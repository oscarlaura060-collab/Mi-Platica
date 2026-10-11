/**
 * "Tengo esta plata: la mando a ahorros o pago deuda?"
 *
 * Esta es la decision financiera mas comun y la gente casi siempre la toma
 * con el estomago. Aqui se toma con una comparacion de tasas, que es un
 * arbitraje sencillo:
 *
 *   - Pagar una deuda que te cobra 26% E.A. es una rentabilidad GARANTIZADA
 *     del 26%: cada peso abonado es un peso de interes que no vas a pagar.
 *   - Un CDT al 10% E.A. es una rentabilidad del 10%, y encima le quitan
 *     impuestos.
 *
 * Por eso, salvo excepciones, gana la deuda. Pero hay tres excepciones que
 * el motor respeta y que la regla de "siempre paga deuda primero" ignora:
 *
 *   1. COLCHON. Sin fondo de emergencia, cualquier imprevisto te devuelve
 *      a endeudarte, probablemente mas caro. El colchon va primero.
 *   2. CUOTAS PROXIMAS. La plata comprometida esta semana no se invierte
 *      ni se abona a capital: se separa.
 *   3. LIQUIDEZ. Un CDT a termino no sirve de colchon aunque rente bien.
 *
 * El resultado es un plan con montos concretos, no un consejo generico.
 */
import { money } from '@/utils/money';
import { monthlyToEffectiveAnnualBp, netAnnualRateBp } from './projection';
import { prioritize } from '@/domain/debt/amortization';
import type { DebtProgress } from '@/db/types';
import type { InvestmentProgress } from '@/db/types';

export interface DecisionInput {
  /** Plata disponible a repartir (centavos). */
  amount: number;
  debts: DebtProgress[];
  investments: InvestmentProgress[];
  strategy: 'avalanche' | 'snowball';
  /** Colchon objetivo y cuanto tienes hoy en vehiculos liquidos + cuentas. */
  emergencyBuffer: number;
  liquidSavings: number;
  /** Cuotas que vencen en el horizonte corto (ya calculadas por el coach). */
  committedSoon: number;
  inflationBp: number;
}

export interface DecisionSlice {
  kind: 'buffer' | 'debt' | 'invest' | 'commitment';
  label: string;
  amount: number;
  /** Rentabilidad efectiva anual que "produce" destinar la plata aqui. */
  effectiveAnnualBp: number;
  reason: string;
  debtId?: number;
  investmentId?: number;
}

export interface Decision {
  verdict: 'pay_debt' | 'save' | 'split';
  headline: string;
  explanation: string;
  slices: DecisionSlice[];
  /** Comparacion cruda que sustenta el veredicto. */
  comparison: {
    bestDebtName: string | null;
    bestDebtAnnualBp: number | null;
    bestInvestName: string | null;
    bestInvestNetAnnualBp: number | null;
    bestInvestRealAnnualBp: number | null;
    spreadBp: number | null;
  };
  /** Cuanto te ahorras / ganas en 12 meses con cada opcion. */
  oneYear: { payingDebt: number; investing: number };
}

const bpToPct = (v: number) => (v / 100).toFixed(1) + '%';

