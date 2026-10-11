/**
 * CUATRO FORMAS DE LLEGAR A UNA META
 *
 * La pregunta no es "¿cuanto tengo que ahorrar?" sino "¿cuanto puedo
 * ahorrar sin quedarme sin plata?". Por eso todas las opciones salen de
 * la CAPACIDAD REAL (ingresos menos gastos fijos, deudas y necesidades)
 * y no de dividir la meta entre los meses que uno quisiera.
 *
 * Las tres primeras son fracciones de esa capacidad; la cuarta nace de
 * la fecha que el usuario eligio y puede perfectamente NO ser viable.
 * Cuando no lo es, se dice con claridad y se propone una fecha alcanzable
 * en vez de cambiarle la meta por su cuenta.
 */
import { money } from '@/utils/money';
import type { Capacity, Frequency } from './plan';
import { FREQUENCY_LABEL } from './plan';

export type OptionKind = 'recommended' | 'intermediate' | 'flexible' | 'target';

export interface SavingsOption {
  kind: OptionKind;
  title: string;
  /** Aporte por periodo (quincena o mes). */
  amount: number;
  frequency: Frequency;
  /** Periodos que tomaria llegar. null = no llega nunca con ese aporte. */
  periods: number | null;
  /** Fecha estimada de llegada. */
  endDate: Date | null;
  /** Cuanto quedaria libre por periodo despues del aporte. */
  leftAfter: number;
  /** ¿Cabe dentro de lo que la persona puede ahorrar? */
  feasible: boolean;
  /** Solo para la opcion de fecha: ¿llega a tiempo? */
  onTime: boolean | null;
  reason: string;
}

export interface OptionsResult {
  options: SavingsOption[];
  /** Cual se destaca. */
  highlight: OptionKind;
  /** Maximo que se puede aportar por periodo sin desfinanciarse. */
  safePerPeriod: number;
  /** true si la capacidad es estimada (no declaro sus gastos basicos). */
  isEstimate: boolean;
  /** Datos que faltan para calcular bien. */
  missing: string[];
  /** Si la fecha elegida no da, esta es una realista. */
  suggestedDate: Date | null;
}

const PERIODS_PER_MONTH: Record<Frequency, number> = { biweekly: 2, monthly: 1 };
const DAYS_PER_PERIOD: Record<Frequency, number> = { biweekly: 15, monthly: 30 };

/** $1.000 en centavos. Los pesos no se parten, los aportes tampoco. */
const MIL = 1_000 * 100;

/**
 * Lo mas chico que se ofrece: $2.000 por periodo. No es un minimo para
 * guardar (a mano se puede poner lo que sea), es el primer escalon que
 * propone la app cuando no hay margen.
 */
const MIN_APORTE = 2 * MIL;

const redondearAMil = (cents: number) => Math.round(cents / MIL) * MIL;

function addPeriods(freq: Frequency, periods: number, from = new Date()): Date {
  const d = new Date(from);
  d.setDate(d.getDate() + DAYS_PER_PERIOD[freq] * periods);
  return d;
}

/** Periodos completos que faltan hasta una fecha. */
function periodsUntilDate(target: string, freq: Frequency): number {
  const dias = Math.ceil(
    (new Date(target + 'T00:00:00').getTime() - Date.now()) / 86_400_000,
  );
  if (dias <= 0) return 0;
  return Math.max(Math.floor(dias / DAYS_PER_PERIOD[freq]), 1);
}

/** Capacidad mensual de ahorro segura, con lo que se sabe del usuario. */
export function safeMonthlyCapacity(capacity: Capacity): {
  safeMonthly: number;
  isEstimate: boolean;
  missing: string[];
} {
  const missing: string[] = [];
  if (capacity.monthlyIncome <= 0) missing.push('tus ingresos fijos');
  if (capacity.monthlyFixed <= 0) missing.push('tus gastos fijos');

  const declaro = capacity.basicNeeds > 0;
  if (!declaro && capacity.avgDailyExpense <= 0) {
    missing.push('cuanto necesitas al mes para lo basico');
  }

  const necesidades = declaro
    ? capacity.basicNeeds
    : Math.round(capacity.avgDailyExpense * 30);

  const safeMonthly = Math.max(
    capacity.monthlyIncome - capacity.monthlyFixed - capacity.monthlyDebt - necesidades,
    0,
  );

  return { safeMonthly, isEstimate: !declaro, missing };
}

