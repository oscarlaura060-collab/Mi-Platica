import { all, one, run, tx } from '../index';
import type { Investment, InvestmentMove, InvestmentProgress } from '../types';
import { dayKey, nowIso } from '@/utils/date';

export async function listInvestments(status: 'active' | 'all' = 'active') {
  return all<InvestmentProgress>(
    `SELECT * FROM v_investment_progress
     WHERE (? = 'all' OR status = 'active')
     ORDER BY status, balance DESC`,
    [status],
  );
}

export async function getInvestment(id: number) {
  return one<InvestmentProgress>('SELECT * FROM v_investment_progress WHERE id = ?', [id]);
}

/** Patrimonio invertido total. */
export async function investedTotal(): Promise<number> {
  const r = await one<{ total: number | null }>(
    `SELECT SUM(balance) AS total FROM v_investment_progress WHERE status = 'active'`,
  );
  return r?.total ?? 0;
}

/**
 * Ahorro LIQUIDO: lo unico que de verdad sirve de colchon de emergencia.
 * Un CDT a termino no cuenta aunque rente mejor.
 */
export async function liquidSavings(): Promise<number> {
  const r = await one<{ total: number | null }>(
    `SELECT SUM(balance) AS total FROM v_investment_progress
     WHERE status = 'active' AND liquidity = 'immediate'`,
  );
  return r?.total ?? 0;
}

export type NewInvestment = Pick<Investment, 'name' | 'kind' | 'start_date'> &
  Partial<Investment>;

export async function createInvestment(i: NewInvestment) {
  const r = await run(
    `INSERT INTO investments
       (name, kind, issuer, annual_rate_bp, fee_rate_bp, liquidity, risk,
        initial_amount, monthly_target, account_id, start_date, maturity_date,
        color, notes)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      i.name.trim(),
      i.kind,
      i.issuer ?? null,
      i.annual_rate_bp ?? 0,
      i.fee_rate_bp ?? 0,
      i.liquidity ?? 'immediate',
      i.risk ?? 'low',
      i.initial_amount ?? 0,
      i.monthly_target ?? 0,
      i.account_id ?? null,
      i.start_date,
      i.maturity_date ?? null,
      i.color ?? '#6366F1',
      i.notes ?? null,
    ],
  );
  return r.lastInsertRowId as number;
}

export async function updateInvestment(id: number, patch: Partial<Investment>) {
  const allowed: (keyof Investment)[] = [
    'name',
    'kind',
    'issuer',
    'annual_rate_bp',
    'fee_rate_bp',
    'liquidity',
    'risk',
    'initial_amount',
    'monthly_target',
    'account_id',
    'start_date',
    'maturity_date',
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
    `UPDATE investments SET ${fields.join(', ')}, updated_at = datetime('now') WHERE id = ?`,
    params,
  );
}

export async function deleteInvestment(id: number) {
  await run('DELETE FROM investments WHERE id = ?', [id]);
}

/**
 * Aporta a una inversion: sale plata de la cuenta (transaccion
 * 'goal_deposit', que la vista de saldos ya resta) y entra al vehiculo.
 */
export async function depositToInvestment(input: {
  investmentId: number;
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
         (type, amount, account_id, investment_id, note, occurred_at, occurred_day)
       VALUES ('goal_deposit', ?, ?, ?, ?, ?, ?)`,
      [
        input.amount,
        input.accountId,
        input.investmentId,
        input.note ?? null,
        occurredAt,
        dayKey(new Date(occurredAt)),
      ],
    );
    txId = r.lastInsertRowId as number;

    await run(
      `INSERT INTO investment_moves
         (investment_id, transaction_id, amount, kind, moved_at, note)
       VALUES (?,?,?,'deposit',?,?)`,
      [input.investmentId, txId, input.amount, occurredAt, input.note ?? null],
    );
  });

  return txId;
}

/** Retiro: vuelve la plata a la cuenta como ingreso. */
export async function withdrawFromInvestment(input: {
  investmentId: number;
  accountId: number;
  amount: number;
  note?: string | null;
}) {
  const occurredAt = nowIso();
  await tx(async () => {
    const r = await run(
      `INSERT INTO transactions
         (type, amount, account_id, investment_id, note, occurred_at, occurred_day)
       VALUES ('income', ?, ?, ?, ?, ?, ?)`,
      [
        input.amount,
        input.accountId,
        input.investmentId,
        input.note ?? 'Retiro de inversion',
        occurredAt,
        dayKey(new Date(occurredAt)),
      ],
    );
    await run(
      `INSERT INTO investment_moves
         (investment_id, transaction_id, amount, kind, moved_at, note)
       VALUES (?,?,?,'withdraw',?,?)`,
      [input.investmentId, r.lastInsertRowId as number, -input.amount, occurredAt, input.note ?? null],
    );
  });
}

/**
 * Registra el rendimiento que reconocio el banco. No mueve plata de
 * ninguna cuenta: solo sube el saldo del vehiculo.
 */
export async function registerYield(investmentId: number, amount: number, note?: string) {
  await run(
    `INSERT INTO investment_moves (investment_id, amount, kind, moved_at, note)
     VALUES (?,?,'yield',?,?)`,
    [investmentId, amount, nowIso(), note ?? null],
  );
}

export async function investmentMoves(investmentId: number) {
  return all<InvestmentMove>(
    `SELECT * FROM investment_moves WHERE investment_id = ?
     ORDER BY moved_at DESC, id DESC`,
    [investmentId],
  );
}