export function decide(input: DecisionInput): Decision {
  const {
    amount,
    debts,
    investments,
    strategy,
    emergencyBuffer,
    liquidSavings,
    committedSoon,
    inflationBp,
  } = input;

  const slices: DecisionSlice[] = [];
  let left = amount;

  // --- La deuda mas cara, expresada en efectiva anual ---------------------
  const activeDebts = prioritize(
    debts.filter((d) => d.status === 'active' && d.outstanding > 0),
    strategy,
  );
  const costliest = debts
    .filter((d) => d.status === 'active' && d.outstanding > 0)
    .reduce<DebtProgress | null>(
      (best, d) => (!best || d.monthly_rate_bp > best.monthly_rate_bp ? d : best),
      null,
    );
  const debtAnnualBp = costliest
    ? monthlyToEffectiveAnnualBp(costliest.monthly_rate_bp)
    : null;

  // --- La mejor inversion, NETA de comisiones -----------------------------
  const openInvestments = investments.filter((i) => i.status === 'active');
  const bestInvest = openInvestments.reduce<InvestmentProgress | null>(
    (best, i) => {
      const net = netAnnualRateBp(i.annual_rate_bp, i.fee_rate_bp);
      const bestNet = best ? netAnnualRateBp(best.annual_rate_bp, best.fee_rate_bp) : -1e9;
      return net > bestNet ? i : best;
    },
    null,
  );
  const investNetBp = bestInvest
    ? netAnnualRateBp(bestInvest.annual_rate_bp, bestInvest.fee_rate_bp)
    : null;
  const investRealBp =
    investNetBp === null
      ? null
      : Math.round(
          ((1 + investNetBp / 10_000) / (1 + inflationBp / 10_000) - 1) * 10_000,
        );

  // --- 1. Cuotas comprometidas -------------------------------------------
  if (committedSoon > 0 && left > 0) {
    const take = Math.min(committedSoon, left);
    slices.push({
      kind: 'commitment',
      label: 'Separar para cuotas de este mes',
      amount: take,
      effectiveAnnualBp: 0,
      reason: 'Plata ya comprometida. No es ahorro ni abono: es un pago pendiente.',
    });
    left -= take;
  }

  // --- 2. Colchon de emergencia ------------------------------------------
  const bufferGap = Math.max(emergencyBuffer - liquidSavings, 0);
  if (bufferGap > 0 && left > 0) {
    // Solo hasta la mitad de lo que queda, para no congelar todo el dinero
    // cuando hay deuda cara corriendo.
    const cap = debtAnnualBp && debtAnnualBp > 2500 ? Math.round(left / 2) : left;
    const take = Math.min(bufferGap, cap);
    if (take > 0) {
      slices.push({
        kind: 'buffer',
        label: 'Colchon de emergencia',
        amount: take,
        effectiveAnnualBp: 0,
        reason:
          `Te faltan ${money(bufferGap)} para tu colchon. Sin el, cualquier ` +
          `imprevisto te hace endeudarte de nuevo, casi siempre mas caro.`,
      });
      left -= take;
    }
  }

  // --- 3. El arbitraje: deuda vs inversion --------------------------------
  const spread =
    debtAnnualBp !== null && investNetBp !== null ? debtAnnualBp - investNetBp : null;

  if (left > 0) {
    const debtWins = debtAnnualBp !== null && (investNetBp === null || debtAnnualBp > investNetBp);

    if (debtWins) {
      let rest = left;
      for (const d of activeDebts) {
        if (rest <= 0) break;
        const take = Math.min(rest, d.outstanding);
        slices.push({
          kind: 'debt',
          label: `Abonar a ${d.name}`,
          amount: take,
          effectiveAnnualBp: monthlyToEffectiveAnnualBp(d.monthly_rate_bp),
          reason:
            `Te cuesta ${bpToPct(monthlyToEffectiveAnnualBp(d.monthly_rate_bp))} efectivo ` +
            `anual. Abonar aqui es ganar esa misma tasa, sin riesgo y sin impuestos.`,
          debtId: d.id,
        });
        rest -= take;
      }
      left = rest;
    }

    // Lo que sobre (o todo, si la inversion gana) va al vehiculo de ahorro.
    if (left > 0) {
      const target = bestInvest;
      slices.push({
        kind: 'invest',
        label: target ? `Aportar a ${target.name}` : 'Ahorro / inversion',
        amount: left,
        effectiveAnnualBp: investNetBp ?? 0,
        reason: target
          ? `Rinde ${bpToPct(investNetBp ?? 0)} neto anual` +
            (investRealBp !== null
              ? ` (${bpToPct(investRealBp)} real, descontando inflacion).`
              : '.')
          : 'Aun no registras un vehiculo de inversion. Crea uno para proyectar.',
        investmentId: target?.id,
      });
      left = 0;
    }
  }

  // --- Veredicto y cifras a 12 meses --------------------------------------
  const toDebt = slices
    .filter((s) => s.kind === 'debt')
    .reduce((a, s) => a + s.amount, 0);
  const toInvest = slices
    .filter((s) => s.kind === 'invest' || s.kind === 'buffer')
    .reduce((a, s) => a + s.amount, 0);

  const verdict: Decision['verdict'] =
    toDebt > 0 && toInvest > 0 ? 'split' : toDebt > 0 ? 'pay_debt' : 'save';

  const base = amount - committedSoon > 0 ? amount - committedSoon : amount;
  const oneYear = {
    payingDebt: debtAnnualBp ? Math.round((base * debtAnnualBp) / 10_000) : 0,
    investing: investNetBp ? Math.round((base * investNetBp) / 10_000) : 0,
  };

  let headline: string;
  let explanation: string;

  if (verdict === 'pay_debt') {
    headline = `Paga deuda: ${money(toDebt)} a ${costliest?.name ?? 'tus deudas'}`;
    explanation =
      debtAnnualBp !== null && investNetBp !== null
        ? `Tu deuda cuesta ${bpToPct(debtAnnualBp)} E.A. y tu mejor inversion rinde ` +
          `${bpToPct(investNetBp)} neto. Abonar te deja ${money(
            oneYear.payingDebt - oneYear.investing,
          )} mas en 12 meses que invertir.`
        : `No tienes una inversion que compita con el costo de esta deuda. ` +
          `Cada peso abonado es interes que dejas de pagar.`;
  } else if (verdict === 'save') {
    headline = `Manda ${money(toInvest)} a ahorro`;
    explanation = costliest
      ? `Tu mejor inversion rinde ${bpToPct(investNetBp ?? 0)} neto y tu deuda mas cara ` +
        `cuesta ${bpToPct(debtAnnualBp ?? 0)}: aqui si conviene invertir.`
      : `No tienes deudas activas. Toda esta plata puede trabajar para ti.`;
  } else {
    headline = `Divide: ${money(toDebt)} a deuda y ${money(toInvest)} a ahorro`;
    explanation =
      `Primero aseguras liquidez y luego atacas la deuda cara. ` +
      (spread !== null
        ? `La diferencia de tasas es ${bpToPct(Math.abs(spread))} a favor de ${
            spread > 0 ? 'pagar la deuda' : 'invertir'
          }.`
        : '');
  }

  return {
    verdict,
    headline,
    explanation,
    slices,
    comparison: {
      bestDebtName: costliest?.name ?? null,
      bestDebtAnnualBp: debtAnnualBp,
      bestInvestName: bestInvest?.name ?? null,
      bestInvestNetAnnualBp: investNetBp,
      bestInvestRealAnnualBp: investRealBp,
      spreadBp: spread,
    },
    oneYear,
  };
}
