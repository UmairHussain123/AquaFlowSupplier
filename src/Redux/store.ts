import {persistReducer, persistStore} from 'redux-persist';
import {configureStore} from '@reduxjs/toolkit';
import storage from './storageWithRetry';
import rootReducer from './reducers/rootReducer';

const persistConfig = {
  key: 'root',
  storage,
  // Persist only light-weight slices to avoid huge writes.
  whitelist: ['user', 'shop', 'filter', 'setting'],
  writeFailHandler: (e: any) => {
    console.warn('redux-persist write failed:', e?.message || e);
  },
};

const persistedReducer = persistReducer(persistConfig, rootReducer as any);

const store = configureStore({
  reducer: persistedReducer,
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      serializableCheck: false,
      immutableCheck: false,
    }),
});

const persistor = persistStore(store);

export type RootState = ReturnType<typeof rootReducer>;
export type AppDispatch = typeof store.dispatch;

export {store, persistor};
