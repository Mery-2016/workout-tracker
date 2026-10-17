export function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function isRealDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

export function weekRange(today: Date): { from: string; to: string } {
  const current = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const weekday = current.getDay();
  const mondayOffset = weekday === 0 ? -6 : 1 - weekday;
  const monday = addDays(current, mondayOffset);
  const sunday = addDays(monday, 6);
  return { from: formatLocalDate(monday), to: formatLocalDate(sunday) };
}

export function monthPrefix(today: Date): string {
  return formatLocalDate(today).slice(0, 7);
}

export type PeriodKey = '7d' | '30d' | '90d' | 'all';

export function periodBounds(period: PeriodKey, today: Date): { from: string | null; to: string } {
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const to = formatLocalDate(end);
  if (period === 'all') return { from: null, to };
  const daysBack = period === '7d' ? 6 : period === '90d' ? 89 : 29;
  return { from: formatLocalDate(addDays(end, -daysBack)), to };
}

export function eachDate(from: string, to: string): string[] {
  const [fromYear, fromMonth, fromDay] = from.split('-').map(Number);
  const [toYear, toMonth, toDay] = to.split('-').map(Number);
  const cursor = new Date(fromYear, fromMonth - 1, fromDay);
  const end = new Date(toYear, toMonth - 1, toDay);
  const dates: string[] = [];
  while (cursor <= end) {
    dates.push(formatLocalDate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

export function volumeFromSets(
  sets: Array<{ reps: number; weight_kg: number | null | undefined }>,
): number {
  let sum = 0;
  for (const set of sets) {
    if (set.weight_kg == null) continue;
    sum += set.weight_kg * set.reps;
  }
  return Math.round(sum * 1000) / 1000;
}

export function distanceFromSets(
  sets: Array<{ distance_km: number | null | undefined }>,
): number {
  let sum = 0;
  for (const set of sets) {
    if (set.distance_km == null) continue;
    sum += set.distance_km;
  }
  return Math.round(sum * 1000) / 1000;
}
