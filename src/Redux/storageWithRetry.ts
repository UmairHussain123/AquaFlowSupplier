import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * redux-persist's storage engine, but a transient AsyncStorage failure retries
 * instead of tearing the whole persist down (which is what surfaced as a
 * redbox on low-storage Android devices).
 */
const RETRIES = 2;
const RETRY_DELAY_MS = 120;

const wait = (ms: number) =>
  new Promise<void>(resolve => {
    setTimeout(() => resolve(), ms);
  });

const withRetry = async <T,>(operation: () => Promise<T>): Promise<T> => {
  let lastError: unknown;

  for (let attempt = 0; attempt <= RETRIES; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt < RETRIES) await wait(RETRY_DELAY_MS);
    }
  }

  throw lastError;
};

const storageWithRetry = {
  getItem: (key: string) => withRetry(() => AsyncStorage.getItem(key)),
  setItem: (key: string, value: string) =>
    withRetry(() => AsyncStorage.setItem(key, value)),
  removeItem: (key: string) => withRetry(() => AsyncStorage.removeItem(key)),
};

export default storageWithRetry;
