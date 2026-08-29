import {useSelector} from 'react-redux';
import {selectActiveShop, selectActiveShopId} from '../Redux/slices/shopSlice';
import type {Shop} from '../Server/Shops/ShopsApi';

/** The shop every shop-scoped endpoint is called against. */
export function useActiveShop(): Shop | null {
  return useSelector(selectActiveShop);
}

export function useActiveShopId(): number | null {
  return useSelector(selectActiveShopId);
}
