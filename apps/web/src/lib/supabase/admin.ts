/**
 * Server-only Supabase client using the service role key.
 * Never import this into client components — it bypasses RLS.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { missingEnvKeys, supabaseEnv } from '@/lib/config/env';

let adminClient: SupabaseClient | null = null;

/** True when URL + service role key are configured in env. */
export function isSupabaseAdminConfigured(): boolean {
  return missingEnvKeys(
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY'
  ).length === 0;
}

/**
 * Lazy singleton admin client (service role).
 * Throws if env is incomplete — call `isSupabaseAdminConfigured()` first
 * or handle the error at the route boundary.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (adminClient) return adminClient;

  const url = supabaseEnv.url();
  const serviceRoleKey = supabaseEnv.serviceRoleKey();
  if (!url || !serviceRoleKey) {
    throw new Error(
      'Supabase admin is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in apps/web/.env.local'
    );
  }

  adminClient = createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  return adminClient;
}
