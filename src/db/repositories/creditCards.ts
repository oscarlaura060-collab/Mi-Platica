import { all, one, run, tx } from '../index';
import { installmentAmount } from '@/domain/debt/amortization';
import { validatePaymentAmount } from '@/domain/debt/payments';
import { dayKey, nowIso } from '@/utils/date';

export interface CreditCard {
  id: number;
  name: string;
  color: string;
  emoji: string | null;
  currency: string;
  credit_limit: number | null;
  statement_day: number | null;
  payment_due_day: number | null;
  card_rate_bp: number;
  archived: 0 | 1;
  /** Deuda actual con el banco (positivo = debes). */
  used: number;
  /** Cupo que te queda. */
  available: number;
  /** Suma de las cuotas mensuales de los planes activos. */
  monthly_installments: number;
  active_plans: number;
}

export interface InstallmentPlan {
  id: number;
  account_id: number;
  transaction_id: number | null;
  description: string;
  principal: number;
  installments_total: number;
  monthly_rate_bp: number;
  installment_amount: number;
  installments_paid: number;
  first_due_date: string;
  status: 'active' | 'paid' | 'cancelled';
}

export async function listCreditCards() {
  return all<CreditCard>(
    'SELECT * FROM v_credit_cards WHERE archived = 0 ORDER BY name',
  );
}

export async function getCreditCard(id: number) {
  return one<CreditCard>('SELECT * FROM v_credit_cards WHERE id = ?', [id]);
}

/** Deuda total en tarjetas: es deuda real, aunque no viva en `debts`. */
export async function creditCardDebtTotal(): Promise<number> {
  const r = await one<{ total: number | null }>(
    `SELECT SUM(CASE WHEN used > 0 THEN used ELSE 0 END) AS total
     FROM v_credit_cards WHERE archived = 0`,
  );
  return r?.total ?? 0;
}

/** Cuotas de tarjeta que caen este mes: el coach las trata como compromiso. */
export async function monthlyCardInstallments(): Promise<number> {
  const r = await one<{ total: number | null }>(
    `SELECT COALESCE(SUM(installment_amount), 0) AS total
     FROM installment_plans WHERE status = 'active'`,
  );
  return r?.total ?? 0;
}

export async function listPlans(accountId?: number) {
  return all<InstallmentPlan & { account_name: string }>(
    `SELECT p.*, a.name AS account_name
     FROM installment_plans p
     JOIN accounts a ON a.id = p.account_id
     WHERE p.status = 'active' AND (? IS NULL OR p.account_id = ?)
     ORDER BY p.created_at DESC`,
    [accountId ?? null, accountId ?? null],
  );
}

/**
 * Registra una compra diferida a cuotas con tarjeta.
 *
 * La transaccion de gasto afecta el cupo por el TOTAL (asi lo hace el
 * banco) y el plan guarda como te lo van a cobrar mes a mes.
 */
