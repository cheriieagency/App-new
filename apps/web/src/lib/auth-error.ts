/**
 * Normalize better-auth / fetch auth errors into a detailed user-facing string.
 * Prefer explicit `message` (and code/status) over a generic fallback.
 */

type AuthErrorLike = {
  message?: unknown;
  statusText?: unknown;
  status?: unknown;
  code?: unknown;
  error?: unknown;
  cause?: unknown;
  details?: unknown;
};

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function collectFromUnknown(error: unknown, into: string[], depth = 0): void {
  if (error == null || depth > 3) return;

  if (typeof error === 'string') {
    const s = asNonEmptyString(error);
    if (s && !into.includes(s)) into.push(s);
    return;
  }

  if (error instanceof Error) {
    const s = asNonEmptyString(error.message);
    if (s && !into.includes(s)) into.push(s);
    if (error.cause) collectFromUnknown(error.cause, into, depth + 1);
    return;
  }

  if (typeof error !== 'object') return;
  const e = error as AuthErrorLike;

  const message = asNonEmptyString(e.message);
  if (message && !into.includes(message)) into.push(message);

  const statusText = asNonEmptyString(e.statusText);
  if (statusText && statusText !== message && !into.includes(statusText)) {
    into.push(statusText);
  }

  const code = asNonEmptyString(e.code);
  if (code) {
    const tagged = `[${code}]`;
    if (!into.includes(tagged)) into.push(tagged);
  }

  if (typeof e.status === 'number') {
    const tagged = `(HTTP ${e.status})`;
    if (!into.includes(tagged)) into.push(tagged);
  }

  if (e.details != null && typeof e.details === 'object') {
    try {
      const json = JSON.stringify(e.details);
      if (json && json !== '{}' && !into.includes(json)) into.push(json);
    } catch {
      /* ignore */
    }
  }

  collectFromUnknown(e.error, into, depth + 1);
  collectFromUnknown(e.cause, into, depth + 1);
}

/** Build a detailed auth error string for UI display. */
export function formatAuthError(error: unknown, fallback: string): string {
  const parts: string[] = [];
  collectFromUnknown(error, parts);

  // Drop useless generic-only noise when we have richer pieces alongside it.
  const generics = new Set(['fetch failed', 'failed to fetch', 'network error']);
  const useful = parts.filter((p) => !generics.has(p.toLowerCase()));
  const chosen = useful.length > 0 ? useful : parts;

  if (chosen.length === 0) return fallback;
  return chosen.join(' — ');
}
