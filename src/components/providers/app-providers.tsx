"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";

import { useAuthStore } from "@/store/auth-store";

export function AppProviders({ children }: { children: ReactNode }) {
  useEffect(() => {
    useAuthStore.persist.rehydrate();
  }, []);

  return children;
}
