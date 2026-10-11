/**
 * Verifica que las recomendaciones nunca pidan mas de lo que falta.
 *
 *   node scripts/verify-small-goals.mjs
 */
import { readFileSync } from 'fs';

let fallas = 0;
const ok = (n, c, e = '') => {
  console.log(`  ${c ? 'OK  ' : 'FALLA'} ${n}${c ? '' : ` -> ${e}`}`);
  if (!c) fallas++;
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

const plan = cargar('src/domain/savings/plan.ts');
const m = cargar('src/domain/savings/options.ts', {
  FREQUENCY_LABEL: plan.FREQUENCY_LABEL,
});

const PESO = 100;
const M = (p) => p * PESO;

// Alguien con buena capacidad: sin tope, propondria cientos de miles.
const holgado = {
  monthlyIncome: M(3_000_000),
  monthlyFixed: M(1_200_000),
  monthlyDebt: M(300_000),
  basicNeeds: M(800_000),
  avgDailyExpense: M(30_000),
  balance: M(500_000),
};

const build = (remaining, targetDate = null, freq = 'biweekly') =>
  m.buildOptions({ remaining, targetDate, frequency: freq, capacity: holgado });

// =====================================================================
console.log('\n1. Meta de $3: ningun aporte puede pasarse');
// =====================================================================
const tres = build(M(3));
ok('margen holgado existe', build(M(9_000_000)).safePerPeriod > 0);
ok('ningun aporte supera los $3',
  tres.options.every((o) => o.amount <= M(3)),
  tres.options.map((o) => money(o.amount)).join(', '));
ok('se colapsa en UNA sola opcion', tres.options.length === 1,
  String(tres.options.length));
ok('esa opcion pide exactamente los $3', tres.options[0].amount === M(3),
  money(tres.options[0].amount));
ok('se cumple en un solo aporte', tres.options[0].periods === 1,
  String(tres.options[0].periods));
ok('el texto lo dice sin rodeos',
  tres.options[0].reason.includes('un solo aporte'), tres.options[0].reason);
ok('la destacada existe en la lista',
  tres.options.some((o) => o.kind === tres.highlight), tres.highlight);

// =====================================================================
console.log('\n2. Meta ya alcanzada: no se pide nada');
// =====================================================================
for (const r of [0, -M(500), -M(1_000_000)]) {
  const x = build(r);
  ok(`restante ${money(r)}: sin opciones`, x.options.length === 0,
    String(x.options.length));
}

// =====================================================================
console.log('\n3. Meta parcialmente cumplida');
// =====================================================================
// Meta 1.000.000, ya tiene 950.000 => faltan 50.000.
const parcial = build(M(50_000));
ok('ningun aporte supera los 50.000',
  parcial.options.every((o) => o.amount <= M(50_000)),
  parcial.options.map((o) => money(o.amount)).join(', '));
ok('ninguna duracion es cero o negativa',
  parcial.options.every((o) => o.periods === null || o.periods >= 1));
ok('ningun aporte en cero', parcial.options.every((o) => o.amount > 0));

// =====================================================================
console.log('\n4. Una meta grande sigue dando cuatro caminos');
// =====================================================================
const grande = build(M(9_000_000), null, 'biweekly');
ok('tres opciones de capacidad', grande.options.length === 3,
  String(grande.options.length));
ok('montos distintos entre si',
  new Set(grande.options.map((o) => o.amount)).size === 3,
  grande.options.map((o) => money(o.amount)).join(', '));
ok('ninguno supera lo que falta',
  grande.options.every((o) => o.amount <= M(9_000_000)));

// Con fecha, aparece la cuarta.
const conFecha = build(M(9_000_000), '2027-12-31');
ok('con fecha hay cuatro', conFecha.options.length === 4,
  String(conFecha.options.length));
ok('la de fecha tampoco se pasa',
  conFecha.options.find((o) => o.kind === 'target').amount <= M(9_000_000));

// =====================================================================
console.log('\n5. Meta chica CON fecha elegida');
// =====================================================================
const chicaFecha = build(M(3), '2027-12-31');
ok('tampoco se pasa de $3',
  chicaFecha.options.every((o) => o.amount <= M(3)),
  chicaFecha.options.map((o) => money(o.amount)).join(', '));
ok('sigue siendo una sola', chicaFecha.options.length === 1,
  String(chicaFecha.options.length));

// =====================================================================
console.log('\n6. Sin margen y meta chica a la vez');
// =====================================================================
const ahogado = {
  monthlyIncome: M(1_000_000),
  monthlyFixed: M(900_000),
  monthlyDebt: M(200_000),
  basicNeeds: M(500_000),
  avgDailyExpense: M(20_000),
  balance: 0,
};
const sinMargenChica = m.buildOptions({
  remaining: M(3),
  targetDate: null,
  frequency: 'biweekly',
  capacity: ahogado,
});
ok('sin margen, tampoco pide mas de $3',
  sinMargenChica.options.every((o) => o.amount <= M(3)),
  sinMargenChica.options.map((o) => money(o.amount)).join(', '));
ok('y sigue habiendo algo que elegir', sinMargenChica.options.length >= 1);

console.log(fallas === 0 ? '\nTodo bien: ninguna falla\n' : `\n${fallas} falla(s)\n`);
process.exitCode = fallas === 0 ? 0 : 1;
