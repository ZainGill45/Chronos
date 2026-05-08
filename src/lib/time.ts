export const HOUR_MS = 60 * 60 * 1000;
export const DAY_MS = 24 * HOUR_MS;

export function startOfHour(ts: number): number {
  const d = new Date(ts);
  d.setMinutes(0, 0, 0);
  return d.getTime();
}

export function previousHourStart(now: number = Date.now()): number {
  return startOfHour(now) - HOUR_MS;
}

export function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function addDays(ts: number, n: number): number {
  const d = new Date(ts);
  d.setDate(d.getDate() + n);
  return d.getTime();
}

export function isSameDay(a: number, b: number): boolean {
  return startOfDay(a) === startOfDay(b);
}

export function hourOfDay(ts: number): number {
  return new Date(ts).getHours();
}

function formatHour12(hour: number): string {
  if (hour === 0) return '12 AM';
  if (hour === 12) return '12 PM';
  if (hour < 12) return `${hour} AM`;
  return `${hour - 12} PM`;
}

export function formatHourRange(hourStart: number): string {
  const startHour = hourOfDay(hourStart);
  const endHour = (startHour + 1) % 24;
  return `${formatHour12(startHour)} – ${formatHour12(endHour)}`;
}

export function formatDayLabel(dayStart: number): string {
  const today = startOfDay(Date.now());
  if (dayStart === today) return 'Today';
  if (dayStart === today - DAY_MS) return 'Yesterday';
  const d = new Date(dayStart);
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}
