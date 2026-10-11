/**
 * Verifica el semaforo del coach de gastos.
 *
 *   node scripts/verify-expense-coach.mjs
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

function cargar(ruta, deps = {}) {
  const fuente = readFileSync(ruta, 'utf8').replace(/^import .*$/gm, '');
  const js = ts.transpileModule(fuente, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const n = ['money', ...Object.keys(deps)];
  const v = [money, ...Object.values(deps)];
  return new Function(...n, `const exports = {}; ${js}; return exports;`)(...v);
}

const m = cargar('src/domain/coach/expenseCoach.ts');

const PESO = 100;
const M = (p) => p * PESO;

/** Contexto base: sin compromisos y con plata de sobra. */
const ctxBase = (over = {}) => ({
  accounts: [],
  totalBalance: M(1_000_000),
  debts: [],
  commitments: [],
  committedTotal: 0,
  fixedPending: [],
  fixedPendingTotal: 0,
  fixedMonthlyTotal: 0,
  trimmable: [],
  availableReal: M(1_000_000),
  investments: [],
  nextIncome: null,
  topGoal: null,
  overdueDebtIds: [],
  avgDailyExpense: M(30_000),
  spentToday: 0,
  emergencyBuffer: 0,
  rules: {},
  ...over,
});

const cat = (budget, name = 'Comida') => ({
  id: 1,
  name,
  kind: 'expense',
  emoji: '*',
  color: '#000',
  monthly_budget: budget,
  is_essential: 0,
  archived: 0,
  sort_order: 0,
});

const evaluar = (o) =>
  m.evaluateExpenseForCoach({
    amount: o.amount,
    category: o.category ?? null,
    categorySpentThisMonth: o.spent ?? 0,
    accountName: 'Nequi',
    accountBalance: o.balance ?? M(1_000_000),
    ctx: o.ctx ?? ctxBase(),
  });

// =====================================================================
console.log('\n1. Manejable: el gasto cabe de sobra');
// =====================================================================
// Mercado de 45.000 con presupuesto de comida de 549.000.
const manejable = evaluar({
  amount: M(45_000),
  category: cat(M(549_000)),
  spent: 0,
});
ok('nivel manageable', manejable.level === 'manageable', manejable.level);
ok('titulo exacto', manejable.title === 'Sí, es manejable', manejable.title);
ok('badge dentro de presupuesto',
  manejable.badge === 'Dentro de tu presupuesto', manejable.badge);
ok('8% usado', manejable.usedPercent === 8, String(manejable.usedPercent));
ok('tres filas', manejable.rows.length === 3, String(manejable.rows.length));
ok('fila "Gastos registrados" = 45.000',
  manejable.rows[0].label === 'Gastos registrados' && manejable.rows[0].amount === M(45_000));
ok('fila presupuesto nombra la categoria',
  manejable.rows[1].label === 'Presupuesto de comida', manejable.rows[1].label);
ok('fila "Te quedarian" = 504.000',
  manejable.rows[2].label === 'Te quedarían' && manejable.rows[2].amount === M(504_000),
  money(manejable.rows[2].amount));
ok('consejo del coach',
  manejable.tipTitle === 'Puedes hacerlo sin desordenar tu plan.');
ok('primario Confirmar gasto', manejable.primaryAction === 'Confirmar gasto');
ok('secundario Cambiar gasto', manejable.secondaryAction === 'Cambiar gasto');
ok('sin confirmacion extra', manejable.needsExtraConfirm === false);

// =====================================================================
console.log('\n2. Atencion: cabe, pero aprieta');
// =====================================================================
// Domicilio de 180.000 con presupuesto de 215.000 => 84% usado.
const atencion = evaluar({
  amount: M(180_000),
  category: cat(M(215_000)),
  spent: 0,
});
ok('nivel attention', atencion.level === 'attention', atencion.level);
ok('titulo exacto', atencion.title === 'Ojo, te puede apretar', atencion.title);
ok('badge cerca del limite', atencion.badge === 'Cerca del límite', atencion.badge);
ok('84% usado', atencion.usedPercent === 84, String(atencion.usedPercent));
ok('te quedarian 35.000', atencion.rows[2].amount === M(35_000),
  money(atencion.rows[2].amount));
