/**
 * VERIFICACION FUNCIONAL COMPLETA
 *
 * Levanta el esquema real de la app (todas las migraciones) en una base
 * SQLite en memoria y simula los flujos que mas duelen si fallan:
 * pagos de tarjeta, gastos quincenales, aportes a metas, duplicados.
 *
 *   node scripts/verify-all.mjs
 */
import initSqlJs from 'sql.js';
import { readFileSync } from 'fs';

let fallas = 0;
const ok = (nombre, real, esperado) => {
  const bien = String(real) === String(esperado);
  console.log(
    `  ${bien ? 'OK  ' : 'FALLA'} ${nombre}: ${real}${bien ? '' : ` (esperaba ${esperado})`}`,
  );
  if (!bien) fallas++;
};
const seccion = (t) => console.log(`\n${t}\n`);

// --- Esquema real: se extraen los SQL de migrations.ts ---------------
const ts = (await import('typescript')).default;
const fuente = readFileSync('src/db/migrations.ts', 'utf8').replace(/^import .*$/gm, '');
const js = ts.transpileModule(fuente, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const { MIGRATIONS } = new Function(`const exports={}; ${js}; return exports;`)();

const SQL = await initSqlJs();
const db = new SQL.Database();

for (const m of MIGRATIONS) {
  try {
    db.run(m.sql);
  } catch (e) {
    console.log(`  FALLA migracion ${m.version} (${m.name}): ${e.message}`);
    fallas++;
  }
}

const q = (sql, params = []) => {
  const r = db.exec(sql, params);
  return r.length ? r[0].values[0][0] : null;
};
const run = (sql, params = []) => db.run(sql, params);
const ym = q(`SELECT strftime('%Y-%m','now','localtime')`);
const hoy = q(`SELECT date('now','localtime')`);

seccion('ESQUEMA — las 11 migraciones corren sobre una base limpia');
ok('numero de migraciones', MIGRATIONS.length, 12);
for (const tabla of [
  'accounts', 'categories', 'transactions', 'debts', 'debt_payments',
  'fixed_expenses', 'fixed_expense_payments', 'fixed_incomes',
  'fixed_income_receipts', 'investments', 'investment_moves',
  'savings_goals', 'goal_contributions', 'installment_plans',
  'detected_movements', 'reminders', 'settings', 'coach_rules',
]) {
  ok(
    `tabla ${tabla}`,
    q(`SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=?`, [tabla]),
    1,
  );
}
for (const vista of [
  'v_account_balances', 'v_credit_cards', 'v_debt_progress',
  'v_fixed_expense_status', 'v_fixed_income_status', 'v_goal_progress',
  'v_investment_progress', 'v_daily_expense',
]) {
  ok(
    `vista ${vista}`,
    q(`SELECT COUNT(*) FROM sqlite_master WHERE type='view' AND name=?`, [vista]),
    1,
  );
}

seccion('CUENTAS — saldos derivados, nunca denormalizados');
run(`INSERT INTO accounts (name,type,initial_balance,include_in_total)
     VALUES ('Nequi','wallet',100000000,1)`);                       // $1.000.000
run(`INSERT INTO accounts (name,type,initial_balance,include_in_total)
     VALUES ('Efectivo','cash',20000000,1)`);                       // $200.000
run(`INSERT INTO accounts (name,type,initial_balance,credit_limit,payment_due_day,statement_day)
     VALUES ('Visa','credit_card',-25000000,200000000,5,20)`);      // debe $250.000

ok('saldo Nequi', q(`SELECT balance FROM v_account_balances WHERE name='Nequi'`), 100000000);
ok('total (sin tarjeta)',
  q(`SELECT SUM(balance) FROM v_account_balances
     WHERE archived=0 AND include_in_total=1 AND type<>'credit_card'`), 120000000);
ok('deuda de la tarjeta', q(`SELECT used FROM v_credit_cards`), 25000000);
ok('cupo libre', q(`SELECT available FROM v_credit_cards`), 175000000);

seccion('TARJETA — pagar BAJA la deuda y libera cupo');
run(`INSERT INTO transactions (type,amount,account_id,to_account_id,occurred_at,occurred_day)
     VALUES ('transfer',15000000,1,3,'${hoy}','${hoy}')`);          // paga $150.000
ok('deuda despues del pago', q(`SELECT used FROM v_credit_cards`), 10000000);
ok('cupo liberado', q(`SELECT available FROM v_credit_cards`), 190000000);
ok('salio de Nequi', q(`SELECT balance FROM v_account_balances WHERE id=1`), 85000000);

run(`INSERT INTO transactions (type,amount,account_id,occurred_at,occurred_day)
     VALUES ('expense',5000000,3,'${hoy}','${hoy}')`);              // compra $50.000
ok('comprar sube la deuda', q(`SELECT used FROM v_credit_cards`), 15000000);

seccion('TARJETA — compra a cuotas afecta el cupo por el total');
run(`INSERT INTO installment_plans
     (account_id,description,principal,installments_total,monthly_rate_bp,
      installment_amount,first_due_date)
     VALUES (3,'Nevera',60000000,6,225,10700000,'${hoy}')`);
run(`INSERT INTO transactions (type,amount,account_id,installment_plan_id,occurred_at,occurred_day)
     VALUES ('expense',60000000,3,1,'${hoy}','${hoy}')`);
ok('el cupo baja por el TOTAL', q(`SELECT used FROM v_credit_cards`), 75000000);
ok('cuota mensual del plan', q(`SELECT monthly_installments FROM v_credit_cards`), 10700000);
ok('planes activos', q(`SELECT active_plans FROM v_credit_cards`), 1);
ok('la deuda NO se cuenta dos veces',
  q(`SELECT used FROM v_credit_cards`) === 75000000 ? 'si' : 'no', 'si');

seccion('GASTOS FIJOS — quincenal cuenta dos veces al mes');
run(`INSERT INTO fixed_expenses (name,amount,due_day,due_day_2,frequency)
     VALUES ('Mercado',30000000,15,30,'biweekly')`);
run(`INSERT INTO fixed_expenses (name,amount,due_day,frequency)
     VALUES ('Arriendo',120000000,5,'monthly')`);

ok('mercado: 2 cobros', q(`SELECT occurrences FROM v_fixed_expense_status WHERE name='Mercado'`), 2);
ok('mercado: $600.000 al mes', q(`SELECT monthly_total FROM v_fixed_expense_status WHERE name='Mercado'`), 60000000);
ok('total fijo mensual', q(`SELECT SUM(monthly_total) FROM v_fixed_expense_status`), 180000000);

run(`INSERT INTO fixed_expense_payments (fixed_expense_id,amount,period,paid_at)
     VALUES (1,30000000,'${ym}','${hoy}')`);
ok('1a quincena pagada', q(`SELECT paid_first FROM v_fixed_expense_status WHERE id=1`), 1);
ok('2a quincena pendiente', q(`SELECT paid_second FROM v_fixed_expense_status WHERE id=1`), 0);
ok('el mes NO esta completo', q(`SELECT paid_this_month FROM v_fixed_expense_status WHERE id=1`), 0);
ok('pendiente del mes',
  q(`SELECT SUM(monthly_total - paid_amount) FROM v_fixed_expense_status WHERE status='active'`),
  150000000);

// No se puede pagar dos veces el mismo periodo.
let duplicado = false;
try {
  run(`INSERT INTO fixed_expense_payments (fixed_expense_id,amount,period,paid_at)
       VALUES (1,30000000,'${ym}','${hoy}')`);
} catch { duplicado = true; }
ok('el indice unico impide pagar dos veces la misma quincena', duplicado, true);

seccion('INGRESOS FIJOS — frecuencias y recepcion');
run(`INSERT INTO fixed_incomes (name,amount,pay_day,pay_day_2,frequency,is_reliable)
     VALUES ('Salario',150000000,15,30,'biweekly',1)`);
ok('salario quincenal registrado',
  q(`SELECT COUNT(*) FROM v_fixed_income_status WHERE frequency='biweekly'`), 1);
ok('aun no recibido este mes',
  q(`SELECT received_this_month FROM v_fixed_income_status WHERE id=1`), 0);

run(`INSERT INTO transactions (type,amount,account_id,fixed_income_id,occurred_at,occurred_day)
     VALUES ('income',150000000,1,1,'${hoy}','${hoy}')`);
run(`INSERT INTO fixed_income_receipts (fixed_income_id,amount,period,received_at)
     VALUES (1,150000000,'${ym}','${hoy}')`);
ok('marcado como recibido',
  q(`SELECT received_this_month FROM v_fixed_income_status WHERE id=1`), 1);
ok('el ingreso subio el saldo', q(`SELECT balance FROM v_account_balances WHERE id=1`), 235000000);

seccion('METAS — el aporte NO es un gasto');
run(`INSERT INTO savings_goals (name,target_amount,initial_amount,frequency,planned_contribution,plan_kind)
     VALUES ('Viaje',900000000,50000000,'biweekly',21000000,'recommended')`);
ok('meta creada', q(`SELECT COUNT(*) FROM v_goal_progress`), 1);
ok('arranca con lo que ya tenia', q(`SELECT saved FROM v_goal_progress WHERE id=1`), 50000000);
ok('le falta', q(`SELECT remaining FROM v_goal_progress WHERE id=1`), 850000000);
ok('guarda el plan elegido', q(`SELECT planned_contribution FROM v_goal_progress WHERE id=1`), 21000000);

const gastoAntes = q(`SELECT COALESCE(SUM(amount),0) FROM transactions
                      WHERE type='expense' AND deleted_at IS NULL`);
run(`INSERT INTO transactions (type,amount,account_id,savings_goal_id,occurred_at,occurred_day)
     VALUES ('goal_deposit',21000000,1,1,'${hoy}','${hoy}')`);
run(`INSERT INTO goal_contributions (goal_id,transaction_id,amount,contributed_at)
     VALUES (1,(SELECT MAX(id) FROM transactions),21000000,'${hoy}')`);

ok('el aporte suma a la meta', q(`SELECT saved FROM v_goal_progress WHERE id=1`), 71000000);
ok('baja el saldo de la cuenta', q(`SELECT balance FROM v_account_balances WHERE id=1`), 214000000);
ok('pero NO cuenta como gasto',
  q(`SELECT COALESCE(SUM(amount),0) FROM transactions
     WHERE type='expense' AND deleted_at IS NULL`), gastoAntes);
ok('ni se cuenta dos veces en la meta', q(`SELECT contributions FROM v_goal_progress WHERE id=1`), 1);

seccion('DEUDAS — abono separa capital e interes');
run(`INSERT INTO debts (name,principal,monthly_rate_bp,installments_total,
                        installment_amount,due_day,start_date)
     VALUES ('Prestamo',200000000,200,12,18900000,10,'${hoy}')`);
ok('saldo inicial', q(`SELECT outstanding FROM v_debt_progress WHERE id=1`), 200000000);

run(`INSERT INTO transactions (type,amount,account_id,debt_id,occurred_at,occurred_day)
     VALUES ('debt_payment',18900000,1,1,'${hoy}','${hoy}')`);
run(`INSERT INTO debt_payments (debt_id,transaction_id,amount,interest_part,
                                principal_part,installment_no,paid_at)
     VALUES (1,(SELECT MAX(id) FROM transactions),18900000,4000000,14900000,1,'${hoy}')`);

ok('el saldo baja solo por el capital',
  q(`SELECT outstanding FROM v_debt_progress WHERE id=1`), 185100000);
ok('el interes queda registrado aparte',
  q(`SELECT paid_interest FROM v_debt_progress WHERE id=1`), 4000000);
ok('el abono salio de la cuenta',
  q(`SELECT balance FROM v_account_balances WHERE id=1`), 195100000);
ok('cuotas pagadas', q(`SELECT installments_paid FROM v_debt_progress WHERE id=1`), 1);

seccion('DETECCION — sin duplicados');
run(`INSERT INTO detected_movements (notif_key,source,kind,amount,posted_at,confidence)
     VALUES ('abc123','Bancolombia','expense',5000000,1,85)`);
let dupDetect = false;
try {
  run(`INSERT INTO detected_movements (notif_key,source,kind,amount,posted_at,confidence)
       VALUES ('abc123','Bancolombia','expense',5000000,1,85)`);
} catch { dupDetect = true; }
ok('la misma notificacion no entra dos veces', dupDetect, true);
ok('queda pendiente de confirmar',
  q(`SELECT COUNT(*) FROM detected_movements WHERE status='pending'`), 1);

run(`UPDATE detected_movements SET status='ignored' WHERE notif_key='abc123'`);
ok('descartarla la saca de pendientes',
  q(`SELECT COUNT(*) FROM detected_movements WHERE status='pending'`), 0);

seccion('BORRADO LOGICO — se puede deshacer');
const saldoAntes = q(`SELECT balance FROM v_account_balances WHERE id=1`);
run(`UPDATE transactions SET deleted_at=datetime('now')
     WHERE type='expense' AND account_id=3 AND amount=5000000`);
ok('borrar la compra baja la deuda de la tarjeta',
  q(`SELECT used FROM v_credit_cards`), 70000000);
run(`UPDATE transactions SET deleted_at=NULL
     WHERE type='expense' AND account_id=3 AND amount=5000000`);
ok('deshacer la restaura', q(`SELECT used FROM v_credit_cards`), 75000000);
ok('el saldo de Nequi no se vio afectado',
  q(`SELECT balance FROM v_account_balances WHERE id=1`), saldoAntes);

seccion('AJUSTES — claves que la app espera');
for (const k of [
  'currency', 'theme', 'debt_strategy', 'emergency_buffer', 'user_name',
  'primary_account_id', 'basic_needs_reserve', 'daily_motivation',
  'daily_motivation_hour', 'inflation_bp', 'detect_enabled',
]) {
  ok(`ajuste ${k}`, q(`SELECT COUNT(*) FROM settings WHERE key=?`, [k]), 1);
}
ok('reglas del coach sembradas', q(`SELECT COUNT(*) FROM coach_rules`), 8);
ok('categorias sembradas', q(`SELECT COUNT(*) FROM categories`), 14);

seccion('CUENTA PRINCIPAL — solo preferencia, no toca saldos');
const totalAntes = q(`SELECT SUM(balance) FROM v_account_balances
                      WHERE archived=0 AND include_in_total=1 AND type<>'credit_card'`);
run(`UPDATE settings SET value='1' WHERE key='primary_account_id'`);
ok('marcarla no cambia el total',
  q(`SELECT SUM(balance) FROM v_account_balances
     WHERE archived=0 AND include_in_total=1 AND type<>'credit_card'`), totalAntes);
ok('la cuenta principal queda guardada',
  q(`SELECT value FROM settings WHERE key='primary_account_id'`), '1');

console.log(
  fallas
    ? `\n======== ${fallas} FALLA(S) ========\n`
    : '\n======== TODO VERIFICADO ========\n',
);
if (fallas) process.exitCode = 1;
