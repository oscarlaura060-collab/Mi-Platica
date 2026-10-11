import { all, one } from '../index';

export interface DayPoint {
  day: string;
  expense: number;
  income: number;
}

/**
 * Serie diaria completa del rango (incluye dias en cero) usando un CTE
 * recursivo: asi la grafica no "salta" dias sin movimientos.
 */
export async function dailySeries(from: string, to: string) {
  return all<DayPoint>(
    `WITH RECURSIVE days(day) AS (
       SELECT ?
       UNION ALL
       SELECT date(day, '+1 day') FROM days WHERE day < ?
     )
     SELECT d.day,
            COALESCE((SELECT SUM(amount) FROM transactions t
                       WHERE t.occurred_day = d.day AND t.deleted_at IS NULL
                         AND t.type IN ('expense','debt_payment')), 0) AS expense,
            COALESCE((SELECT SUM(amount) FROM transactions t
                       WHERE t.occurred_day = d.day AND t.deleted_at IS NULL
                         AND t.type = 'income'), 0) AS income
     FROM days d
     ORDER BY d.day`,
    [from, to],
  );
}

export async function monthTotals(from: string, to: string) {
  const r = await one<{ income: number | null; expense: number | null; debt: number | null }>(
    `SELECT
       SUM(CASE WHEN type = 'income'       THEN amount END) AS income,
       SUM(CASE WHEN type = 'expense'      THEN amount END) AS expense,
       SUM(CASE WHEN type = 'debt_payment' THEN amount END) AS debt
     FROM transactions
     WHERE deleted_at IS NULL AND occurred_day BETWEEN ? AND ?`,
    [from, to],
  );
  return {
    income: r?.income ?? 0,
    expense: r?.expense ?? 0,
    debtPaid: r?.debt ?? 0,
    net: (r?.income ?? 0) - (r?.expense ?? 0) - (r?.debt ?? 0),
  };
}

export async function byCategory(from: string, to: string, limit = 8) {
  return all<{
    id: number;
    name: string;
    emoji: string;
    color: string;
    total: number;
    n: number;
    monthly_budget: number | null;
  }>(
    `SELECT c.id, c.name, c.emoji, c.color, c.monthly_budget,
            SUM(t.amount) AS total, COUNT(t.id) AS n
     FROM transactions t
     JOIN categories c ON c.id = t.category_id
     WHERE t.type = 'expense' AND t.deleted_at IS NULL
       AND t.occurred_day BETWEEN ? AND ?
     GROUP BY c.id
     ORDER BY total DESC
     LIMIT ?`,
    [from, to, limit],
  );
}

/** El dia de mayor gasto del rango: insight estrella del dashboard. */
export async function peakSpendingDay(from: string, to: string) {
  return one<{ day: string; total: number; n: number }>(
    `SELECT occurred_day AS day, SUM(amount) AS total, COUNT(*) AS n
     FROM transactions
     WHERE type = 'expense' AND deleted_at IS NULL
       AND occurred_day BETWEEN ? AND ?
     GROUP BY occurred_day
     ORDER BY total DESC
     LIMIT 1`,
    [from, to],
  );
}

/** Patron por dia de la semana (0=domingo en strftime %w). */
export async function byWeekday(from: string, to: string) {
  return all<{ wd: number; total: number; n: number }>(
    `SELECT CAST(strftime('%w', occurred_day) AS INTEGER) AS wd,
            SUM(amount) AS total, COUNT(*) AS n
     FROM transactions
     WHERE type = 'expense' AND deleted_at IS NULL
       AND occurred_day BETWEEN ? AND ?
     GROUP BY wd ORDER BY wd`,
    [from, to],
  );
}

/** Gasto promedio diario de los ultimos N dias (base del detector de picos). */
export async function avgDailyExpense(days = 30) {
  const r = await one<{ avg: number | null }>(
    `SELECT COALESCE(SUM(amount),0) * 1.0 / ? AS avg
     FROM transactions
     WHERE type = 'expense' AND deleted_at IS NULL
       AND occurred_day >= date('now','localtime', ?)`,
    [days, `-${days} days`],
  );
  return Math.round(r?.avg ?? 0);
}

/**
 * Gasto diario del DIARIO VIVIR: comida, transporte, antojos.
 *
 * Deja por fuera los pagos de gastos fijos y las cuotas de tarjeta,
 * porque quien pregunta "¿cuanto puedo ahorrar?" ya resta esos aparte.
 * Usar avgDailyExpense ahi los contaba dos veces: el arriendo salia una
 * vez como gasto fijo y otra vez dentro del promedio, y la capacidad de
 * ahorro daba cero aunque la persona tuviera con que.
 */