ok('la fila sobrante se marca en rojo', atencion.rows[2].emphasis === 'bad');
ok('primario Revisar gasto', atencion.primaryAction === 'Revisar gasto');
ok('secundario Confirmar de todas formas',
  atencion.secondaryAction === 'Confirmar de todas formas');
ok('sin confirmacion extra', atencion.needsExtraConfirm === false);

// El umbral: 79% sigue siendo manejable, 80% ya es atencion.
const just79 = evaluar({ amount: M(79_000), category: cat(M(100_000)) });
const just80 = evaluar({ amount: M(80_000), category: cat(M(100_000)) });
ok('79% es manejable', just79.level === 'manageable', just79.level);
ok('80% ya es atencion', just80.level === 'attention', just80.level);

// =====================================================================
console.log('\n3. Riesgo: deja sin cubrir un compromiso');
// =====================================================================
const ctxRiesgo = ctxBase({
  availableReal: M(163_899),
  commitments: [
    { debtId: 1, name: 'Préstamo Nu', amount: M(701_601), daysLeft: 4 },
  ],
  committedTotal: M(701_601),
});
const riesgo = evaluar({
  amount: M(450_000),
  category: cat(0, 'Tecnología'),
  ctx: ctxRiesgo,
});
ok('nivel risk', riesgo.level === 'risk', riesgo.level);
ok('titulo exacto', riesgo.title === 'Mejor espera', riesgo.title);
ok('nombra el compromiso', riesgo.message.includes('Préstamo Nu'), riesgo.message);
ok('dice en cuantos dias', riesgo.message.includes('en 4 días'), riesgo.message);
ok('faltante = 286.101', riesgo.shortfall === M(286_101), money(riesgo.shortfall));
ok('el faltante aparece en el mensaje',
  riesgo.message.includes('286.101'), riesgo.message);
ok('seccion "Antes de confirmar"',
  riesgo.sectionTitle === 'Antes de confirmar', riesgo.sectionTitle);
ok('fila "Gasto nuevo" = 450.000', riesgo.rows[0].amount === M(450_000));
ok('fila "Compromisos proximos" = 701.601', riesgo.rows[1].amount === M(701_601));
ok('fila "Diferencia faltante" negativa', riesgo.rows[2].amount === -M(286_101),
  money(riesgo.rows[2].amount));
ok('badge de compromisos',
  riesgo.badge === 'Puede afectar tus compromisos', riesgo.badge);
ok('primario Cambiar gasto', riesgo.primaryAction === 'Cambiar gasto');
ok('secundario Confirmar de todas formas',
  riesgo.secondaryAction === 'Confirmar de todas formas');
ok('EXIGE confirmacion extra', riesgo.needsExtraConfirm === true);
ok('consejo sin culpa', riesgo.tipTitle === 'No es un no para siempre.');

// Riesgo sin compromiso con nombre: el mensaje no debe decir "undefined".
const riesgoSolo = evaluar({
  amount: M(500_000),
  ctx: ctxBase({ availableReal: M(100_000) }),
});
ok('riesgo sin compromiso nombrado', riesgoSolo.level === 'risk');
ok('no dice undefined', !/undefined/.test(riesgoSolo.message), riesgoSolo.message);

// Un gasto fijo pendiente tambien cuenta como compromiso.
const conFijo = evaluar({
  amount: M(500_000),
  ctx: ctxBase({
    availableReal: M(100_000),
    fixedPending: [{ id: 1, name: 'Arriendo', amount: M(800_000), dueDay: 5 }],
    fixedPendingTotal: M(800_000),
  }),
});
ok('el gasto fijo cuenta como compromiso',
  conFijo.message.includes('Arriendo'), conFijo.message);

