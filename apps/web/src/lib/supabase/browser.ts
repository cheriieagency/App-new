/**
 * Browser Supabase client (anon key) for Auth recovery / password update.
 * Session cookies for the app still come from better-auth.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { isDummyEnvValue } from '@/lib/auth-env';

let browserClient: SupabaseClient | null | undefined;

/** True when public Supabase URL + anon key are present. */
export function isBrowserSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return !isDummyEnvValue(url) && !isDummyEnvValue(anon);
}

/** Lazy singleton. Returns null when env is missing (demo / local template). */
export function getBrowserSupabase(): SupabaseClient | null {
  if (browserClient !== undefined) return browserClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anon || isDummyEnvValue(url) || isDummyEnvValue(anon)) {
    browserClient = null;
    return null;
  }
  browserClient = createClient(url, anon, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
    },
  });
  return browserClient;
}
