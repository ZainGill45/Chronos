import { getSetting, setSetting } from './db';

const KEY_NOTIFY_START = 'notify_start_hour';
const KEY_NOTIFY_END = 'notify_end_hour';

export const DEFAULT_NOTIFY_START = 8;
export const DEFAULT_NOTIFY_END = 23;

export type NotifyWindow = { startHour: number; endHour: number };

function clampHour(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(23, Math.max(0, Math.floor(n)));
}

export async function getNotifyWindow(): Promise<NotifyWindow> {
  const [startRaw, endRaw] = await Promise.all([
    getSetting(KEY_NOTIFY_START),
    getSetting(KEY_NOTIFY_END),
  ]);
  const startHour = startRaw == null ? DEFAULT_NOTIFY_START : clampHour(Number(startRaw));
  const endHour = endRaw == null ? DEFAULT_NOTIFY_END : clampHour(Number(endRaw));
  return { startHour, endHour };
}

export async function setNotifyWindow(window: NotifyWindow): Promise<void> {
  await setSetting(KEY_NOTIFY_START, String(clampHour(window.startHour)));
  await setSetting(KEY_NOTIFY_END, String(clampHour(window.endHour)));
}
