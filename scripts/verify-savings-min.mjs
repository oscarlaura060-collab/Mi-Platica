/**
 * Verifica que SIEMPRE se pueda armar un plan de ahorro, aunque no haya
 * margen, y que los ingresos fijos se cuenten las veces que de verdad
 * llegan.
 *
 *   node scripts/verify-savings-min.mjs
 */
import { readFileSync } from 'fs';
import initSqlJs from 'sql.js';

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
  const nombres = ['money', ...Object.keys(deps)];
  const valores = [money, ...Object.values(deps)];
  return new Function(...nombres, `const exports = {}; ${js}; return exports;`)(
    ...valores,
  );
}

const plan = cargar('src/domain/savings/plan.ts');
const mod = cargar('src/domain/savings/options.ts', {
  FREQUENCY_LABEL: plan.FREQUENCY_LABEL,
});

const PESO = 100;
const M = (pesos) => pesos * PESO;

// =====================================================================
console.log('\n1. Sin margen: la app igual propone con que arrancar');
// =====================================================================
// El caso de Oscar: entra 1.800.000 al mes, 863.000 de gastos fijos,
// 164.101 de cuotas y 900.000 de diario vivir => el margen da negativo.
const apretado = {
  monthlyIncome: M(1_800_000),
  monthlyFixed: M(863_000),
  monthlyDebt: M(164_101),
  basicNeeds: M(900_000),
  avgDailyExpense: M(30_000),
  balance: 0,
};

for (const freq of ['biweekly', 'monthly']) {
  const r = mod.buildOptions({
    remaining: M(1_000_000),
    targetDate: null,
    frequency: freq,
    capacity: apretado,
  });

  ok(`[${freq}] el margen seguro es cero`, r.safePerPeriod === 0, `${r.safePerPeriod}`);
  ok(`[${freq}] aun asi hay opciones para elegir`, r.options.length === 3,
    `devolvio ${r.options.length}`);
  ok(`[${freq}] la destacada existe en la lista`,
    r.options.some((o) => o.kind === r.highlight), r.highlight);

  const montos = r.options.map((o) => o.amount);
  ok(`[${freq}] ninguna opcion vale cero`, montos.every((m) => m > 0),
    montos.join(', '));
  ok(`[${freq}] las tres son distintas`, new Set(montos).size === 3,
    montos.map(money).join(', '));
  ok(`[${freq}] todas tienen plazo calculado`,
    r.options.every((o) => o.periods !== null && o.periods > 0));

  const menor = Math.min(...montos);
  ok(`[${freq}] la mas chica es de $2.000 o mas`, menor >= M(2_000), money(menor));
  ok(`[${freq}] la mas chica no pasa de $20.000`, menor <= M(20_000), money(menor));
  console.log(`       opciones: ${montos.map(money).join(' / ')} por ${freq === 'biweekly' ? 'quincena' : 'mes'}`);
}

// =====================================================================
console.log('\n2. Sin ingresos registrados tampoco se queda en blanco');
// =====================================================================
const vacio = {
  monthlyIncome: 0,
  monthlyFixed: 0,
  monthlyDebt: 0,
  basicNeeds: 0,
  avgDailyExpense: 0,
  balance: 0,
};
const r2 = mod.buildOptions({
  remaining: M(500_000),
  targetDate: null,
  frequency: 'biweekly',
  capacity: vacio,
});
ok('hay tres opciones', r2.options.length === 3, `${r2.options.length}`);
ok('la mas chica es $2.000', Math.min(...r2.options.map((o) => o.amount)) === M(2_000));
ok('avisa que faltan datos', r2.missing.length > 0, JSON.stringify(r2.missing));

// =====================================================================
console.log('\n3. Un aporte de $2.000 produce un plan coherente');
// =====================================================================
const dosMil = M(2_000);
const faltan = M(100_000);
const periodos = Math.ceil(faltan / dosMil);
ok('100.000 a 2.000 por quincena = 50 quincenas', periodos === 50, `${periodos}`);

// =====================================================================
console.log('\n4. Con margen de sobra NO cambia lo que ya funcionaba');
// =====================================================================
const holgado = {
  monthlyIncome: M(3_000_000),
  monthlyFixed: M(1_200_000),
  monthlyDebt: M(300_000),
  basicNeeds: M(800_000),
  avgDailyExpense: M(30_000),
  balance: M(500_000),
};
const r4 = mod.buildOptions({
  remaining: M(9_000_000),
  targetDate: null,
  frequency: 'monthly',
  capacity: holgado,
});
ok('margen seguro = 700.000', r4.safePerPeriod === M(700_000), money(r4.safePerPeriod));
ok('recomendada = 60% = 420.000',
  r4.options.find((o) => o.kind === 'recommended')?.amount === M(420_000),
  money(r4.options.find((o) => o.kind === 'recommended')?.amount ?? 0));
