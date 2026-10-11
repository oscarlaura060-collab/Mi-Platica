/**
 * NOTIFICACIONES 100% LOCALES.
 * No hay push server, no hay tokens, no sale nada del telefono:
 * solo `scheduleNotificationAsync` con triggers de calendario.
 */
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
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

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function initNotifications() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('cuotas', {
      name: 'Cuotas y vencimientos',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 200, 100, 200],
      lightColor: '#10B981',
    });
    await Notifications.setNotificationChannelAsync('habito', {
      name: 'Recordatorio de registro',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
}

export async function ensurePermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

export async function listReminders() {
  return all<Reminder>('SELECT * FROM reminders ORDER BY kind, hour');
}

async function cancel(notificationId: string | null) {
  if (!notificationId) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch {
    /* ya no existia */
  }
}

/** Recordatorio diario de registro de gastos (habito). */
export async function scheduleDailyLog(hour: number, minute = 0) {
  const existing = await all<Reminder>(
    `SELECT * FROM reminders WHERE kind = 'daily_log'`,
  );
  for (const r of existing) await cancel(r.notification_id);
  await run(`DELETE FROM reminders WHERE kind = 'daily_log'`);

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Como te fue hoy?',
      body: 'Registra tus gastos del dia en 10 segundos.',
      data: { route: 'QuickAdd' },
      ...(Platform.OS === 'android' ? { channelId: 'habito' } : null),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });

  await run(
    `INSERT INTO reminders (kind, title, body, hour, minute, notification_id)
     VALUES ('daily_log','Como te fue hoy?','Registra tus gastos del dia.',?,?,?)`,
    [hour, minute, id],
  );
  return id;
}

/**
 * Aviso de cuota: se programa MENSUAL en el dia (vencimiento - daysBefore).
 * Si el resultado cae antes del dia 1, se ancla al dia 1.
 */
export async function scheduleDebtDue(
  debtId: number,
  opts: { daysBefore?: number; hour?: number } = {},
) {
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

  const day = Math.max(1, Math.min(28, debt.due_day - daysBefore));
  const cuota = debt.installment_amount ?? 0;

  const title =
    daysBefore === 0
      ? `Hoy vence ${debt.name}`
      : `${debt.name} vence en ${daysBefore} dia(s)`;
  const body = cuota
    ? `Cuota de ${money(cuota)}. Saldo pendiente: ${money(debt.outstanding)}.`
    : `Saldo pendiente: ${money(debt.outstanding)}.`;

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: { route: 'DebtDetail', debtId },
      ...(Platform.OS === 'android' ? { channelId: 'cuotas' } : null),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.MONTHLY,
      day,
      hour,
      minute: 0,
    },
  });

  await run(
    `INSERT INTO reminders (kind, debt_id, title, body, hour, days_before, notification_id)
     VALUES ('debt_due', ?, ?, ?, ?, ?, ?)`,
    [debtId, title, body, hour, daysBefore, id],
  );
  return id;
}

/**
 * Aviso de gasto fijo: mensual, 2 dias antes del dia de pago.
 * Reusa la tabla `reminders` con kind 'custom' y el id en el titulo.
 */
export async function scheduleFixedExpenseDue(
  fixedExpenseId: number,
  opts: { daysBefore?: number; hour?: number } = {},
) {
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

  const day = Math.max(1, Math.min(28, f.due_day - daysBefore));
  const title = `${f.name}: ${money(f.amount)}`;

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body:
        daysBefore === 0
          ? 'Vence hoy. Registralo apenas lo pagues.'
          : `Vence en ${daysBefore} dias (dia ${f.due_day}).`,
      data: { route: 'FixedExpenses', fixedExpenseId },
      ...(Platform.OS === 'android' ? { channelId: 'cuotas' } : null),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.MONTHLY,
      day,
      hour,
      minute: 0,
    },
  });

  await run(
    `INSERT INTO reminders (kind, title, body, hour, days_before, notification_id)
     VALUES ('fixed_due', ?, ?, ?, ?, ?)`,
    [title, String(fixedExpenseId), hour, daysBefore, id],
  );
  return id;
}

/**
 * MENSAJES MOTIVACIONALES
 *
 * No se usa un trigger repetitivo porque siempre mostraría el mismo texto.
 * Se programa una ventana móvil con mensajes distintos basados en el
 * progreso real; al abrir la app se renueva con datos actualizados.
 *
 * Antes de programar se cancela TODO lo anterior de este tipo: es la
 * unica forma de garantizar que no lleguen dos avisos el mismo dia.
 */
export async function scheduleDailyMotivation(
  hour: number,
  minute = 0,
  intervalHours = 2,
) {
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
    const msg = secuencia[i];
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: msg.title,
        body: msg.body,
        data: { route: 'Savings' },
        ...(Platform.OS === 'android' ? { channelId: 'habito' } : null),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: fechas[i],
      },
    });
    ids.push(id);
  }

  // Se guardan los ids juntos para poder cancelar todos los avisos.
  await run(
    `INSERT INTO reminders (kind, title, body, hour, minute, notification_id)
     VALUES ('motivation','Recordatorio diario','', ?, ?, ?)`,
    [hour, minute, ids.join(',')],
  );

  return ids.length;
}

export async function cancelDailyMotivation() {
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
export async function scheduleWeeklyReview(weekday = 1, hour = 19) {
  const prev = await all<Reminder>(
    `SELECT * FROM reminders WHERE kind = 'weekly_review'`,
  );
  for (const r of prev) await cancel(r.notification_id);
  await run(`DELETE FROM reminders WHERE kind = 'weekly_review'`);

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Revision de la semana',
      body: 'Mira tu dia de mayor gasto y ajusta el plan de deudas.',
      data: { route: 'Dashboard' },
      ...(Platform.OS === 'android' ? { channelId: 'habito' } : null),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      weekday,
      hour,
      minute: 0,
    },
  });

  await run(
    `INSERT INTO reminders (kind, title, body, hour, weekday, notification_id)
     VALUES ('weekly_review','Revision de la semana','Mira tu dia de mayor gasto.',?,?,?)`,
    [hour, weekday, id],
  );
  return id;
}

export async function cancelReminder(id: number) {
  const rows = await all<Reminder>('SELECT * FROM reminders WHERE id = ?', [id]);
  for (const r of rows) await cancel(r.notification_id);
  await run('DELETE FROM reminders WHERE id = ?', [id]);
}

export async function cancelDebtReminders(debtId: number) {
  const rows = await all<Reminder>('SELECT * FROM reminders WHERE debt_id = ?', [debtId]);
  for (const r of rows) await cancel(r.notification_id);
  await run('DELETE FROM reminders WHERE debt_id = ?', [debtId]);
}

/**
 * Reconciliacion: el SO puede perder lo programado tras un reinicio o una
 * actualizacion. Se llama al abrir la app y vuelve a programar lo que falte.
 */
export async function resyncAll() {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const liveIds = new Set(scheduled.map((s) => s.identifier));
  const rows = await listReminders();

  for (const r of rows) {
    if (r.enabled === 0) continue;
    if (r.notification_id && liveIds.has(r.notification_id)) continue;
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

  // La tanda de mensajes motivacionales se regenera siempre que se abre
  // la app, para que los mensajes usen progreso actualizado y la ventana
  // movil de 48 horas no se agote durante el uso habitual.
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
