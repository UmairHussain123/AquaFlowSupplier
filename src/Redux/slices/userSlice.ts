import {createSlice, type PayloadAction} from '@reduxjs/toolkit';

/** Shape of `user` in the POST /supplier/login response. */
export interface SupplierUser {
  id: string | number;
  name: string;
  email: string;
  roles: string[];
  phone?: string | null;
}

export interface UserState {
  isLoggedIn: boolean;
  user: SupplierUser | null;
  token: string | null;
}

const initialState: UserState = {
  isLoggedIn: false,
  user: null,
  token: null,
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    login: (
      state,
      action: PayloadAction<{user: SupplierUser; token: string}>,
    ) => {
      state.isLoggedIn = true;
      state.user = action.payload.user;
      state.token = action.payload.token;
    },
    setUser: (state, action: PayloadAction<SupplierUser | null>) => {
      state.user = action.payload;
    },
    logout: () => initialState,
  },
});

export const {login, setUser, logout} = userSlice.actions;

export const selectUser = (state: any): SupplierUser | null => state.user?.user ?? null;
export const selectIsLoggedIn = (state: any): boolean => Boolean(state.user?.isLoggedIn);
/** supplier_owner gets every shop; a manager/delivery account gets only theirs. */
export const selectRoles = (state: any): string[] => state.user?.user?.roles ?? [];
export const hasRole = (state: any, role: string): boolean =>
  selectRoles(state).includes(role);

export default userSlice.reducer;
