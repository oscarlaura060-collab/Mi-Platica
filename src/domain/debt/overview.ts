/**
 * EL RESUMEN DE TUS DEUDAS
 *
 * Responde cuatro preguntas en el orden en que la gente las hace:
 *
 *   ¿Cuanto debo?      el total que falta por pagar
 *   ¿Cuanto me sale?   lo que se va cada mes en cuotas
 *   ¿Cuando salgo?     meses hasta quedar libre
 *   ¿Que pago ya?      lo que vence primero
 *
 * Las tarjetas cuentan como deuda. Dejarlas fuera daria un total mas
 * bonito y mas falso.
 *
 * "Libre en N meses" NO es el total dividido por la cuota: eso ignora
 * los intereses y siempre da de menos. Se calcula deuda por deuda con
 * `monthsToPayoff`, que si los tiene en cuenta, y se toma la que mas
 * tarda, porque libre se queda uno cuando cae la ultima.
 */
import { monthsToPayoff, installmentAmount } from './amortization';

export type DebtStrategy = 'avalanche' | 'snowball';

export const STRATEGY_HELP: Record<DebtStrategy, string> = {
  avalanche: 'Primero la de tasa más alta: pagas menos intereses en total.',
  snowball: 'Primero la deuda más pequeña: ganas motivación más rápido.',
};

export interface UpcomingPayment {
  id: string;
  name: string;
  dueInDays: number;
  amount: number;
  kind: 'loan' | 'debt' | 'credit-card';
  /** Id real de la fila, para navegar al detalle. */
  refId: number;
}

export interface CardSummary {
  id: number;
  name: string;
  color: string;
  amountOwed: number;
  availableCredit: number;
  /** null = la tarjeta no tiene cupo registrado. */
  usagePercent: number | null;
  dueInDays: number | null;
}

export interface DebtOverview {
  total: number;
  monthlyCharge: number;
  /** null = con las cuotas actuales no se termina de pagar, o faltan datos. */
  monthsToFreedom: number | null;
  upcoming: UpcomingPayment[];
  cards: CardSummary[];
  priority: {
    name: string;
    dueInDays: number;
    amount: number;
    refId: number;
    kind: UpcomingPayment['kind'];
  } | null;
  /** true si no hay ninguna deuda ni tarjeta con saldo. */
  isEmpty: boolean;
}

interface DebtLike {
  id: number;
  name: string;
  outstanding: number;
  monthly_rate_bp: number;
  installment_amount: number | null;
  installments_total: number;
  principal: number;
  kind: string;
}

interface CardLike {
  id: number;
  name: string;
  color: string;
  used: number;
  available: number;
  credit_limit: number | null;
  card_rate_bp: number;
  monthly_installments: number;
}

/** La cuota de una deuda: la registrada, o la que sale de sus datos. */
export function cuotaDe(d: DebtLike): number {
  const base =
    d.installment_amount ??
    installmentAmount(d.principal, d.monthly_rate_bp, d.installments_total);
  return Math.min(base, d.outstanding);
}

