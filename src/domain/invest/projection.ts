/**
 * Matematica de inversion a largo plazo. Todo en centavos y tasas en
 * basis points. Las tasas de inversion se manejan EFECTIVAS ANUALES (E.A.),
 * que es como las publican los bancos en Colombia; las de deuda se manejan
 * nominales mensuales (m.v.), que es como las cobran. Aqui estan las
 * conversiones para poder compararlas de verdad.
 */

const bp = (v: number) => v / 10_000;

/** Tasa mensual (m.v.) -> efectiva anual. 2% m.v. => 26,82% E.A. */
export function monthlyToEffectiveAnnualBp(monthlyRateBp: number): number {
  const i = bp(monthlyRateBp);
  return Math.round((Math.pow(1 + i, 12) - 1) * 10_000);
}

/** Efectiva anual -> equivalente mensual. */
export function effectiveAnnualToMonthlyBp(annualRateBp: number): number {
  const a = bp(annualRateBp);
  return Math.round((Math.pow(1 + a, 1 / 12) - 1) * 10_000);
}

/**
 * Rentabilidad NETA: le quita comisiones/impuestos a la bruta.
 * Es la unica cifra honesta para comparar contra una deuda.
 */
export function netAnnualRateBp(annualRateBp: number, feeRateBp: number): number {
  return Math.max(annualRateBp - feeRateBp, -10_000);
}

/**
 * Rentabilidad REAL: lo que de verdad ganas despues de la inflacion.
 *   real = (1 + nominal) / (1 + inflacion) - 1
 * Si tu CDT da 9% E.A. y la inflacion es 5%, no ganaste 9%: ganaste 3,8%.
 */
export function realAnnualRateBp(nominalBp: number, inflationBp: number): number {
  const r = (1 + bp(nominalBp)) / (1 + bp(inflationBp)) - 1;
  return Math.round(r * 10_000);
}

export interface ProjectionPoint {
  month: number;
  contributed: number;
  balance: number;
  yields: number;
}

/**
 * Valor futuro con aportes mensuales al final de cada mes:
 *   FV = P(1+r)^n + C * ((1+r)^n - 1) / r
 * Devuelve la serie mes a mes para poder graficarla.
 */
export function project(
  principal: number,
  monthlyContribution: number,
  annualRateBp: number,
  months: number,
): ProjectionPoint[] {
  const r = bp(effectiveAnnualToMonthlyBp(annualRateBp));
  const out: ProjectionPoint[] = [];
  let balance = principal;
  let contributed = principal;

  for (let m = 1; m <= months; m++) {
    balance = Math.round(balance * (1 + r)) + monthlyContribution;
    contributed += monthlyContribution;
    out.push({
      month: m,
      contributed,
      balance,
      yields: balance - contributed,
    });
  }
  return out;
}

/** Atajo: solo el valor final. */
export function futureValue(
  principal: number,
  monthlyContribution: number,
  annualRateBp: number,
  months: number,
): number {
  if (months <= 0) return principal;
  const serie = project(principal, monthlyContribution, annualRateBp, months);
  return serie[serie.length - 1].balance;
}

/** Cuantos meses para alcanzar una meta con cierto aporte mensual. */
export function monthsToReach(
  target: number,
  principal: number,
  monthlyContribution: number,
  annualRateBp: number,
  maxMonths = 1200,
): number | null {
  if (principal >= target) return 0;
  if (monthlyContribution <= 0 && annualRateBp <= 0) return null;
  const r = bp(effectiveAnnualToMonthlyBp(annualRateBp));
  let balance = principal;
  for (let m = 1; m <= maxMonths; m++) {
    balance = balance * (1 + r) + monthlyContribution;
    if (balance >= target) return m;
  }
  return null;
}

/** Aporte mensual necesario para llegar a la meta en N meses. */
export function requiredMonthly(
  target: number,
  principal: number,
  annualRateBp: number,
  months: number,
): number {
  if (months <= 0) return Math.max(target - principal, 0);
  const r = bp(effectiveAnnualToMonthlyBp(annualRateBp));
  const growth = Math.pow(1 + r, months);
  if (r === 0) return Math.max(Math.round((target - principal) / months), 0);
  const needed = (target - principal * growth) * (r / (growth - 1));
  return Math.max(Math.round(needed), 0);
}
