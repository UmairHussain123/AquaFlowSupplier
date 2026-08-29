import {privateAPI} from '../Config';
import dayjs from '../../helper/dateHelper';

/**
 * Shop configuration: when the shop is open, when it's closed for the day, and
 * where it delivers.
 *
 * Endpoints (Aquago Supplier API):
 *   GET    /supplier/shops/{shop}/business-hours
 *   PUT    /supplier/shops/{shop}/business-hours
 *   GET    /supplier/shops/{shop}/holidays
 *   POST   /supplier/shops/{shop}/holidays
 *   DELETE /supplier/shops/{shop}/holidays/{id}
 *   GET    /supplier/shops/{shop}/service-zones
 *   POST   /supplier/shops/{shop}/service-zones
 *   PUT    /supplier/shops/{shop}/service-zones/{id}
 *   DELETE /supplier/shops/{shop}/service-zones/{id}
 */

// --------------------
// Business hours
// --------------------

/** 0 = Sunday ... 6 = Saturday, matching the API's day_of_week. */
export const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

/** The single-letter chips in the design (SA5) run Monday-first. */
export const DAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

/** Times come back as "HH:MM:SS" (or null on a closed day). */
export interface BusinessHour {
  id: number;
  shop_id: number;
  day_of_week: number;
  opens_at: string | null;
  closes_at: string | null;
  is_closed: boolean;
  created_at: string;
  updated_at: string;
}

/** One day in the PUT payload — a closed day carries no times. */
export interface BusinessHourInput {
  day_of_week: number;
  opens_at?: string;
  closes_at?: string;
  is_closed?: boolean;
}

const hoursBase = (shopId: number | string) =>
  `/supplier/shops/${shopId}/business-hours`;

export const listBusinessHours = async (
  shopId: number | string,
): Promise<BusinessHour[]> => {
  const {data} = await privateAPI.get<{data: BusinessHour[]}>(hoursBase(shopId));
  return data.data ?? [];
};

/** Replaces the whole week — send all seven days, not a partial set. */
export const setBusinessHours = async (
  shopId: number | string,
  hours: BusinessHourInput[],
): Promise<BusinessHour[]> => {
  const {data} = await privateAPI.put<{data: BusinessHour[]}>(hoursBase(shopId), {
    hours,
  });
  return data.data ?? [];
};

/** "09:00:00" -> "09:00" for the time picker. */
export const toTimeInput = (value: string | null): string =>
  value ? value.slice(0, 5) : '';

/** "09:00" -> "9:00 AM" for display. */
export const formatTime = (value: string | null | undefined): string => {
  if (!value) return '—';
  const [h, m] = value.split(':');
  const hour = Number(h);
  if (Number.isNaN(hour)) return value;
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return `${display}:${m} ${suffix}`;
};

/**
 * Fill any missing day so the editor always shows a full week — a shop that has
 * never set hours comes back with fewer than seven rows.
 */
export const weekFromApi = (hours: BusinessHour[]): BusinessHourInput[] =>
  DAY_NAMES.map((_, day) => {
    const row = hours.find(h => h.day_of_week === day);
    if (!row) return {day_of_week: day, is_closed: true};
    return {
      day_of_week: day,
      is_closed: row.is_closed,
      opens_at: toTimeInput(row.opens_at) || undefined,
      closes_at: toTimeInput(row.closes_at) || undefined,
    };
  });

/** Drop the times on closed days so the payload matches what the API expects. */
export const weekToPayload = (week: BusinessHourInput[]): BusinessHourInput[] =>
  week.map(day =>
    day.is_closed
      ? {day_of_week: day.day_of_week, is_closed: true}
      : {
          day_of_week: day.day_of_week,
          is_closed: false,
          opens_at: day.opens_at,
          closes_at: day.closes_at,
        },
  );

/** Days that are open but missing a time, or close at/before they open. */
export const invalidDays = (week: BusinessHourInput[]): string[] =>
  week
    .filter(day => {
      if (day.is_closed) return false;
      if (!day.opens_at || !day.closes_at) return true;
      return day.closes_at <= day.opens_at;
    })
    .map(day => DAY_NAMES[day.day_of_week]);

/** "Mon–Sat 09:00–22:00" for the Shop settings row. */
export const weekSummary = (week: BusinessHourInput[]): string => {
  const open = week.filter(day => !day.is_closed);
  if (!open.length) return 'Closed all week';
  const first = open[0];
  const sameHours = open.every(
    day => day.opens_at === first.opens_at && day.closes_at === first.closes_at,
  );
  const days = open
    .map(day => DAY_NAMES[day.day_of_week].slice(0, 3))
    .join(', ');
  return sameHours
    ? `${days} ${first.opens_at}–${first.closes_at}`
    : `${open.length} days open`;
};

// --------------------
// Service zones
// --------------------

