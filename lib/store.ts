import { configureStore, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { useDispatch, useSelector, type TypedUseSelectorHook } from "react-redux";

type AuthState = { token: string | null; user: Record<string, unknown> | null; initialized: boolean };
const authSlice = createSlice({
  name: "auth",
  initialState: { token: null, user: null, initialized: false } as AuthState,
  reducers: {
    restoreSession(state, action: PayloadAction<{ token: string | null; user?: Record<string, unknown> | null }>) {
      state.token = action.payload.token;
      state.user = action.payload.user ?? null;
      state.initialized = true;
    },
    setSession(state, action: PayloadAction<{ token: string; user?: Record<string, unknown> | null }>) {
      state.token = action.payload.token;
      state.user = action.payload.user ?? null;
      state.initialized = true;
    },
    clearSession(state) {
      state.token = null;
      state.user = null;
      state.initialized = true;
    },
  },
});

export const { restoreSession, setSession, clearSession } = authSlice.actions;
export const makeStore = () => configureStore({ reducer: { auth: authSlice.reducer } });
export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
