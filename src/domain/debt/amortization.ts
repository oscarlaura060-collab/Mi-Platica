/**
 * Matematica financiera de deudas. Todo en centavos (entero) y tasa mensual
 * en basis points (150 = 1,50% mensual).
 *
 * No usamos librerias: son 4 formulas y conviene tenerlas auditables.
 */

export interface AmortRow {
  n: number;
  payment: number;
  interest: number;
  principal: number;
  balance: number;
}

const bpToRate = (bp: number) => bp / 10_000;

/**
 * Cuota fija (sistema frances):
 *   C = P * i / (1 - (1+i)^-n)
 * Con i = 0 => simple division.
 */
export function installmentAmount(
  principal: number,
  monthlyRateBp: number,
  n: number,
): number {
  if (n <= 0) return principal;
  const i = bpToRate(monthlyRateBp);
  if (i === 0) return Math.round(principal / n);
  const factor = 1 - Math.pow(1 + i, -n);
  return Math.round((principal * i) / factor);
}

/** Tabla de amortizacion completa. */
export function schedule(
  principal: number,
  monthlyRateBp: number,
  n: number,
  fixedPayment?: number,
): AmortRow[] {
  const i = bpToRate(monthlyRateBp);
  const payment = fixedPayment ?? installmentAmount(principal, monthlyRateBp, n);
  const rows: AmortRow[] = [];
  let balance = principal;

  for (let k = 1; k <= n && balance > 0; k++) {
    const interest = Math.round(balance * i);
    let principalPart = payment - interest;
    if (principalPart <= 0) break; // la cuota no cubre el interes: deuda eterna
    if (principalPart > balance) principalPart = balance;
    const actualPayment = principalPart + interest;
    balance -= principalPart;
    rows.push({
      n: k,
      payment: actualPayment,
      interest,
      principal: principalPart,
      balance,
    });
  }
  return rows;
}

/** Cuantos meses faltan si abono `payment` cada mes sobre `balance`. */
export function monthsToPayoff(
  balance: number,
  monthlyRateBp: number,
  payment: number,
): number | null {
  if (payment <= 0 || balance <= 0) return null;
  const i = bpToRate(monthlyRateBp);
  if (i === 0) return Math.ceil(balance / payment);
  if (payment <= balance * i) return null; // nunca se paga
  const n = Math.log(payment / (payment - balance * i)) / Math.log(1 + i);
  return Math.ceil(n);
}

/** Interes total que se pagara con ese plan. */
export function totalInterest(
  balance: number,
  monthlyRateBp: number,
  payment: number,
): number {
  const n = monthsToPayoff(balance, monthlyRateBp, payment);
  if (n === null) return 0;
  return schedule(balance, monthlyRateBp, n, payment).reduce(
    (acc, r) => acc + r.interest,
    0,
  );
}

/**
 * Reparte un pago entre interes corriente y capital.
 * El interes del periodo se calcula sobre el saldo pendiente.
 */
export function splitPayment(
  outstanding: number,
  monthlyRateBp: number,
  amount: number,
) {
  const interest = Math.min(Math.round(outstanding * bpToRate(monthlyRateBp)), amount);
  const principal = Math.min(amount - interest, outstanding);
  return { interest, principal };
}

/**
 * Impacto de un abono extraordinario: cuantos meses y cuanto interes ahorra.
 * Esto es lo que el coach muestra para motivar ("este abono te ahorra 3 meses").
 */
export function extraPaymentImpact(
  outstanding: number,
  monthlyRateBp: number,
  monthlyPayment: number,
  extra: number,
) {
  const baseMonths = monthsToPayoff(outstanding, monthlyRateBp, monthlyPayment);
  const baseInterest = totalInterest(outstanding, monthlyRateBp, monthlyPayment);
  const newBalance = Math.max(outstanding - extra, 0);
  const newMonths =
    newBalance === 0 ? 0 : monthsToPayoff(newBalance, monthlyRateBp, monthlyPayment);
  const newInterest =
    newBalance === 0 ? 0 : totalInterest(newBalance, monthlyRateBp, monthlyPayment);

  return {
    monthsSaved:
      baseMonths !== null && newMonths !== null ? baseMonths - newMonths : null,
    interestSaved: Math.max(baseInterest - newInterest, 0),
    newBalance,
  };
}

/**
 * Orden estrategico de salida de capital.
 *  - avalanche: primero la tasa mas alta (optimo matematico).
 *  - snowball : primero el saldo mas pequeno (optimo psicologico).
 */
export function prioritize<
  T extends { outstanding: number; monthly_rate_bp: number; due_day: number },
>(debts: T[], strategy: 'avalanche' | 'snowball'): T[] {
  const active = debts.filter((d) => d.outstanding > 0);
  return [...active].sort((a, b) => {
    if (strategy === 'snowball') {
      if (a.outstanding !== b.outstanding) return a.outstanding - b.outstanding;
      return b.monthly_rate_bp - a.monthly_rate_bp;
    }
    if (a.monthly_rate_bp !== b.monthly_rate_bp) {
      return b.monthly_rate_bp - a.monthly_rate_bp;
    }
    return a.outstanding - b.outstanding;
  });
}
