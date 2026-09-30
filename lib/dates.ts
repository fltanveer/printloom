// Date helpers. All display uses Asia/Dhaka local time.

export const TZ = 'Asia/Dhaka';
const DAY = 24 * 60 * 60 * 1000;

export function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * DAY);
}

/** Parts of a date in Dhaka time. */
export function dhakaParts(d: Date): { y: number; m: number; day: number; weekday: number; hour: number; minute: number } {
  const f = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  });
  const parts = Object.fromEntries(f.formatToParts(d).map((p) => [p.type, p.value]));
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return {
    y: Number(parts.year),
    m: Number(parts.month),
    day: Number(parts.day),
    weekday: weekdays.indexOf(parts.weekday as string),
    hour: Number(parts.hour) % 24,
    minute: Number(parts.minute),
  };
}

export function dayKey(d: Date): string {
  const p = dhakaParts(d);
  return `${p.y}-${p.m}-${p.day}`;
}

export function isSameDhakaDay(a: Date, b: Date): boolean {
  return dayKey(a) === dayKey(b);
}

export function formatDate(iso: string | Date, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return new Intl.DateTimeFormat('en-GB', { timeZone: TZ, ...opts }).format(d);
}

export function formatDateTime(iso: string | Date): string {
  return formatDate(iso, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true });
}

/** "Today, 2 Oct", "Tomorrow, 2 Oct", "Sat, 4 Oct" */
export function relativeDay(iso: string | Date, now: Date = new Date()): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  const base = formatDate(d, { day: 'numeric', month: 'short' });
  if (isSameDhakaDay(d, now)) return `Today, ${base}`;
  if (isSameDhakaDay(d, addDays(now, 1))) return `Tomorrow, ${base}`;
  if (isSameDhakaDay(d, addDays(now, -1))) return `Yesterday, ${base}`;
  return formatDate(d, { weekday: 'short', day: 'numeric', month: 'short' });
}

/** "5 min ago", "3 h ago", "2 d ago" */
export function timeAgo(iso: string, now: Date = new Date()): string {
  const diff = now.getTime() - new Date(iso).getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d} d ago`;
  return formatDate(iso);
}

export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Production start: same day if before cutoff and not the weekly off day,
 * otherwise the next working day.
 */
export function productionStart(now: Date, cutoff: string, offDay: number): { start: Date; afterCutoff: boolean; offDay: boolean } {
  const [ch, cm] = cutoff.split(':').map(Number);
  const p = dhakaParts(now);
  let start = now;
  const afterCutoff = p.hour > ch || (p.hour === ch && p.minute >= cm);
  let isOff = p.weekday === offDay;
  if (afterCutoff || isOff) start = addDays(start, 1);
  while (dhakaParts(start).weekday === offDay) {
    start = addDays(start, 1);
    isOff = true;
  }
  return { start, afterCutoff, offDay: isOff };
}

/** Add N working days, skipping the weekly off day. */
export function addWorkingDays(from: Date, days: number, offDay: number): Date {
  let d = from;
  let left = days;
  while (left > 0) {
    d = addDays(d, 1);
    if (dhakaParts(d).weekday !== offDay) left--;
  }
  return d;
}

export function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / DAY);
}
