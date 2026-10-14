/**
 * NOTIFICACIONES LOCALES — Web Compatible.
 * Sin servidores externos ni telemetría: compatible con la Web Notification API
 * y la tabla `reminders` de SQLite.
 */
import { all, run } from '@/db';
import type { Reminder } from '@/db/types';
import { listDebts } from '@/db/repositories/debts';
import { listGoals } from '@/db/repositories/goals';
import { getSettings } from '@/db/repositories/settings';
import { avgDailyExpense, loggingStreak } from '@/db/repositories/stats';
import { buildCoachContext } from '@/domain/coach/context';
import { buildMessages, pickSequence } from '@/domain/motivation/messages';
import { money } from '@/utils/money';
import { buildMotivationSchedule } from '@/domain/motivation/schedule';

export async function initNotifications(): Promise<void> {
  // Web initialization
}

export async function ensurePermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const res = await Notification.requestPermission();
  return res === 'granted';
}

export async function listReminders(): Promise<Reminder[]> {
  return all<Reminder>('SELECT * FROM reminders ORDER BY kind, hour');
}

async function cancel(notificationId: string | null): Promise<void> {
  if (!notificationId) return;
  // Browser cancel (no-op or handled locally)
}

/** Recordatorio diario de registro de gastos (habito). */
export async function scheduleDailyLog(hour: number, minute = 0): Promise<string> {
  const existing = await all<Reminder>(
    `SELECT * FROM reminders WHERE kind = 'daily_log'`,
  );
  for (const r of existing) await cancel(r.notification_id);
  await run(`DELETE FROM reminders WHERE kind = 'daily_log'`);

  const id = 'daily_log_' + Date.now();
  await run(
    `INSERT INTO reminders (kind, title, body, hour, minute, notification_id)
     VALUES ('daily_log','¿Cómo te fue hoy?','Registra tus gastos del día en 10 segundos.',?,?,?)`,
    [hour, minute, id],
  );
  return id;
}

/**
 * Aviso de cuota: se programa MENSUAL en el dia (vencimiento - daysBefore).
 */
export async function scheduleDebtDue(
  debtId: number,
  opts: { daysBefore?: number; hour?: number } = {},
): Promise<string | null> {
  const daysBefore = opts.daysBefore ?? 2;
  const hour = opts.hour ?? 9;

  const debts = await listDebts('all');
  const debt = debts.find((d) => d.id === debtId);
  if (!debt) return null;

  const prev = await all<Reminder>(
    `SELECT * FROM reminders WHERE kind = 'debt_due' AND debt_id = ?`,
    [debtId],
  );
  for (const r of prev) await cancel(r.notification_id);
  await run(`DELETE FROM reminders WHERE kind = 'debt_due' AND debt_id = ?`, [debtId]);

  const cuota = debt.installment_amount ?? 0;
  const title =
    daysBefore === 0
      ? `Hoy vence ${debt.name}`
      : `${debt.name} vence en ${daysBefore} día(s)`;
  const body = cuota
    ? `Cuota de ${money(cuota)}. Saldo pendiente: ${money(debt.outstanding)}.`
    : `Saldo pendiente: ${money(debt.outstanding)}.`;

  const id = `debt_due_${debtId}_${Date.now()}`;
  await run(
    `INSERT INTO reminders (kind, debt_id, title, body, hour, days_before, notification_id)
     VALUES ('debt_due', ?, ?, ?, ?, ?, ?)`,
    [debtId, title, body, hour, daysBefore, id],
  );
  return id;
}

/**
 * Aviso de gasto fijo: mensual, 2 dias antes del dia de pago.
 */
export async function scheduleFixedExpenseDue(
  fixedExpenseId: number,
  opts: { daysBefore?: number; hour?: number } = {},
): Promise<string | null> {
  const daysBefore = opts.daysBefore ?? 2;
  const hour = opts.hour ?? 9;

  const fx = await all<{ name: string; amount: number; due_day: number }>(
    'SELECT name, amount, due_day FROM fixed_expenses WHERE id = ?',
    [fixedExpenseId],
  );
  const f = fx[0];
  if (!f) return null;

  const prev = await all<Reminder>(
    `SELECT * FROM reminders WHERE kind = 'fixed_due' AND body = ?`,
    [String(fixedExpenseId)],
  );
  for (const r of prev) await cancel(r.notification_id);
  await run(`DELETE FROM reminders WHERE kind = 'fixed_due' AND body = ?`, [
    String(fixedExpenseId),
  ]);

  const title = `${f.name}: ${money(f.amount)}`;
  const id = `fixed_due_${fixedExpenseId}_${Date.now()}`;

  await run(
    `INSERT INTO reminders (kind, title, body, hour, days_before, notification_id)
     VALUES ('fixed_due', ?, ?, ?, ?, ?)`,
    [title, String(fixedExpenseId), hour, daysBefore, id],
  );
  return id;
}

