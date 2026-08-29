import {combineReducers} from '@reduxjs/toolkit';
import userReducer from '../slices/userSlice';
import shopReducer from '../slices/shopSlice';
import loadingReducer from '../slices/loadingSlice';
import filterReducer from '../slices/filterSlice';
import settingReducer from '../slices/SettingSlice';

const appReducer = combineReducers({
  user: userReducer,
  shop: shopReducer,
  loading: loadingReducer,
  filter: filterReducer,
  setting: settingReducer,
});

/**
 * `RESET_APP` is dispatched from Config.tsx on sign-out so the next account
 * never inherits the previous supplier's shops, filters or profile.
 */
const rootReducer = (state: any, action: any) => {
  if (action.type === 'RESET_APP') {
    return appReducer(undefined, action);
  }
  return appReducer(state, action);
};

export default rootReducer;
