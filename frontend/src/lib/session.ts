import type { TokenPair } from "@/lib/types";

const ACCESS_KEY = "aims_access";
const REFRESH_KEY = "aims_refresh";
const ROLE_KEY = "aims_role";

function getStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function saveSession(tokens: TokenPair) {
  const storage = getStorage();
  if (!storage) {
    return;
  }
  storage.setItem(ACCESS_KEY, tokens.access);
  storage.setItem(REFRESH_KEY, tokens.refresh);
}

export function getAccessToken() {
  const storage = getStorage();
  if (!storage) {
    return null;
  }
  return storage.getItem(ACCESS_KEY);
}

export function saveRole(role: string) {
  const storage = getStorage();
  if (!storage) {
    return;
  }
  storage.setItem(ROLE_KEY, role);
}

export function getSavedRole() {
  const storage = getStorage();
  if (!storage) {
    return null;
  }
  return storage.getItem(ROLE_KEY);
}

export function clearSession() {
  const storage = getStorage();
  if (!storage) {
    return;
  }
  storage.removeItem(ACCESS_KEY);
  storage.removeItem(REFRESH_KEY);
  storage.removeItem(ROLE_KEY);
}
