import {createSlice, type PayloadAction} from '@reduxjs/toolkit';
import type {Shop} from '../../Server/Shops/ShopsApi';

export interface ShopState {
  shops: Shop[];
  activeShopId: number | null;
  /** false until the shops request has settled, so screens can tell loading from none. */
  loaded: boolean;
}

const initialState: ShopState = {
  shops: [],
  activeShopId: null,
  loaded: false,
};

const shopSlice = createSlice({
  name: 'shop',
  initialState,
  reducers: {
    setShops: (state, action: PayloadAction<Shop[]>) => {
      state.shops = action.payload;
      state.loaded = true;
      if (
        !state.activeShopId ||
        !action.payload.some(shop => shop.id === state.activeShopId)
      ) {
        state.activeShopId = action.payload[0]?.id ?? null;
      }
    },
    setActiveShop: (state, action: PayloadAction<number>) => {
      state.activeShopId = action.payload;
    },
    /** Local echo of an open/pause toggle so the header flips immediately. */
    setShopOpen: (state, action: PayloadAction<boolean>) => {
      const shop = state.shops.find(s => s.id === state.activeShopId);
      if (shop) shop.is_open = action.payload;
    },
    shopsFailed: state => {
      state.loaded = true;
    },
    clearShops: () => initialState,
  },
});

export const {setShops, setActiveShop, setShopOpen, shopsFailed, clearShops} =
  shopSlice.actions;

export const selectShops = (state: any): Shop[] => state.shop?.shops ?? [];
export const selectActiveShopId = (state: any): number | null =>
  state.shop?.activeShopId ?? null;
export const selectShopsLoaded = (state: any): boolean =>
  Boolean(state.shop?.loaded);
export const selectActiveShop = (state: any): Shop | null =>
  selectShops(state).find(shop => shop.id === selectActiveShopId(state)) ?? null;

/** "Open" / "Closed" / "Paused" / "Suspended" for the dashboard pill. */
export const shopStatusLabel = (shop: Shop | null): string => {
  if (!shop) return '—';
  if (shop.status !== 'active') {
    return shop.status.charAt(0).toUpperCase() + shop.status.slice(1);
  }
  return shop.is_open ? 'Open' : 'Closed';
};

export default shopSlice.reducer;
