/**
 * Formatting helpers for the decimal-string money fields, snake_case statuses
 * and ISO timestamps the Aquago Supplier API returns.
 */

/** "1030.00" -> "Rs 1,030". Empty/NaN values render as an em dash. */
export const formatMoney = (
  amount: string | number | null | undefined,
): string => {
  if (amount === null || amount === undefined || amount === '') return '—';
  const n = Number(amount);
  if (Number.isNaN(n)) return String(amount);
  return `Rs ${n.toLocaleString('en-US', {maximumFractionDigits: 0})}`;
};

/** Same as formatMoney but without the currency prefix. */
export const formatAmount = (
  amount: string | number | null | undefined,
): string => {
  if (amount === null || amount === undefined || amount === '') return '—';
  const n = Number(amount);
  if (Number.isNaN(n)) return String(amount);
  return n.toLocaleString('en-US', {maximumFractionDigits: 0});
};

export const toNumber = (value: string | number | null | undefined): number => {
  const n = Number(value ?? 0);
  return Number.isNaN(n) ? 0 : n;
};

/** Backend statuses are snake_case — "out_for_delivery" -> "Out for delivery". */
export const statusLabel = (status: string): string => {
  if (!status) return '—';
  const spaced = status.replace(/_/g, ' ');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
};

/**
 * Pulls the human message out of an axios error. A 401 is special-cased: the
 * interceptor is already signing the user out, and the API's bare
 * "Unauthorized." would only flash on screen mid-redirect.
 */
export const apiErrorMessage = (err: unknown, fallback: string): string => {
  const response = (
    err as {response?: {status?: number; data?: {message?: string; errors?: any}}}
  )?.response;

  if (response?.status === 401) {
    return 'Your session has expired. Please sign in again.';
  }

  // Laravel validation errors come back as { errors: { field: [msg] } }.
  const errors = response?.data?.errors;
  if (errors && typeof errors === 'object') {
    const first = Object.values(errors)[0];
    if (Array.isArray(first) && typeof first[0] === 'string') return first[0];
  }

  return response?.data?.message ?? fallback;
};

/** "0301 4412290" from whatever shape the API hands back. */
export const formatPhone = (phone?: string | null): string => {
  if (!phone) return '—';
  const digits = phone.replace(/[^\d+]/g, '');
  if (digits.length === 11 && digits.startsWith('0')) {
    return `${digits.slice(0, 4)} ${digits.slice(4)}`;
  }
  return phone;
};

/** Turns "Sana Ahmed" into "SA" for the avatar bubbles. */
export const initials = (name?: string | null): string => {
  if (!name) return '—';
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part.charAt(0).toUpperCase())
    .join('');
};

export const pluralize = (count: number, one: string, many?: string): string =>
  `${count} ${count === 1 ? one : many ?? `${one}s`}`;
