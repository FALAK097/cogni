const storagePrefix = "widget:session:";

export function sessionStorageKey(publicKey: string) {
  return `${storagePrefix}${publicKey}`;
}

export function readSessionToken(publicKey: string) {
  if (typeof window === "undefined") return null;

  try {
    return window.localStorage.getItem(sessionStorageKey(publicKey));
  } catch {
    return null;
  }
}

export function writeSessionToken(publicKey: string, token: string) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(sessionStorageKey(publicKey), token);
  } catch {
    // Ignore quota or privacy mode failures.
  }
}

export function clearSessionToken(publicKey: string) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(sessionStorageKey(publicKey));
  } catch {
    // Ignore storage failures.
  }
}
