export const MOTIVATION_INTERVALS = [1, 2, 4] as const;
export type MotivationInterval = (typeof MOTIVATION_INTERVALS)[number];

/** Notifications are generated only during the user's waking window and
 * only for the next 48 hours, keeping the pending queue bounded. */
export function buildMotivationSchedule(
  now: Date,
  intervalHours: number,
  startHour: number,
  minute = 0,
): Date[] {
  const interval = MOTIVATION_INTERVALS.includes(
    intervalHours as MotivationInterval,
  )
    ? intervalHours
    : 2;
  const start = Math.max(7, Math.min(20, Math.floor(startHour)));
  const endHour = 21;
  const horizon = now.getTime() + 48 * 60 * 60 * 1000;
  const dates: Date[] = [];

  for (let dayOffset = 0; dayOffset < 3; dayOffset++) {
    for (let hour = start; hour <= endHour; hour += interval) {
      const date = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + dayOffset,
        hour,
        minute,
        0,
        0,
      );
      if (date.getTime() > now.getTime() && date.getTime() <= horizon) {
        dates.push(date);
      }
    }
  }

  return dates;
}
