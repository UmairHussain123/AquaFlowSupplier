import {createSlice, type PayloadAction} from '@reduxjs/toolkit';

/** Device-local preferences — nothing here round-trips to the API. */
export interface SettingState {
  loudOrderAlert: boolean;
  hasSeenOnboarding: boolean;
}

const initialState: SettingState = {
  loudOrderAlert: true,
  hasSeenOnboarding: false,
};

const settingSlice = createSlice({
  name: 'setting',
  initialState,
  reducers: {
    setLoudOrderAlert: (state, action: PayloadAction<boolean>) => {
      state.loudOrderAlert = action.payload;
    },
    markOnboardingSeen: state => {
      state.hasSeenOnboarding = true;
    },
  },
});

export const {setLoudOrderAlert, markOnboardingSeen} = settingSlice.actions;
export default settingSlice.reducer;
