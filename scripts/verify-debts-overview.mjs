/**
 * Verifica el resumen de la pantalla de Deudas.
 *
 *   node scripts/verify-debts-overview.mjs
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

const amort = cargar('src/domain/debt/amortization.ts');
const m = cargar('src/domain/debt/overview.ts', {
  monthsToPayoff: amort.monthsToPayoff,
  installmentAmount: amort.installmentAmount,
});

const PESO = 100;
const M = (p) => p * PESO;

const deuda = (o) => ({
  id: 1,
  name: 'Préstamo Nu',
  outstanding: M(1_000_000),
  monthly_rate_bp: 200,
  installment_amount: M(164_101),
  installments_total: 12,
  principal: M(1_000_000),
  kind: 'loan',
  ...o,
});

const tarjeta = (o) => ({
  id: 1,
  name: 'NuCredito',
  color: '#6C19D8',
  used: M(254_284),
  available: M(5_716),
  credit_limit: M(260_000),
  card_rate_bp: 250,
  monthly_installments: M(50_000),
  ...o,
});

const build = (o) =>
  m.buildDebtOverview({
    debts: o.debts ?? [],
    cards: o.cards ?? [],
    commitments: o.commitments ?? [],
    cardDueDays: o.cardDueDays ?? {},
  });

// =====================================================================
console.log('\n1. La tarjeta cuenta dentro de la deuda total');
// =====================================================================
const conAmbas = build({
  debts: [deuda({ outstanding: M(6_105_112) })],
  cards: [tarjeta()],
});
ok('total = deuda + tarjeta', conAmbas.total === M(6_359_396), money(conAmbas.total));
ok('carga mensual = cuota + cuota de tarjeta',
  conAmbas.monthlyCharge === M(214_101), money(conAmbas.monthlyCharge));

const soloDeuda = build({ debts: [deuda()] });
ok('sin tarjetas el total es solo la deuda',
  soloDeuda.total === M(1_000_000), money(soloDeuda.total));

// =====================================================================
console.log('\n2. "Libre en" tiene en cuenta los intereses');
// =====================================================================
// 1.000.000 al 3% mensual pagando 100.000. La division simple diria 10
// meses; los intereses lo alargan de verdad.
const simple = Math.ceil(M(1_000_000) / M(100_000));
const conInteres = build({
  debts: [
    deuda({
      outstanding: M(1_000_000),
      monthly_rate_bp: 300,
      installment_amount: M(100_000),
    }),
  ],
}).monthsToFreedom;
ok('los intereses alargan el plazo', conInteres > simple,
  `simple ${simple}, real ${conInteres}`);
ok('coincide con monthsToPayoff',
  conInteres === amort.monthsToPayoff(M(1_000_000), 300, M(100_000)),
  String(conInteres));

// Manda la que mas tarda.
const dos = build({
  debts: [
    deuda({ id: 1, outstanding: M(100_000), installment_amount: M(50_000), monthly_rate_bp: 0 }),
    deuda({ id: 2, outstanding: M(900_000), installment_amount: M(50_000), monthly_rate_bp: 0 }),
  ],
});
ok('manda la deuda mas lenta', dos.monthsToFreedom === 18, String(dos.monthsToFreedom));

// Cuota que no cubre ni el interes: no se inventa una fecha.
const nunca = build({
  debts: [deuda({ outstanding: M(1_000_000), monthly_rate_bp: 300, installment_amount: M(1_000) })],
});
ok('cuota insuficiente => null', nunca.monthsToFreedom === null,
  String(nunca.monthsToFreedom));

// Tarjeta sin cuota mensual: tampoco se proyecta.
const sinCuota = build({ cards: [tarjeta({ monthly_installments: 0 })] });
ok('tarjeta sin cuota => null', sinCuota.monthsToFreedom === null,
  String(sinCuota.monthsToFreedom));

// =====================================================================
console.log('\n3. Vencimientos ordenados, lo mas urgente primero');
// =====================================================================
const venc = build({
  debts: [deuda({ id: 1 }), deuda({ id: 2, name: 'Deuda', kind: 'other' })],
  cards: [tarjeta()],
  commitments: [
    { debtId: 2, name: 'Deuda', amount: M(537_500), daysLeft: 19 },
    { debtId: 1, name: 'Préstamo Nu', amount: M(164_101), daysLeft: 4 },
  ],
  cardDueDays: { 1: 4 },
});
ok('el primero es el mas proximo', venc.upcoming[0].dueInDays === 4,
  String(venc.upcoming[0].dueInDays));
ok('a igual dia, primero el mas caro',
  venc.upcoming[0].amount >= venc.upcoming[1].amount,
  `${money(venc.upcoming[0].amount)} vs ${money(venc.upcoming[1].amount)}`);
ok('el ultimo es el mas lejano',
  venc.upcoming[venc.upcoming.length - 1].dueInDays === 19);
ok('la tarjeta aparece como vencimiento',
  venc.upcoming.some((u) => u.kind === 'credit-card'));
ok('el prestamo se marca como loan',
  venc.upcoming.find((u) => u.refId === 1 && u.kind === 'loan') !== undefined);

// =====================================================================
console.log('\n4. Texto de la proxima prioridad');
// =====================================================================
const texto = m.priorityText(venc);
ok('nombra el pago', texto.includes('Préstamo Nu') || texto.includes('NuCredito'), texto);
ok('dice el plazo', texto.includes('en 4 días'), texto);
ok('es sugerencia, no orden', texto.includes('Te sugerimos'), texto);
ok('no promete ahorro', !/ahorrar|ahorras/i.test(texto), texto);

const vacio = build({});
ok('sin datos no inventa un orden',
  m.priorityText(vacio) === 'Agrega tus fechas y tasas para crear un orden personalizado.',
  m.priorityText(vacio));
ok('sin deudas marca isEmpty', vacio.isEmpty === true);
ok('sin deudas el total es 0', vacio.total === 0);

// =====================================================================
console.log('\n5. Uso del cupo de la tarjeta');
// =====================================================================
const t1 = build({ cards: [tarjeta()] }).cards[0];
ok('97% usado', t1.usagePercent === 98 || t1.usagePercent === 97, String(t1.usagePercent));
ok('debes = used', t1.amountOwed === M(254_284));
ok('cupo libre = available', t1.availableCredit === M(5_716));

const sinCupo = build({ cards: [tarjeta({ credit_limit: null })] }).cards[0];
ok('sin cupo registrado => null (no se inventa)', sinCupo.usagePercent === null,
  String(sinCupo.usagePercent));

const negativo = build({ cards: [tarjeta({ available: -M(50_000) })] }).cards[0];
ok('cupo libre nunca negativo', negativo.availableCredit === 0,
  money(negativo.availableCredit));

const pasado = build({
  cards: [tarjeta({ used: M(500_000), credit_limit: M(260_000) })],
}).cards[0];
ok('uso no pasa de 100', pasado.usagePercent === 100, String(pasado.usagePercent));

// Una tarjeta sin saldo no aparece.
const pagada = build({ cards: [tarjeta({ used: 0 })] });
ok('tarjeta en cero no se lista', pagada.cards.length === 0);
ok('tarjeta en cero no suma al total', pagada.total === 0);

// =====================================================================
console.log('\n6. Deudas pagadas no aparecen');
// =====================================================================
const conPagada = build({
  debts: [deuda({ id: 1 }), deuda({ id: 2, name: 'Vieja', outstanding: 0 })],
});
ok('la pagada no suma', conPagada.total === M(1_000_000), money(conPagada.total));
ok('la pagada no cobra cuota', conPagada.monthlyCharge === M(164_101),
  money(conPagada.monthlyCharge));

// =====================================================================
console.log('\n7. Textos de plazo y estrategia');
// =====================================================================
ok('hoy', m.plazoTexto(0) === 'hoy', m.plazoTexto(0));
ok('mañana', m.plazoTexto(1) === 'mañana', m.plazoTexto(1));
ok('en 4 días', m.plazoTexto(4) === 'en 4 días', m.plazoTexto(4));
ok('vencido', m.plazoTexto(-2) === 'vencido', m.plazoTexto(-2));

ok('texto de avalancha',
  m.STRATEGY_HELP.avalanche === 'Primero la de tasa más alta: pagas menos intereses en total.',
  m.STRATEGY_HELP.avalanche);
ok('texto de bola de nieve',
  m.STRATEGY_HELP.snowball === 'Primero la deuda más pequeña: ganas motivación más rápido.',
  m.STRATEGY_HELP.snowball);

// =====================================================================
console.log('\n8. La cuota nunca pasa del saldo');
// =====================================================================
const casi = build({
  debts: [deuda({ outstanding: M(10_000), installment_amount: M(164_101) })],
});
ok('cobra solo lo que falta', casi.monthlyCharge === M(10_000),
  money(casi.monthlyCharge));

// Sin installment_amount se calcula de principal, tasa y plazo.
const calculada = m.cuotaDe({
  id: 1, name: 'x', outstanding: M(1_200_000), monthly_rate_bp: 0,
  installment_amount: null, installments_total: 12, principal: M(1_200_000), kind: 'other',
});
ok('cuota calculada sin tasa = principal/12', calculada === M(100_000),
  money(calculada));

console.log(fallas === 0 ? '\nTodo bien: ninguna falla\n' : `\n${fallas} falla(s)\n`);
process.exitCode = fallas === 0 ? 0 : 1;
