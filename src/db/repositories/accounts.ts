import { all, one, run } from '../index';
import type { Account, AccountBalance } from '../types';

export async function listAccounts(includeArchived = false) {
  return all<AccountBalance>(
    `SELECT * FROM v_account_balances
     WHERE (? = 1 OR archived = 0)
     ORDER BY archived, sort_order, id`,
    [includeArchived ? 1 : 0],
  );
}

export async function getAccount(id: number) {
  return one<AccountBalance>('SELECT * FROM v_account_balances WHERE id = ?', [id]);
}

/** Saldo total consolidado (solo cuentas marcadas para el total). */
export async function totalBalance(): Promise<number> {
  const r = await one<{ total: number | null }>(
    `SELECT SUM(balance) AS total FROM v_account_balances
     WHERE archived = 0 AND include_in_total = 1 AND type <> 'credit_card'`,
  );
  return r?.total ?? 0;
}

export type NewAccount = Pick<Account, 'name' | 'type'> &
  Partial<
    Pick<
      Account,
      | 'provider_key'
      | 'color'
      | 'emoji'
      | 'initial_balance'
      | 'credit_limit'
      | 'statement_day'
      | 'payment_due_day'
      | 'card_rate_bp'
      | 'include_in_total'
      | 'currency'
    >
  >;

export async function createAccount(a: NewAccount) {
  const r = await run(
    `INSERT INTO accounts
       (name, type, provider_key, currency, color, emoji, initial_balance,
        credit_limit, statement_day, payment_due_day, card_rate_bp,
        include_in_total, sort_order)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?, (SELECT COALESCE(MAX(sort_order),0)+1 FROM accounts))`,
    [
      a.name.trim(),
      a.type,
      a.provider_key ?? null,
      a.currency ?? 'COP',
      a.color ?? '#10B981',
      a.emoji ?? null,
      a.initial_balance ?? 0,
      a.credit_limit ?? null,
      a.statement_day ?? null,
      a.payment_due_day ?? null,
      a.card_rate_bp ?? 0,
      a.include_in_total ?? 1,
    ],
  );
  return r.lastInsertRowId as number;
}

export async function updateAccount(id: number, patch: Partial<Account>) {
  const allowed: (keyof Account)[] = [
    'name',
    'type',
    'provider_key',
    'color',
    'emoji',
    'initial_balance',
    'credit_limit',
    'statement_day',
    'payment_due_day',
    'card_rate_bp',
    'include_in_total',
    'archived',
    'sort_order',
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
    `UPDATE accounts SET ${fields.join(', ')}, updated_at = datetime('now') WHERE id = ?`,
    params,
  );
}

/**
 * No borramos cuentas con movimientos: archivamos. Asi el historico y los
 * saldos pasados nunca se corrompen.
 */
/**
 * Cuantos movimientos tocan esta cuenta, contando los traslados que
 * entran a ella.
 *
 * Se consulta ANTES de ofrecer borrar, para poder decirle a la persona
 * que va a pasar con su historial en vez de que lo descubra despues.
 */
export async function accountMovementCount(id: number): Promise<number> {
  const r = await one<{ n: number }>(
    `SELECT COUNT(*) AS n FROM transactions
     WHERE (account_id = ? OR to_account_id = ?) AND deleted_at IS NULL`,
    [id, id],
  );
  return r?.n ?? 0;
}

/**
 * Archivar NO borra nada: los movimientos siguen ahi y el historial no
 * cambia. Solo deja de ofrecerse la cuenta para movimientos nuevos y
 * deja de sumar al total.
 */
export async function archiveAccount(id: number) {
  await run('UPDATE accounts SET archived = 1 WHERE id = ?', [id]);
}

export async function restoreAccount(id: number) {
  await run('UPDATE accounts SET archived = 0 WHERE id = ?', [id]);
}

export async function deleteOrArchiveAccount(id: number) {
  const r = await one<{ n: number }>(
    'SELECT COUNT(*) AS n FROM transactions WHERE account_id = ? OR to_account_id = ?',
    [id, id],
  );
  if ((r?.n ?? 0) > 0) {
    await run('UPDATE accounts SET archived = 1 WHERE id = ?', [id]);
    return 'archived' as const;
  }
  await run('DELETE FROM accounts WHERE id = ?', [id]);
  return 'deleted' as const;
}
