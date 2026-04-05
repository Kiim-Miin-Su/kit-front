import { api } from "@/services/api";
import type { AuthSession, AuthUser } from "@/types/auth";

interface SignInPayload {
  email: string;
  password: string;
}

export async function signIn(payload: SignInPayload) {
  const { data } = await api.post<AuthSession>("/auth/sign-in", payload);
  return data;
}

export async function signOut() {
  await api.post("/auth/sign-out");
}

export async function fetchMe() {
  const { data } = await api.get<AuthUser>("/auth/me");
  return data;
}

export async function refreshAccessToken() {
  const { data } = await api.post<{ accessToken: string }>("/auth/refresh");
  return data;
}
