import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import utc from 'dayjs/plugin/utc';

dayjs.extend(relativeTime);
dayjs.extend(utc);

/** "21 Aug 2026, 14:22" */
export const formatDateTime = (iso: string | null | undefined): string => {
  if (!iso) return '—';
  const d = dayjs(iso);
  return d.isValid() ? d.format('DD MMM YYYY, HH:mm') : String(iso);
};

/** "21 Aug, 14:22" — the compact form the ticket and order lists use. */
export const formatShortDateTime = (iso: string | null | undefined): string => {
  if (!iso) return '—';
  const d = dayjs(iso);
  return d.isValid() ? d.format('DD MMM, HH:mm') : String(iso);
};

/** "4:01 PM" */
export const formatTimeOfDay = (iso: string | null | undefined): string => {
  if (!iso) return '—';
  const d = dayjs(iso);
  return d.isValid() ? d.format('h:mm A') : String(iso);
};

/** "Fri, 31 Jul" */
export const formatDayLabel = (iso: string | null | undefined): string => {
  if (!iso) return '—';
  const d = dayjs(iso);
  return d.isValid() ? d.format('ddd, D MMM') : String(iso);
};

/** "18h ago" */
export const fromNow = (iso: string | null | undefined): string => {
  if (!iso) return '—';
  const d = dayjs(iso);
  return d.isValid() ? d.fromNow() : String(iso);
};

export const isToday = (iso: string | null | undefined): boolean => {
  if (!iso) return false;
  const d = dayjs(iso);
  return d.isValid() && d.isSame(dayjs(), 'day');
};

export const isThisWeek = (iso: string | null | undefined): boolean => {
  if (!iso) return false;
  const d = dayjs(iso);
  if (!d.isValid()) return false;
  // Mon–Sun, matching the "This week gross" card in the design.
  const startOfWeek = dayjs().startOf('day').subtract((dayjs().day() + 6) % 7, 'day');
  return d.isAfter(startOfWeek) || d.isSame(startOfWeek, 'day');
};

/** Today as "YYYY-MM-DD" in local time, for the holiday date picker's minimum. */
export const todayKey = (): string => dayjs().format('YYYY-MM-DD');

export const dateKey = (value: Date): string => dayjs(value).format('YYYY-MM-DD');

/**
 * "2026-10-01T00:00:00.000000Z" -> "Thu, 1 Oct 2026". Read in UTC so a
 * midnight-UTC stamp can't slide to the previous day in a behind-UTC timezone.
 */
export const formatHolidayDate = (key: string): string => {
  const d = dayjs.utc(key);
  return d.isValid() ? d.format('ddd, D MMM YYYY') : key;
};

export default dayjs;