export function buildOptions(input: {
  /** Lo que falta por reunir. */
  remaining: number;
  targetDate: string | null;
  frequency: Frequency;
  capacity: Capacity;
}): OptionsResult {
  const { remaining, targetDate, frequency, capacity } = input;
  const porMes = PERIODS_PER_MONTH[frequency];
  const etiqueta = FREQUENCY_LABEL[frequency];

  const { safeMonthly, isEstimate, missing } = safeMonthlyCapacity(capacity);
  const safePerPeriod = Math.floor(safeMonthly / porMes);

  // Meta cumplida: no hay nada que proponer. Sugerir un aporte aqui
  // seria pedirle plata a alguien que ya llego.
  if (remaining <= 0) {
    return {
      options: [],
      highlight: 'recommended',
      safePerPeriod,
      isEstimate,
      missing,
      suggestedDate: null,
    };
  }

  /** Construye una opcion a partir de un aporte por periodo. */
  const make = (
    kind: OptionKind,
    title: string,
    amount: number,
    reason: string,
  ): SavingsOption => {
    // Ningun aporte puede pasarse de lo que falta. Para una meta de
    // $3 no tiene sentido proponer $45.000 "por quincena": se pide lo
    // que falta y se acaba en un solo aporte.
    const monto = Math.min(Math.max(Math.round(amount), 0), Math.max(remaining, 0));
    const periods = monto > 0 ? Math.ceil(remaining / monto) : null;
    return {
      kind,
      title,
      amount: monto,
      frequency,
      periods,
      endDate: periods !== null ? addPeriods(frequency, periods) : null,
      leftAfter: Math.max(safePerPeriod - monto, 0),
      feasible: monto > 0 && monto <= safePerPeriod,
      onTime: null,
      reason,
    };
  };

  const options: SavingsOption[] = [];

  // --- Las tres que nacen de la capacidad ----------------------------
  // Son fracciones del maximo seguro: la recomendada deja margen de
  // sobra, la intermedia aprieta mas y la flexible es la que casi nadie
  // abandona.
  if (safePerPeriod > 0) {
    options.push(
      make(
        'recommended',
        'Recomendada',
        safePerPeriod * 0.6,
        `Avanzas bien y te quedan ${money(Math.round(safePerPeriod * 0.4))} de margen cada ${etiqueta}.`,
      ),
      make(
        'intermediate',
        'Acelerada',
        safePerPeriod * 0.85,
        'Llegas antes, pero el margen queda justo. Sirve si tus gastos son estables.',
      ),
      make(
        'flexible',
        'Tranquila',
        safePerPeriod * 0.35,
        'Un aporte que casi no se siente. Tarda mas, pero es el mas facil de sostener.',
      ),
    );
  } else {
    // Sin margen NO se deja a la persona sin nada que escoger.
    //
    // Que la cuenta de "ingresos menos compromisos" de cero no significa
    // que ahorrar sea imposible: significa que toca arrancar pequeno. Un
    // aporte de 2.000 por quincena vale mas que una meta que nunca se
    // creo. Las opciones se marcan como no holgadas (feasible queda en
    // false) y el motivo lo dice sin adornos, pero se pueden elegir.
    const base =
      capacity.monthlyIncome > 0
        ? [0.01, 0.025, 0.05].map((p) =>
            redondearAMil((capacity.monthlyIncome * p) / porMes),
          )
        : [MIN_APORTE, MIN_APORTE * 2.5, MIN_APORTE * 5];

    // Con un ingreso bajo los tres porcentajes caen en el mismo valor al
    // redondear. Se separan para que de verdad haya tres opciones.
    const pequeno = Math.max(base[0], MIN_APORTE);
    const medio = Math.max(base[1], pequeno + MIL);
    const grande = Math.max(base[2], medio + MIL);

    options.push(
      make(
        'flexible',
        'Para arrancar',
        pequeno,
        `Apenas ${money(pequeno)} cada ${etiqueta}. No te va a desacomodar y la meta deja de ser solo una idea.`,
      ),
      make(
        'recommended',
        'Sostenible',
        medio,
        'Un poco mas, todavia sin apretarte. Es el que la mayoria logra mantener.',
      ),
      make(
        'intermediate',
        'Con esfuerzo',
        grande,
        'Avanzas mas rapido, pero vas a sentirlo. Escogelo solo si tus gastos no se mueven.',
      ),
    );
  }

  // --- La que nace de la fecha elegida -------------------------------
  let suggestedDate: Date | null = null;

  if (targetDate) {
    const periodos = periodsUntilDate(targetDate, frequency);
    if (periodos === 0) {
      options.push({
        kind: 'target',
        title: 'Tu fecha',
        amount: remaining,
        frequency,
        periods: 0,
        endDate: new Date(targetDate + 'T00:00:00'),
        leftAfter: 0,
        feasible: false,
        onTime: false,
        reason: 'Esa fecha ya paso o es muy pronto. Escoge una mas adelante.',
      });
    } else {
      // El aporte para llegar en la fecha, con dos topes de sentido
      // comun: nunca mas de lo que falta, y nunca una miseria. Sin el
      // segundo, una meta de $3 a dos años pedia siete centavos por
      // quincena, que es una respuesta tecnicamente correcta y
      // completamente inutil.
      const requerido = Math.min(
        Math.max(Math.ceil(remaining / periodos), Math.min(MIN_APORTE, remaining)),
        remaining,
      );
      const alcanza = safePerPeriod > 0 && requerido <= safePerPeriod;

      options.push({
        kind: 'target',
        title: 'Tu fecha',
        amount: requerido,
        frequency,
        periods: periodos,
        endDate: new Date(targetDate + 'T00:00:00'),
        leftAfter: Math.max(safePerPeriod - requerido, 0),
        feasible: alcanza,
        onTime: true,
        reason: alcanza
          ? `Con ${money(requerido)} por ${etiqueta} llegas justo en tu fecha.`
          : safePerPeriod > 0
            ? `Necesitarias ${money(requerido)} por ${etiqueta}, pero con tus ` +
              `compromisos solo te sobran ${money(safePerPeriod)}. Es apretado.`
            : `Con tus ingresos y gastos actuales no queda margen para ahorrar.`,
      });

      // Si la fecha no da, se calcula una alcanzable con el maximo seguro.
      if (!alcanza && safePerPeriod > 0) {
        suggestedDate = addPeriods(frequency, Math.ceil(remaining / safePerPeriod));
      }
    }
  }

  // --- Cual se destaca ------------------------------------------------
  // Si la fecha del usuario es viable, se respeta su decision. Si no,
  // manda la recomendada.
  // --- Metas chicas o ya cumplidas ------------------------------------
  // Con el tope de arriba, una meta de $3 deja las cuatro opciones en el
  // mismo monto. Mostrar cuatro tarjetas identicas seria ruido: se deja
  // una sola, que es la respuesta honesta ("ponle los $3 y ya").
  const unicas: SavingsOption[] = [];
  for (const o of options) {
    if (!unicas.some((u) => u.amount === o.amount)) unicas.push(o);
  }
  if (unicas.length < options.length) {
    options.length = 0;
    options.push(
      ...unicas.map((o) =>
        unicas.length === 1
          ? {
              ...o,
              title: 'De una',
              reason: `Te faltan ${money(remaining)}: con un solo aporte la cumples.`,
            }
          : o,
      ),
    );
  }

  const opcionFecha = options.find((o) => o.kind === 'target');
  const highlight: OptionKind =
    opcionFecha?.feasible ? 'target' : safePerPeriod > 0 ? 'recommended' : 'flexible';

  return {
    options,
    highlight,
    safePerPeriod,
    isEstimate,
    missing,
    suggestedDate,
  };
}
