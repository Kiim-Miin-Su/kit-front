import type { AuthSession } from "@/types/auth";

export const AUTH_STORAGE_KEY = "ai-edu-auth";

interface PersistedAuthPayload {
  state?: AuthSession;
}

export function readStoredAuthSession() {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as PersistedAuthPayload;
    return parsed.state ?? null;
  } catch {
    return null;
  }
}

export function clearStoredAuthSession() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(AUTH_STORAGE_KEY);
}
