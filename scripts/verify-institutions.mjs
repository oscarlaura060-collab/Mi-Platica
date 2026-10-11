/**
 * Verifica el catalogo de bancos y billeteras y su buscador.
 *
 *   node scripts/verify-institutions.mjs
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

const m = cargar('src/domain/accounts/institutions.ts');

// =====================================================================
console.log('\n1. El catalogo tiene las entidades que se usan en Colombia');
// =====================================================================
const nombres = m.INSTITUTIONS.map((i) => i.name);
for (const n of ['Bancolombia', 'Davivienda', 'Banco de Bogotá', 'BBVA', 'Nu']) {
  ok(`banco ${n}`, nombres.includes(n));
}
for (const n of ['Nequi', 'Daviplata', 'Movii', 'RappiPay', 'dale!']) {
  ok(`billetera ${n}`, nombres.includes(n));
}

ok('cada entidad tiene color', m.INSTITUTIONS.every((i) => /^#[0-9A-Fa-f]{6}$/.test(i.color)));
ok('cada entidad tiene id unico',
  new Set(m.INSTITUTIONS.map((i) => i.id)).size === m.INSTITUTIONS.length);
ok('solo hay dos tipos',
  m.INSTITUTIONS.every((i) => i.kind === 'bank' || i.kind === 'wallet'));

// =====================================================================
console.log('\n2. La lista depende del tipo elegido');
// =====================================================================
const bancos = m.searchInstitutions('bank', '');
const billeteras = m.searchInstitutions('wallet', '');
ok('los bancos no traen billeteras', bancos.every((i) => i.kind === 'bank'));
ok('las billeteras no traen bancos', billeteras.every((i) => i.kind === 'wallet'));
ok('hay varios bancos', bancos.length >= 10, String(bancos.length));
ok('hay varias billeteras', billeteras.length >= 7, String(billeteras.length));
ok('Nequi NO aparece entre los bancos',
  !bancos.some((i) => i.name === 'Nequi'));
ok('Bancolombia NO aparece entre las billeteras',
  !billeteras.some((i) => i.name === 'Bancolombia'));

// =====================================================================
console.log('\n3. El buscador');
// =====================================================================
const buscar = (k, q) => m.searchInstitutions(k, q).map((i) => i.name);

ok('busca por nombre', buscar('bank', 'bancolombia').includes('Bancolombia'));
ok('no distingue mayusculas', buscar('bank', 'BANCOLOMBIA').includes('Bancolombia'));
ok('ignora tildes: "bogota" encuentra "Bogotá"',
  buscar('bank', 'bogota').includes('Banco de Bogotá'));
ok('ignora tildes al reves: "uala" encuentra "Ualá"',
  buscar('wallet', 'uala').includes('Ualá'));
ok('busca por trozo', buscar('wallet', 'nequ').includes('Nequi'));
ok('ignora espacios sobrantes', buscar('bank', '  bbva  ').includes('BBVA'));

const sinResultado = buscar('bank', 'zzzzz');
ok('una busqueda sin resultados deja solo "Otro banco"',
  sinResultado.length === 1 && sinResultado[0] === 'Otro banco',
  JSON.stringify(sinResultado));

// =====================================================================
console.log('\n4. "Otra" siempre esta y siempre al final');
// =====================================================================
for (const [k, esperado] of [
  ['bank', 'Otro banco'],
  ['wallet', 'Otra billetera'],
]) {
  for (const q of ['', 'nequi', 'bancolombia', 'zzzz', 'bogota']) {
    const lista = buscar(k, q);
    ok(`[${k}] con "${q || 'vacio'}" la ultima es "${esperado}"`,
      lista[lista.length - 1] === esperado,
      lista[lista.length - 1]);
  }
}
ok('solo hay una opcion "otra" por tipo',
  m.searchInstitutions('bank', '').filter((i) => i.isOther).length === 1 &&
  m.searchInstitutions('wallet', '').filter((i) => i.isOther).length === 1);

// =====================================================================
console.log('\n5. Buscar una entidad por id');
// =====================================================================
ok('encuentra por id', m.findInstitution('nequi')?.name === 'Nequi');
ok('id inexistente da null', m.findInstitution('no-existe') === null);
ok('null da null', m.findInstitution(null) === null);
ok('la opcion otra se marca', m.findInstitution('otro-banco')?.isOther === true);
ok('una entidad normal no se marca como otra',
  m.findInstitution('bancolombia')?.isOther === undefined);

// =====================================================================
console.log('\n6. Nu existe como banco y como billetera, sin chocar');
// =====================================================================
const nus = m.INSTITUTIONS.filter((i) => i.name === 'Nu');
ok('hay dos entradas de Nu', nus.length === 2, String(nus.length));
ok('con ids distintos', nus[0].id !== nus[1].id);
ok('una de cada tipo',
  new Set(nus.map((i) => i.kind)).size === 2);

console.log(fallas === 0 ? '\nTodo bien: ninguna falla\n' : `\n${fallas} falla(s)\n`);
process.exitCode = fallas === 0 ? 0 : 1;
