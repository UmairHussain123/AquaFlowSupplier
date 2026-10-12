import {Api, privateAPI} from '../Config';

/**
 * Pakistani cities from the platform directory.
 *
 *   GET /supplier/cities        (?active=1 → only cities Aqua Flow operates in)
 *
 * The supplier application calls it signed out, so `signedOut` goes through
 * the public client: no stale token is attached, and a failure can't trip the
 * private client's global toasts or its session-expired sign-out mid-form.
 */

export interface City {
  id: number;
  name: string;
  province: string;
  is_active: boolean;
}

export const listCities = async (
  params: {active?: boolean; signedOut?: boolean} = {},
): Promise<City[]> => {
  const client = params.signedOut ? Api : privateAPI;
  const {data} = await client.get<{data: City[]}>('/supplier/cities', {
    params: params.active ? {active: 1} : undefined,
  });
  return data.data ?? [];
};

/** A city as the API sends it: a bare name, or `{id, name}` when the relation is loaded. */
export type CityRef = string | {id?: number; name: string | null} | null | undefined;

/** The city's display name whichever shape the API used — never `[object Object]`. */
export const cityName = (city: CityRef): string =>
  typeof city === 'string' ? city : city?.name ?? '';

/** The city's id when the API sent the loaded relation, else null. */
export const cityId = (city: CityRef): number | null =>
  city && typeof city === 'object' && typeof city.id === 'number' ? city.id : null;
