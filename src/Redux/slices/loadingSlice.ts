import {createSlice, type PayloadAction} from '@reduxjs/toolkit';

export interface LoadingState {
  visible: boolean;
  message: string | null;
}

const initialState: LoadingState = {visible: false, message: null};

const loadingSlice = createSlice({
  name: 'loading',
  initialState,
  reducers: {
    showLoader: (state, action: PayloadAction<string | undefined>) => {
      state.visible = true;
      state.message = action.payload ?? null;
    },
    hideLoader: () => initialState,
  },
});

export const {showLoader, hideLoader} = loadingSlice.actions;
export const selectLoading = (state: any): LoadingState =>
  state.loading ?? initialState;

export default loadingSlice.reducer;
