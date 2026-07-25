//Auth Store (Zustand) : Store sẽ giữ trạng thái đăng nhập của toàn bộ ứng dụng.
import { create } from "zustand";
import { User } from "@/types/account";

interface AuthState {
  user: User | null;
  token: string | null;

  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;

  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,

  setUser: (user) => set({ user }),

  setToken: (token) => set({ token }),

  logout: () =>
    set({
      user: null,
      token: null,
    }),
}));