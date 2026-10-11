/**
 * Rangos de fecha para analizar.
 *
 * Lo interesante son los CICLOS DE PAGO: si a alguien le pagan el 15 y el
 * 30, su mes financiero real no empieza el dia 1. Analizar del 1 al 31
 * mezcla dos quincenas y no sirve para entender si la plata alcanzo.
 */
import { dayKey } from '@/utils/date';
import type { FixedIncomeStatus } from '@/db/repositories/fixedIncomes';

export interface Range {
  key: string;
  label: string;
  from: string;
  to: string;
  /** Dias que abarca, para comparar contra el periodo anterior. */
  days: number;
}

const d = (y: number, m: number, day: number) => new Date(y, m, day);
const lastDayOf = (y: number, m: number) => new Date(y, m + 1, 0).getDate();

function range(key: string, label: string, from: Date, to: Date): Range {
  const f = dayKey(from);
  const t = dayKey(to);
  const days =
    Math.round(
      (new Date(t + 'T00:00:00').getTime() - new Date(f + 'T00:00:00').getTime()) /
        86_400_000,
    ) + 1;
  return { key, label, from: f, to: t, days };
}

/** Rangos fijos que siempre estan disponibles. */
export function standardRanges(ref: Date = new Date()): Range[] {
  const y = ref.getFullYear();
  const m = ref.getMonth();
  const hoy = ref.getDate();

  const inicioMes = d(y, m, 1);
  const finMes = d(y, m, lastDayOf(y, m));
  const mesPasado = new Date(y, m - 1, 1);
  const myp = mesPasado.getFullYear();
  const mmp = mesPasado.getMonth();

  return [
    range('today', 'Hoy', ref, ref),
    range('week', '7 dias', new Date(y, m, hoy - 6), ref),
    range('fortnight', '15 dias', new Date(y, m, hoy - 14), ref),
    range('month', 'Este mes', inicioMes, finMes),
    range('lastMonth', 'Mes pasado', d(myp, mmp, 1), d(myp, mmp, lastDayOf(myp, mmp))),
    range('90', '3 meses', new Date(y, m, hoy - 89), ref),
  ];
}

/**
 * Ciclos de pago a partir del ingreso quincenal/mensual del usuario.
 *
 * Un ciclo va desde un dia de cobro hasta el dia anterior al siguiente
 * cobro: es el periodo en el que esa plata tiene que alcanzar.
 */
export function payCycles(
  incomes: FixedIncomeStatus[],
  ref: Date = new Date(),
): Range[] {
  const base = incomes.find((i) => i.is_reliable === 1 && i.frequency !== 'variable');
  if (!base) return [];

  const dias = [base.pay_day, base.pay_day_2]
    .filter((x): x is number => typeof x === 'number' && x > 0)
    .sort((a, b) => a - b);
  if (!dias.length) return [];

  // Se arman los ultimos cortes de cobro hacia atras desde hoy.
  const cortes: Date[] = [];
  for (let offset = -2; offset <= 1; offset++) {
    const y = ref.getFullYear();
    const m = ref.getMonth() + offset;
    const base2 = new Date(y, m, 1);
    const yy = base2.getFullYear();
    const mm = base2.getMonth();
    for (const dia of dias) {
      cortes.push(d(yy, mm, Math.min(dia, lastDayOf(yy, mm))));
    }
  }
  cortes.sort((a, b) => a.getTime() - b.getTime());

  const hoySinHora = d(ref.getFullYear(), ref.getMonth(), ref.getDate());

  // El ciclo actual es el que empieza en el ultimo corte <= hoy.
  let idxActual = -1;
  for (let i = 0; i < cortes.length; i++) {
    if (cortes[i].getTime() <= hoySinHora.getTime()) idxActual = i;
  }
  if (idxActual < 0) return [];

  const construir = (i: number, etiqueta: string): Range | null => {
    const inicio = cortes[i];
    const siguiente = cortes[i + 1];
    if (!inicio) return null;
    const fin = siguiente
      ? new Date(siguiente.getTime() - 86_400_000)
      : hoySinHora;
    // El ciclo actual no se proyecta al futuro: se corta en hoy.
    const finReal = fin.getTime() > hoySinHora.getTime() && i === idxActual ? hoySinHora : fin;
    return range(`cycle-${i}`, etiqueta, inicio, finReal);
  };

  const out: Range[] = [];
  const actual = construir(idxActual, dias.length > 1 ? 'Esta quincena' : 'Este ciclo');
  const anterior = construir(
    idxActual - 1,
    dias.length > 1 ? 'Quincena pasada' : 'Ciclo pasado',
  );
  if (actual) out.push(actual);
  if (anterior) out.push(anterior);
  return out;
}

/** El periodo inmediatamente anterior y del mismo largo, para comparar. */
export function previousRange(r: Range): Range {
  const desde = new Date(r.from + 'T00:00:00');
  const hasta = new Date(desde.getTime() - 86_400_000);
  const inicio = new Date(hasta.getTime() - (r.days - 1) * 86_400_000);
  return range(`${r.key}-prev`, 'Periodo anterior', inicio, hasta);
}
