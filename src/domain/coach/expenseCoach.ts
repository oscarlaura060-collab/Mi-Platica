/**
 * EL SEMAFORO DE UN GASTO
 *
 * Responde una sola pregunta: ¿este gasto cabe en tu mes?
 *
 * Tres respuestas posibles, y ninguna es "no puedes":
 *
 *   manageable  cabe sin desordenar nada
 *   attention   cabe, pero el margen queda corto
 *   risk        puede dejarte sin con que cubrir algo que ya debes
 *
 * `engine.ts` ya decide si un gasto merece ruido (`evaluateExpense`), y
 * esa logica no se repite aqui. Lo que este modulo hace es traducir el
 * contexto a lo que la pantalla necesita mostrar: titulo, explicacion,
 * las tres filas de impacto y el porcentaje de la barra.
 *
 * El coach nunca bloquea. En el estado de riesgo pide una confirmacion
 * extra y dice la consecuencia con todas sus letras, pero la decision
 * siempre es de la persona.
 */
import { money } from '@/utils/money';
import type { CoachContext } from './types';
import type { Category } from '@/db/types';

export type CoachRiskLevel = 'manageable' | 'attention' | 'risk' | 'unknown';

export interface ImpactRow {
  key: string;
  label: string;
  amount: number;
  /** Resalta el valor: es el numero que importa de la fila. */
  emphasis?: 'good' | 'bad';
}

export interface CoachEvaluation {
  level: CoachRiskLevel;
  title: string;
  message: string;
  badge: string;
  /** Titulo de la seccion de impacto. */
  sectionTitle: string;
  rows: ImpactRow[];
  /** 0..100 para la barra. */
  usedPercent: number;
  /** Que mide la barra, para que el numero no quede sin explicacion. */
  barLabel: string;
  /** El consejo del pie, con su titulo y su linea de apoyo. */
  tipTitle: string;
  tipBody: string;
  /** Textos de los botones. El primario es el que el coach recomienda. */
  primaryAction: string;
  secondaryAction: string;
  /** El estado de riesgo exige confirmar dos veces. */
  needsExtraConfirm: boolean;
  /** Compromiso que podria verse afectado, si hay uno. */
  commitment: { name: string; amount: number; daysLeft: number } | null;
  /** Lo que faltaria para cubrir los compromisos. 0 = no falta nada. */
  shortfall: number;
}

/** Umbrales del semaforo. Viven aqui, no repartidos por los componentes. */
export const RISK_THRESHOLDS = {
  /** Desde este % del presupuesto de la categoria, el coach pone atencion. */
  attentionUsagePercent: 80,
  /** Compromisos que caen dentro de estos dias cuentan como proximos. */
  upcomingDays: 7,
  /**
   * Si despues del gasto queda menos de esto de margen libre, el coach
   * avisa aunque no haya presupuesto de categoria.
   */
  thinMarginCents: 50_000 * 100,
} as const;

export interface ExpenseCoachInput {
  amount: number;
  category: Category | null;
  categorySpentThisMonth: number;
  accountName: string;
  accountBalance: number;
  ctx: CoachContext;
}

const pct = (parte: number, total: number) =>
  total <= 0 ? 0 : Math.max(0, Math.min(100, Math.round((parte * 100) / total)));

function diasTexto(d: number) {
  if (d <= 0) return 'hoy';
  if (d === 1) return 'mañana';
  return `en ${d} días`;
}