/**
 * MENSAJES MOTIVACIONALES
 */
export async function scheduleDailyMotivation(
  hour: number,
  minute = 0,
  intervalHours = 2,
): Promise<number> {
  await cancelDailyMotivation();

  const [goalRows, coach, settings, streakVal, avg, recientes] = await Promise.all([
    listGoals('active'),
    buildCoachContext(),
    getSettings(),
    loggingStreak(),
    avgDailyExpense(30),
    recentContributionCount(30),
  ]);

  const pool = buildMessages({
    name: (settings.user_name ?? '').trim(),
    goals: goalRows.map((g) => ({
      name: g.name,
      saved: g.saved,
      target: g.target_amount,
      remaining: g.remaining,
    })),
    streak: streakVal,
    fixedPending: coach.fixedPendingTotal,
    availableReal: coach.availableReal,
    avgDaily: avg,
    loggedRecently: streakVal > 0,
    recentContributions: recientes,
  });

  const ahora = new Date();
  const fechas = buildMotivationSchedule(ahora, intervalHours, hour, minute);
  const secuencia = pickSequence(pool, fechas.length);
  const ids: string[] = [];

  for (let i = 0; i < fechas.length; i++) {
    ids.push(`motivation_${Date.now()}_${i}`);
  }

  await run(
    `INSERT INTO reminders (kind, title, body, hour, minute, notification_id)
     VALUES ('motivation','Recordatorio diario','', ?, ?, ?)`,
    [hour, minute, ids.join(',')],
  );

  return ids.length;
}

export async function cancelDailyMotivation(): Promise<void> {
  const rows = await all<Reminder>(`SELECT * FROM reminders WHERE kind = 'motivation'`);
  for (const r of rows) {
    for (const id of (r.notification_id ?? '').split(',').filter(Boolean)) {
      await cancel(id);
    }
  }
  await run(`DELETE FROM reminders WHERE kind = 'motivation'`);
}

/** Aportes a metas en los ultimos N dias. */
async function recentContributionCount(days: number): Promise<number> {
  const rows = await all<{ n: number }>(
    `SELECT COUNT(*) AS n FROM goal_contributions
     WHERE contributed_at >= datetime('now', ?)`,
    [`-${days} days`],
  );
  return rows[0]?.n ?? 0;
}

/** Revision semanal (domingo por defecto). */
export async function scheduleWeeklyReview(weekday = 1, hour = 19): Promise<string> {
  const prev = await all<Reminder>(
    `SELECT * FROM reminders WHERE kind = 'weekly_review'`,
  );
  for (const r of prev) await cancel(r.notification_id);
  await run(`DELETE FROM reminders WHERE kind = 'weekly_review'`);

  const id = `weekly_review_${Date.now()}`;
  await run(
    `INSERT INTO reminders (kind, title, body, hour, weekday, notification_id)
     VALUES ('weekly_review','Revisión de la semana','Mira tu día de mayor gasto.',?,?,?)`,
    [hour, weekday, id],
  );
  return id;
}

export async function cancelReminder(id: number): Promise<void> {
  const rows = await all<Reminder>('SELECT * FROM reminders WHERE id = ?', [id]);
  for (const r of rows) await cancel(r.notification_id);
  await run('DELETE FROM reminders WHERE id = ?', [id]);
}

export async function cancelDebtReminders(debtId: number): Promise<void> {
  const rows = await all<Reminder>('SELECT * FROM reminders WHERE debt_id = ?', [debtId]);
  for (const r of rows) await cancel(r.notification_id);
  await run('DELETE FROM reminders WHERE debt_id = ?', [debtId]);
}

export async function resyncAll(): Promise<void> {
  const rows = await listReminders();
  for (const r of rows) {
    if (r.enabled === 0) continue;
    if (r.kind === 'daily_log') await scheduleDailyLog(r.hour, r.minute);
    else if (r.kind === 'debt_due' && r.debt_id)
      await scheduleDebtDue(r.debt_id, { daysBefore: r.days_before, hour: r.hour });
    else if (r.kind === 'weekly_review')
      await scheduleWeeklyReview(r.weekday ?? 1, r.hour);
    else if (r.kind === 'fixed_due' && r.body)
      await scheduleFixedExpenseDue(Number(r.body), {
        daysBefore: r.days_before,
        hour: r.hour,
      });
  }

  const motiv = rows.find((r) => r.kind === 'motivation' && r.enabled === 1);
  if (motiv) {
    const settings = await getSettings();
    await scheduleDailyMotivation(
      motiv.hour,
      motiv.minute,
      Number(settings.daily_motivation_interval_hours ?? 2),
    );
  }
}
