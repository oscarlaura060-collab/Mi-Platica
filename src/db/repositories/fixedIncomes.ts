import { all, one, run, tx } from '../index';
import { dayKey, nowIso } from '@/utils/date';
import { nextReceiptPeriod } from '@/domain/income/receiptPeriods';

export interface FixedIncome {
  id: number;
  name: string;
  amount: number;
  account_id: number | null;
  category_id: number | null;
  pay_day: number;
  pay_day_2: number | null;
  frequency: 'monthly' | 'biweekly' | 'weekly' | 'yearly' | 'variable';
  is_reliable: 0 | 1;
  auto_remind: 0 | 1;
  emoji: string;
  color: string;
  notes: string | null;
  status: 'active' | 'paused';
}

export interface FixedIncomeStatus extends Omit<FixedIncome, 'notes'> {
  received_this_month: 0 | 1;
  received_amount: number | null;
}

const FIXED_INCOME_STATUS_SELECT = `
  SELECT f.*,
    CASE WHEN f.frequency = 'biweekly' AND f.pay_day_2 IS NOT NULL THEN
      CASE WHEN EXISTS (SELECT 1 FROM fixed_income_receipts r
        WHERE r.fixed_income_id = f.id AND r.period = strftime('%Y-%m','now','localtime'))
        AND EXISTS (SELECT 1 FROM fixed_income_receipts r
        WHERE r.fixed_income_id = f.id AND r.period = strftime('%Y-%m','now','localtime') || '-Q2')
        THEN 1 ELSE 0 END
    WHEN EXISTS (SELECT 1 FROM fixed_income_receipts r
      WHERE r.fixed_income_id = f.id AND r.period = strftime('%Y-%m','now','localtime'))
      THEN 1 ELSE 0 END AS received_this_month,
    (SELECT SUM(r.amount) FROM fixed_income_receipts r WHERE r.fixed_income_id = f.id
      AND substr(r.period,1,7) = strftime('%Y-%m','now','localtime')) AS received_amount
  FROM fixed_incomes f`;

export async function listFixedIncomes(includePaused = false) {
  return all<FixedIncomeStatus>(
    `${FIXED_INCOME_STATUS_SELECT}
     WHERE (? = 1 OR status = 'active')
     ORDER BY received_this_month, pay_day`,
    [includePaused ? 1 : 0],
  );
}

export async function getFixedIncome(id: number) {
  return one<FixedIncomeStatus>(`${FIXED_INCOME_STATUS_SELECT} WHERE f.id = ?`, [id]);
}

/** Ingresos con una fecha de pago de este mes ya vencida y aún sin recibo. */
export async function pendingFixedIncomesDue() {
  const rows = await all<FixedIncome>(
    `SELECT * FROM fixed_incomes WHERE status = 'active' ORDER BY pay_day`,
  );
  const now = new Date();
  const month = dayKey(now).slice(0, 7);
  const due: FixedIncome[] = [];
  for (const income of rows) {
    const dates = [income.pay_day, ...(income.frequency === 'biweekly' && income.pay_day_2 ? [income.pay_day_2] : [])];
    for (let i = 0; i < dates.length; i++) {
      const date = Math.min(dates[i], new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate());
      if (date > now.getDate()) continue;
      const period = i === 1 ? `${month}-Q2` : month;
      const receipt = await one<{ id: number }>(
        'SELECT id FROM fixed_income_receipts WHERE fixed_income_id = ? AND period = ?',
        [income.id, period],
      );
      if (!receipt) { due.push(income); break; }
    }
  }
  return due;
}

/** Lo que deberia entrar cada mes. */
/**
 * Lo que entra al mes, contando cada ingreso las veces que de verdad llega.
 *
 * El "amount" de un ingreso fijo es lo que llega CADA VEZ, no al mes. Un
 * sueldo quincenal de 1.000.000 son 2.000.000 mensuales. Sumar el monto
 * tal cual dejaba el ingreso a la mitad, y con eso la capacidad de ahorro
 * daba cero y la app no proponia ningun plan.
 *
 * Los gastos fijos ya hacen esta cuenta en v_fixed_expense_status
 * (monthly_total); aqui se usa el mismo criterio.
 */
export async function monthlyIncomeTotal(): Promise<number> {
  const r = await one<{ total: number | null }>(
    `SELECT SUM(
       amount * CASE frequency
         WHEN 'biweekly' THEN 2.0
         WHEN 'weekly'   THEN 4.345
         WHEN 'yearly'   THEN 1.0 / 12.0
         ELSE 1.0
       END
     ) AS total
     FROM fixed_incomes
     WHERE status = 'active'`,
  );
  return Math.round(r?.total ?? 0);
}

/** Lo que falta por entrar este mes (solo los confiables cuentan). */
export async function expectedRemaining(): Promise<number> {
  const r = await one<{ total: number | null }>(
    `SELECT SUM(amount) AS total FROM v_fixed_income_status
     WHERE status = 'active' AND received_this_month = 0 AND is_reliable = 1`,
  );
  return r?.total ?? 0;
}

/**
 * Proximo ingreso esperado. El coach lo usa para cambiar el tono: no es lo
 * mismo andar corto el dia 28 con el salario entrando el 30, que andar
 * corto el dia 2.
 */
