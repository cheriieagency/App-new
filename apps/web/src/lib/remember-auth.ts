/** Local "Remember me" helpers for signup / sign-in autofill (demo-friendly). */

const STORAGE_KEY = 'nc_remember_auth';

export type RememberedAuth = {
  email: string;
  password: string;
};

export function loadRememberedAuth(): RememberedAuth | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<RememberedAuth>;
    if (typeof parsed.email !== 'string' || !parsed.email.trim()) return null;
    return {
      email: parsed.email.trim(),
      password: typeof parsed.password === 'string' ? parsed.password : '',
    };
  } catch {
    return null;
  }
}

export function saveRememberedAuth(email: string, password: string) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ email: email.trim(), password })
    );
  } catch {
    /* ignore quota */
  }
}

export function clearRememberedAuth() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function hasRememberedAuth(): boolean {
  return !!loadRememberedAuth()?.email;
}
