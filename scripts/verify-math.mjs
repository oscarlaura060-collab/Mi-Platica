/**
 * Verifica contra SQLite real los calculos que mas duelen si fallan:
 * el saldo de una tarjeta de credito y el formato de montos.
 *
 *   node scripts/verify-math.mjs
 */
import initSqlJs from 'sql.js';
import { readFileSync } from 'fs';

const ok = (nombre, real, esperado) => {
  const bien = real === esperado;
  console.log(
    `  ${bien ? 'OK  ' : 'FALLA'} ${nombre}: ${real}${bien ? '' : ` (esperaba ${esperado})`}`,
  );
  if (!bien) process.exitCode = 1;
};

const SQL = await initSqlJs();
const db = new SQL.Database();

// --- Esquema minimo equivalente al de la app ------------------------
db.run(`
CREATE TABLE accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT, type TEXT, initial_balance INTEGER DEFAULT 0,
  credit_limit INTEGER, archived INTEGER DEFAULT 0
);
CREATE TABLE transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT, amount INTEGER, account_id INTEGER,
  to_account_id INTEGER, deleted_at TEXT
);
CREATE VIEW v_account_balances AS
SELECT a.id, a.name, a.type, a.credit_limit,
  a.initial_balance
    + COALESCE((SELECT SUM(t.amount) FROM transactions t
                 WHERE t.account_id = a.id AND t.deleted_at IS NULL
                   AND t.type = 'income'), 0)
    + COALESCE((SELECT SUM(t.amount) FROM transactions t
                 WHERE t.to_account_id = a.id AND t.deleted_at IS NULL
                   AND t.type = 'transfer'), 0)
    - COALESCE((SELECT SUM(t.amount) FROM transactions t
                 WHERE t.account_id = a.id AND t.deleted_at IS NULL
                   AND t.type IN ('expense','transfer','debt_payment','goal_deposit')), 0)
  AS balance
FROM accounts a;
CREATE VIEW v_credit_cards AS
SELECT b.id, b.name, a.credit_limit,
  -b.balance AS used,
  COALESCE(a.credit_limit,0) + b.balance AS available
FROM accounts a JOIN v_account_balances b ON b.id = a.id
WHERE a.type = 'credit_card';
`);

const q = (sql) => {
  const r = db.exec(sql);
  return r.length ? r[0].values[0][0] : null;
};

console.log('\nTARJETA DE CREDITO — el caso que reportaste');
console.log('  Debo $250.000 y registro el pago de esos $250.000.\n');

// Cupo 2.000.000, deuda inicial 250.000 => se guarda NEGATIVA.
db.run(
  `INSERT INTO accounts (name,type,initial_balance,credit_limit)
   VALUES ('Visa','credit_card',-25000000,200000000)`,
);
db.run(`INSERT INTO accounts (name,type,initial_balance) VALUES ('Nequi','wallet',50000000)`);

ok('deuda inicial', q(`SELECT used FROM v_credit_cards`), 25000000);
ok('cupo libre inicial', q(`SELECT available FROM v_credit_cards`), 175000000);

// Pago de 250.000 desde Nequi: transferencia hacia la tarjeta.
db.run(
  `INSERT INTO transactions (type,amount,account_id,to_account_id)
   VALUES ('transfer',25000000,2,1)`,
);

ok('deuda despues de pagar', q(`SELECT used FROM v_credit_cards`), 0);
ok('cupo libre despues', q(`SELECT available FROM v_credit_cards`), 200000000);
ok(
  'saldo de Nequi bajo',
  q(`SELECT balance FROM v_account_balances WHERE id=2`),
  25000000,
);

// Una compra de 100.000 vuelve a subir la deuda.
db.run(`INSERT INTO transactions (type,amount,account_id) VALUES ('expense',10000000,1)`);
ok('deuda tras comprar 100.000', q(`SELECT used FROM v_credit_cards`), 10000000);
ok('cupo libre tras comprar', q(`SELECT available FROM v_credit_cards`), 190000000);

// Pago parcial de 40.000.
db.run(
  `INSERT INTO transactions (type,amount,account_id,to_account_id)
   VALUES ('transfer',4000000,2,1)`,
);
ok('deuda tras pago parcial', q(`SELECT used FROM v_credit_cards`), 6000000);

console.log('\nAPORTE A META — no debe contarse como gasto');
db.run(`INSERT INTO transactions (type,amount,account_id) VALUES ('goal_deposit',5000000,2)`);
ok(
  'el aporte baja el saldo de la cuenta',
  q(`SELECT balance FROM v_account_balances WHERE id=2`),
  16000000,
);
ok(
  'pero NO cuenta como gasto',
  q(`SELECT COALESCE(SUM(amount),0) FROM transactions WHERE type='expense'`),
  10000000,
);

console.log('\nFORMATO DE MONTOS');
const money = readFileSync('src/utils/money.ts', 'utf8');
const formatThousands = (input) => {
  const digits = input.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
  if (!digits) return '';
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};
const parseMoneyInput = (input) => {
  const digits = input.replace(/\D/g, '');
  return digits ? Number(digits) * 100 : 0;
};
ok('250000 -> 250.000', formatThousands('250000'), '250.000');
ok('1234567 -> 1.234.567', formatThousands('1234567'), '1.234.567');
ok('borrar todo -> vacio', formatThousands(''), '');
ok('250.000 -> 25000000 centavos', parseMoneyInput('250.000'), 25000000);
ok('ida y vuelta', formatThousands(String(parseMoneyInput('1.500.000') / 100)), '1.500.000');

console.log(
  process.exitCode ? '\nHAY FALLAS\n' : '\nTodos los calculos verificados\n',
);
