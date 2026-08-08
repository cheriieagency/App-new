/**
 * Detect incomplete / placeholder auth backends so local testing can fall back
 * to in-memory demo auth (better-auth memory adapter).
 *
 * This app uses better-auth + DATABASE_URL (Neon). Workspace templates also
 * ship NEXT_PUBLIC_SUPABASE_* placeholders — treat those as "not configured".
 */

const DUMMY_VALUE_PATTERNS = [
  /^https?:\/\/dindatabas\./i,
  /din-offentliga-nyckel/i,
  /din-hemliga/i,
  /your[_-]?project/i,
  /your[_-]?anon/i,
  /your[_-]?supabase/i,
  /placeholder/i,
  /example\.supabase/i,
  /changeme/i,
  /^xxx+$/i,
  /^dummy/i,
  /^test[_-]?key$/i,
];

/** True when a string is missing or looks like a template placeholder. */
export function isDummyEnvValue(value: string | undefined | null): boolean {
  if (value == null) return true;
  const trimmed = value.trim();
  if (!trimmed) return true;
  return DUMMY_VALUE_PATTERNS.some((pattern) => pattern.test(trimmed));
}

/** Client + server: Supabase public env is missing or still placeholder text. */
export function isSupabaseEnvMissingOrDummy(): boolean {
  return (
    isDummyEnvValue(process.env.NEXT_PUBLIC_SUPABASE_URL) ||
    isDummyEnvValue(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  );
}

/**
 * Server: enable demo/memory auth when the real DB is missing, or when
 * Supabase placeholders indicate local template setup without a backend.
 */
export function shouldUseDemoAuth(): boolean {
  const noDatabase = isDummyEnvValue(process.env.DATABASE_URL);
  // Incomplete local template → demo. Real DATABASE_URL always wins.
  if (!noDatabase) return false;
  return noDatabase || isSupabaseEnvMissingOrDummy();
}

/** Client-safe signal for UI banners (public env only). */
export function isDemoAuthUiEnabled(): boolean {
  if (process.env.NEXT_PUBLIC_DEMO_AUTH === 'true') return true;
  if (process.env.NEXT_PUBLIC_DEMO_AUTH === 'false') return false;
  return isSupabaseEnvMissingOrDummy();
}
