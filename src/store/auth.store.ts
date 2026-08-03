import { create } from "zustand";
import { persist } from "zustand/middleware";
import { User } from "@/types/account";

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;

  setAccessToken: (token: string | null) => void;
  setRefreshToken: (token: string | null) => void;
  setUser: (user: User | null) => void;

  login: (data: { accessToken: string; refreshToken?: string; user: User }) => void;
  logout: () => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      user: null,

      setAccessToken: (token) => set({ accessToken: token }),

      setRefreshToken: (token) => set({ refreshToken: token }),

      setUser: (user) => set({ user }),

      login: (data) =>
        set({
          accessToken: data.accessToken,
          refreshToken: data.refreshToken ?? null,
          user: data.user,
        }),

      logout: () =>
        set({
          accessToken: null,
          refreshToken: null,
          user: null,
        }),

      clear: () =>
        set({
          accessToken: null,
          refreshToken: null,
          user: null,
        }),
    }),
    {
      name: "auth-storage",
    }
  )
);

export const isAuthenticated = () => {
  const state = useAuthStore.getState();
  return !!state.accessToken;
};
