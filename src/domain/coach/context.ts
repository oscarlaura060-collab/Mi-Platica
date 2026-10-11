import { listAccounts, totalBalance } from '@/db/repositories/accounts';
import { listDebts, overdueDebts, upcomingCommitments } from '@/db/repositories/debts';
import { avgDailyExpense, spentToday } from '@/db/repositories/stats';
import { getNumberSetting, listCoachRules } from '@/db/repositories/settings';
import {
  pendingOccurrences,
  pendingThisMonth,
  monthlyFixedTotal,
  trimmable,
} from '@/db/repositories/fixedExpenses';
import { listInvestments } from '@/db/repositories/investments';
import { nextIncome } from '@/db/repositories/fixedIncomes';
import { listGoals } from '@/db/repositories/goals';
import {
  cardDates,
  listCreditCards,
} from '@/db/repositories/creditCards';
import { netAnnualRateBp } from '@/domain/invest/projection';
import type { CoachContext, Severity } from './types';

/**
 * Arma el snapshot que consume el motor de reglas. Una sola pasada a la BD
 * (~12 consultas indexadas) => suficientemente rapido para correr en cada
 * cambio de monto del teclado sin que se sienta.
 */
export async function buildCoachContext(): Promise<CoachContext> {
  const [
    accounts,
    total,
    debts,
    commitmentsRaw,
    overdue,
    avg,
    today,
    buffer,
    rulesRows,
    fixedPendingRows,
    fixedPendingTotal,
    fixedMonthlyTotal,
    trimmableRows,
    investmentRows,
  ] = await Promise.all([
    listAccounts(),
    totalBalance(),
    listDebts('active'),
    upcomingCommitments(15),
    overdueDebts(),
    avgDailyExpense(30),
    spentToday(),
    getNumberSetting('emergency_buffer', 0),
    listCoachRules(),
    pendingOccurrences(),
    pendingThisMonth(),
    monthlyFixedTotal(),
    trimmable(),
    listInvestments(),
  ]);

  // Las cuotas de tarjeta son compromisos del mes igual que una cuota de
  // prestamo: si no se cuentan, el coach cree que hay mas plata libre.
  const cards = await listCreditCards();

  // Para que los consejos puedan decir "hasta el [fecha]" con datos
  // reales en vez de una frase generica.
  const [proximoIngreso, metas] = await Promise.all([
    nextIncome(),
    listGoals('active'),
  ]);
  const metaCercana = metas
    .filter((g) => g.remaining > 0)
    .sort((a, b) => a.remaining - b.remaining)[0];

  const rules: CoachContext['rules'] = {};
  for (const r of rulesRows) {
    let params: Record<string, number> = {};
    try {
      params = JSON.parse(r.params_json) as Record<string, number>;
    } catch {
      params = {};
    }
    rules[r.code] = {
      enabled: r.enabled === 1,
      severity: r.severity as Severity,
      params,
    };
  }
  if (rules.COMMITMENTS_AT_RISK && !rules.COMMITMENTS_AT_RISK.params.horizonDays) {
    rules.COMMITMENTS_AT_RISK.params.horizonDays = 15;
  }

  const cardCommitments = cards
    .filter((c) => c.monthly_installments > 0 || c.used > 0)
    .map((c) => {
      const d = cardDates(c);
      return {
        debtId: -c.id, // negativo: no es una fila de `debts`
        amount: c.monthly_installments > 0 ? c.monthly_installments : c.used,
        daysLeft: d.daysToPayment ?? 30,
        name: c.name,
      };
    });
  const committedTotal =
    commitmentsRaw.reduce((a, c) => a + c.amount, 0) +
    cardCommitments.reduce((a, c) => a + c.amount, 0);

  return {
    accounts,
    totalBalance: total,
    debts,
    commitments: [
      ...commitmentsRaw.map((c) => ({
        debtId: c.debt.id,
        amount: c.amount,
        daysLeft: c.daysLeft,
        name: c.debt.name,
      })),
      ...cardCommitments,
    ].sort((a, b) => a.daysLeft - b.daysLeft),
    committedTotal,
    // Cada VENCIMIENTO por separado: un gasto quincenal entra dos veces,
    // con su propia fecha, porque son dos salidas de plata distintas.
    fixedPending: fixedPendingRows.map((o) => ({
      id: o.expense.id,
      name:
        o.expense.occurrences === 2
          ? `${o.expense.name} (${o.occurrence}a quincena)`
          : o.expense.name,
      amount: o.amount,
      dueDay: o.dueDay,
    })),
    fixedPendingTotal,
    fixedMonthlyTotal,
    trimmable: trimmableRows.map((f) => ({
      id: f.id,
      name: f.name,
      amount: f.monthly_total,
    })),
    availableReal: total - fixedPendingTotal - committedTotal,
    investments: investmentRows.map((i) => ({
      id: i.id,
      name: i.name,
      netAnnualBp: netAnnualRateBp(i.annual_rate_bp, i.fee_rate_bp),
      liquidity: i.liquidity,
    })),
    nextIncome: proximoIngreso,
    topGoal: metaCercana
      ? {
          id: metaCercana.id,
          name: metaCercana.name,
          remaining: metaCercana.remaining,
          saved: metaCercana.saved,
        }
      : null,
    overdueDebtIds: overdue.map((d) => d.id),
    avgDailyExpense: avg,
    spentToday: today,
    emergencyBuffer: buffer,
    rules,
  };
}
