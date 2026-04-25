import type { TokenPair } from "@/lib/types";

const ACCESS_KEY = "aims_access";
const REFRESH_KEY = "aims_refresh";

export function saveSession(tokens: TokenPair) {
  localStorage.setItem(ACCESS_KEY, tokens.access);
  localStorage.setItem(REFRESH_KEY, tokens.refresh);
}

export function getAccessToken() {
  return localStorage.getItem(ACCESS_KEY);
}

export function clearSession() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}
