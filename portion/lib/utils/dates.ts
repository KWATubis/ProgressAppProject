/**
 * Convert any Date to a "date-only" Date at UTC midnight matching the
 * server's local calendar day. Used as the canonical `TaskLog.date`.
 */
export function toUtcMidnight(d: Date = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/**
 * Parse a YYYY-MM-DD string into a UTC-midnight Date.
 */
export function parseISODate(iso: string): Date {
  const [y, m, day] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, day));
}

/**
 * Format a Date as YYYY-MM-DD (using its UTC fields — pair with toUtcMidnight).
 */
export function formatISODate(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Return UTC-midnight Dates for Sunday → Saturday of the week containing `ref`.
 */
export function getWeekDates(ref: Date): Date[] {
  const base = toUtcMidnight(ref);
  const dow = base.getUTCDay(); // 0=Sun
  const sunday = new Date(base);
  sunday.setUTCDate(base.getUTCDate() - dow);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sunday);
    d.setUTCDate(sunday.getUTCDate() + i);
    return d;
  });
}

export function addDays(d: Date, n: number): Date {
  const next = new Date(d);
  next.setUTCDate(d.getUTCDate() + n);
  return next;
}

export function sameUtcDay(a: Date, b: Date): boolean {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}
