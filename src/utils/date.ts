import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  endOfMonth,
  format,
  isAfter,
  parseISO,
  setDate,
  startOfMonth,
  subDays,
} from 'date-fns';
import { es } from 'date-fns/locale';

/** 'YYYY-MM-DD' en hora LOCAL (lo que el usuario llama "hoy"). */
export function dayKey(d: Date = new Date()): string {
  return format(d, 'yyyy-MM-dd');
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function monthRange(ref: Date = new Date()) {
  return {
    from: dayKey(startOfMonth(ref)),
    to: dayKey(endOfMonth(ref)),
    label: format(ref, "LLLL 'de' yyyy", { locale: es }),
  };
}

export function lastNDays(n: number, ref: Date = new Date()) {
  return { from: dayKey(subDays(ref, n - 1)), to: dayKey(ref) };
}

export function prettyDay(day: string): string {
  const d = parseISO(day);
  const diff = differenceInCalendarDays(new Date(), d);
  if (diff === 0) return 'Hoy';
  if (diff === 1) return 'Ayer';
  return format(d, "EEEE d 'de' LLLL", { locale: es });
}

export function shortWeekday(day: string): string {
  return format(parseISO(day), 'EEEEEE', { locale: es });
}

/**
 * Proxima fecha de vencimiento para una deuda con dia de corte `dueDay`.
 * Si el dia ya paso este mes, devuelve el del mes siguiente. Ajusta meses
 * cortos (dia 31 en febrero => ultimo dia del mes).
 */
export function nextDueDate(dueDay: number, ref: Date = new Date()): Date {
  const clamp = (base: Date) => {
    const last = endOfMonth(base).getDate();
    return setDate(base, Math.min(dueDay, last));
  };
  const thisMonth = clamp(ref);
  return isAfter(thisMonth, subDays(ref, 1)) ? thisMonth : clamp(addMonths(ref, 1));
}

export function daysUntil(d: Date, ref: Date = new Date()): number {
  return differenceInCalendarDays(d, ref);
}

export function dueLabel(dueDay: number): string {
  const d = nextDueDate(dueDay);
  const n = daysUntil(d);
  if (n < 0) return `Vencida hace ${Math.abs(n)} d`;
  if (n === 0) return 'Vence hoy';
  if (n === 1) return 'Vence manana';
  return `Vence en ${n} dias`;
}

export { addDays, addMonths, format, parseISO };
