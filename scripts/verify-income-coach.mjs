/**
 * Verifica el plan de las tres bolsas del coach de ingresos.
 *
 *   node scripts/verify-income-coach.mjs
 */
import { readFileSync } from 'fs';

let fallas = 0;
const ok = (nombre, cond, extra = '') => {
  console.log(`  ${cond ? 'OK  ' : 'FALLA'} ${nombre}${cond ? '' : ` -> ${extra}`}`);
  if (!cond) fallas++;
};

const ts = (await import('typescript')).default;

function cargar(ruta) {
  const fuente = readFileSync(ruta, 'utf8').replace(/^import .*$/gm, '');
  const js = ts.transpileModule(fuente, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  return new Function(`const exports = {}; ${js}; return exports;`)();
}

const m = cargar('src/domain/coach/incomePlan.ts');

const PESO = 100;
const M = (p) => p * PESO;
const money = (c) =>
  '$' + Math.round(c / 100).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');

/** Un plan de destinos como el que arma destinations.ts. */
const destinos = (lista) => ({
  total: 0,
  destinations: lista,
  suggestedFree: 0,
  funMoney: 0,
  headline: '',
  detail: '',
  uncovered: [],
});

const d = (key, kind, refId, label, suggested, cap = 0) => ({
  key, kind, refId, label, suggested, cap,
  hint: '', color: '#000', priority: 1,
});

// =====================================================================
console.log('\n1. Porcentajes enteros que SIEMPRE suman 100');
// =====================================================================
const casos = [
  [[M(1_710_000), M(570_000), M(570_000)], M(2_850_000)],
  [[M(1_000_000), M(1_000_000), M(1_000_000)], M(3_000_000)], // el 33,33 clasico
  [[M(1), M(1), M(2_849_998)], M(2_850_000)],
  [[M(2_850_000), 0, 0], M(2_850_000)],
  [[0, 0, 0], 0],
  [[M(333_333), M(333_333), M(333_334)], M(1_000_000)],
];
for (const [montos, total] of casos) {
  const p = m.wholePercentages(montos, total);
  const suma = p.reduce((a, b) => a + b, 0);
  ok(`${montos.map(money).join(' + ')} => ${p.join('/')}`,
    total === 0 ? suma === 0 : suma === 100, `suma ${suma}`);
}

// =====================================================================
console.log('\n2. El caso del storyboard, con datos reales');
// =====================================================================
const ingreso = M(2_850_000);
const plan1 = m.buildIncomePlan({
  income: ingreso,
  plan: destinos([
    d('fixed-1', 'fixed', 1, 'Arriendo', M(1_200_000)),
    d('card-1', 'card', 1, 'Nequi', M(510_000)),
    d('goal-1', 'goal', 1, 'Meta Viaje', M(570_000)),
  ]),
  sourceAccountId: 7,
  sourceAccountName: 'Nu',
});

const b = (k) => plan1.buckets.find((x) => x.key === k);
ok('Compromisos agrupa fijo + tarjeta', b('commitments').amount === M(1_710_000),
  money(b('commitments').amount));
ok('Ahorro toma la meta', b('savings').amount === M(570_000), money(b('savings').amount));
ok('Disponible es el resto', b('available').amount === M(570_000),
  money(b('available').amount));
ok('los porcentajes dan 60/20/20',
  [b('commitments'), b('savings'), b('available')].map((x) => x.percentage).join('/') === '60/20/20',
  [b('commitments'), b('savings'), b('available')].map((x) => x.percentage).join('/'));
ok('las bolsas suman el ingreso exacto',
  plan1.buckets.reduce((a, x) => a + x.amount, 0) === ingreso);
ok('Compromisos guarda los destinos reales', b('commitments').items.length === 2);
ok('Ahorro apunta a la meta', b('savings').destinationName === 'Meta Viaje');
ok('Disponible se queda en la cuenta origen',
  b('available').destinationId === 7 && b('available').destinationName === 'Nu');
ok('todo aplicado, nada pendiente',
  plan1.applied === ingreso && plan1.unassigned === 0,
  `${money(plan1.applied)} / ${money(plan1.unassigned)}`);

// =====================================================================
console.log('\n3. Deseleccionar deja la plata visible, nunca escondida');
// =====================================================================
const sinAhorro = m.toggleBucket(plan1, 'savings');
ok('aplicado baja a 2.280.000', sinAhorro.applied === M(2_280_000),
  money(sinAhorro.applied));
ok('para despues sube a 570.000', sinAhorro.unassigned === M(570_000),
  money(sinAhorro.unassigned));
ok('aplicado + pendiente = ingreso',
  sinAhorro.applied + sinAhorro.unassigned === ingreso);

const nada = m.leaveAllForLater(plan1);
ok('dejar todo para despues: aplicado 0', nada.applied === 0);
ok('dejar todo para despues: pendiente = ingreso', nada.unassigned === ingreso);

const vuelve = m.toggleBucket(sinAhorro, 'savings');
ok('volver a marcar restaura el total', vuelve.applied === ingreso, money(vuelve.applied));

// =====================================================================
console.log('\n4. Validaciones antes de aplicar');
// =====================================================================
ok('sin seleccion no se puede continuar',
  m.validate(nada, M(2_850_000)).some((p) => p.message.includes('al menos una categoria')));
ok('con todo bien no hay problemas',
  m.validate(plan1, M(2_850_000)).length === 0,
  JSON.stringify(m.validate(plan1, M(2_850_000))));

// Saldo insuficiente: sale 1.710.000 de compromisos + 570.000 de ahorro
// = 2.280.000. Disponible NO sale de la cuenta.
ok('avisa si el saldo no alcanza',
  m.validate(plan1, M(2_000_000)).some((p) => p.message.includes('saldo suficiente')));
ok('2.280.000 de saldo SI alcanza',
  !m.validate(plan1, M(2_280_000)).some((p) => p.message.includes('saldo suficiente')),
  'Disponible no deberia contar como salida');

// Ahorro marcado sin meta elegida.
const sinMeta = m.setDestination(plan1, 'savings',
  { type: 'unassigned', id: null, name: null });
ok('exige elegir meta para el ahorro',
  m.validate(sinMeta, M(2_850_000)).some((p) => p.bucket === 'savings'));

// =====================================================================
console.log('\n5. Sin compromisos no se inventa nada');
// =====================================================================
const plan2 = m.buildIncomePlan({
  income: M(1_000_000),
  plan: destinos([]),
  sourceAccountId: 3,
  sourceAccountName: 'Efectivo',
});
const b2 = (k) => plan2.buckets.find((x) => x.key === k);
ok('Compromisos en cero', b2('commitments').amount === 0);
ok('Compromisos sin destinos inventados', b2('commitments').items.length === 0);
ok('Compromisos arranca desmarcado', b2('commitments').selected === false);
ok('Ahorro en cero sin metas', b2('savings').amount === 0);
ok('todo queda disponible', b2('available').amount === M(1_000_000),
  money(b2('available').amount));
ok('Disponible 100%', b2('available').percentage === 100, `${b2('available').percentage}`);

// =====================================================================
console.log('\n6. Cambiar destino conserva montos y seleccion');
// =====================================================================
const otroDestino = m.setDestination(plan1, 'savings',
  { type: 'savings-goal', id: 9, name: 'Meta Computador' });
ok('cambia el nombre del destino',
  otroDestino.buckets.find((x) => x.key === 'savings').destinationName === 'Meta Computador');
ok('no cambia el monto',
  otroDestino.buckets.find((x) => x.key === 'savings').amount === M(570_000));
ok('no cambia el total aplicado', otroDestino.applied === ingreso);

// =====================================================================
console.log('\n7. Los destinos nunca pueden pasarse del ingreso');
// =====================================================================
const excedido = m.buildIncomePlan({
  income: M(100_000),
  plan: destinos([d('fixed-1', 'fixed', 1, 'Arriendo', M(500_000))]),
  sourceAccountId: 1,
  sourceAccountName: 'Nu',
});
ok('Disponible no se vuelve negativo',
  excedido.buckets.find((x) => x.key === 'available').amount === 0,
  money(excedido.buckets.find((x) => x.key === 'available').amount));

// =====================================================================
console.log('\n8. Las metas van antes que las inversiones');
// =====================================================================
const src = readFileSync('src/domain/coach/destinations.ts', 'utf8');
ok("'goal' es un tipo de destino", /DestinationKind = .*'goal'/.test(src));
ok('las metas se cargan de la base', /listGoals\('active'\)/.test(src));
ok('la meta tiene prioridad 4 y la inversion 5',
  src.indexOf('priority: 4,') < src.indexOf('priority: 5,'));
ok('el ahorro se reparte primero a metas',
  src.indexOf("filter((d) => d.kind === 'goal')") <
  src.indexOf("find((d) => d.kind === 'invest')"));

console.log(fallas === 0 ? '\nTodo bien: ninguna falla\n' : `\n${fallas} falla(s)\n`);
process.exitCode = fallas === 0 ? 0 : 1;
