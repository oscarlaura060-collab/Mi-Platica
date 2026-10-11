/**
 * Verifica que un gasto fijo quincenal se cuente DOS veces al mes y que
 * pagar una quincena no marque la otra.
 *
 *   node scripts/verify-biweekly.mjs
 */
import initSqlJs from 'sql.js';

const ok = (nombre, real, esperado) => {
  const bien = real === esperado;
  console.log(
    `  ${bien ? 'OK  ' : 'FALLA'} ${nombre}: ${real}${bien ? '' : ` (esperaba ${esperado})`}`,
  );
  if (!bien) process.exitCode = 1;
};

const SQL = await initSqlJs();
const db = new SQL.Database();

db.run(`
CREATE TABLE fixed_expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT, amount INTEGER, category_id INTEGER, account_id INTEGER,
  due_day INTEGER, due_day_2 INTEGER, frequency TEXT DEFAULT 'monthly',
  is_essential INTEGER DEFAULT 1, auto_remind INTEGER DEFAULT 1,
  emoji TEXT DEFAULT '*', color TEXT DEFAULT '#0EA5E9', status TEXT DEFAULT 'active'
);
CREATE TABLE fixed_expense_payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fixed_expense_id INTEGER, transaction_id INTEGER,
  amount INTEGER, period TEXT, paid_at TEXT
);
CREATE UNIQUE INDEX idx_fep ON fixed_expense_payments(fixed_expense_id, period);
`);

// Vista identica a la de la migracion 9.
db.run(`
CREATE VIEW v_fixed_expense_status AS
WITH base AS (
  SELECT f.*,
    CASE WHEN f.frequency = 'biweekly' AND f.due_day_2 IS NOT NULL THEN 2 ELSE 1 END AS occurrences,
    strftime('%Y-%m','now','localtime') AS ym,
    CAST(strftime('%d','now','localtime') AS INTEGER) AS today_day
  FROM fixed_expenses f
)
SELECT b.id, b.name, b.amount, b.due_day, b.due_day_2, b.frequency,
  b.is_essential, b.status, b.occurrences, b.today_day,
  b.amount * b.occurrences AS monthly_total,
  CASE WHEN EXISTS (SELECT 1 FROM fixed_expense_payments p
    WHERE p.fixed_expense_id = b.id AND p.period = b.ym) THEN 1 ELSE 0 END AS paid_first,
  CASE WHEN EXISTS (SELECT 1 FROM fixed_expense_payments p
    WHERE p.fixed_expense_id = b.id AND p.period = b.ym || '-Q2') THEN 1 ELSE 0 END AS paid_second,
  CASE
    WHEN b.occurrences = 1 THEN
      CASE WHEN EXISTS (SELECT 1 FROM fixed_expense_payments p
        WHERE p.fixed_expense_id = b.id AND p.period = b.ym) THEN 1 ELSE 0 END
    ELSE
      CASE WHEN EXISTS (SELECT 1 FROM fixed_expense_payments p
        WHERE p.fixed_expense_id = b.id AND p.period = b.ym)
       AND EXISTS (SELECT 1 FROM fixed_expense_payments p
        WHERE p.fixed_expense_id = b.id AND p.period = b.ym || '-Q2') THEN 1 ELSE 0 END
  END AS paid_this_month,
  (SELECT COALESCE(SUM(p.amount),0) FROM fixed_expense_payments p
    WHERE p.fixed_expense_id = b.id AND (p.period = b.ym OR p.period = b.ym || '-Q2')) AS paid_amount
FROM base b;
`);

const q = (sql) => {
  const r = db.exec(sql);
  return r.length ? r[0].values[0][0] : null;
};
const ym = q(`SELECT strftime('%Y-%m','now','localtime')`);

console.log('\nGASTO QUINCENAL — mercado de $300.000 los dias 15 y 30\n');
db.run(`INSERT INTO fixed_expenses (name,amount,due_day,due_day_2,frequency)
        VALUES ('Mercado',30000000,15,30,'biweekly')`);
db.run(`INSERT INTO fixed_expenses (name,amount,due_day,frequency)
        VALUES ('Arriendo',120000000,5,'monthly')`);

ok('mercado: 2 cobros al mes', q(`SELECT occurrences FROM v_fixed_expense_status WHERE name='Mercado'`), 2);
ok('mercado: cuesta 600.000 al mes', q(`SELECT monthly_total FROM v_fixed_expense_status WHERE name='Mercado'`), 60000000);
ok('arriendo: 1 cobro al mes', q(`SELECT occurrences FROM v_fixed_expense_status WHERE name='Arriendo'`), 1);
ok('arriendo: cuesta 1.200.000', q(`SELECT monthly_total FROM v_fixed_expense_status WHERE name='Arriendo'`), 120000000);
ok('total mensual de fijos', q(`SELECT SUM(monthly_total) FROM v_fixed_expense_status`), 180000000);

console.log('\nPago SOLO la primera quincena del mercado\n');
db.run(`INSERT INTO fixed_expense_payments (fixed_expense_id,amount,period,paid_at)
        VALUES (1,30000000,'${ym}','x')`);

ok('primera quincena pagada', q(`SELECT paid_first FROM v_fixed_expense_status WHERE id=1`), 1);
ok('segunda AUN pendiente', q(`SELECT paid_second FROM v_fixed_expense_status WHERE id=1`), 0);
ok('el mes NO esta completo', q(`SELECT paid_this_month FROM v_fixed_expense_status WHERE id=1`), 0);
ok('pagado del mercado', q(`SELECT paid_amount FROM v_fixed_expense_status WHERE id=1`), 30000000);

// Pendiente = monthly_total - paid_amount, sumando todos.
ok(
  'pendiente total del mes',
  q(`SELECT SUM(monthly_total - paid_amount) FROM v_fixed_expense_status WHERE status='active'`),
  150000000,
);

console.log('\nPago la segunda quincena\n');
db.run(`INSERT INTO fixed_expense_payments (fixed_expense_id,amount,period,paid_at)
        VALUES (1,30000000,'${ym}-Q2','x')`);

ok('ahora el mes SI esta completo', q(`SELECT paid_this_month FROM v_fixed_expense_status WHERE id=1`), 1);
ok('pagado del mercado', q(`SELECT paid_amount FROM v_fixed_expense_status WHERE id=1`), 60000000);
ok(
  'solo queda el arriendo pendiente',
  q(`SELECT SUM(monthly_total - paid_amount) FROM v_fixed_expense_status WHERE status='active'`),
  120000000,
);

console.log('\nDeshago la segunda quincena\n');
db.run(`DELETE FROM fixed_expense_payments WHERE fixed_expense_id=1 AND period='${ym}-Q2'`);
ok('vuelve a quedar pendiente', q(`SELECT paid_second FROM v_fixed_expense_status WHERE id=1`), 0);
ok('la primera sigue pagada', q(`SELECT paid_first FROM v_fixed_expense_status WHERE id=1`), 1);

console.log(
  process.exitCode ? '\nHAY FALLAS\n' : '\nLogica quincenal verificada\n',
);
