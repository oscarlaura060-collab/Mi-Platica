import { all, one, run, tx } from '../index';
import { dayKey, nowIso, nextDueDate, daysUntil } from '@/utils/date';

export type FixedFrequency = 'monthly' | 'biweekly' | 'weekly' | 'yearly';

export interface FixedExpense {
  id: number;
  name: string;
  amount: number;
  category_id: number | null;
  account_id: number | null;
  due_day: number;
  /** Segundo vencimiento del mes. Solo para quincenales. */
  due_day_2: number | null;
  frequency: FixedFrequency;
  is_essential: 0 | 1;
  auto_remind: 0 | 1;
  emoji: string;
  color: string;
  notes: string | null;
  status: 'active' | 'paused';
}

export interface FixedExpenseStatus extends Omit<FixedExpense, 'notes'> {
  /** 1 o 2 cobros al mes. */
  occurrences: number;
  /** Lo que cuesta al mes en total (amount * occurrences). */
  monthly_total: number;
  paid_first: 0 | 1;
  paid_second: 0 | 1;
  paid_this_month: 0 | 1;
  paid_amount: number;
  today_day: number;
}

/**
 * Un vencimiento concreto: "el arriendo del dia 5", "la segunda quincena
 * del internet". Es la unidad con la que de verdad se trabaja cuando hay
 * gastos quincenales.
 */
export interface Occurrence {
  expense: FixedExpenseStatus;
  /** 1 = primer cobro del mes, 2 = segundo. */
  occurrence: 1 | 2;
  dueDay: number;
  /** Fecha real del proximo vencimiento. */
  dueDate: Date;
  daysLeft: number;
  amount: number;
  paid: boolean;
}

export async function listFixedExpenses(includesPaused = false) {
  return all<FixedExpenseStatus>(
    `SELECT * FROM v_fixed_expense_status
     WHERE (? = 1 OR status = 'active')
     ORDER BY paid_this_month, due_day, amount DESC`,
    [includesPaused ? 1 : 0],
  );
}

export async function getFixedExpense(id: number) {
  return one<FixedExpenseStatus>('SELECT * FROM v_fixed_expense_status WHERE id = ?', [id]);
}

/** Total mensual comprometido, contando dos veces los quincenales. */
export async function monthlyFixedTotal(): Promise<number> {
  const r = await one<{ total: number | null }>(
    `SELECT SUM(monthly_total) AS total FROM v_fixed_expense_status
     WHERE status = 'active'`,
  );
  return r?.total ?? 0;
}

/**
 * Convierte los gastos fijos en vencimientos concretos con su fecha.
 * Es lo que permite decir "el 15 te toca pagar X y el 30 pagar Y".
 */
export function toOccurrences(items: FixedExpenseStatus[]): Occurrence[] {
  const out: Occurrence[] = [];

  for (const f of items) {
    if (f.status !== 'active') continue;

    const dias: { day: number; n: 1 | 2; paid: boolean }[] = [
      { day: f.due_day, n: 1, paid: f.paid_first === 1 },
    ];
    if (f.occurrences === 2 && f.due_day_2 !== null) {
      dias.push({ day: f.due_day_2, n: 2, paid: f.paid_second === 1 });
    }

    for (const d of dias) {
      const dueDate = nextDueDate(d.day);
      out.push({
        expense: f,
        occurrence: d.n,
        dueDay: d.day,
        dueDate,
        daysLeft: daysUntil(dueDate),
        amount: f.amount,
        paid: d.paid,
      });
    }
  }

  return out.sort((a, b) => a.dueDay - b.dueDay);
}

/** Vencimientos de este mes que aun no se pagan. */
export async function pendingOccurrences(): Promise<Occurrence[]> {
  const items = await listFixedExpenses();
  return toOccurrences(items).filter((o) => !o.paid);
}

/**
 * Lo que FALTA por pagar este mes. Este es el numero que el coach resta
 * del saldo para saber cuanta plata esta de verdad libre.
 */
export async function pendingThisMonth(): Promise<number> {
  const pend = await pendingOccurrences();
  return pend.reduce((a, o) => a + o.amount, 0);
}

/** Compatibilidad: la lista plana que usan el coach y el reparto. */
export async function pendingList(): Promise<FixedExpenseStatus[]> {
  const items = await listFixedExpenses();
  return items.filter((f) => f.paid_this_month === 0);
}

/** Gastos fijos NO esenciales: lo primero que el coach sugiere recortar. */
export async function trimmable(): Promise<FixedExpenseStatus[]> {
  return all<FixedExpenseStatus>(
    `SELECT * FROM v_fixed_expense_status
     WHERE status = 'active' AND is_essential = 0
     ORDER BY monthly_total DESC`,
  );
}