export type ZoneType = 'radius' | 'polygon' | string;

/** Money and distance fields come back as decimal strings. */
export interface ServiceZone {
  id: number;
  shop_id: number;
  zone_type: ZoneType;
  radius_km: string | null;
  /** Only set for polygon zones — drawing one isn't supported in the app. */
  polygon: unknown | null;
  delivery_fee: string;
  minimum_order_amount: string;
  estimated_delivery_minutes: number;
  created_at: string;
  updated_at: string;
}

export interface ServiceZonePayload {
  zone_type: ZoneType;
  radius_km: number;
  delivery_fee: number;
  minimum_order_amount: number;
  estimated_delivery_minutes: number;
}

const zonesBase = (shopId: number | string) =>
  `/supplier/shops/${shopId}/service-zones`;

export const listServiceZones = async (
  shopId: number | string,
): Promise<ServiceZone[]> => {
  const {data} = await privateAPI.get<{data: ServiceZone[]}>(zonesBase(shopId));
  return data.data ?? [];
};

export const createServiceZone = async (
  shopId: number | string,
  payload: ServiceZonePayload,
): Promise<ServiceZone> => {
  const {data} = await privateAPI.post<{data: ServiceZone}>(
    zonesBase(shopId),
    payload,
  );
  return data.data;
};

/** Partial update — send only the fields you're changing. */
export const updateServiceZone = async (
  shopId: number | string,
  zoneId: number | string,
  payload: Partial<ServiceZonePayload>,
): Promise<ServiceZone> => {
  const {data} = await privateAPI.put<{data: ServiceZone}>(
    `${zonesBase(shopId)}/${zoneId}`,
    payload,
  );
  return data.data;
};

export const deleteServiceZone = async (
  shopId: number | string,
  zoneId: number | string,
): Promise<void> => {
  await privateAPI.delete(`${zonesBase(shopId)}/${zoneId}`);
};

/** "5 km radius" / "Custom area" */
export const zoneLabel = (zone: ServiceZone): string =>
  zone.zone_type === 'radius' && zone.radius_km
    ? `${Number(zone.radius_km)} km radius`
    : 'Custom area';

/** "5 km · Rs 40 · min Rs 300" for the Shop settings row. */
export const zonesSummary = (zones: ServiceZone[]): string => {
  if (!zones.length) return 'No delivery zone set';
  const zone = zones[0];
  const parts = [
    zone.zone_type === 'radius' && zone.radius_km
      ? `${Number(zone.radius_km)} km`
      : 'Custom area',
    `Rs ${Number(zone.delivery_fee)}`,
    `min Rs ${Number(zone.minimum_order_amount)}`,
  ];
  const summary = parts.join(' · ');
  return zones.length > 1 ? `${summary} + ${zones.length - 1} more` : summary;
};

// --------------------
// Holidays
// --------------------

/**
 * A one-off closed day. Note the asymmetry: `date` comes back as a full ISO
 * timestamp ("2026-10-01T00:00:00.000000Z") but the POST takes "YYYY-MM-DD".
 */
export interface Holiday {
  id: number;
  shop_id: number;
  date: string;
  reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface HolidayPayload {
  /** "YYYY-MM-DD" */
  date: string;
  reason?: string;
}

const holidaysBase = (shopId: number | string) =>
  `/supplier/shops/${shopId}/holidays`;

export const listHolidays = async (
  shopId: number | string,
): Promise<Holiday[]> => {
  const {data} = await privateAPI.get<{data: Holiday[]}>(holidaysBase(shopId));
  return data.data ?? [];
};

export const addHoliday = async (
  shopId: number | string,
  payload: HolidayPayload,
): Promise<Holiday> => {
  const {data} = await privateAPI.post<{data: Holiday}>(
    holidaysBase(shopId),
    payload,
  );
  return data.data;
};

export const deleteHoliday = async (
  shopId: number | string,
  holidayId: number | string,
): Promise<void> => {
  await privateAPI.delete(`${holidaysBase(shopId)}/${holidayId}`);
};

/**
 * "2026-10-01T00:00:00.000000Z" -> "2026-10-01". Sliced rather than parsed
 * through Date so a midnight-UTC stamp can't slide to the previous day in a
 * behind-UTC timezone.
 */
export const holidayDateKey = (holiday: Holiday): string =>
  holiday.date.slice(0, 10);

/** A holiday whose day has already gone by. */
export const isPastHoliday = (holiday: Holiday): boolean =>
  holidayDateKey(holiday) < dayjs().format('YYYY-MM-DD');

/** Soonest first, so the next closure is at the top. */
export const sortHolidays = (holidays: Holiday[]): Holiday[] =>
  [...holidays].sort((a, b) =>
    holidayDateKey(a).localeCompare(holidayDateKey(b)),
  );
