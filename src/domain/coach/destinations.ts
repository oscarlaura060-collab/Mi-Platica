/**
 * TODOS los destinos a los que el usuario puede mandar un ingreso.
 *
 * Antes el coach proponia un reparto y algunas lineas quedaban como "solo
 * informativo" porque la app no sabia ejecutarlas. Eso era una mentira a
 * medias: si se muestra una linea, debe poder hacerse. Aqui se arma la
 * lista completa de destinos EJECUTABLES, con la sugerencia precargada.
 */
import { listDebts } from '@/db/repositories/debts';
import { listCreditCards } from '@/db/repositories/creditCards';
import { listInvestments } from '@/db/repositories/investments';
import { listGoals } from '@/db/repositories/goals';
import { pendingList } from '@/db/repositories/fixedExpenses';
import {
  monthlyToEffectiveAnnualBp,
  netAnnualRateBp,
} from '@/domain/invest/projection';
import { prioritize } from '@/domain/debt/amortization';
import { money } from '@/utils/money';

export type DestinationKind = 'fixed' | 'card' | 'debt' | 'invest' | 'goal';

export interface Destination {
  key: string;
  kind: DestinationKind;
  /** Id de la fila correspondiente segun `kind`. */
  refId: number;
  label: string;
  hint: string;
  color: string;
  /** Tope razonable: la cuota, el saldo pendiente, etc. 0 = sin tope. */
  cap: number;
  /** Monto que el coach sugiere. El usuario lo puede cambiar. */
  suggested: number;
  /** Para ordenar: lo mas urgente primero. */
  priority: number;
}

export interface DestinationPlan {
  total: number;
  destinations: Destination[];
  /** Lo que la sugerencia deja sin asignar (queda en la cuenta). */
  suggestedFree: number;
  /**
   * Parte del libre que se puede gastar sin culpa. Solo aparece cuando
   * TODO lo necesario quedo cubierto: un presupuesto que no deja espacio
   * para nada agradable no se sostiene, pero proponer un gusto cuando
   * faltan pagos seria irresponsable.
   */
  funMoney: number;
  /** Mensaje de cabecera, calido y concreto. */
  headline: string;
  /** Explicacion corta de como quedo el reparto. */
  detail: string;
  /** Compromisos que NO alcanzan a cubrirse con este ingreso. */
  uncovered: { label: string; amount: number }[];
}

/**
 * Arma los destinos y reparte el ingreso en este orden:
 *   1. Gastos fijos del mes sin pagar
 *   2. Tarjetas con pago proximo
 *   3. Cuotas / deudas segun la estrategia elegida
 *   4. Ahorro e inversion
 * Lo que sobre queda libre.
 */
