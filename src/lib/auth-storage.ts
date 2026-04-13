import type { AuthSession, UserRole } from "@/types/auth";

export const AUTH_STORAGE_KEY = "ai-edu-auth";

// middleware.ts 에서 Edge Runtime 으로 읽기 위해 쿠키에 저장한다.
// httpOnly 가 아닌 일반 쿠키이므로 UX 라우팅 전용으로만 사용하고
// 실제 권한 검증은 반드시 서버(back API)에서 수행한다.
const ROLE_COOKIE_NAME = "ai_edu_role";

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
  clearRoleCookie();
}

export function setRoleCookie(role: UserRole) {
  if (typeof document === "undefined") {
    return;
  }

  document.cookie = `${ROLE_COOKIE_NAME}=${role}; path=/; SameSite=Lax`;
}

export function clearRoleCookie() {
  if (typeof document === "undefined") {
    return;
  }

  document.cookie = `${ROLE_COOKIE_NAME}=; path=/; SameSite=Lax; Max-Age=0`;
}