export async function createInstallmentPurchase(input: {
  accountId: number;
  amount: number;
  installments: number;
  monthlyRateBp: number;
  description: string;
  categoryId?: number | null;
  occurredAt?: string;
}) {
  const occurredAt = input.occurredAt ?? nowIso();
  const cuota = installmentAmount(
    input.amount,
    input.monthlyRateBp,
    input.installments,
  );

  const card = await getCreditCard(input.accountId);
  const dueDay = card?.payment_due_day ?? 1;
  const base = new Date(occurredAt);
  const firstDue = new Date(base.getFullYear(), base.getMonth() + 1, dueDay);

  let planId = 0;
  await tx(async () => {
    const r = await run(
      `INSERT INTO installment_plans
         (account_id, description, principal, installments_total,
          monthly_rate_bp, installment_amount, first_due_date)
       VALUES (?,?,?,?,?,?,?)`,
      [
        input.accountId,
        input.description.trim() || 'Compra a cuotas',
        input.amount,
        input.installments,
        input.monthlyRateBp,
        cuota,
        dayKey(firstDue),
      ],
    );
    planId = r.lastInsertRowId as number;

    const txRow = await run(
      `INSERT INTO transactions
         (type, amount, account_id, category_id, installment_plan_id, note,
          occurred_at, occurred_day)
       VALUES ('expense', ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.amount,
        input.accountId,
        input.categoryId ?? null,
        planId,
        `${input.description} · ${input.installments} cuotas`,
        occurredAt,
        dayKey(base),
      ],
    );

    await run('UPDATE installment_plans SET transaction_id = ? WHERE id = ?', [
      txRow.lastInsertRowId as number,
      planId,
    ]);
  });

  return { planId, installmentAmount: cuota };
}

export async function cancelPlan(planId: number) {
  await run(`UPDATE installment_plans SET status = 'cancelled' WHERE id = ?`, [planId]);
}

/**
 * Pago de la tarjeta: traslado desde una cuenta real hacia la tarjeta.
 * Como el cupo usado se deriva del libro, pagar LIBERA EL CUPO solo.
 *
 * Si `advancePlans` viene en true, tambien avanza una cuota en cada plan
 * activo (y los cierra al llegar a la ultima).
 */
export async function payCreditCard(input: {
  cardId: number;
  fromAccountId: number;
  amount: number;
  advancePlans?: boolean;
  occurredAt?: string;
}) {
  const card = await getCreditCard(input.cardId);
  if (!card || card.used <= 0) throw new Error('La tarjeta no tiene saldo pendiente.');
  validatePaymentAmount(input.amount, card.used);
  const source = await one<{ balance: number }>(
    'SELECT balance FROM v_account_balances WHERE id = ? AND archived = 0', [input.fromAccountId],
  );
  if (!source || input.fromAccountId === input.cardId || source.balance < input.amount) {
    throw new Error('La cuenta seleccionada no tiene saldo suficiente para este pago.');
  }
  const planBalance = await one<{ total: number }>(
    `SELECT COALESCE(SUM(installment_amount),0) AS total
     FROM installment_plans
     WHERE account_id = ? AND status = 'active' AND installments_paid < installments_total`,
    [input.cardId],
  );
  // Un pago parcial no debe marcar cuotas como pagadas. Solo avanzamos los
  // planes cuando el abono alcanza al menos todas las cuotas vigentes.
  const advancePlans = Boolean(input.advancePlans) && input.amount >= (planBalance?.total ?? 0);
  const occurredAt = input.occurredAt ?? nowIso();

  await tx(async () => {
    await run(
      `INSERT INTO transactions
         (type, amount, account_id, to_account_id, note, occurred_at, occurred_day)
       VALUES ('transfer', ?, ?, ?, ?, ?, ?)`,
      [
        input.amount,
        input.fromAccountId,
        input.cardId,
        'Pago de tarjeta',
        occurredAt,
        dayKey(new Date(occurredAt)),
      ],
    );

    if (advancePlans) {
      await run(
        `UPDATE installment_plans
            SET installments_paid = MIN(installments_paid + 1, installments_total)
          WHERE account_id = ? AND status = 'active'`,
        [input.cardId],
      );
      await run(
        `UPDATE installment_plans SET status = 'paid'
          WHERE account_id = ? AND status = 'active'
            AND installments_paid >= installments_total`,
        [input.cardId],
      );
    }
  });
}

/**
 * Fechas clave de la tarjeta. Devuelve el proximo corte, el proximo limite
 * de pago y cuantos dias sin interes ganarias comprando hoy.
 */
export function cardDates(card: {
  statement_day: number | null;
  payment_due_day: number | null;
}) {
  const today = new Date();
  const lastDay = (y: number, m: number) => new Date(y, m + 1, 0).getDate();

  const next = (day: number | null) => {
    if (!day) return null;
    const d = Math.min(day, lastDay(today.getFullYear(), today.getMonth()));
    let date = new Date(today.getFullYear(), today.getMonth(), d);
    if (date < new Date(today.getFullYear(), today.getMonth(), today.getDate())) {
      const m = today.getMonth() + 1;
      date = new Date(
        today.getFullYear(),
        m,
        Math.min(day, lastDay(today.getFullYear(), m)),
      );
    }
    return date;
  };

  const statement = next(card.statement_day);
  const payment = next(card.payment_due_day);
  const daysTo = (d: Date | null) =>
    d === null
      ? null
      : Math.round(
          (d.getTime() -
            new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) /
            86_400_000,
        );

  return {
    statement,
    payment,
    daysToStatement: daysTo(statement),
    daysToPayment: daysTo(payment),
  };
}
