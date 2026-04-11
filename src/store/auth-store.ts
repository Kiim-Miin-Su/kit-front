"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { AUTH_STORAGE_KEY } from "@/lib/auth-storage";
import type { AuthSession, AuthUser, UserRole } from "@/types/auth";

interface AuthStore extends AuthSession {
  hydrated: boolean;
  setHydrated: (hydrated: boolean) => void;
  setSession: (session: AuthSession) => void;
  setUser: (user: AuthUser | null) => void;
  clearSession: () => void;
  isAuthenticated: () => boolean;
  getRole: () => UserRole;
}

const initialState: AuthSession = {
  accessToken: null,
  user: null,
};

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      ...initialState,
      hydrated: false,
      setHydrated: (hydrated) => set({ hydrated }),
      setSession: ({ accessToken, user }) => set({ accessToken, user }),
      setUser: (user) => set({ user }),
      clearSession: () => set(initialState),
      isAuthenticated: () => Boolean(get().accessToken && get().user),
      getRole: () => get().user?.role ?? "guest",
    }),
    {
      name: AUTH_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      // accessToken은 XSS 노출 방지를 위해 localStorage에 저장하지 않는다.
      // 탭 새로고침 후 token이 없으면 /auth/refresh(httpOnly Cookie)로 재발급한다.
      partialize: ({ user }) => ({ user }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    },
  ),
);