export async function avgDailyDiscretionaryExpense(days = 30) {
  const r = await one<{ avg: number | null }>(
    `SELECT COALESCE(SUM(amount),0) * 1.0 / ? AS avg
     FROM transactions
     WHERE type = 'expense' AND deleted_at IS NULL
       AND fixed_expense_id IS NULL
       AND installment_plan_id IS NULL
       AND occurred_day >= date('now','localtime', ?)`,
    [days, `-${days} days`],
  );
  return Math.round(r?.avg ?? 0);
}

/**
 * Totales de un rango, separando a donde fue cada peso.
 *
 * Importante: un aporte a meta y un abono a deuda NO son "gasto". Salen
 * de la cuenta, si, pero uno pasa a ser ahorro tuyo y el otro baja una
 * deuda. Mezclarlos con el gasto corriente haria creer que se gasta mas
 * de lo real.
 */
export async function periodTotals(from: string, to: string) {
  const r = await one<{
    income: number | null;
    expense: number | null;
    debt: number | null;
    saved: number | null;
    n: number | null;
  }>(
    `SELECT
       SUM(CASE WHEN type = 'income'       THEN amount END) AS income,
       SUM(CASE WHEN type = 'expense'      THEN amount END) AS expense,
       SUM(CASE WHEN type = 'debt_payment' THEN amount END) AS debt,
       SUM(CASE WHEN type = 'goal_deposit' THEN amount END) AS saved,
       COUNT(*) AS n
     FROM transactions
     WHERE deleted_at IS NULL AND occurred_day BETWEEN ? AND ?`,
    [from, to],
  );
  const income = r?.income ?? 0;
  const expense = r?.expense ?? 0;
  const debtPaid = r?.debt ?? 0;
  const saved = r?.saved ?? 0;
  return {
    income,
    expense,
    debtPaid,
    saved,
    /** Lo que quedo despues de todo lo que salio. */
    net: income - expense - debtPaid - saved,
    /** Lo que salio de la cuenta en total. */
    outflow: expense + debtPaid + saved,
    count: r?.n ?? 0,
  };
}

/** Los gastos mas grandes del rango: donde se fue la plata de verdad. */
export async function topExpenses(from: string, to: string, limit = 5) {
  return all<{
    id: number;
    amount: number;
    note: string | null;
    occurred_day: string;
    category_name: string | null;
    category_emoji: string | null;
    category_color: string | null;
  }>(
    `SELECT t.id, t.amount, t.note, t.occurred_day,
            c.name AS category_name, c.emoji AS category_emoji,
            c.color AS category_color
     FROM transactions t
     LEFT JOIN categories c ON c.id = t.category_id
     WHERE t.type = 'expense' AND t.deleted_at IS NULL
       AND t.occurred_day BETWEEN ? AND ?
     ORDER BY t.amount DESC
     LIMIT ?`,
    [from, to, limit],
  );
}

/** Cuantos dias del rango tuvieron al menos un gasto. */
export async function activeDays(from: string, to: string) {
  const r = await one<{ n: number }>(
    `SELECT COUNT(DISTINCT occurred_day) AS n FROM transactions
     WHERE type = 'expense' AND deleted_at IS NULL
       AND occurred_day BETWEEN ? AND ?`,
    [from, to],
  );
  return r?.n ?? 0;
}

export async function spentInCategoryThisMonth(categoryId: number) {
  const r = await one<{ total: number | null }>(
    `SELECT SUM(amount) AS total FROM transactions
     WHERE type = 'expense' AND deleted_at IS NULL AND category_id = ?
       AND strftime('%Y-%m', occurred_day) = strftime('%Y-%m','now','localtime')`,
    [categoryId],
  );
  return r?.total ?? 0;
}

export async function spentToday() {
  const r = await one<{ total: number | null }>(
    `SELECT SUM(amount) AS total FROM transactions
     WHERE type = 'expense' AND deleted_at IS NULL
       AND occurred_day = date('now','localtime')`,
  );
  return r?.total ?? 0;
}

/** Racha de dias consecutivos con al menos un registro (gamificacion suave). */
export async function loggingStreak(): Promise<number> {
  const rows = await all<{ day: string }>(
    `SELECT DISTINCT occurred_day AS day FROM transactions
     WHERE deleted_at IS NULL ORDER BY day DESC LIMIT 400`,
  );
  if (!rows.length) return 0;

  const days = new Set(rows.map((r) => r.day));
  const cursor = new Date();
  let streak = 0;

  // Si hoy aun no hay registro, la racha se mide desde ayer (no se rompe
  // hasta que el dia termine).
  if (!days.has(dayKeyLocal(cursor))) cursor.setDate(cursor.getDate() - 1);

  while (days.has(dayKeyLocal(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function dayKeyLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