export async function nextIncome(): Promise<{
  name: string;
  amount: number;
  daysLeft: number;
} | null> {
  const rows = await all<FixedIncomeStatus>(
    `SELECT * FROM v_fixed_income_status WHERE status = 'active' AND is_reliable = 1`,
  );
  if (!rows.length) return null;

  const hoy = new Date();
  const diaHoy = hoy.getDate();
  const ultimoDia = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate();

  let mejor: { name: string; amount: number; daysLeft: number } | null = null;

  for (const f of rows) {
    const dias = [f.pay_day, f.pay_day_2].filter(
      (d): d is number => typeof d === 'number' && d > 0,
    );
    for (const d of dias) {
      const dia = Math.min(d, ultimoDia);
      // Si ya paso este mes, el proximo es el mes entrante.
      const faltan = dia >= diaHoy ? dia - diaHoy : ultimoDia - diaHoy + dia;
      if (!mejor || faltan < mejor.daysLeft) {
        mejor = { name: f.name, amount: f.amount, daysLeft: faltan };
      }
    }
  }
  return mejor;
}

export type NewFixedIncome = Pick<FixedIncome, 'name' | 'amount' | 'pay_day'> &
  Partial<FixedIncome>;

export async function createFixedIncome(f: NewFixedIncome) {
  const r = await run(
    `INSERT INTO fixed_incomes
       (name, amount, account_id, category_id, pay_day, pay_day_2, frequency,
        is_reliable, auto_remind, emoji, color, notes)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      f.name.trim(),
      f.amount,
      f.account_id ?? null,
      f.category_id ?? null,
      f.pay_day,
      f.pay_day_2 ?? null,
      f.frequency ?? 'monthly',
      f.is_reliable ?? 1,
      f.auto_remind ?? 0,
      f.emoji ?? '*',
      f.color ?? '#10B981',
      f.notes ?? null,
    ],
  );
  return r.lastInsertRowId as number;
}

export async function updateFixedIncome(id: number, patch: Partial<FixedIncome>) {
  const allowed: (keyof FixedIncome)[] = [
    'name',
    'amount',
    'account_id',
    'category_id',
    'pay_day',
    'pay_day_2',
    'frequency',
    'is_reliable',
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
    `UPDATE fixed_incomes SET ${fields.join(', ')}, updated_at = datetime('now') WHERE id = ?`,
    params,
  );
}

export async function deleteFixedIncome(id: number) {
  await run('DELETE FROM fixed_incomes WHERE id = ?', [id]);
}

/** Registra que el ingreso llego: crea la transaccion y marca el periodo. */
export async function receiveFixedIncome(input: {
  fixedIncomeId: number;
  accountId: number;
  amount?: number;
  occurredAt?: string;
}) {
  const fi = await getFixedIncome(input.fixedIncomeId);
  if (!fi) throw new Error('Ingreso fijo no encontrado');

  const amount = input.amount ?? fi.amount;
  const occurredAt = input.occurredAt ?? nowIso();
  const month = occurredAt.slice(0, 7);
  let txId = 0;

  await tx(async () => {
    const existing = await all<{ period: string }>(
      `SELECT period FROM fixed_income_receipts
       WHERE fixed_income_id = ? AND substr(period,1,7) = ?`,
      [fi.id, month],
    );
    const period = nextReceiptPeriod(
      month,
      fi.frequency,
      fi.pay_day_2 !== null,
      existing.map((r) => r.period),
    );
    if (!period) throw new Error('Este ingreso ya fue registrado para todas sus fechas de este mes.');
    const r = await run(
      `INSERT INTO transactions
         (type, amount, account_id, category_id, fixed_income_id, note,
          occurred_at, occurred_day)
       VALUES ('income', ?, ?, ?, ?, ?, ?, ?)`,
      [
        amount,
        input.accountId,
        fi.category_id,
        fi.id,
        fi.name,
        occurredAt,
        dayKey(new Date(occurredAt)),
      ],
    );
    txId = r.lastInsertRowId as number;

    await run(
      `INSERT INTO fixed_income_receipts
         (fixed_income_id, transaction_id, amount, period, received_at)
       VALUES (?,?,?,?,?)`,
      [fi.id, txId, amount, period, occurredAt],
    );
  });

  return txId;
}

export async function unreceiveFixedIncome(fixedIncomeId: number) {
  const month = dayKey().slice(0, 7);
  const row = await one<{ period: string; transaction_id: number | null }>(
    `SELECT period, transaction_id FROM fixed_income_receipts
     WHERE fixed_income_id = ? AND substr(period,1,7) = ?
     ORDER BY received_at DESC LIMIT 1`,
    [fixedIncomeId, month],
  );
  await tx(async () => {
    if (row?.transaction_id) {
      await run(`UPDATE transactions SET deleted_at = datetime('now') WHERE id = ?`, [
        row.transaction_id,
      ]);
    }
    if (row) await run(
      `DELETE FROM fixed_income_receipts WHERE fixed_income_id = ? AND period = ?`,
      [fixedIncomeId, row.period],
    );
  });
}
