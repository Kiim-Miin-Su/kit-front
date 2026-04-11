import axios, { AxiosHeaders } from "axios";

import { clearStoredAuthSession, readStoredAuthSession } from "@/lib/auth-storage";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000",
  withCredentials: true,
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  const session = readStoredAuthSession();

  if (session?.accessToken) {
    const headers = config.headers instanceof AxiosHeaders
      ? config.headers
      : new AxiosHeaders(config.headers);

    headers.set("Authorization", `Bearer ${session.accessToken}`);
    config.headers = headers;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      clearStoredAuthSession();
    }

    return Promise.reject(error);
  },
);