export type NewFixedExpense = Pick<FixedExpense, 'name' | 'amount' | 'due_day'> &
  Partial<FixedExpense>;

export async function createFixedExpense(f: NewFixedExpense) {
  const r = await run(
    `INSERT INTO fixed_expenses
       (name, amount, category_id, account_id, due_day, due_day_2, frequency,
        is_essential, auto_remind, emoji, color, notes)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      f.name.trim(),
      f.amount,
      f.category_id ?? null,
      f.account_id ?? null,
      f.due_day,
      f.frequency === 'biweekly' ? (f.due_day_2 ?? null) : null,
      f.frequency ?? 'monthly',
      f.is_essential ?? 1,
      f.auto_remind ?? 1,
      f.emoji ?? '*',
      f.color ?? '#0EA5E9',
      f.notes ?? null,
    ],
  );
  return r.lastInsertRowId as number;
}

export async function updateFixedExpense(id: number, patch: Partial<FixedExpense>) {
  const allowed: (keyof FixedExpense)[] = [
    'name',
    'amount',
    'category_id',
    'account_id',
    'due_day',
    'due_day_2',
    'frequency',
    'is_essential',
    'auto_remind',
    'emoji',
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
  if (!fields.length) return;
  params.push(id);
  await run(
    `UPDATE fixed_expenses SET ${fields.join(', ')}, updated_at = datetime('now') WHERE id = ?`,
    params,
  );
}

export async function deleteFixedExpense(id: number) {
  await run('DELETE FROM fixed_expenses WHERE id = ?', [id]);
}

/** El periodo que identifica un vencimiento dentro del mes. */
function periodFor(occurrence: 1 | 2, isoDate: string): string {
  const ym = isoDate.slice(0, 7);
  return occurrence === 2 ? `${ym}-Q2` : ym;
}

/**
 * Marca pagado UN vencimiento: crea la transaccion real (sale de la
 * cuenta) y registra el periodo para que no vuelva a contarse pendiente.
 */
export async function payFixedExpense(input: {
  fixedExpenseId: number;
  accountId: number;
  amount?: number;
  /** 1 = primer cobro del mes, 2 = segundo (quincenales). */
  occurrence?: 1 | 2;
  occurredAt?: string;
}) {
  const fx = await getFixedExpense(input.fixedExpenseId);
  if (!fx) throw new Error('Gasto fijo no encontrado');

  const amount = input.amount ?? fx.amount;
  const occurredAt = input.occurredAt ?? nowIso();
  const occurrence = input.occurrence ?? 1;
  const period = periodFor(occurrence, occurredAt);

  await tx(async () => {
    const r = await run(
      `INSERT INTO transactions
         (type, amount, account_id, category_id, fixed_expense_id, note,
          occurred_at, occurred_day)
       VALUES ('expense', ?, ?, ?, ?, ?, ?, ?)`,
      [
        amount,
        input.accountId,
        fx.category_id,
        fx.id,
        occurrence === 2 ? `${fx.name} (2a quincena)` : fx.name,
        occurredAt,
        dayKey(new Date(occurredAt)),
      ],
    );
    await run(
      `INSERT INTO fixed_expense_payments
         (fixed_expense_id, transaction_id, amount, period, paid_at)
       VALUES (?,?,?,?,?)
       ON CONFLICT(fixed_expense_id, period) DO UPDATE SET
         amount = excluded.amount,
         transaction_id = excluded.transaction_id,
         paid_at = excluded.paid_at`,
      [fx.id, r.lastInsertRowId as number, amount, period, occurredAt],
    );
  });
}

/** Deshace el pago de un vencimiento (por si se registro por error). */
export async function unpayFixedExpense(
  fixedExpenseId: number,
  occurrence: 1 | 2 = 1,
) {
  const period = periodFor(occurrence, dayKey());
  const row = await one<{ transaction_id: number | null }>(
    `SELECT transaction_id FROM fixed_expense_payments
     WHERE fixed_expense_id = ? AND period = ?`,
    [fixedExpenseId, period],
  );
  await tx(async () => {
    if (row?.transaction_id) {
      await run(`UPDATE transactions SET deleted_at = datetime('now') WHERE id = ?`, [
        row.transaction_id,
      ]);
    }
    await run(
      `DELETE FROM fixed_expense_payments WHERE fixed_expense_id = ? AND period = ?`,
      [fixedExpenseId, period],
    );
  });
}