// =====================================================================
console.log('\n4. El coach NUNCA bloquea');
// =====================================================================
for (const e of [manejable, atencion, riesgo, riesgoSolo]) {
  ok(`[${e.level}] siempre se puede confirmar`,
    e.primaryAction.startsWith('Confirmar') ||
    e.secondaryAction.startsWith('Confirmar'));
}
const textos = [manejable, atencion, riesgo]
  .map((e) => `${e.title} ${e.message} ${e.tipTitle} ${e.tipBody}`)
  .join(' ')
  .toLowerCase();
for (const palabra of ['no puedes', 'mala decision', 'mala decisión', 'gastando mal', 'error']) {
  ok(`sin la palabra "${palabra}"`, !textos.includes(palabra));
}

// =====================================================================
console.log('\n5. Sin presupuesto no se inventa uno');
// =====================================================================
const sinPresupuesto = evaluar({
  amount: M(50_000),
  category: cat(null),
  ctx: ctxBase({ availableReal: M(900_000) }),
});
ok('sigue siendo manejable', sinPresupuesto.level === 'manageable',
  sinPresupuesto.level);
ok('no habla de presupuesto',
  !sinPresupuesto.rows.some((r) => r.label.startsWith('Presupuesto')),
  JSON.stringify(sinPresupuesto.rows.map((r) => r.label)));
ok('badge honesto', sinPresupuesto.badge === 'Te queda margen', sinPresupuesto.badge);

// Margen delgado sin presupuesto => atencion.
const margenFino = evaluar({
  amount: M(50_000),
  category: cat(null),
  ctx: ctxBase({ availableReal: M(70_000) }),
});
ok('margen delgado da atencion', margenFino.level === 'attention', margenFino.level);

// =====================================================================
console.log('\n6. Sin datos suficientes: estado honesto');
// =====================================================================
const sinDatos = evaluar({
  amount: M(50_000),
  category: cat(null),
  ctx: ctxBase({ totalBalance: 0, availableReal: 0 }),
});
ok('nivel unknown', sinDatos.level === 'unknown', sinDatos.level);
ok('titulo honesto',
  sinDatos.title === 'Aún estamos conociendo este gasto', sinDatos.title);
ok('ofrece agregar presupuesto',
  sinDatos.secondaryAction === 'Agregar presupuesto', sinDatos.secondaryAction);
ok('deja confirmar igual', sinDatos.primaryAction === 'Confirmar gasto');
ok('no inventa riesgo', sinDatos.needsExtraConfirm === false);

// =====================================================================
console.log('\n7. La barra nunca se desborda');
// =====================================================================
const casos = [
  evaluar({ amount: M(10_000_000), category: cat(M(100_000)) }),
  evaluar({ amount: M(1), category: cat(M(1_000_000)) }),
  evaluar({ amount: M(450_000), ctx: ctxRiesgo }),
  manejable,
  atencion,
];
for (const e of casos) {
  ok(`[${e.level}] barra entre 0 y 100`,
    e.usedPercent >= 0 && e.usedPercent <= 100, String(e.usedPercent));
  ok(`[${e.level}] la barra dice que mide`, e.barLabel.length > 0);
}

// =====================================================================
console.log('\n8. Animo inicial segun el semaforo');
// =====================================================================
ok('manejable arranca en 🙂', m.defaultMood('manageable') === 'good');
ok('atencion arranca en 😐', m.defaultMood('attention') === 'neutral');
ok('riesgo arranca en 😟', m.defaultMood('risk') === 'worried');

console.log(fallas === 0 ? '\nTodo bien: ninguna falla\n' : `\n${fallas} falla(s)\n`);
process.exitCode = fallas === 0 ? 0 : 1;