export function buildDebtOverview(input: {
  debts: DebtLike[];
  cards: CardLike[];
  /** Vencimientos ya calculados por el repositorio, con sus dias. */
  commitments: { debtId: number; name: string; amount: number; daysLeft: number }[];
  /** Dias hasta el proximo pago de cada tarjeta, por id. */
  cardDueDays: Record<number, number | null>;
}): DebtOverview {
  const { debts, cards, commitments, cardDueDays } = input;

  const activas = debts.filter((d) => d.outstanding > 0);
  const conSaldo = cards.filter((c) => c.used > 0);

  const deudaDebts = activas.reduce((a, d) => a + d.outstanding, 0);
  const deudaCards = conSaldo.reduce((a, c) => a + c.used, 0);
  const total = deudaDebts + deudaCards;

  const cuotasDebts = activas.reduce((a, d) => a + cuotaDe(d), 0);
  const cuotasCards = conSaldo.reduce((a, c) => a + c.monthly_installments, 0);
  const monthlyCharge = cuotasDebts + cuotasCards;

  // --- ¿Cuando quedo libre? -------------------------------------------
  // La ultima en caer manda. Si alguna no se termina nunca con su cuota
  // actual, no se inventa una fecha: se devuelve null y la pantalla lo
  // dice con palabras.
  let meses: number | null = 0;
  for (const d of activas) {
    const n = monthsToPayoff(d.outstanding, d.monthly_rate_bp, cuotaDe(d));
    if (n === null) {
      meses = null;
      break;
    }
    meses = Math.max(meses ?? 0, n);
  }
  if (meses !== null) {
    for (const c of conSaldo) {
      if (c.monthly_installments <= 0) {
        // Sin cuota mensual no hay forma honesta de proyectarlo.
        meses = null;
        break;
      }
      const n = monthsToPayoff(c.used, c.card_rate_bp, c.monthly_installments);
      if (n === null) {
        meses = null;
        break;
      }
      meses = Math.max(meses, n);
    }
  }

  // --- Proximos vencimientos -------------------------------------------
  const upcoming: UpcomingPayment[] = [
    ...commitments.map((c) => {
      const d = activas.find((x) => x.id === c.debtId);
      return {
        id: `debt-${c.debtId}`,
        name: c.name,
        dueInDays: c.daysLeft,
        amount: c.amount,
        kind: (d?.kind === 'loan' ? 'loan' : 'debt') as UpcomingPayment['kind'],
        refId: c.debtId,
      };
    }),
    ...conSaldo
      .filter((c) => cardDueDays[c.id] !== null && cardDueDays[c.id] !== undefined)
      .map((c) => ({
        id: `card-${c.id}`,
        name: c.name,
        dueInDays: cardDueDays[c.id] as number,
        amount: c.monthly_installments > 0 ? c.monthly_installments : c.used,
        kind: 'credit-card' as const,
        refId: c.id,
      })),
  ].sort((a, b) => a.dueInDays - b.dueInDays || b.amount - a.amount);

  // --- Tarjetas ---------------------------------------------------------
  const cardSummaries: CardSummary[] = conSaldo.map((c) => {
    const cupo = c.credit_limit ?? 0;
    return {
      id: c.id,
      name: c.name,
      color: c.color,
      amountOwed: c.used,
      availableCredit: Math.max(c.available, 0),
      usagePercent:
        cupo > 0 ? Math.max(0, Math.min(100, Math.round((c.used * 100) / cupo))) : null,
      dueInDays: cardDueDays[c.id] ?? null,
    };
  });

  const primero = upcoming[0] ?? null;

  return {
    total,
    monthlyCharge,
    monthsToFreedom: meses,
    upcoming,
    cards: cardSummaries,
    priority: primero
      ? {
          name: primero.name,
          dueInDays: primero.dueInDays,
          amount: primero.amount,
          refId: primero.refId,
          kind: primero.kind,
        }
      : null,
    isEmpty: activas.length === 0 && conSaldo.length === 0,
  };
}

/** "en 4 días", "mañana", "hoy", "vencido". */
export function plazoTexto(dias: number): string {
  if (dias < 0) return 'vencido';
  if (dias === 0) return 'hoy';
  if (dias === 1) return 'mañana';
  return `en ${dias} días`;
}

/** El texto de "Tu proxima prioridad". Sin datos no se inventa un orden. */
export function priorityText(o: DebtOverview): string {
  if (!o.priority) {
    return 'Agrega tus fechas y tasas para crear un orden personalizado.';
  }
  return (
    `El pago que vence primero es ${o.priority.name} (${plazoTexto(o.priority.dueInDays)}). ` +
    `Te sugerimos pagarlo para evitar cargos adicionales.`
  );
}
