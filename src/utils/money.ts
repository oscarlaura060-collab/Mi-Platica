/**
 * Todo el dinero vive en enteros (centavos). Nunca hacemos aritmetica
 * con floats sobre saldos.
 */
export const CENTS = 100;

export function toCents(value: string | number): number {
  if (typeof value === 'number') return Math.round(value * CENTS);
  const clean = value.replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3}\b)/g, '');
  const normalized = clean.replace(',', '.');
  const n = Number(normalized);
  return Number.isFinite(n) ? Math.round(n * CENTS) : 0;
}

export function fromCents(cents: number): number {
  return cents / CENTS;
}

const fmtCOP = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

const fmtCompact = new Intl.NumberFormat('es-CO', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

/** $1.250.000 */
export function money(cents: number): string {
  return fmtCOP.format(Math.round(fromCents(cents)));
}

/** 1,2 M — para ejes de graficas y chips pequenos */
export function moneyCompact(cents: number): string {
  return '$' + fmtCompact.format(Math.round(fromCents(cents)));
}

/** Con signo explicito segun el tipo de movimiento. */
export function signed(cents: number, isInflow: boolean): string {
  return (isInflow ? '+ ' : '- ') + money(Math.abs(cents));
}

/** Entrada por teclado numerico: acumula digitos como centavos->pesos. */
export function pushDigit(current: number, digit: string): number {
  if (digit === 'del') return Math.floor(current / 10);
  const d = Number(digit);
  if (!Number.isInteger(d)) return current;
  const next = current * 10 + d;
  return next > 99_999_999_999 ? current : next; // tope de seguridad
}

/** El teclado acumula PESOS enteros; aqui pasamos a centavos. */
export function keypadToCents(pesos: number): number {
  return pesos * CENTS;
}

/**
 * Formatea lo que el usuario escribe poniendo puntos de miles en vivo:
 * "250000" -> "250.000". Se trabaja solo con digitos para que borrar y
 * editar siga siendo natural (el cursor no salta porque el texto se
 * reconstruye entero desde los digitos).
 */
export function formatThousands(input: string): string {
  const digits = input.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
  if (!digits) return '';
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/** "250.000" -> 25000000 (centavos). Lo que de verdad se guarda. */
export function parseMoneyInput(input: string): number {
  const digits = input.replace(/\D/g, '');
  if (!digits) return 0;
  const pesos = Number(digits);
  return Number.isFinite(pesos) ? pesos * CENTS : 0;
}

/** Centavos -> texto para precargar un campo: 25000000 -> "250.000". */
export function centsToInput(cents: number): string {
  if (!cents) return '';
  return formatThousands(String(Math.round(cents / CENTS)));
}

export function pct(part: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.max(0, (part / total) * 100));
}
