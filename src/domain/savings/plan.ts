/**
 * ¿Cuanto puedo aportar a una meta sin quedarme sin plata?
 *
 * La cuenta ingenua ("lo que falta dividido los meses que quedan") suele
 * proponer un ahorro imposible. Aqui el aporte sugerido se compara contra
 * lo que de verdad sobra despues de cubrir compromisos, y SIEMPRE se dice
 * cuanto queda disponible tras el aporte.
 */
import { money } from '@/utils/money';

export type Frequency = 'biweekly' | 'monthly';

export interface Capacity {
  /** Ingreso mensual conocido (ingresos fijos registrados). */
  monthlyIncome: number;
  /** Gastos fijos mensuales registrados. */
  monthlyFixed: number;
  /** Cuotas de deudas y tarjetas del mes. */
  monthlyDebt: number;
  /** Lo que el usuario dijo que necesita para vivir (comida, transporte). */
  basicNeeds: number;
  /** Promedio de gasto diario observado, por si no hay reserva declarada. */
  avgDailyExpense: number;
  /** Saldo disponible hoy. */
  balance: number;
}

export interface SavingsPlan {
  /** Periodos que faltan hasta la fecha objetivo (null si no hay fecha). */
  periods: number | null;
  /** Lo que haria falta aportar por periodo para llegar a tiempo. */
  requiredPerPeriod: number | null;
  /** Lo maximo que se puede aportar por periodo sin desfinanciarse. */
  safePerPeriod: number;
  /** El que se recomienda: el menor entre lo necesario y lo seguro. */
  suggestedPerPeriod: number;
  /** Lo que quedaria libre despues del aporte sugerido, en ese periodo. */
  leftAfter: number;
  /** Con el aporte seguro, ¿cuando se alcanzaria la meta? */
  periodsAtSafePace: number | null;
  /** true si la capacidad es una estimacion, no un dato declarado. */
  isEstimate: boolean;
  /** true si no hay datos suficientes para calcular nada fiable. */
  needsMoreData: boolean;
  headline: string;
  detail: string;
}

const PERIODS_PER_MONTH: Record<Frequency, number> = {
  biweekly: 2,
  monthly: 1,
};

export const FREQUENCY_LABEL: Record<Frequency, string> = {
  biweekly: 'quincena',
  monthly: 'mes',
};

/** Periodos completos entre hoy y la fecha objetivo. */
export function periodsUntil(targetDate: string | null, freq: Frequency): number | null {
  if (!targetDate) return null;
  const target = new Date(targetDate + 'T00:00:00');
  const hoy = new Date();
  const dias = Math.ceil((target.getTime() - hoy.getTime()) / 86_400_000);
  if (dias <= 0) return 0;
  const porPeriodo = freq === 'biweekly' ? 15 : 30;
  return Math.max(Math.floor(dias / porPeriodo), 1);
}

export function buildSavingsPlan(input: {
  remaining: number;
  targetDate: string | null;
  frequency: Frequency;
  capacity: Capacity;
}): SavingsPlan {
  const { remaining, targetDate, frequency, capacity } = input;
  const porMes = PERIODS_PER_MONTH[frequency];
  const etiqueta = FREQUENCY_LABEL[frequency];

  const periods = periodsUntil(targetDate, frequency);
  const requiredPerPeriod =
    periods && periods > 0 ? Math.ceil(remaining / periods) : null;

  // --- Capacidad de ahorro -------------------------------------------
  // Lo que necesita para vivir: lo declarado, o una estimacion a partir
  // del gasto diario observado si no declaro nada.
  const declaro = capacity.basicNeeds > 0;
  const necesidades = declaro
    ? capacity.basicNeeds
    : Math.round(capacity.avgDailyExpense * 30);

  const sobranteMensual =
    capacity.monthlyIncome - capacity.monthlyFixed - capacity.monthlyDebt - necesidades;

  const safePerMonth = Math.max(sobranteMensual, 0);
  const safePerPeriod = Math.floor(safePerMonth / porMes);

  const sinIngresos = capacity.monthlyIncome <= 0;
  const sinReferencia = !declaro && capacity.avgDailyExpense <= 0;
  const needsMoreData = sinIngresos || sinReferencia;

  const suggestedPerPeriod =
    requiredPerPeriod !== null
      ? Math.min(requiredPerPeriod, safePerPeriod > 0 ? safePerPeriod : requiredPerPeriod)
      : safePerPeriod;

  const leftAfter = Math.max(
    Math.floor(safePerMonth / porMes) - suggestedPerPeriod,
    0,
  );

  const periodsAtSafePace =
    safePerPeriod > 0 ? Math.ceil(remaining / safePerPeriod) : null;

  // --- Mensajes -------------------------------------------------------
  let headline: string;
  let detail: string;

  if (remaining <= 0) {
    headline = 'Meta cumplida';
    detail = 'Ya reuniste lo que te propusiste.';
  } else if (needsMoreData) {
    headline = `Faltan ${money(remaining)}`;
    detail = sinIngresos
      ? 'Registra tus ingresos fijos en Ajustes para calcular cuanto puedes ahorrar sin quedarte corto.'
      : 'Dime cuanto necesitas al mes para tus gastos basicos y calculo un aporte seguro.';
  } else if (requiredPerPeriod !== null && periods !== null) {
    if (safePerPeriod <= 0) {
      headline = `Necesitarias ${money(requiredPerPeriod)} por ${etiqueta}`;
      detail =
        `Con tus ingresos y compromisos actuales no queda margen para ahorrar. ` +
        `Tendrias que recortar algun gasto o mover la fecha.`;
    } else if (requiredPerPeriod <= safePerPeriod) {
      headline = `Aporta ${money(requiredPerPeriod)} por ${etiqueta}`;
      detail =
        `Asi llegas a tiempo en ${periods} ${etiqueta}s. ` +
        `Te quedarian ${money(leftAfter)} libres cada ${etiqueta}.`;
    } else {
      headline = `Puedes aportar ${money(safePerPeriod)} por ${etiqueta}`;
      detail =
        `Para llegar en la fecha harian falta ${money(requiredPerPeriod)}, pero eso te ` +
        `dejaria sin cubrir lo basico. A este ritmo llegarias en ` +
        `${periodsAtSafePace} ${etiqueta}s.`;
    }
  } else {
    headline =
      safePerPeriod > 0
        ? `Puedes aportar ${money(safePerPeriod)} por ${etiqueta}`
        : `Faltan ${money(remaining)}`;
    detail =
      safePerPeriod > 0
        ? `A ese ritmo llegarias en ${periodsAtSafePace} ${etiqueta}s. ` +
          `Ponle una fecha objetivo si quieres apurarlo.`
        : 'Con tus compromisos actuales no queda margen de ahorro este mes.';
  }

  return {
    periods,
    requiredPerPeriod,
    safePerPeriod,
    suggestedPerPeriod: Math.max(suggestedPerPeriod, 0),
    leftAfter,
    periodsAtSafePace,
    isEstimate: !declaro,
    needsMoreData,
    headline,
    detail,
  };
}
