function parseDateOnlyUTC(dateString: string): Date {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
}

/** Monday-to-Sunday week containing `dateString`, as UTC day boundaries (matches AppointmentDate's UTC-midnight storage). */
export function getWeekBoundsUTC(dateString: string) {
  const anchor = parseDateOnlyUTC(dateString);
  const weekday = anchor.getUTCDay(); // 0 (Sun) .. 6 (Sat)
  const mondayOffset = weekday === 0 ? -6 : 1 - weekday;

  const weekStart = new Date(anchor);
  weekStart.setUTCDate(weekStart.getUTCDate() + mondayOffset);

  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);
  weekEnd.setUTCHours(23, 59, 59, 999);

  return { weekStart, weekEnd };
}

/** Calendar month containing `dateString`, as UTC day boundaries. */
export function getMonthBoundsUTC(dateString: string) {
  const anchor = parseDateOnlyUTC(dateString);
  const monthStart = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), 1, 0, 0, 0, 0));
  const monthEnd = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + 1, 0, 23, 59, 59, 999));
  return { monthStart, monthEnd };
}
