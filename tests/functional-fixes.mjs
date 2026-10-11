import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import initSqlJs from 'sql.js';

function loadPureModule(path) {
  const source = readFileSync(path, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  return new Function(`const exports = {}; ${output}; return exports;`)();
}

const { validatePaymentAmount } = loadPureModule('src/domain/debt/payments.ts');
const { nextReceiptPeriod } = loadPureModule('src/domain/income/receiptPeriods.ts');
const { defaultAccountId } = loadPureModule('src/domain/accounts/defaultAccount.ts');
const { buildMotivationSchedule } = loadPureModule('src/domain/motivation/schedule.ts');

assert.equal(validatePaymentAmount(25_000, 100_000), 25_000, 'pago parcial');
assert.equal(validatePaymentAmount(100_000, 100_000), 100_000, 'pago exacto');
assert.throws(() => validatePaymentAmount(0, 100_000), /mayor que cero/, 'pago cero');
assert.throws(() => validatePaymentAmount(-1, 100_000), /mayor que cero/, 'pago negativo');
assert.throws(() => validatePaymentAmount(100_001, 100_000), /saldo pendiente/, 'sobrepago');
assert.equal(nextReceiptPeriod('2026-10', 'monthly', false, []), '2026-10', 'ingreso mensual pendiente');
assert.equal(nextReceiptPeriod('2026-10', 'biweekly', true, []), '2026-10', 'primera quincena');
assert.equal(nextReceiptPeriod('2026-10', 'biweekly', true, ['2026-10']), '2026-10-Q2', 'segunda quincena');
assert.equal(nextReceiptPeriod('2026-10', 'biweekly', true, ['2026-10', '2026-10-Q2']), null, 'sin duplicar periodos recibidos');
assert.equal(defaultAccountId(undefined, [{ id: 1 }, { id: 2 }], 2), 2, 'usa la cuenta principal por defecto');
assert.equal(defaultAccountId(1, [{ id: 1 }, { id: 2 }], 2), 1, 'respeta una cuenta seleccionada');
assert.equal(defaultAccountId(undefined, [{ id: 1, archived: 1 }], 1), null, 'no selecciona cuenta archivada');
const motivationNow = new Date(2026, 9, 11, 8, 30, 0, 0);
const hourlyMotivation = buildMotivationSchedule(motivationNow, 1, 9, 0);
const twoHourlyMotivation = buildMotivationSchedule(motivationNow, 2, 9, 0);
assert.equal(hourlyMotivation[0].getHours(), 9, 'primer mensaje dentro del horario diurno');
assert(hourlyMotivation.length <= 26, 'cola de una hora limitada a 48 horas');
assert(hourlyMotivation.every((date) => date.getHours() >= 7 && date.getHours() <= 21), 'sin avisos nocturnos');
assert(twoHourlyMotivation.slice(1).every((date, i) =>
  date.getDate() !== twoHourlyMotivation[i].getDate() ||
  date.getTime() - twoHourlyMotivation[i].getTime() === 2 * 60 * 60 * 1000,
), 'intervalo de dos horas dentro de la franja diurna');
assert(hourlyMotivation.every((date) => date.getTime() <= motivationNow.getTime() + 48 * 60 * 60 * 1000), 'horizonte de 48 horas');

console.log('OK: pagos parciales, exactos, cero, negativos y superiores al saldo');
console.log('OK: ingreso fijo mensual, quincena 1, quincena 2 y prevención de duplicados');
console.log('OK: cuenta principal predeterminada, selección explícita y exclusión de archivadas');
console.log('OK: frecuencia motivacional de 1/2/4 horas, horario diurno y cola acotada');

const migrationSource = readFileSync('src/db/migrations.ts', 'utf8').replace(/^import .*$/gm, '');
const migrationJs = ts.transpileModule(migrationSource, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const { MIGRATIONS } = new Function(`const exports = {}; ${migrationJs}; return exports;`)();
const SQL = await initSqlJs();
const db = new SQL.Database();
for (const migration of MIGRATIONS) db.run(migration.sql);

function query(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}
const all = async (sql, params = []) => query(sql, params);
const one = async (sql, params = []) => query(sql, params)[0] ?? null;
const run = async (sql, params = []) => {
  db.run(sql, params);
  return { lastInsertRowId: (await one('SELECT last_insert_rowid() AS id')).id };
};
const tx = async (fn) => fn();
const dayKey = (date = new Date()) => date.toISOString().slice(0, 10);
const fixedSource = readFileSync('src/db/repositories/fixedIncomes.ts', 'utf8').replace(/^import .*$/gm, '');
const fixedJs = ts.transpileModule(fixedSource, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const fixed = new Function('all', 'one', 'run', 'tx', 'dayKey', 'nowIso', 'nextReceiptPeriod',
  `const exports = {}; ${fixedJs}; return exports;`)(
    all, one, run, tx, dayKey, () => new Date().toISOString(), nextReceiptPeriod,
  );

await run("INSERT INTO accounts (name,type) VALUES ('Cuenta prueba','bank')");
await run("INSERT INTO fixed_incomes (name,amount,pay_day,pay_day_2,frequency) VALUES ('Salario',1000,1,2,'biweekly')");
const incomeId = (await one("SELECT id FROM fixed_incomes WHERE name='Salario'")).id;
assert.equal((await fixed.pendingFixedIncomesDue()).length, 1, 'ingreso vencido aparece pendiente');
await fixed.receiveFixedIncome({ fixedIncomeId: incomeId, accountId: 1, occurredAt: `${dayKey().slice(0, 7)}-01T12:00:00.000Z` });
assert.equal((await fixed.pendingFixedIncomesDue()).length, 1, 'segunda quincena sigue pendiente');
await fixed.receiveFixedIncome({ fixedIncomeId: incomeId, accountId: 1, occurredAt: `${dayKey().slice(0, 7)}-02T12:00:00.000Z` });
assert.equal((await fixed.pendingFixedIncomesDue()).length, 0, 'se quitan pendientes tras confirmar las dos quincenas');
assert.equal((await fixed.listFixedIncomes())[0].received_this_month, 1, 'estado recibido del mes');
assert.equal((await one('SELECT balance FROM v_account_balances WHERE id=1')).balance, 2000, 'saldo suma ambos recibos');
assert.equal((await all('SELECT id FROM transactions WHERE fixed_income_id=? AND deleted_at IS NULL', [incomeId])).length, 2, 'dos movimientos sin duplicados');
await assert.rejects(
  fixed.receiveFixedIncome({ fixedIncomeId: incomeId, accountId: 1 }),
  /todas sus fechas/,
  'bloquea el tercer recibo duplicado',
);
console.log('OK: ingreso vencido, confirmación de dos quincenas, saldo y prevención de recibo duplicado');

await run("INSERT INTO debts (name,principal,installments_total,due_day,start_date) VALUES ('Deuda editable',1000,10,5,'2026-01-01')");
const debtId = (await one("SELECT id FROM debts WHERE name='Deuda editable'")).id;
await run("INSERT INTO debt_payments (debt_id,amount,interest_part,principal_part,installment_no,is_extra,paid_at) VALUES (?,300,0,250,1,0,'2026-02-01')", [debtId]);
const debtSource = readFileSync('src/db/repositories/debts.ts', 'utf8').replace(/^import .*$/gm, '');
const debtJs = ts.transpileModule(debtSource, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const debtRepo = new Function('all', 'one', 'run', 'tx', 'installmentAmount', 'splitPayment', 'dayKey', 'nowIso', 'validatePaymentAmount',
  `const exports = {}; ${debtJs}; return exports;`)(all, one, run, tx,
    () => 0, () => ({ interest: 0, principal: 0 }), dayKey,
    () => new Date().toISOString(), validatePaymentAmount);
await debtRepo.updateDebt(debtId, { principal: 1500, name: 'Deuda editada' });
assert.equal((await one('SELECT outstanding FROM v_debt_progress WHERE id=?', [debtId])).outstanding, 1250, 'edición respeta abono previo');
assert.equal((await all('SELECT id FROM debt_payments WHERE debt_id=?', [debtId])).length, 1, 'editar no duplica el historial de pagos');
assert.equal((await one('SELECT status FROM debts WHERE id=?', [debtId])).status, 'active', 'edición reactiva deuda con saldo');
await assert.rejects(debtRepo.updateDebt(debtId, { principal: 200 }), /por debajo de lo ya abonado/, 'no permite capital menor a lo ya pagado');
console.log('OK: edición de deuda conserva pagos, recalcula saldo y no duplica historial');

await run("UPDATE accounts SET initial_balance=500000 WHERE id=1");
await run("INSERT INTO accounts (name,type,initial_balance,credit_limit,payment_due_day) VALUES ('Tarjeta prueba','credit_card',-100000,500000,20)");
const cardId = (await one("SELECT id FROM accounts WHERE name='Tarjeta prueba'")).id;
await run("INSERT INTO installment_plans (account_id,description,principal,installments_total,monthly_rate_bp,installment_amount,first_due_date) VALUES (?, 'Compra',50000,5,0,10000,'2026-10-20')", [cardId]);
const cardSource = readFileSync('src/db/repositories/creditCards.ts', 'utf8').replace(/^import .*$/gm, '');
const cardJs = ts.transpileModule(cardSource, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const cardRepo = new Function('all', 'one', 'run', 'tx', 'installmentAmount', 'dayKey', 'nowIso', 'validatePaymentAmount',
  `const exports = {}; ${cardJs}; return exports;`)(all, one, run, tx,
    () => 0, dayKey, () => new Date().toISOString(), validatePaymentAmount);
await cardRepo.payCreditCard({ cardId, fromAccountId: 1, amount: 5000, advancePlans: true });
assert.equal((await one('SELECT used FROM v_credit_cards WHERE id=?', [cardId])).used, 95000, 'pago parcial reduce saldo de tarjeta');
assert.equal((await one('SELECT installments_paid FROM installment_plans WHERE account_id=?', [cardId])).installments_paid, 0, 'pago parcial no marca cuotas como pagadas');
await cardRepo.payCreditCard({ cardId, fromAccountId: 1, amount: 10000, advancePlans: true });
assert.equal((await one('SELECT installments_paid FROM installment_plans WHERE account_id=?', [cardId])).installments_paid, 1, 'pago que cubre cuota avanza el plan una vez');
const beforeInvalidCardPay = (await one('SELECT COUNT(*) AS n FROM transactions')).n;
await assert.rejects(cardRepo.payCreditCard({ cardId, fromAccountId: 1, amount: 90000 }), /saldo pendiente/, 'no permite exceder saldo de tarjeta');
assert.equal((await one('SELECT COUNT(*) AS n FROM transactions')).n, beforeInvalidCardPay, 'pago inválido no crea movimiento');
await cardRepo.payCreditCard({ cardId, fromAccountId: 1, amount: 85000 });
assert.equal((await one('SELECT used FROM v_credit_cards WHERE id=?', [cardId])).used, 0, 'pago exacto deja tarjeta en cero');
console.log('OK: vencimiento y saldo de tarjeta, pago parcial, cuota, exacto y sobrepago');

const dbIndexSource = readFileSync('src/db/index.ts', 'utf8').replace(/^import .*$/gm, '');
const dbIndexJs = ts.transpileModule(dbIndexSource, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const connection = {
  execAsync: async (sql) => { try { db.run(sql); } catch (error) { if (!sql.startsWith('PRAGMA journal_mode')) throw error; } },
  getFirstAsync: async (sql) => sql.includes('user_version') ? { user_version: MIGRATIONS.length } : await one(sql),
  withTransactionAsync: async (fn) => fn(),
  runAsync: run,
};
const dbIndex = new Function('SQLite', 'MIGRATIONS',
  `const exports = {}; ${dbIndexJs}; return exports;`)({ openDatabaseAsync: async () => connection }, MIGRATIONS);
await dbIndex.openDb();
await dbIndex.wipeAllData();
for (const table of ['transactions','debt_payments','fixed_income_receipts','fixed_expense_payments','goal_contributions','investment_moves','installment_plans','fixed_incomes','fixed_expenses','debts','savings_goals','investments','accounts']) {
  assert.equal((await one(`SELECT COUNT(*) AS n FROM ${table}`)).n, 0, `borrado completo de ${table}`);
}
console.log('OK: borrar todos mis datos elimina registros de todos los módulos financieros');
