/**
 * Interpreta las notificaciones de bancos y billeteras colombianas.
 *
 * Importante sobre la confianza: los bancos cambian sus textos sin avisar,
 * asi que esto NUNCA registra un movimiento solo. Propone, y el usuario
 * confirma. Un parser silenciosamente desactualizado que registre basura
 * en tus finanzas es peor que no tener parser.
 */
import type { CapturedNotification } from '../../../modules/notification-reader';

export type DetectedKind = 'expense' | 'income' | 'transfer_out' | 'unknown';

export interface Detected {
  key: string;
  source: string;
  kind: DetectedKind;
  amount: number;
  merchant: string | null;
  rawTitle: string;
  rawBody: string;
  postedAt: number;
  /** 0-100. Por debajo de 60 se muestra pero con advertencia. */
  confidence: number;
}

/**
 * Nombre bonito a partir de un FRAGMENTO del paquete. Igual que en el
 * servicio nativo: por igualdad exacta se queda desactualizado solo.
 * El orden importa: "daviplata" antes que "davivienda".
 */
const SOURCES: [string, string][] = [
  ['daviplata', 'Daviplata'],
  ['davivienda', 'Davivienda'],
  ['bancolombia', 'Bancolombia'],
  ['todo1', 'Bancolombia'],
  ['nequi', 'Nequi'],
  ['bbva', 'BBVA'],
  ['bancodebogota', 'Banco de Bogota'],
  ['bancobogota', 'Banco de Bogota'],
  ['lulobank', 'Lulo Bank'],
  ['nu.production', 'Nu'],
  ['nubank', 'Nu'],
  ['walletnfcrel', 'Google Wallet'],
  ['android.apps.wallet', 'Google Wallet'],
  ['android.gms', 'Google Pay'],
  ['colpatria', 'Colpatria'],
  ['scotiabank', 'Scotiabank'],
  ['itau', 'Itau'],
  ['avvillas', 'AV Villas'],
  ['occidente', 'Banco de Occidente'],
  ['cajasocial', 'Banco Caja Social'],
  ['falabella', 'Falabella'],
  ['movii', 'Movii'],
  ['rappi', 'RappiPay'],
  ['popular', 'Banco Popular'],
  ['tpaga', 'Tpaga'],
  ['powwi', 'Powwi'],
  ['uala', 'Uala'],
  ['dale', 'Dale'],
];

export function sourceName(pkg: string): string {
  const lower = pkg.toLowerCase();
  for (const [frag, nombre] of SOURCES) {
    if (lower.includes(frag)) return nombre;
  }
  return pkg;
}

/**
 * Extrae el monto. Formato colombiano: $ 1.234.567,89 o $1,234,567.89.
 * Se toma el numero mas grande del texto: los bancos suelen poner primero
 * el monto de la transaccion y despues el saldo, pero el saldo casi
 * siempre es mayor... por eso NO usamos el mayor a ciegas: preferimos el
 * que viene justo despues de las palabras clave de la operacion.
 */
function parseAmount(text: string): number | null {
  const matches = [...text.matchAll(/\$\s?([\d.,]+)/g)];
  if (!matches.length) return null;

  const toCents = (s: string): number | null => {
    let clean = s.trim().replace(/[.,]$/, '');
    const comas = (clean.match(/,/g) ?? []).length;
    const puntos = (clean.match(/\./g) ?? []).length;

    // Decide quien es el separador decimal mirando el ultimo simbolo.
    const lastComma = clean.lastIndexOf(',');
    const lastDot = clean.lastIndexOf('.');

    if (comas > 0 && puntos > 0) {
      if (lastComma > lastDot) {
        clean = clean.replace(/\./g, '').replace(',', '.');
      } else {
        clean = clean.replace(/,/g, '');
      }
    } else if (comas === 1 && clean.length - lastComma === 3) {
      clean = clean.replace(',', '.'); // 1234,50
    } else if (puntos === 1 && clean.length - lastDot === 3 && clean.length <= 6) {
      // 123.45 => decimal; 123.456 => miles. Ambiguo, se asume miles si
      // el entero resultante es "redondo" para COP.
      clean = clean.replace('.', '');
    } else {
      clean = clean.replace(/[.,]/g, '');
    }

    const n = Number(clean);
    if (!Number.isFinite(n) || n <= 0) return null;
    return Math.round(n * 100);
  };

  // Primer monto del texto: es el de la operacion en casi todos los bancos.
  for (const m of matches) {
    const v = toCents(m[1]);
    if (v !== null) return v;
  }
  return null;
}

