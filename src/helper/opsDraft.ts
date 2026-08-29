import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'aqua_ops_draft';

/**
 * The delivery hours and service-area numbers collected on step 4 of the
 * application (SA5).
 *
 * `POST /supplier/apply` takes none of them — hours and zones only exist once
 * ops approve the shop and it has an id — so they are held on the device and
 * used to pre-fill Shop settings the first time the supplier opens it.
 */
export interface OpsDraft {
  opensAt: string;
  closesAt: string;
  /** 0 = Sunday … 6 = Saturday. */
  openDays: number[];
  radiusKm: string;
  minimumOrder: string;
  deliveryFee: string;
  dailyCapacity: string;
  etaMinutes: string;
}

export const DEFAULT_OPS_DRAFT: OpsDraft = {
  opensAt: '09:00',
  closesAt: '22:00',
  openDays: [1, 2, 3, 4, 5, 6],
  radiusKm: '5',
  minimumOrder: '300',
  deliveryFee: '40',
  dailyCapacity: '60',
  etaMinutes: '45',
};

export const saveOpsDraft = async (draft: OpsDraft) => {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(draft));
  } catch (error) {
    console.warn('saveOpsDraft failed:', error);
  }
};

export const getOpsDraft = async (): Promise<OpsDraft | null> => {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as OpsDraft) : null;
  } catch (error) {
    console.warn('getOpsDraft failed:', error);
    return null;
  }
};

export const clearOpsDraft = async () => {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch (error) {
    console.warn('clearOpsDraft failed:', error);
  }
};

// --------------------
// Application draft (steps 1–3), so "Save draft" in the wizard really saves.
// --------------------
const APPLICATION_KEY = 'aqua_application_draft';

export const saveApplicationDraft = async (values: Record<string, any>) => {
  try {
    await AsyncStorage.setItem(APPLICATION_KEY, JSON.stringify(values));
  } catch (error) {
    console.warn('saveApplicationDraft failed:', error);
  }
};

export const getApplicationDraft = async (): Promise<Record<string, any> | null> => {
  try {
    const raw = await AsyncStorage.getItem(APPLICATION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.warn('getApplicationDraft failed:', error);
    return null;
  }
};

export const clearApplicationDraft = async () => {
  try {
    await AsyncStorage.removeItem(APPLICATION_KEY);
  } catch (error) {
    console.warn('clearApplicationDraft failed:', error);
  }
};

// --------------------
// The submitted application, so SA6 can show its status after a cold start.
// --------------------
const SUBMITTED_KEY = 'aqua_submitted_application';

export const saveSubmittedApplication = async (application: unknown) => {
  try {
    await AsyncStorage.setItem(SUBMITTED_KEY, JSON.stringify(application));
  } catch (error) {
    console.warn('saveSubmittedApplication failed:', error);
  }
};

export const getSubmittedApplication = async <T = any>(): Promise<T | null> => {
  try {
    const raw = await AsyncStorage.getItem(SUBMITTED_KEY);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch (error) {
    console.warn('getSubmittedApplication failed:', error);
    return null;
  }
};