export async function buildDestinations(
  amount: number,
  opts: {
    strategy: 'avalanche' | 'snowball';
    splitDebt: number;
    splitSave: number;
    balance: number;
  },
): Promise<DestinationPlan> {
  const [fixed, cards, debts, investments, goals] = await Promise.all([
    pendingList(),
    listCreditCards(),
    listDebts('active'),
    listInvestments(),
    listGoals('active'),
  ]);

  const destinations: Destination[] = [];

  // --- 1. Gastos fijos pendientes -----------------------------------
  for (const f of fixed) {
    destinations.push({
      key: `fixed-${f.id}`,
      kind: 'fixed',
      refId: f.id,
      label: f.name,
      hint: `Gasto fijo del mes · vence el dia ${f.due_day}`,
      color: f.color,
      cap: f.amount,
      suggested: 0,
      priority: 1,
    });
  }

  // --- 2. Tarjetas ---------------------------------------------------
  for (const c of cards) {
    const usado = Math.max(c.used, 0);
    if (usado <= 0) continue;
    const minimo = c.monthly_installments > 0 ? c.monthly_installments : usado;
    destinations.push({
      key: `card-${c.id}`,
      kind: 'card',
      refId: c.id,
      label: c.name,
      hint:
        c.monthly_installments > 0
          ? `Cuotas del mes ${money(c.monthly_installments)} · debes ${money(usado)}`
          : `Debes ${money(usado)} · pagarlo libera cupo`,
      color: c.color,
      cap: usado,
      suggested: 0,
      priority: 2,
    });
  }

  // --- 3. Deudas -----------------------------------------------------
  const ordenadas = prioritize(
    debts.filter((d) => d.outstanding > 0),
    opts.strategy,
  );
  for (const d of ordenadas) {
    const ea = monthlyToEffectiveAnnualBp(d.monthly_rate_bp);
    destinations.push({
      key: `debt-${d.id}`,
      kind: 'debt',
      refId: d.id,
      label: d.name,
      hint:
        `Saldo ${money(d.outstanding)}` +
        (d.monthly_rate_bp > 0 ? ` · cuesta ${(ea / 100).toFixed(1)}% E.A.` : ' · sin interes'),
      color: d.color,
      cap: d.outstanding,
      suggested: 0,
      priority: 3,
    });
  }

  // --- 4a. Metas de ahorro -------------------------------------------
  // Van ANTES de las inversiones porque una meta tiene un proposito que
  // la persona escribio ("viaje", "computador"): aportarle es una
  // decision que ya tomo. Una inversion generica no compite con eso.
  for (const g of goals) {
    if (g.remaining <= 0) continue;
    destinations.push({
      key: `goal-${g.id}`,
      kind: 'goal',
      refId: g.id,
      label: g.name,
      hint:
        `Meta de ahorro · llevas ${money(g.saved)} de ${money(g.target_amount)}` +
        (g.planned_contribution > 0
          ? ` · planeaste ${money(g.planned_contribution)} por ${g.frequency === 'biweekly' ? 'quincena' : 'mes'}`
          : ''),
      color: g.color,
      cap: g.remaining,
      suggested: 0,
      priority: 4,
    });
  }

  // --- 4b. Inversion -------------------------------------------------
  const porRendimiento = [...investments].sort(
    (a, b) =>
      netAnnualRateBp(b.annual_rate_bp, b.fee_rate_bp) -
      netAnnualRateBp(a.annual_rate_bp, a.fee_rate_bp),
  );
  for (const i of porRendimiento) {
    const neto = netAnnualRateBp(i.annual_rate_bp, i.fee_rate_bp);
    destinations.push({
      key: `invest-${i.id}`,
      kind: 'invest',
      refId: i.id,
      label: i.name,
      hint:
        `Rinde ${(neto / 100).toFixed(1)}% neto anual · ` +
        (i.liquidity === 'immediate' ? 'puedes sacarlo cuando quieras' : 'a termino'),
      color: i.color,
      cap: 0,
      suggested: 0,
      priority: 5,
    });
  }

  // --- Reparto sugerido ---------------------------------------------
  let left = amount;

  // Gastos fijos: solo lo que el saldo actual no alcanza a cubrir.
  const fixedTotal = fixed.reduce((a, f) => a + f.amount, 0);
  let faltaFijos = Math.max(fixedTotal - Math.max(opts.balance, 0), 0);
  for (const dest of destinations.filter((d) => d.kind === 'fixed')) {
    if (left <= 0 || faltaFijos <= 0) break;
    const take = Math.min(dest.cap, faltaFijos, left);
    dest.suggested = take;
    left -= take;
    faltaFijos -= take;
  }

  // Tarjetas: al menos las cuotas del mes.
  for (const dest of destinations.filter((d) => d.kind === 'card')) {
    if (left <= 0) break;
    const card = cards.find((c) => c.id === dest.refId);
    const minimo = card?.monthly_installments ?? 0;
    if (minimo <= 0) continue;
    const take = Math.min(minimo, dest.cap, left);
    dest.suggested = take;
    left -= take;
  }

  // Excedente: % a deudas y % a ahorro.
  const excedente = left;
  if (excedente > 0) {
    const hayDeuda = destinations.some((d) => d.kind === 'debt');
    const pctDeuda = hayDeuda ? opts.splitDebt : 0;
    const pctAhorro = hayDeuda ? opts.splitSave : opts.splitSave + opts.splitDebt;

    let aDeuda = Math.round((excedente * pctDeuda) / 100);
    let aAhorro = Math.round((excedente * pctAhorro) / 100);

    for (const dest of destinations.filter((d) => d.kind === 'debt')) {
      if (aDeuda <= 0) break;
      const take = Math.min(aDeuda, dest.cap);
      dest.suggested = take;
      aDeuda -= take;
      left -= take;
    }

    // El ahorro va primero a las metas (tienen un proposito que la
    // persona ya escribio) y lo que sobre, a inversion. Una meta no se
    // pasa de lo que le falta: aportarle de mas no la cumple dos veces.
    for (const dest of destinations.filter((d) => d.kind === 'goal')) {
      if (aAhorro <= 0) break;
      const take = Math.min(aAhorro, dest.cap);
      dest.suggested = take;
      aAhorro -= take;
      left -= take;
    }

    const primerAhorro = destinations.find((d) => d.kind === 'invest');
    if (primerAhorro && aAhorro > 0) {
      primerAhorro.suggested = aAhorro;
      left -= aAhorro;
    }
  }

  destinations.sort((a, b) => a.priority - b.priority || b.suggested - a.suggested);

  // --- Lo que no alcanzo a cubrirse ----------------------------------
  const uncovered: { label: string; amount: number }[] = [];
  for (const dest of destinations) {
    if (dest.kind === 'fixed' && dest.suggested < dest.cap) {
      const falta = dest.cap - dest.suggested;
      // Solo cuenta si el saldo tampoco lo cubre.
      if (falta > 0 && opts.balance <= 0) {
        uncovered.push({ label: dest.label, amount: falta });
      }
    }
  }

  const libre = Math.max(left, 0);
  const comprometido = destinations.reduce((a, d) => a + d.suggested, 0);

  // --- Plata para darse un gusto -------------------------------------
  // Solo si no quedo nada sin cubrir. Es el 15% de lo libre, con tope
  // para que no se coma el colchon de un ingreso grande.
  const todoCubierto = uncovered.length === 0;
  const funMoney =
    todoCubierto && libre > 0 ? Math.min(Math.round(libre * 0.15), 15000000) : 0;

  // --- Mensajes -------------------------------------------------------
  let headline: string;
  let detail: string;

  if (uncovered.length > 0) {
    const falta = uncovered.reduce((a, u) => a + u.amount, 0);
    headline = `Cubre primero lo que viene`;
    detail =
      `Con estos ${money(amount)} alcanzas para buena parte, pero quedan ` +
      `${money(falta)} sin cubrir (${uncovered.map((u) => u.label).join(', ')}). ` +
      `Mira si puedes mover una fecha o ajustar algun monto.`;
  } else if (comprometido === 0) {
    headline = `Llegaron ${money(amount)}`;
    detail =
      'No tienes pagos pendientes ahora mismo. Puedes mandar algo a una meta ' +
      'o dejarlo en tu cuenta.';
  } else if (funMoney > 0) {
    headline = `Separa tus pagos y te quedan ${money(libre)}`;
    detail =
      `Ya quedan cubiertos ${money(comprometido)} de compromisos. De lo que ` +
      `sobra, ${money(funMoney)} son para darte un gusto sin remordimiento: ` +
      `un helado, una salida, lo que quieras.`;
  } else {
    headline = `Asi queda tu ${money(amount)}`;
    detail =
      `${money(comprometido)} van a lo que ya tenias comprometido y ` +
      `${money(libre)} quedan disponibles para el resto del periodo.`;
  }

  return {
    total: amount,
    destinations,
    suggestedFree: libre,
    funMoney,
    headline,
    detail,
    uncovered,
  };
}
