/**
 * Verifica filtros, agrupacion y resumen de Movimientos.
 *
 *   node scripts/verify-movements.mjs
 */
import { readFileSync } from 'fs';

let fallas = 0;
const ok = (nombre, cond, extra = '') => {
  console.log(`  ${cond ? 'OK  ' : 'FALLA'} ${nombre}${cond ? '' : ` -> ${extra}`}`);
  if (!cond) fallas++;
};

const ts = (await import('typescript')).default;
const money = (c) =>
  '$' + Math.round(c / 100).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');

function cargar(ruta) {
  const fuente = readFileSync(ruta, 'utf8').replace(/^import .*$/gm, '');
  const js = ts.transpileModule(fuente, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  return new Function(`const exports = {}; ${js}; return exports;`)();
}

const m = cargar('src/domain/stats/movements.ts');

const PESO = 100;
const M = (p) => p * PESO;

let seq = 0;
const tx = (o) => ({
  id: ++seq,
  type: 'expense',
  amount: M(10_000),
  account_id: 1,
  account_name: 'Nequi',
  to_account_id: null,
  category_id: 1,
  category_name: 'Mercado',
  debt_id: null,
  debt_name: null,
  goal_id: null,
  investment_id: null,
  fixed_expense_id: null,
  installment_plan_id: null,
  fixed_income_id: null,
  savings_goal_id: null,
  note: null,
  occurred_at: '2026-10-11T10:00:00',
  occurred_day: '2026-10-11',
  coach_verdict: null,
  coach_override: 0,
  ...o,
});

// Los movimientos del mockup.
const salario = tx({ type: 'income', amount: M(2_850_000), category_name: 'Salario', account_name: 'Nu' });
const mercado = tx({ amount: M(45_000), category_name: 'Mercado' });
const internet = tx({ amount: M(89_900), category_name: 'Internet', fixed_expense_id: 3 });
const transporte = tx({ amount: M(32_000), category_name: 'Transporte', account_name: 'Efectivo', occurred_day: '2026-10-10', occurred_at: '2026-10-10T18:00:00' });
const metaViaje = tx({ type: 'goal_deposit', amount: M(214_000), category_name: null, note: 'Meta Viaje', occurred_day: '2026-10-10', occurred_at: '2026-10-10T19:00:00' });

const todos = [salario, mercado, internet, transporte, metaViaje];

// =====================================================================
console.log('\n1. Cada movimiento sabe que es');
// =====================================================================
ok('salario es ingreso', m.directionOf(salario) === 'income');
ok('mercado es gasto', m.directionOf(mercado) === 'expense');
ok('meta es ahorro', m.directionOf(metaViaje) === 'saving');
ok('abono es deuda', m.directionOf(tx({ type: 'debt_payment' })) === 'debt');

ok('etiqueta Ingreso', m.typeLabel(salario) === 'Ingreso', m.typeLabel(salario));
ok('etiqueta Gasto', m.typeLabel(mercado) === 'Gasto', m.typeLabel(mercado));
ok('etiqueta Gasto fijo', m.typeLabel(internet) === 'Gasto fijo', m.typeLabel(internet));
ok('etiqueta Ahorro', m.typeLabel(metaViaje) === 'Ahorro', m.typeLabel(metaViaje));
ok('etiqueta Cuota',
  m.typeLabel(tx({ installment_plan_id: 7 })) === 'Cuota',
  m.typeLabel(tx({ installment_plan_id: 7 })));
ok('etiqueta Abono a deuda',
  m.typeLabel(tx({ type: 'debt_payment' })) === 'Abono a deuda');

// =====================================================================
console.log('\n2. El resumen y la regla del balance');
// =====================================================================
const r = m.calculateMovementSummary(todos);
ok('ingresos = 2.850.000', r.income === M(2_850_000), money(r.income));
ok('gastos = 166.900 (solo consumo)', r.expenses === M(166_900), money(r.expenses));
ok('el ahorro NO entra en gastos', r.savings === M(214_000), money(r.savings));
ok('balance = ingresos - gastos - ahorro - deudas',
  r.balance === M(2_850_000) - M(166_900) - M(214_000),
  money(r.balance));
ok('balance = 2.469.100', r.balance === M(2_469_100), money(r.balance));

// La nota explica por que los tres numeros no se restan a simple vista.
ok('con ahorro hay nota', m.balanceNote(r) !== null);
ok('la nota menciona ahorro', m.balanceNote(r).includes('ahorro'), m.balanceNote(r));
const soloGastos = m.calculateMovementSummary([salario, mercado]);
ok('sin ahorro ni deudas no hay nota', m.balanceNote(soloGastos) === null);
ok('y ahi si se restan a simple vista',
  soloGastos.balance === soloGastos.income - soloGastos.expenses);

// Balance negativo.
const pobre = m.calculateMovementSummary([mercado, internet]);
ok('balance negativo sin ingresos', pobre.balance === -M(134_900), money(pobre.balance));

// Sin movimientos, todo en cero.
const cero = m.calculateMovementSummary([]);
ok('periodo vacio da cero', cero.income === 0 && cero.expenses === 0 && cero.balance === 0);

// =====================================================================
console.log('\n3. Un traslado no mueve el resumen');
// =====================================================================
const conTraslado = m.calculateMovementSummary([
  ...todos,
  tx({ type: 'transfer', amount: M(500_000) }),
]);
ok('el traslado no suma a ingresos', conTraslado.income === r.income);
ok('el traslado no suma a gastos', conTraslado.expenses === r.expenses);
ok('el traslado no cambia el balance', conTraslado.balance === r.balance);

// =====================================================================
console.log('\n4. Filtros');
// =====================================================================
ok('Todos devuelve todo', m.filterMovements(todos, 'all').length === 5);
ok('Ingresos solo ingresos',
  m.filterMovements(todos, 'income').every((x) => x.type === 'income'));
ok('Ingresos encuentra 1', m.filterMovements(todos, 'income').length === 1);

const gastos = m.filterMovements(todos, 'expense');
ok('Gastos no incluye el ingreso', !gastos.some((x) => x.type === 'income'));
ok('Gastos no incluye el ahorro', !gastos.some((x) => x.type === 'goal_deposit'));
ok('Gastos encuentra 3', gastos.length === 3, String(gastos.length));

const conAbono = [...todos, tx({ type: 'debt_payment', amount: M(100_000) })];
ok('Gastos SI incluye abonos a deuda',
  m.filterMovements(conAbono, 'expense').length === 4,
  String(m.filterMovements(conAbono, 'expense').length));
ok('Ahorro solo metas',
  m.filterMovements(todos, 'saving').length === 1);

// No muta la entrada.
const copia = [...todos];
m.filterMovements(todos, 'expense');
m.groupMovementsByDate(todos);
ok('no muta el arreglo original',
  todos.length === copia.length && todos.every((x, i) => x === copia[i]));

// =====================================================================
console.log('\n5. Agrupacion por dia');
// =====================================================================
const secciones = m.groupMovementsByDate(todos);
ok('dos dias', secciones.length === 2, String(secciones.length));
ok('el mas reciente primero', secciones[0].key === '2026-10-11', secciones[0].key);
ok('hoy tiene 3', secciones[0].data.length === 3, String(secciones[0].data.length));
ok('ayer tiene 2', secciones[1].data.length === 2, String(secciones[1].data.length));

// Dentro del dia, lo mas reciente primero.
const mismoDia = m.groupMovementsByDate([
  tx({ occurred_day: '2026-10-11', occurred_at: '2026-10-11T08:00:00', amount: M(1) }),
  tx({ occurred_day: '2026-10-11', occurred_at: '2026-10-11T20:00:00', amount: M(2) }),
]);
ok('dentro del dia, lo ultimo arriba',
  mismoDia[0].data[0].amount === M(2), money(mismoDia[0].data[0].amount));

ok('lista vacia da cero secciones', m.groupMovementsByDate([]).length === 0);

// Sin duplicados.
const ids = secciones.flatMap((s) => s.data.map((x) => x.id));
ok('sin movimientos duplicados', new Set(ids).size === ids.length);
ok('no se pierde ninguno', ids.length === todos.length);

// =====================================================================
console.log('\n6. El resumen no depende del filtro activo');
// =====================================================================
// Al filtrar "Gastos" el resumen debe seguir mostrando los ingresos:
// si no, el balance mentiria. Por eso la pantalla resume sobre TODO el
// periodo y filtra solo la lista.
const resumenFiltrado = m.calculateMovementSummary(m.filterMovements(todos, 'expense'));
ok('filtrar cambiaria los ingresos a cero', resumenFiltrado.income === 0);
ok('por eso la pantalla resume sobre todo el periodo', r.income === M(2_850_000));


// =====================================================================
console.log('\n7. Resumen por cuenta: nunca mezcla cuentas');
// =====================================================================
const NEQUI = 1;
const NU = 2;

const enNequi = tx({ account_id: NEQUI, amount: M(45_000) });
const enNu = tx({ account_id: NU, amount: M(900_000) });
const ingresoNu = tx({ type: 'income', account_id: NU, amount: M(2_850_000) });
const trasladoNequiANu = tx({
  type: 'transfer',
  account_id: NEQUI,
  to_account_id: NU,
  amount: M(500_000),
});

const todasCuentas = [enNequi, enNu, ingresoNu, trasladoNequiANu];

const rNu = m.calculateAccountSummary(todasCuentas, NU);
const rNequi = m.calculateAccountSummary(todasCuentas, NEQUI);

ok('Nu: el gasto de Nequi NO cuenta',
  rNu.expenses === M(900_000) + 0 + M(0) || rNu.expenses === M(900_000),
  money(rNu.expenses));
ok('Nu: ingreso propio 2.850.000 + traslado recibido 500.000',
  rNu.income === M(3_350_000), money(rNu.income));
ok('Nequi: no ve el gasto de Nu',
  rNequi.expenses === M(45_000) + M(500_000), money(rNequi.expenses));
ok('Nequi: no ve el ingreso de Nu', rNequi.income === 0, money(rNequi.income));

// El traslado sale de una y entra en la otra, nunca las dos cosas.
ok('el traslado sale de Nequi', rNequi.expenses >= M(500_000));
ok('el traslado entra a Nu', rNu.income >= M(500_000));

// Una cuenta sin nada da cero.
const vacia = m.calculateAccountSummary(todasCuentas, 99);
ok('cuenta ajena: todo en cero', vacia.income === 0 && vacia.expenses === 0);

// Un aporte a meta desde Nu sale de Nu.
const aporteNu = tx({ type: 'goal_deposit', account_id: NU, amount: M(200_000) });
const conAporte = m.calculateAccountSummary([...todasCuentas, aporteNu], NU);
ok('el aporte a meta sale de la cuenta',
  conAporte.expenses === rNu.expenses + M(200_000), money(conAporte.expenses));

console.log(fallas === 0 ? '\nTodo bien: ninguna falla\n' : `\n${fallas} falla(s)\n`);
process.exitCode = fallas === 0 ? 0 : 1;
