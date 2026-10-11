import { all, one, run, tx } from '../index';
import { dayKey, nowIso } from '@/utils/date';

export interface SavingsGoal {
  id: number;
  name: string;
  purpose: string | null;
  target_amount: number;
  initial_amount: number;
  target_date: string | null;
  frequency: 'biweekly' | 'monthly';
  account_id: number | null;
  emoji: string;
  color: string;
  status: 'active' | 'done' | 'archived';
  created_at: string;
  /** Aporte por periodo que el usuario escogio al crear el plan. */
  planned_contribution: number;
  /** Que opcion eligio: recommended | intermediate | flexible | target */
  plan_kind: string | null;
}

export interface GoalProgress extends SavingsGoal {
  saved: number;
  remaining: number;
  contributions: number;
  last_contribution_at: string | null;
}

export interface GoalContribution {
  id: number;
  goal_id: number;
  transaction_id: number | null;
  amount: number;
  contributed_at: string;
  note: string | null;
}

export async function listGoals(status: 'active' | 'all' = 'active') {
  return all<GoalProgress>(
    `SELECT * FROM v_goal_progress
     WHERE (? = 'all' OR status = 'active')
     ORDER BY status, (target_date IS NULL), target_date, created_at`,
    [status],
  );
}

export async function getGoal(id: number) {
  return one<GoalProgress>('SELECT * FROM v_goal_progress WHERE id = ?', [id]);
}

export async function savedTotal(): Promise<number> {
  const r = await one<{ total: number | null }>(
    `SELECT SUM(saved) AS total FROM v_goal_progress WHERE status = 'active'`,
  );
  return r?.total ?? 0;
}

export type NewGoal = Pick<SavingsGoal, 'name' | 'target_amount'> & Partial<SavingsGoal>;

export async function createGoal(g: NewGoal) {
  const r = await run(
    `INSERT INTO savings_goals
       (name, purpose, target_amount, initial_amount, target_date, frequency,
        account_id, emoji, color, planned_contribution, plan_kind)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    [
      g.name.trim(),
      g.purpose ?? null,
      g.target_amount,
      g.initial_amount ?? 0,
      g.target_date ?? null,
      g.frequency ?? 'monthly',
      g.account_id ?? null,
      g.emoji ?? '*',
      g.color ?? '#1CBBCE',
      g.planned_contribution ?? 0,
      g.plan_kind ?? null,
    ],
  );
  return r.lastInsertRowId as number;
}

export async function updateGoal(id: number, patch: Partial<SavingsGoal>) {
  const allowed: (keyof SavingsGoal)[] = [
    'name',
    'purpose',
    'target_amount',
    'initial_amount',
    'target_date',
    'frequency',
    'account_id',
    'emoji',
    'color',
    'status',
    'planned_contribution',
    'plan_kind',
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
    `UPDATE savings_goals SET ${fields.join(', ')}, updated_at = datetime('now') WHERE id = ?`,
    params,
  );
}

export async function deleteGoal(id: number) {
  await run('DELETE FROM savings_goals WHERE id = ?', [id]);
}

/**
 * Registra un aporte.
 *
 * El movimiento se guarda como 'goal_deposit', NO como gasto: la plata
 * cambia de bolsillo, no se consume. Asi el aporte baja el saldo de la
 * cuenta (porque ya no esta disponible) pero no ensucia el analisis de
 * gastos ni se cuenta dos veces contra el avance de la meta.
 */
export async function contribute(input: {
  goalId: number;
  accountId: number;
  amount: number;
  note?: string | null;
  occurredAt?: string;
}) {
  const occurredAt = input.occurredAt ?? nowIso();
  let txId = 0;

  await tx(async () => {
    const r = await run(
      `INSERT INTO transactions
         (type, amount, account_id, savings_goal_id, note, occurred_at, occurred_day)
       VALUES ('goal_deposit', ?, ?, ?, ?, ?, ?)`,
      [
        input.amount,
        input.accountId,
        input.goalId,
        input.note ?? 'Aporte a meta',
        occurredAt,
        dayKey(new Date(occurredAt)),
      ],
    );
    txId = r.lastInsertRowId as number;

    await run(
      `INSERT INTO goal_contributions (goal_id, transaction_id, amount, contributed_at, note)
       VALUES (?,?,?,?,?)`,
      [input.goalId, txId, input.amount, occurredAt, input.note ?? null],
    );

    // Si ya alcanzo la meta, se marca cumplida.
    await run(
      `UPDATE savings_goals SET status = 'done', updated_at = datetime('now')
        WHERE id = ?
          AND initial_amount + (
            SELECT COALESCE(SUM(amount),0) FROM goal_contributions WHERE goal_id = ?
          ) >= target_amount`,
      [input.goalId, input.goalId],
    );
  });

  return txId;
}

export async function listContributions(goalId: number) {
  return all<GoalContribution>(
    `SELECT * FROM goal_contributions WHERE goal_id = ?
     ORDER BY contributed_at DESC, id DESC`,
    [goalId],
  );
}

/** Deshace un aporte (borra el movimiento asociado). */
export async function removeContribution(id: number) {
  const row = await one<{ transaction_id: number | null; goal_id: number }>(
    'SELECT transaction_id, goal_id FROM goal_contributions WHERE id = ?',
    [id],
  );
  await tx(async () => {
    if (row?.transaction_id) {
      await run(`UPDATE transactions SET deleted_at = datetime('now') WHERE id = ?`, [
        row.transaction_id,
      ]);
    }
    await run('DELETE FROM goal_contributions WHERE id = ?', [id]);
    if (row?.goal_id) {
      await run(
        `UPDATE savings_goals SET status = 'active' WHERE id = ? AND status = 'done'`,
        [row.goal_id],
      );
    }
  });
}
