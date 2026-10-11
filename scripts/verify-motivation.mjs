/**
 * Verifica los recordatorios motivacionales:
 *  - que el tono rote y no se repita el mismo mensaje seguido
 *  - que NINGUN mensaje culpabilice o avergüence
 *  - que las fechas programadas caigan a la hora elegida, una por dia
 *
 *   node scripts/verify-motivation.mjs
 */
import { readFileSync } from 'fs';

let fallas = 0;
const ok = (nombre, cond, extra = '') => {
  console.log(`  ${cond ? 'OK  ' : 'FALLA'} ${nombre}${cond ? '' : ` ${extra}`}`);
  if (!cond) fallas++;
};

// El modulo usa el alias @/ que node no resuelve, asi que se transpila
// con el propio TypeScript del proyecto y se le inyecta money().
const ts = (await import('typescript')).default;

const fuente = readFileSync('src/domain/motivation/messages.ts', 'utf8').replace(
  /^import .*$/gm,
  '',
);
const js = ts
  .transpileModule(fuente, {
    compilerOptions: { module: ts.ModuleKind.None, target: ts.ScriptTarget.ES2020 },
  })
  // Sin los `export`, lo que queda son funciones sueltas que el
  // new Function de abajo puede devolver directamente.
  .outputText.replace(/^export /gm, '')
  .replace(/Object\.defineProperty\(exports[^;]*;/g, '')
  .replace(/exports\.\w+\s*=\s*\w+;?/g, '')
  .replace(/^\s*exports\.\w+.*$/gm, '');

const money = (c) =>
  '$' + Math.round(c / 100).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');

const mod = new Function(
  'money',
  `${js}; return { buildMessages, pickSequence };`,
)(money);

// --- Contextos de prueba --------------------------------------------
const conAvance = {
  name: 'Oscar',
  goals: [
    { name: 'Viaje', saved: 80000000, target: 100000000, remaining: 20000000 },
  ],
  streak: 5,
  fixedPending: 0,
  availableReal: 45000000,
  avgDaily: 3500000,
  loggedRecently: true,
  recentContributions: 3,
};

const sinAvance = {
  name: '',
  goals: [
    { name: 'Fondo de emergencia', saved: 0, target: 200000000, remaining: 200000000 },
  ],
  streak: 0,
  fixedPending: 50000000,
  availableReal: -10000000,
  avgDaily: 0,
  loggedRecently: false,
  recentContributions: 0,
};

const sinDatos = {
  name: '',
  goals: [],
  streak: 0,
  fixedPending: 0,
  availableReal: 0,
  avgDaily: 0,
  loggedRecently: false,
  recentContributions: 0,
};

console.log('\nCONTENIDO DE LOS MENSAJES\n');

const poolAvance = mod.buildMessages(conAvance);
const poolSin = mod.buildMessages(sinAvance);
const poolVacio = mod.buildMessages(sinDatos);

ok('con avance genera mensajes', poolAvance.length > 0);
ok('sin avance genera mensajes', poolSin.length > 0);
ok('sin ningun dato tambien genera', poolVacio.length >= 5);

ok(
  'menciona el progreso real (80%)',
  poolAvance.some((m) => m.title.includes('80%') || m.title.includes('$800.000')),
);
ok(
  'usa el nombre cuando existe',
  poolAvance.some((m) => m.title.includes('Oscar')),
);
ok(
  'sin nombre no deja frases raras',
  !poolSin.some((m) => m.title.includes('undefined') || m.title.includes('null')),
);

console.log('\nTONO: NADA DE CULPA, VERGUENZA NI TRISTEZA\n');

// Palabras que delatarian un mensaje que culpa o presiona con emociones.
const PROHIBIDAS = [
  'fallaste', 'fracas', 'decepcion', 'verguenza', 'vergüenza', 'culpa',
  'mal hecho', 'no deberias', 'irresponsab', 'descuidad', 'triste',
  'lastima', 'pena', 'perdiste', 'desperdici', 'malgast', 'otra vez no',
  'nunca vas', 'siempre te', 'deberias haber',
];

const todos = [...poolAvance, ...poolSin, ...poolVacio];
const ofensivos = todos.filter((m) => {
  const texto = `${m.title} ${m.body}`.toLowerCase();
  return PROHIBIDAS.some((p) => texto.includes(p));
});
ok(
  `ninguno de los ${todos.length} mensajes culpabiliza`,
  ofensivos.length === 0,
  ofensivos.map((m) => m.title).join(' | '),
);

ok(
  'sin avance: invita a retomar, no reclama',
  poolSin.some(
    (m) =>
      m.title.toLowerCase().includes('retomemos') ||
      m.title.toLowerCase().includes('esperando') ||
      m.body.toLowerCase().includes('empezar'),
  ),
);

ok(
  'con saldo negativo habla de revisar, no de regañar',
  poolSin.some((m) => m.body.includes('evita sorpresas') || m.title.includes('revisemos')),
);

console.log('\nROTACION DE TONOS Y NO REPETICION\n');

const sec = mod.pickSequence(poolAvance, 14);
ok('programa 14 mensajes', sec.length === 14);

let repetidoSeguido = 0;
for (let i = 1; i < sec.length; i++) {
  if (sec[i].title === sec[i - 1].title) repetidoSeguido++;
}
ok('no repite el mismo mensaje dos dias seguidos', repetidoSeguido === 0);

const tonos = new Set(sec.map((m) => m.tone));
ok('usa los tres tonos', tonos.size === 3, [...tonos].join(','));

const primeros3 = sec.slice(0, 3).map((m) => m.tone);
ok(
  'los primeros dias rotan tono',
  new Set(primeros3).size === 3,
  primeros3.join(','),
);

// Con un repertorio corto igual debe funcionar sin romperse.
const secCorta = mod.pickSequence(poolVacio, 14);
ok('aguanta repertorio corto sin fallar', secCorta.length === 14);

console.log('\nHORARIO: UNA SOLA VEZ AL DIA, A LA HORA ELEGIDA\n');

// Replica de la logica de fechas de scheduleDailyMotivation.
function fechasProgramadas(hour, minute, ahora, dias) {
  const out = [];
  for (let i = 0; i < dias; i++) {
    const cuando = new Date(
      ahora.getFullYear(), ahora.getMonth(), ahora.getDate() + i,
      hour, minute, 0, 0,
    );
    if (cuando.getTime() <= ahora.getTime()) continue;
    out.push(cuando);
  }
  return out;
}

// Son las 14:00 y pide aviso a las 9:00 -> hoy ya paso, empieza mañana.
const tarde = fechasProgramadas(9, 0, new Date(2026, 10, 20, 14, 0), 14);
ok('si la hora ya paso, el primero es mañana', tarde[0].getDate() === 21);
ok('programa 13 (se salta hoy)', tarde.length === 13);

// Son las 7:00 y pide aviso a las 9:00 -> hoy todavia alcanza.
const temprano = fechasProgramadas(9, 0, new Date(2026, 10, 20, 7, 0), 14);
ok('si aun no pasa, el primero es hoy', temprano[0].getDate() === 20);
ok('programa los 14', temprano.length === 14);

ok(
  'todos caen a la hora elegida',
  temprano.every((d) => d.getHours() === 9 && d.getMinutes() === 0),
);

const dias = temprano.map((d) => d.toDateString());
ok('un solo aviso por dia', new Set(dias).size === dias.length);

const conMinutos = fechasProgramadas(20, 30, new Date(2026, 10, 20, 7, 0), 5);
ok(
  'respeta los minutos (8:30 p.m.)',
  conMinutos.every((d) => d.getHours() === 20 && d.getMinutes() === 30),
);

console.log('\nMUESTRA DE LOS PRIMEROS 5 MENSAJES\n');
sec.slice(0, 5).forEach((m, i) => {
  console.log(`  ${i + 1}. [${m.tone}] ${m.title}`);
  console.log(`     ${m.body}`);
});

console.log(
  fallas ? `\n${fallas} FALLA(S)\n` : '\nRecordatorios motivacionales verificados\n',
);
if (fallas) process.exitCode = 1;
