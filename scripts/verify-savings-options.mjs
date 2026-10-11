/**
 * Verifica las cuatro opciones de plan de ahorro con un caso real.
 *
 *   node scripts/verify-savings-options.mjs
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

/**
 * Ejecuta un modulo del proyecto en aislamiento.
 *
 * Cada uno va en su propia funcion con su propio `exports`: si se
 * concatenaran, constantes con el mismo nombre en dos modulos (como
 * PERIODS_PER_MONTH) chocarian. Lo que un modulo importa de otro se
 * inyecta como parametro.
 */
function cargar(ruta, deps = {}) {
  const fuente = readFileSync(ruta, 'utf8').replace(/^import .*$/gm, '');
  const js = ts.transpileModule(fuente, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;

  const nombres = ['money', ...Object.keys(deps)];
  const valores = [money, ...Object.values(deps)];
  return new Function(
    ...nombres,
    `const exports = {}; ${js}; return exports;`,
  )(...valores);
}

const plan = cargar('src/domain/savings/plan.ts');
const mod = cargar('src/domain/savings/options.ts', {
  FREQUENCY_LABEL: plan.FREQUENCY_LABEL,
});

// --- Caso: meta de $9.000.000 ---------------------------------------
// Salario 3.000.000; arriendo+servicios 1.200.000; cuota de deuda
// 300.000; necesidades basicas 800.000  =>  sobran 700.000 al mes.
const capacidad = {
  monthlyIncome: 300000000,
  monthlyFixed: 120000000,
  monthlyDebt: 30000000,
  basicNeeds: 80000000,
  avgDailyExpense: 3000000,
  balance: 50000000,
};

console.log('\nCAPACIDAD REAL DE AHORRO\n');
const cap = mod.safeMonthlyCapacity(capacidad);
ok('sobran $700.000 al mes', cap.safeMonthly === 70000000, money(cap.safeMonthly));
ok('no marca datos faltantes', cap.missing.length === 0, cap.missing.join(','));
ok('no es estimacion (declaro lo basico)', cap.isEstimate === false);

console.log('\nMETA DE $9.000.000, SIN FECHA, APORTE QUINCENAL\n');
const sinFecha = mod.buildOptions({
  remaining: 900000000,
  targetDate: null,
  frequency: 'biweekly',
  capacity: capacidad,
});

ok('maximo seguro por quincena: $350.000', sinFecha.safePerPeriod === 35000000, money(sinFecha.safePerPeriod));
ok('genera 3 opciones (sin fecha no hay cuarta)', sinFecha.options.length === 3);
ok('destaca la recomendada', sinFecha.highlight === 'recommended');

for (const o of sinFecha.options) {
  const meses = o.periods ? Math.round(o.periods / 2) : 0;
  console.log(
    `    ${o.title.padEnd(12)} ${money(o.amount).padStart(10)}/quincena · ` +
      `${String(o.periods).padStart(3)} quincenas (~${meses} meses) · ` +
      `queda libre ${money(o.leftAfter)}`,
  );
}

const rec = sinFecha.options.find((o) => o.kind === 'recommended');
const ace = sinFecha.options.find((o) => o.kind === 'intermediate');
const tra = sinFecha.options.find((o) => o.kind === 'flexible');

ok('la acelerada aporta mas que la recomendada', ace.amount > rec.amount);
ok('la tranquila aporta menos que la recomendada', tra.amount < rec.amount);
ok('la acelerada llega antes', ace.periods < rec.periods);
ok('la tranquila tarda mas', tra.periods > rec.periods);
ok('las tres caben en la capacidad', [rec, ace, tra].every((o) => o.feasible));
ok(
  'ninguna consume mas de lo que sobra',
  [rec, ace, tra].every((o) => o.amount <= sinFecha.safePerPeriod),
);
ok(
  'la recomendada deja margen de verdad',
  rec.leftAfter > 0 && rec.leftAfter >= tra.leftAfter * 0.3,
  money(rec.leftAfter),
);
ok(
  'el total aportado cubre la meta',
  rec.amount * rec.periods >= 900000000,
  money(rec.amount * rec.periods),
);

console.log('\nCON FECHA VIABLE (18 meses)\n');
const en18meses = new Date();
en18meses.setMonth(en18meses.getMonth() + 18);
const fechaOk = en18meses.toISOString().slice(0, 10);

const viable = mod.buildOptions({
  remaining: 900000000,
  targetDate: fechaOk,
  frequency: 'biweekly',
  capacity: capacidad,
});
const optFechaOk = viable.options.find((o) => o.kind === 'target');
ok('genera las 4 opciones', viable.options.length === 4);
ok('la opcion de fecha es viable', optFechaOk.feasible === true, money(optFechaOk.amount));
ok('destaca la fecha del usuario', viable.highlight === 'target');
ok('no propone fecha alternativa', viable.suggestedDate === null);
console.log(`    Tu fecha: ${money(optFechaOk.amount)}/quincena durante ${optFechaOk.periods} quincenas`);

console.log('\nCON FECHA IMPOSIBLE (3 meses para $9.000.000)\n');
const en3meses = new Date();
en3meses.setMonth(en3meses.getMonth() + 3);
const fechaDura = en3meses.toISOString().slice(0, 10);

const dura = mod.buildOptions({
  remaining: 900000000,
  targetDate: fechaDura,
  frequency: 'biweekly',
  capacity: capacidad,
});
const optDura = dura.options.find((o) => o.kind === 'target');
ok('marca la fecha como NO viable', optDura.feasible === false);
ok('el aporte requerido supera la capacidad', optDura.amount > dura.safePerPeriod);
ok('deja de destacar esa fecha', dura.highlight === 'recommended');
ok('propone una fecha alternativa', dura.suggestedDate !== null);
ok(
  'la fecha alternativa es posterior a la pedida',
  dura.suggestedDate > new Date(fechaDura),
);
console.log(
  `    Requeriria ${money(optDura.amount)}/quincena pero solo sobran ${money(dura.safePerPeriod)}`,
);
console.log(
  `    Fecha realista sugerida: ${dura.suggestedDate.toISOString().slice(0, 10)}`,
);
ok(
  'el mensaje lo dice con amabilidad',
  !/(imposible|no puedes|olvidalo|absurd)/i.test(optDura.reason),
  optDura.reason,
);

console.log('\nSIN MARGEN PARA AHORRAR\n');
const ahogado = {
  monthlyIncome: 100000000,
  monthlyFixed: 90000000,
  monthlyDebt: 20000000,
  basicNeeds: 50000000,
  avgDailyExpense: 2000000,
  balance: 0,
};
const sinMargen = mod.buildOptions({
  remaining: 900000000,
  targetDate: null,
  frequency: 'monthly',
  capacity: ahogado,
});
ok('capacidad en cero', sinMargen.safePerPeriod === 0);
// Antes esta prueba exigia CERO opciones. Era la conducta equivocada:
// dejaba al usuario sin nada que escoger y sin poder crear la meta.
// Ahora se exige lo contrario: aunque no haya margen, siempre hay tres
// aportes chicos que se pueden elegir.
ok('ofrece aportes chicos', sinMargen.options.length === 3,
  String(sinMargen.options.length));
ok('ninguno vale cero', sinMargen.options.every((o) => o.amount > 0));
ok('ninguno se marca como holgado', sinMargen.options.every((o) => !o.feasible));

console.log('\nFALTAN DATOS\n');
const incompleto = {
  monthlyIncome: 0,
  monthlyFixed: 0,
  monthlyDebt: 0,
  basicNeeds: 0,
  avgDailyExpense: 0,
  balance: 0,
};
const faltante = mod.buildOptions({
  remaining: 900000000,
  targetDate: null,
  frequency: 'monthly',
  capacity: incompleto,
});
ok('avisa que faltan datos', faltante.missing.length >= 2, faltante.missing.join(' / '));
ok('dice cuales', faltante.missing.some((m) => m.includes('ingresos')));
console.log(`    Falta: ${faltante.missing.join(', ')}`);

console.log('\nMENSUAL EN VEZ DE QUINCENAL\n');
const mensual = mod.buildOptions({
  remaining: 900000000,
  targetDate: null,
  frequency: 'monthly',
  capacity: capacidad,
});
ok('maximo mensual: $700.000', mensual.safePerPeriod === 70000000, money(mensual.safePerPeriod));
const recM = mensual.options.find((o) => o.kind === 'recommended');
ok(
  'el aporte mensual duplica al quincenal',
  recM.amount === rec.amount * 2,
  `${money(recM.amount)} vs ${money(rec.amount)}`,
);
ok(
  'y toma la mitad de periodos',
  Math.abs(recM.periods - Math.ceil(rec.periods / 2)) <= 1,
  `${recM.periods} vs ${rec.periods}`,
);

console.log(fallas ? `\n${fallas} FALLA(S)\n` : '\nOpciones de ahorro verificadas\n');
if (fallas) process.exitCode = 1;
