/**
 * BANCOS Y BILLETERAS DE COLOMBIA
 *
 * Es un catalogo para ahorrarle escritura a la persona, no una lista
 * cerrada: siempre existe "Otra" para escribir la que sea. Por eso vive
 * aqui y no dentro de la pantalla, y por eso ninguna entidad se trata
 * distinto de otra.
 *
 * Mi Platica NO se conecta con ningun banco. Elegir "Bancolombia" aqui
 * solo le pone nombre y color a una cuenta que el usuario lleva a mano.
 */
export type AccountKind = 'bank' | 'wallet';

export interface Institution {
  id: string;
  name: string;
  kind: AccountKind;
  /** Color sugerido de la marca, para que la cuenta se reconozca de un vistazo. */
  color: string;
  /** true = abre un campo para escribir el nombre. */
  isOther?: boolean;
}

export const INSTITUTIONS: Institution[] = [
  // --- Bancos --------------------------------------------------------
  { id: 'bancolombia', name: 'Bancolombia', kind: 'bank', color: '#FDDA24' },
  { id: 'davivienda', name: 'Davivienda', kind: 'bank', color: '#ED1C27' },
  { id: 'banco-bogota', name: 'Banco de Bogotá', kind: 'bank', color: '#00479D' },
  { id: 'banco-occidente', name: 'Banco de Occidente', kind: 'bank', color: '#00A0DF' },
  { id: 'bbva', name: 'BBVA', kind: 'bank', color: '#004481' },
  { id: 'colpatria', name: 'Scotiabank Colpatria', kind: 'bank', color: '#EC111A' },
  { id: 'caja-social', name: 'Banco Caja Social', kind: 'bank', color: '#0C4DA2' },
  { id: 'popular', name: 'Banco Popular', kind: 'bank', color: '#00843D' },
  { id: 'av-villas', name: 'Banco AV Villas', kind: 'bank', color: '#EE2E24' },
  { id: 'falabella', name: 'Banco Falabella', kind: 'bank', color: '#7AB800' },
  { id: 'agrario', name: 'Banco Agrario', kind: 'bank', color: '#00843D' },
  { id: 'nu-bank', name: 'Nu', kind: 'bank', color: '#820AD1' },
  { id: 'lulo', name: 'Lulo Bank', kind: 'bank', color: '#00C389' },
  { id: 'otro-banco', name: 'Otro banco', kind: 'bank', color: '#14C4D4', isOther: true },

  // --- Billeteras ----------------------------------------------------
  { id: 'nequi', name: 'Nequi', kind: 'wallet', color: '#200020' },
  { id: 'daviplata', name: 'Daviplata', kind: 'wallet', color: '#ED1C27' },
  { id: 'movii', name: 'Movii', kind: 'wallet', color: '#FF4E00' },
  { id: 'dale', name: 'dale!', kind: 'wallet', color: '#00B2A9' },
  { id: 'rappipay', name: 'RappiPay', kind: 'wallet', color: '#FF441F' },
  { id: 'tpaga', name: 'Tpaga', kind: 'wallet', color: '#00C2FF' },
  { id: 'uala', name: 'Ualá', kind: 'wallet', color: '#FF4E63' },
  { id: 'nu-wallet', name: 'Nu', kind: 'wallet', color: '#820AD1' },
  {
    id: 'otra-billetera',
    name: 'Otra billetera',
    kind: 'wallet',
    color: '#14C4D4',
    isOther: true,
  },
];

/** Quita tildes y mayusculas: buscar "bogota" encuentra "Banco de Bogotá". */
function normalizar(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
}

/**
 * Entidades de un tipo que coinciden con lo buscado.
 *
 * La opcion "Otra" queda SIEMPRE al final y nunca se filtra: si alguien
 * busca su banco y no aparece, tiene que poder escribirlo ahi mismo en
 * vez de borrar la busqueda para encontrar la salida.
 */
export function searchInstitutions(kind: AccountKind, query: string): Institution[] {
  const delTipo = INSTITUTIONS.filter((i) => i.kind === kind);
  const otra = delTipo.filter((i) => i.isOther);
  const normales = delTipo.filter((i) => !i.isOther);

  const q = normalizar(query);
  const encontradas = q ? normales.filter((i) => normalizar(i.name).includes(q)) : normales;

  return [...encontradas, ...otra];
}

export function findInstitution(id: string | null): Institution | null {
  if (!id) return null;
  return INSTITUTIONS.find((i) => i.id === id) ?? null;
}
