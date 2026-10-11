/**
 * Verifica los rangos de analisis y los ciclos de quincena.
 *
 *   node scripts/verify-periods.mjs
 */
const ok = (nombre, real, esperado) => {
  const bien = String(real) === String(esperado);
  console.log(
    `  ${bien ? 'OK  ' : 'FALLA'} ${nombre}: ${real}${bien ? '' : ` (esperaba ${esperado})`}`,
  );
  if (!bien) process.exitCode = 1;
};

// --- Copia exacta de la logica de src/domain/period/cycles.ts --------
const pad = (n) => String(n).padStart(2, '0');
const dayKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const d = (y, m, day) => new Date(y, m, day);
const lastDayOf = (y, m) => new Date(y, m + 1, 0).getDate();

function range(key, label, from, to) {
  const f = dayKey(from);
  const t = dayKey(to);
  const days =
    Math.round(
      (new Date(t + 'T00:00:00').getTime() - new Date(f + 'T00:00:00').getTime()) / 86400000,
    ) + 1;
  return { key, label, from: f, to: t, days };
}

function standardRanges(ref) {
  const y = ref.getFullYear();
  const m = ref.getMonth();
  const hoy = ref.getDate();
  const mesPasado = new Date(y, m - 1, 1);
  const myp = mesPasado.getFullYear();
  const mmp = mesPasado.getMonth();
  return [
    range('today', 'Hoy', ref, ref),
    range('week', '7 dias', new Date(y, m, hoy - 6), ref),
    range('fortnight', '15 dias', new Date(y, m, hoy - 14), ref),
    range('month', 'Este mes', d(y, m, 1), d(y, m, lastDayOf(y, m))),
    range('lastMonth', 'Mes pasado', d(myp, mmp, 1), d(myp, mmp, lastDayOf(myp, mmp))),
    range('90', '3 meses', new Date(y, m, hoy - 89), ref),
  ];
}

function payCycles(incomes, ref) {
  const base = incomes.find((i) => i.is_reliable === 1 && i.frequency !== 'variable');
  if (!base) return [];
  const dias = [base.pay_day, base.pay_day_2]
    .filter((x) => typeof x === 'number' && x > 0)
    .sort((a, b) => a - b);
  if (!dias.length) return [];

  const cortes = [];
  for (let offset = -2; offset <= 1; offset++) {
    const base2 = new Date(ref.getFullYear(), ref.getMonth() + offset, 1);
    const yy = base2.getFullYear();
    const mm = base2.getMonth();
    for (const dia of dias) cortes.push(d(yy, mm, Math.min(dia, lastDayOf(yy, mm))));
  }
  cortes.sort((a, b) => a.getTime() - b.getTime());
  const hoySinHora = d(ref.getFullYear(), ref.getMonth(), ref.getDate());

  let idxActual = -1;
  for (let i = 0; i < cortes.length; i++) {
    if (cortes[i].getTime() <= hoySinHora.getTime()) idxActual = i;
  }
  if (idxActual < 0) return [];

  const construir = (i, etiqueta) => {
    const inicio = cortes[i];
    const siguiente = cortes[i + 1];
    if (!inicio) return null;
    const fin = siguiente ? new Date(siguiente.getTime() - 86400000) : hoySinHora;
    const finReal =
      fin.getTime() > hoySinHora.getTime() && i === idxActual ? hoySinHora : fin;
    return range(`cycle-${i}`, etiqueta, inicio, finReal);
  };

  const out = [];
  const actual = construir(idxActual, dias.length > 1 ? 'Esta quincena' : 'Este ciclo');
  const anterior = construir(idxActual - 1, dias.length > 1 ? 'Quincena pasada' : 'Ciclo pasado');
  if (actual) out.push(actual);
  if (anterior) out.push(anterior);
  return out;
}

function previousRange(r) {
  const desde = new Date(r.from + 'T00:00:00');
  const hasta = new Date(desde.getTime() - 86400000);
  const inicio = new Date(hasta.getTime() - (r.days - 1) * 86400000);
  return range(`${r.key}-prev`, 'anterior', inicio, hasta);
}

// --- Pruebas ---------------------------------------------------------
console.log('\nRANGOS ESTANDAR (simulando el 20 de noviembre de 2026)\n');
const ref = new Date(2026, 10, 20); // 20 nov 2026
const std = standardRanges(ref);
const get = (k) => std.find((r) => r.key === k);

ok('Hoy es 1 dia', get('today').days, 1);
ok('Hoy = 2026-11-20', get('today').from, '2026-11-20');
ok('7 dias empieza el 14', get('week').from, '2026-11-14');
ok('7 dias son 7', get('week').days, 7);
ok('15 dias empieza el 6', get('fortnight').from, '2026-11-06');
ok('Este mes: 1 al 30', `${get('month').from}..${get('month').to}`, '2026-11-01..2026-11-30');
ok('Mes pasado: octubre completo', `${get('lastMonth').from}..${get('lastMonth').to}`, '2026-10-01..2026-10-31');
ok('Mes pasado son 31 dias', get('lastMonth').days, 31);

console.log('\nCICLOS DE QUINCENA (le pagan el 15 y el 30)\n');
const ingresoQuincenal = [
  { is_reliable: 1, frequency: 'biweekly', pay_day: 15, pay_day_2: 30 },
];

// Hoy 20 nov: el ciclo actual empezo el 15 y va hasta hoy.
const c20 = payCycles(ingresoQuincenal, new Date(2026, 10, 20));
ok('quincena actual empieza el 15', c20[0].from, '2026-11-15');
ok('quincena actual termina hoy', c20[0].to, '2026-11-20');
ok('quincena pasada: 30 oct al 14 nov', `${c20[1].from}..${c20[1].to}`, '2026-10-30..2026-11-14');

// Hoy 5 nov: el ciclo actual empezo el 30 de octubre.
const c05 = payCycles(ingresoQuincenal, new Date(2026, 10, 5));
ok('el 5 nov la quincena viene del 30 oct', c05[0].from, '2026-10-30');
ok('y termina hoy', c05[0].to, '2026-11-05');
ok('la pasada fue 15 al 29 de octubre', `${c05[1].from}..${c05[1].to}`, '2026-10-15..2026-10-29');

console.log('\nCICLO MENSUAL (le pagan solo el 30)\n');
const ingresoMensual = [{ is_reliable: 1, frequency: 'monthly', pay_day: 30, pay_day_2: null }];
const cm = payCycles(ingresoMensual, new Date(2026, 10, 20));
ok('el 20 nov el ciclo viene del 30 oct', cm[0].from, '2026-10-30');
ok('ciclo pasado empezo el 30 sep', cm[1].from, '2026-09-30');

console.log('\nINGRESO VARIABLE no genera ciclos\n');
ok(
  'freelance variable: sin ciclos',
  payCycles([{ is_reliable: 1, frequency: 'variable', pay_day: 1 }], ref).length,
  0,
);

console.log('\nPERIODO ANTERIOR PARA COMPARAR\n');
const mes = get('month');
const prevMes = previousRange(mes);
ok('el anterior termina justo antes', prevMes.to, '2026-10-31');
ok('y dura lo mismo (30 dias)', prevMes.days, 30);
ok('empieza el 2 de octubre', prevMes.from, '2026-10-02');

const semana = get('week');
const prevSemana = previousRange(semana);
ok('semana anterior: 7 al 13', `${prevSemana.from}..${prevSemana.to}`, '2026-11-07..2026-11-13');

console.log(process.exitCode ? '\nHAY FALLAS\n' : '\nPeriodos y ciclos verificados\n');
