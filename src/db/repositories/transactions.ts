import { all, one, run } from '../index';
import type { TransactionRow, TxType } from '../types';
import { dayKey, nowIso } from '@/utils/date';

const SELECT_ROW = `
  SELECT t.*,
         c.name AS category_name, c.emoji AS category_emoji, c.color AS category_color,
         a.name AS account_name, a.color AS account_color,
         d.name AS debt_name
  FROM transactions t
  LEFT JOIN categories c ON c.id = t.category_id
  LEFT JOIN accounts   a ON a.id = t.account_id
  LEFT JOIN debts      d ON d.id = t.debt_id
`;

export interface NewTransaction {
  type: TxType;
  amount: number;
  accountId: number;
  toAccountId?: number | null;
  categoryId?: number | null;
  debtId?: number | null;
  goalId?: number | null;
  note?: string | null;
  occurredAt?: string;
  coachVerdict?: string | null;
  coachOverride?: boolean;
}

export async function addTransaction(t: NewTransaction) {
  const occurredAt = t.occurredAt ?? nowIso();
  const r = await run(
    `INSERT INTO transactions
       (type, amount, account_id, to_account_id, category_id, debt_id, goal_id,
        note, occurred_at, occurred_day, coach_verdict, coach_override)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      t.type,
      t.amount,
      t.accountId,
      t.toAccountId ?? null,
      t.categoryId ?? null,
      t.debtId ?? null,
      t.goalId ?? null,
      t.note?.trim() || null,
      occurredAt,
      dayKey(new Date(occurredAt)),
      t.coachVerdict ?? null,
      t.coachOverride ? 1 : 0,
    ],
  );
  return r.lastInsertRowId as number;
}

export async function recentTransactions(limit = 30) {
  return all<TransactionRow>(
    `${SELECT_ROW} WHERE t.deleted_at IS NULL
     ORDER BY t.occurred_at DESC, t.id DESC LIMIT ?`,
    [limit],
  );
}

export async function transactionsByDay(from: string, to: string) {
  return all<TransactionRow>(
    `${SELECT_ROW} WHERE t.deleted_at IS NULL AND t.occurred_day BETWEEN ? AND ?
     ORDER BY t.occurred_day DESC, t.id DESC`,
    [from, to],
  );
}

export async function transactionsByAccount(accountId: number, limit = 100) {
  return all<TransactionRow>(
    `${SELECT_ROW} WHERE t.deleted_at IS NULL
       AND (t.account_id = ? OR t.to_account_id = ?)
     ORDER BY t.occurred_at DESC LIMIT ?`,
    [accountId, accountId, limit],
  );
}

/** Borrado logico -> permite "Deshacer" en el toast. */
export async function softDelete(id: number) {
  await run(`UPDATE transactions SET deleted_at = datetime('now') WHERE id = ?`, [id]);
}

export async function undoDelete(id: number) {
  await run('UPDATE transactions SET deleted_at = NULL WHERE id = ?', [id]);
}

export async function getTransaction(id: number) {
  return one<TransactionRow>(`${SELECT_ROW} WHERE t.id = ?`, [id]);
}

/**
 * Edicion de una transaccion ya registrada. Solo campos "planos": el monto
 * de una transaccion ligada a deuda/inversion/gasto fijo no se toca aqui
 * porque descuadraria el saldo de ese modulo.
 */
export async function updateTransaction(
  id: number,
  patch: {
    amount?: number;
    account_id?: number;
    category_id?: number | null;
    note?: string | null;
    occurred_at?: string;
  },
) {
  const fields: string[] = [];
  const params: (string | number | null)[] = [];

  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) continue;
    fields.push(`${k} = ?`);
    params.push(v as string | number | null);
    if (k === 'occurred_at' && typeof v === 'string') {
      fields.push('occurred_day = ?');
      params.push(dayKey(new Date(v)));
    }
  }
  if (!fields.length) return;
  params.push(id);
  await run(`UPDATE transactions SET ${fields.join(', ')} WHERE id = ?`, params);
}

export async function lastUsedFor(type: TxType) {
  return one<{ account_id: number; category_id: number | null }>(
    `SELECT account_id, category_id FROM transactions
     WHERE type = ? AND deleted_at IS NULL
     ORDER BY id DESC LIMIT 1`,
    [type],
  );
}
