/**
 * Pakistani mobile numbers — the one format every supplier-side phone field
 * takes (customers, staff, the account, the shop).
 */

/**
 * As-you-type mask that always starts "03", as in the HHC apps:
 * "+92 300 1234567" / "3001234567" → "0300-1234567", "0999…" → "0399…".
 *
 * Empty stays empty so optional fields can be left blank. A lone "0" is left
 * as typed, so backspacing "03" → "0" → "" clears the field instead of the
 * prefix snapping back.
 */
export const formatPakistaniPhone = (value: string): string => {
  let digits = (value ?? '').replace(/\D/g, '');
  if (!digits || digits === '0') return digits;

  // +92 country code → local.
  if (digits.startsWith('92')) digits = digits.slice(2);

  // Drop whatever local prefix was typed, then force "03" back on.
  if (digits.startsWith('03')) digits = digits.slice(2);
  else if (digits.startsWith('3') || digits.startsWith('0')) {
    digits = digits.slice(1);
  }

  digits = `03${digits}`.slice(0, 11);
  return digits.length <= 4 ? digits : `${digits.slice(0, 4)}-${digits.slice(4)}`;
};

/** "0300-1234567" → "03001234567", the shape the API stores. */
export const phoneDigits = (value: string | null | undefined): string =>
  (value ?? '').replace(/\D/g, '');

/** A full 03XXXXXXXXX mobile number (dashes and spaces ignored). */
export const isPakistaniMobile = (value: string | null | undefined): boolean =>
  /^03\d{9}$/.test(phoneDigits(value));

/**
 * Display form of a stored number: a full mobile reads as 03XX-XXXXXXX
 * whatever shape it was saved in. Numbers the API already masked
 * ("0300****567") come back unchanged.
 */
export const formatPhoneDisplay = (
  value: string | null | undefined,
  fallback = '—',
): string => {
  const raw = (value ?? '').trim();
  if (!raw) return fallback;
  if (!/^[+\d\s()-]+$/.test(raw)) return raw;

  let digits = raw.replace(/\D/g, '');
  if (digits.startsWith('92') && digits.length === 12) digits = `0${digits.slice(2)}`;

  return /^0\d{10}$/.test(digits) ? `${digits.slice(0, 4)}-${digits.slice(4)}` : raw;
};