const RE_INGRESO =
  /(recibiste|te consign|consignaci|abono|recibido|te enviaron|transferencia recibida|deposito|dep[oó]sito|nomina|n[oó]mina|ingreso)/i;
const RE_GASTO =
  /(compra|pago|pagaste|cobro|debito|d[eé]bito|retiro|retiraste|avance|cargo|aprobada|aprobado|realizaste un pago)/i;
const RE_TRANSFER =
  /(enviaste|transferiste|transferencia enviada|env[ií]o exitoso|le enviaste)/i;
const RE_RECHAZO =
  /(rechaz|declinad|fallid|no fue posible|insuficient|cancelad|intento)/i;

/** Saca el nombre del comercio: lo que va despues de "en" o entre comillas. */
function parseMerchant(text: string): string | null {
  const comillas = text.match(/["“']([^"”']{3,40})["”']/);
  if (comillas) return comillas[1].trim();

  const en = text.match(
    /\ben\s+([A-ZÁÉÍÓÚÑ0-9][\wÁÉÍÓÚÑáéíóúñ&.\- ]{2,34})/,
  );
  if (en) return en[1].trim().replace(/\s+(por|el|the)$/i, '');

  const de = text.match(/\bde\s+([A-ZÁÉÍÓÚÑ][\wÁÉÍÓÚÑáéíóúñ&.\- ]{2,34})/);
  if (de) return de[1].trim();

  return null;
}

export function parseNotification(n: CapturedNotification): Detected | null {
  const text = `${n.title} ${n.body}`.replace(/\s+/g, ' ').trim();
  if (!text) return null;

  // Las notificaciones de operaciones rechazadas no son movimientos.
  if (RE_RECHAZO.test(text)) return null;

  const amount = parseAmount(text);
  if (amount === null) return null;

  let kind: DetectedKind = 'unknown';
  let confidence = 45;

  if (RE_INGRESO.test(text)) {
    kind = 'income';
    confidence = 80;
  } else if (RE_TRANSFER.test(text)) {
    kind = 'transfer_out';
    confidence = 75;
  } else if (RE_GASTO.test(text)) {
    kind = 'expense';
    confidence = 85;
  }

  // Google Wallet casi siempre es una compra presencial.
  if (n.package.startsWith('com.google.android') && kind === 'unknown') {
    kind = 'expense';
    confidence = 70;
  }

  // Si no se reconoce el tipo pero SI hay un monto, se guarda igual como
  // 'unknown'. Es deliberado: un banco que cambie su texto aparece en la
  // lista para que el usuario diga si fue gasto o ingreso, en vez de
  // desaparecer en silencio y hacerle creer que la deteccion no sirve.
  const merchant = parseMerchant(text);
  if (merchant) confidence = Math.min(confidence + 10, 95);

  return {
    key: n.key,
    source: sourceName(n.package),
    kind,
    amount,
    merchant,
    rawTitle: n.title,
    rawBody: n.body,
    postedAt: n.postedAt,
    confidence,
  };
}

export function parseAll(items: CapturedNotification[]): Detected[] {
  const out: Detected[] = [];
  for (const n of items) {
    const d = parseNotification(n);
    if (d) out.push(d);
  }
  return out.sort((a, b) => b.postedAt - a.postedAt);
}