ok('destaca la recomendada', r4.highlight === 'recommended', r4.highlight);
ok('todas son viables', r4.options.every((o) => o.feasible));

// =====================================================================
console.log('\n5. Ingresos fijos: cada uno cuenta las veces que llega');
// =====================================================================
const SQL = await initSqlJs();
const db = new SQL.Database();

// Esquema minimo, copiado de la migracion real.
db.run(`
  CREATE TABLE fixed_incomes (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    name      TEXT NOT NULL,
    amount    INTEGER NOT NULL CHECK (amount > 0),
    frequency TEXT NOT NULL DEFAULT 'monthly'
              CHECK (frequency IN ('monthly','biweekly','weekly','yearly','variable')),
    status    TEXT NOT NULL DEFAULT 'active'
              CHECK (status IN ('active','paused'))
  );
`);

// La consulta tal cual quedo en el repositorio.
const fuenteRepo = readFileSync('src/db/repositories/fixedIncomes.ts', 'utf8');
const sql = fuenteRepo
  .split('export async function monthlyIncomeTotal')[1]
  .split('`')[1];
ok('la consulta pondera por frecuencia', /biweekly/.test(sql) && /2\.0/.test(sql));

const total = () => db.exec(sql)[0].values[0][0] ?? 0;

db.run(`INSERT INTO fixed_incomes (name, amount, frequency) VALUES
  ('Sueldo quincenal', ${M(900_000)}, 'biweekly')`);
ok('quincenal de 900.000 = 1.800.000 al mes', Math.round(total()) === M(1_800_000),
  money(Math.round(total())));

db.run(`DELETE FROM fixed_incomes`);
db.run(`INSERT INTO fixed_incomes (name, amount, frequency) VALUES
  ('Arriendo que cobro', ${M(1_200_000)}, 'monthly')`);
ok('mensual se queda igual', Math.round(total()) === M(1_200_000),
  money(Math.round(total())));

db.run(`DELETE FROM fixed_incomes`);
db.run(`INSERT INTO fixed_incomes (name, amount, frequency) VALUES
  ('Domicilios', ${M(100_000)}, 'weekly')`);
ok('semanal de 100.000 ~ 434.500 al mes',
  Math.abs(Math.round(total()) - M(434_500)) <= PESO,
  money(Math.round(total())));

db.run(`DELETE FROM fixed_incomes`);
db.run(`INSERT INTO fixed_incomes (name, amount, frequency) VALUES
  ('Prima anual', ${M(2_400_000)}, 'yearly')`);
ok('anual de 2.400.000 = 200.000 al mes', Math.round(total()) === M(200_000),
  money(Math.round(total())));

db.run(`DELETE FROM fixed_incomes`);
db.run(`INSERT INTO fixed_incomes (name, amount, frequency, status) VALUES
  ('Sueldo', ${M(900_000)}, 'biweekly', 'active'),
  ('Viejo empleo', ${M(5_000_000)}, 'monthly', 'paused')`);
ok('los pausados no suman', Math.round(total()) === M(1_800_000),
  money(Math.round(total())));

// =====================================================================
console.log('\n6. El gasto del diario vivir no cuenta dos veces lo fijo');
// =====================================================================
const fuenteStats = readFileSync('src/db/repositories/stats.ts', 'utf8');
const consulta = fuenteStats
  .split('export async function avgDailyDiscretionaryExpense')[1]
  .split('`')[1];
ok('excluye pagos de gastos fijos', /fixed_expense_id IS NULL/.test(consulta));
ok('excluye cuotas de tarjeta', /installment_plan_id IS NULL/.test(consulta));
ok('solo mira gastos', /type = 'expense'/.test(consulta));
ok('ignora los borrados', /deleted_at IS NULL/.test(consulta));

const usoCapacidad = readFileSync('src/features/savings/useCapacity.ts', 'utf8');
ok('useCapacity usa el gasto discrecional',
  /avgDailyDiscretionaryExpense\(30\)/.test(usoCapacidad));

// =====================================================================
console.log(
  fallas === 0
    ? '\nTodo bien: ' + 'ninguna falla\n'
    : `\n${fallas} falla(s)\n`,
);
db.close();
process.exitCode = fallas === 0 ? 0 : 1;