export function evaluateExpenseForCoach(input: ExpenseCoachInput): CoachEvaluation {
  const { amount, category, categorySpentThisMonth, ctx } = input;

  const presupuesto = category?.monthly_budget ?? 0;
  const hayPresupuesto = presupuesto > 0;

  // --- Compromisos que caen pronto -----------------------------------
  const proximos = ctx.commitments.filter(
    (c) => c.daysLeft <= RISK_THRESHOLDS.upcomingDays,
  );
  const fijosPendientes = ctx.fixedPending.map((f) => ({
    name: f.name,
    amount: f.amount,
    daysLeft: 0,
  }));
  const todos = [
    ...proximos.map((c) => ({
      name: c.name,
      amount: c.amount,
      daysLeft: c.daysLeft,
    })),
    ...fijosPendientes,
  ];
  const compromisosTotal = todos.reduce((a, c) => a + c.amount, 0);

  // El mas urgente: el que vence antes, y a igual fecha el mas caro.
  const masUrgente =
    todos.length > 0
      ? [...todos].sort((a, b) => a.daysLeft - b.daysLeft || b.amount - a.amount)[0]
      : null;

  // --- Cuanta plata queda de verdad ----------------------------------
  // `availableReal` ya descuenta gastos fijos pendientes y cuotas: es el
  // unico numero honesto para decidir si gastar.
  const libreAntes = ctx.availableReal;
  const libreDespues = libreAntes - amount;
  const shortfall = Math.max(-libreDespues, 0);

  // --- ¿Hay con que evaluar? ------------------------------------------
  const sinDatos =
    !hayPresupuesto && compromisosTotal === 0 && ctx.totalBalance <= 0;

  if (sinDatos) {
    return {
      level: 'unknown',
      title: 'Aún estamos conociendo este gasto',
      message: 'No tenemos suficiente información para evaluar su impacto.',
      badge: 'Sin datos suficientes',
      sectionTitle: 'Así queda tu periodo',
      rows: [{ key: 'new', label: 'Gasto nuevo', amount }],
      usedPercent: 0,
      barLabel: 'Sin presupuesto definido',
      tipTitle: 'Ponle un presupuesto a esta categoría.',
      tipBody: 'Así puedo decirte si un gasto cabe o no antes de que lo hagas.',
      primaryAction: 'Confirmar gasto',
      secondaryAction: 'Agregar presupuesto',
      needsExtraConfirm: false,
      commitment: null,
      shortfall: 0,
    };
  }

  // =====================================================================
  // PRIORIDAD 1 · Riesgo: el gasto deja sin cubrir algo que ya se debe
  // =====================================================================
  if (shortfall > 0) {
    const conCompromiso = masUrgente !== null;
    return {
      level: 'risk',
      title: 'Mejor espera',
      message: conCompromiso
        ? `Este gasto puede afectar tu pago de ${masUrgente!.name} ${diasTexto(masUrgente!.daysLeft)}. ` +
          `Te faltarían ${money(shortfall)} para cubrir tus compromisos.`
        : `Después de este gasto te faltarían ${money(shortfall)} para cubrir lo que ya debes este mes.`,
      badge: 'Puede afectar tus compromisos',
      sectionTitle: 'Antes de confirmar',
      rows: [
        { key: 'new', label: 'Gasto nuevo', amount },
        { key: 'commitments', label: 'Compromisos próximos', amount: compromisosTotal },
        {
          key: 'short',
          label: 'Diferencia faltante',
          amount: -shortfall,
          emphasis: 'bad',
        },
      ],
      usedPercent: pct(amount, Math.max(libreAntes, amount)),
      barLabel: 'de tu plata libre',
      tipTitle: 'No es un no para siempre.',
      tipBody: 'Si esperas, podrás decidir con más tranquilidad.',
      primaryAction: 'Cambiar gasto',
      secondaryAction: 'Confirmar de todas formas',
      needsExtraConfirm: true,
      commitment: masUrgente,
      shortfall,
    };
  }

  // =====================================================================
  // PRIORIDAD 2 · Atencion: cabe, pero el margen queda corto
  // =====================================================================
  const gastadoCategoria = categorySpentThisMonth + amount;
  const usoCategoria = hayPresupuesto ? pct(gastadoCategoria, presupuesto) : 0;

  const aprieta = hayPresupuesto
    ? usoCategoria >= RISK_THRESHOLDS.attentionUsagePercent
    : libreDespues < RISK_THRESHOLDS.thinMarginCents;

  const filasPeriodo = (): ImpactRow[] =>
    hayPresupuesto
      ? [
          { key: 'spent', label: 'Gastos registrados', amount: gastadoCategoria },
          {
            key: 'budget',
            label: `Presupuesto de ${(category?.name ?? '').toLowerCase() || 'la categoría'}`,
            amount: presupuesto,
          },
          {
            key: 'left',
            label: 'Te quedarían',
            amount: Math.max(presupuesto - gastadoCategoria, 0),
            emphasis: aprieta ? 'bad' : 'good',
          },
        ]
      : [
          { key: 'new', label: 'Gasto nuevo', amount },
          { key: 'commitments', label: 'Compromisos próximos', amount: compromisosTotal },
          {
            key: 'left',
            label: 'Te quedarían',
            amount: libreDespues,
            emphasis: aprieta ? 'bad' : 'good',
          },
        ];

  const barra = hayPresupuesto
    ? { usedPercent: usoCategoria, barLabel: 'de tu presupuesto' }
    : { usedPercent: pct(amount, Math.max(libreAntes, 1)), barLabel: 'de tu plata libre' };

  if (aprieta) {
    const cuanto = hayPresupuesto
      ? Math.max(presupuesto - gastadoCategoria, 0)
      : libreDespues;
    return {
      level: 'attention',
      title: 'Ojo, te puede apretar',
      message:
        `Después de este gasto te quedarían ${money(cuanto)} ` +
        (hayPresupuesto
          ? `en tu presupuesto de ${(category?.name ?? 'esta categoría').toLowerCase()}.`
          : 'para tus compromisos de la semana.') +
        (ctx.nextIncome
          ? ` Tu próximo ingreso entra ${diasTexto(ctx.nextIncome.daysLeft)}.`
          : ''),
      badge: 'Cerca del límite',
      sectionTitle: 'Así queda tu periodo',
      rows: filasPeriodo(),
      ...barra,
      tipTitle: 'Puedes hacerlo, pero revisa si es prioridad para esta semana.',
      tipBody: 'Si no es urgente, dejarlo para después te da más aire.',
      primaryAction: 'Revisar gasto',
      secondaryAction: 'Confirmar de todas formas',
      needsExtraConfirm: false,
      commitment: masUrgente,
      shortfall: 0,
    };
  }

  // =====================================================================
  // PRIORIDAD 3 · Manejable
  // =====================================================================
  return {
    level: 'manageable',
    title: 'Sí, es manejable',
    message: `Después de este gasto te quedarían ${money(Math.max(libreDespues, 0))} disponibles para tus compromisos inmediatos.`,
    badge: hayPresupuesto ? 'Dentro de tu presupuesto' : 'Te queda margen',
    sectionTitle: 'Así queda tu periodo',
    rows: filasPeriodo(),
    ...barra,
    tipTitle: 'Puedes hacerlo sin desordenar tu plan.',
    tipBody: 'Si quieres, revisamos qué podrías ajustar después.',
    primaryAction: 'Confirmar gasto',
    secondaryAction: 'Cambiar gasto',
    needsExtraConfirm: false,
    commitment: null,
    shortfall: 0,
  };
}

/** Animo inicial sugerido segun el semaforo. Se puede cambiar siempre. */
export function defaultMood(level: CoachRiskLevel): 'worried' | 'neutral' | 'good' {
  if (level === 'risk') return 'worried';
  if (level === 'attention') return 'neutral';
  return 'good';
}
