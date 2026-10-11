import { all, one, run, tx } from '../index';
import type { Debt, DebtProgress } from '../types';
import { installmentAmount, splitPayment } from '@/domain/debt/amortization';
import { validatePaymentAmount } from '@/domain/debt/payments';
import { dayKey, nowIso } from '@/utils/date';

export async function listDebts(status: 'active' | 'all' = 'active') {
  return all<DebtProgress>(
    `SELECT * FROM v_debt_progress
     WHERE (? = 'all' OR status = 'active')
     ORDER BY CASE status WHEN 'active' THEN 0 WHEN 'paused' THEN 1 ELSE 2 END,
              due_day`,
    [status],
  );
}

export async function getDebt(id: number) {
  return one<DebtProgress>('SELECT * FROM v_debt_progress WHERE id = ?', [id]);
}

export async function getDebtRaw(id: number) {
  return one<Debt>('SELECT * FROM debts WHERE id = ?', [id]);
}

export type NewDebt = Pick<
  Debt,
  'name' | 'principal' | 'installments_total' | 'due_day' | 'start_date'
> &
  Partial<Debt>;

export async function createDebt(d: NewDebt) {
  const cuota =
    d.installment_amount ??
    installmentAmount(d.principal, d.monthly_rate_bp ?? 0, d.installments_total);

  const r = await run(
    `INSERT INTO debts
       (name, creditor, kind, principal, monthly_rate_bp, installments_total,
        installment_amount, due_day, start_date, account_id, color, notes)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      d.name.trim(),
      d.creditor ?? null,
      d.kind ?? 'loan',
      d.principal,
      d.monthly_rate_bp ?? 0,
      d.installments_total,
      cuota,
      d.due_day,
      d.start_date,
      d.account_id ?? null,
      d.color ?? '#EF4444',
      d.notes ?? null,
    ],
  );
  return r.lastInsertRowId as number;
}

export async function updateDebt(id: number, patch: Partial<Debt>) {
  const allowed: (keyof Debt)[] = [
    'name',
    'creditor',
    'kind',
    'principal',
    'monthly_rate_bp',
    'installments_total',
    'installment_amount',
    'due_day',
    'start_date',
    'account_id',
    'color',
    'notes',
    'status',
  ];
  const fields: string[] = [];
  const params: (string | number | null)[] = [];
  for (const k of allowed) {
    if (patch[k] === undefined) continue;
    fields.push(`${k} = ?`);
    params.push(patch[k] as string | number | null);
  }
  if (patch.principal !== undefined) {
    const current = await one<{ status: Debt['status']; paid_principal: number }>(
      `SELECT d.status,
        (SELECT COALESCE(SUM(principal_part),0) FROM debt_payments WHERE debt_id = d.id) AS paid_principal
       FROM debts d WHERE d.id = ?`, [id],
    );
    if (current && patch.principal < current.paid_principal) {
      throw new Error(`No puedes fijar la deuda por debajo de lo ya abonado a capital (${current.paid_principal}).`);
    }
    if (current && patch.status === undefined && current.status !== 'paused') {
      fields.push('status = ?');
      params.push(patch.principal <= current.paid_principal ? 'paid' : 'active');
    }
  }
  if (!fields.length) return;
  params.push(id);
  await run(
    `UPDATE debts SET ${fields.join(', ')}, updated_at = datetime('now') WHERE id = ?`,
    params,
  );
}

export async function deleteDebt(id: number) {
  await run('DELETE FROM debts WHERE id = ?', [id]);
}

/**
 * Registra un abono: crea la transaccion (salida de la cuenta) y la fila de
 * `debt_payments` con el desglose capital/interes, todo en una transaccion
 * SQL para que nunca quede a medias.
 */
export async function payDebt(input: {
  debtId: number;
  accountId: number;
  amount: number;
  isExtra?: boolean;
  note?: string | null;
  occurredAt?: string;
}) {
  const debt = await getDebt(input.debtId);
  if (!debt) throw new Error('Deuda no encontrada');
  validatePaymentAmount(input.amount, debt.outstanding);

  const { interest, principal } = input.isExtra
    ? { interest: 0, principal: Math.min(input.amount, debt.outstanding) }
    : splitPayment(debt.outstanding, debt.monthly_rate_bp, input.amount);

  const occurredAt = input.occurredAt ?? nowIso();
  let txId = 0;

  await tx(async () => {
    const r = await run(
      `INSERT INTO transactions
         (type, amount, account_id, debt_id, note, occurred_at, occurred_day)
       VALUES ('debt_payment', ?, ?, ?, ?, ?, ?)`,
      [
        input.amount,
        input.accountId,
        input.debtId,
        input.note ?? null,
        occurredAt,
        dayKey(new Date(occurredAt)),
      ],
    );
    txId = r.lastInsertRowId as number;

    await run(
      `INSERT INTO debt_payments
         (debt_id, transaction_id, amount, interest_part, principal_part,
          installment_no, is_extra, paid_at, note)
       VALUES (?,?,?,?,?,
         (SELECT COALESCE(MAX(installment_no),0)+1 FROM debt_payments WHERE debt_id = ?),
         ?,?,?)`,
      [
        input.debtId,
        txId,
        input.amount,
        interest,
        principal,
        input.debtId,
        input.isExtra ? 1 : 0,
        occurredAt,
        input.note ?? null,
      ],
    );

    // Si el capital queda en cero, la deuda se marca pagada automaticamente.
    await run(
      `UPDATE debts SET status = 'paid', updated_at = datetime('now')
       WHERE id = ? AND principal - (
         SELECT COALESCE(SUM(principal_part),0) FROM debt_payments WHERE debt_id = ?
       ) <= 0`,
      [input.debtId, input.debtId],
    );
  });

  return { transactionId: txId, interest, principal };
}

export async function debtHistory(debtId: number) {
  return all<{
    id: number;
    amount: number;
    interest_part: number;
    principal_part: number;
    installment_no: number | null;
    is_extra: 0 | 1;
    paid_at: string;
    note: string | null;
  }>(
    `SELECT * FROM debt_payments WHERE debt_id = ? ORDER BY paid_at DESC, id DESC`,
    [debtId],
  );
}

/** Compromisos de los proximos `days` dias: lo que el coach debe proteger. */
export async function upcomingCommitments(days = 15) {
  const debts = await listDebts('active');
  const today = new Date();
  const out: {
    debt: DebtProgress;
    dueDate: string;
    daysLeft: number;
    amount: number;
  }[] = [];

  for (const d of debts) {
    if (d.outstanding <= 0) continue;
    const last = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const day = Math.min(d.due_day, last);
    let due = new Date(today.getFullYear(), today.getMonth(), day);
    if (due.getTime() < new Date(dayKey(today)).getTime()) {
      due = new Date(today.getFullYear(), today.getMonth() + 1, day);
    }
    const daysLeft = Math.round(
      (due.getTime() - new Date(dayKey(today)).getTime()) / 86_400_000,
    );
    if (daysLeft > days) continue;

    const cuota = Math.min(
      d.installment_amount ??
        installmentAmount(d.principal, d.monthly_rate_bp, d.installments_total),
      d.outstanding,
    );
    out.push({ debt: d, dueDate: dayKey(due), daysLeft, amount: cuota });
  }
  return out.sort((a, b) => a.daysLeft - b.daysLeft);
}

/** Suma de cuotas comprometidas en el horizonte dado. */
export async function committedAmount(days = 15) {
  const items = await upcomingCommitments(days);
  return items.reduce((acc, i) => acc + i.amount, 0);
}

/** Deudas con cuota del mes sin pagar y fecha ya vencida. */
export async function overdueDebts() {
  return all<DebtProgress & { last_paid_day: string | null }>(
    `SELECT v.*, (SELECT MAX(date(p.paid_at)) FROM debt_payments p WHERE p.debt_id = v.id) AS last_paid_day
     FROM v_debt_progress v
     WHERE v.status = 'active'
       AND v.outstanding > 0
       AND CAST(strftime('%d','now','localtime') AS INTEGER) > v.due_day
       AND (
         (SELECT COUNT(*) FROM debt_payments p
           WHERE p.debt_id = v.id
             AND strftime('%Y-%m', p.paid_at) = strftime('%Y-%m','now','localtime')) = 0
       )`,
  );
}
