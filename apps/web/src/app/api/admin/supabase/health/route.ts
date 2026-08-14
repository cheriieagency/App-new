/**
 * GET /api/admin/supabase/health
 * Reports whether Supabase URL + service role key are installed (no secrets).
 */

import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { missingEnvKeys, supabaseEnv } from '@/lib/config/env';
import {
  getSupabaseAdmin,
  isSupabaseAdminConfigured,
} from '@/lib/supabase/admin';

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const missing = missingEnvKeys(
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY'
  );
  const configured = isSupabaseAdminConfigured();
  const serviceKey = supabaseEnv.serviceRoleKey() ?? '';
  const keyFormat = serviceKey.startsWith('eyJ')
    ? 'legacy_jwt'
    : serviceKey.startsWith('sb_secret_')
      ? 'sb_secret'
      : serviceKey
        ? 'other'
        : 'missing';

  let reachable: boolean | null = null;
  let reachError: string | null = null;

  if (configured) {
    try {
      const admin = getSupabaseAdmin();
      // Lightweight auth admin call — proves the service key is accepted.
      const { error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1 });
      if (error) {
        reachable = false;
        reachError = error.message;
      } else {
        reachable = true;
      }
    } catch (error) {
      reachable = false;
      reachError = error instanceof Error ? error.message : 'unreachable';
    }
  }

  return Response.json({
    ok: configured && reachable === true,
    configured,
    keys: {
      NEXT_PUBLIC_SUPABASE_URL: Boolean(supabaseEnv.url()),
      NEXT_PUBLIC_SUPABASE_ANON_KEY: Boolean(supabaseEnv.anonKey()),
      SUPABASE_SERVICE_ROLE_KEY: Boolean(supabaseEnv.serviceRoleKey()),
    },
    storageBucket: supabaseEnv.storageBucket(),
    serviceRoleKeyFormat: keyFormat,
    reachable,
    reachError,
    missing,
    integrations: {
      database: 'Uses DATABASE_URL (Postgres) — already bypasses RLS; no JS service role needed',
      upload: 'Uses getSupabaseAdmin() → Storage for public HTTPS media URLs',
      mobile: 'Must never embed SUPABASE_SERVICE_ROLE_KEY',
    },
    hint: configured
      ? reachable
        ? 'Supabase service role is installed and responding.'
        : 'Key is present but Supabase rejected it — paste the service_role secret from Supabase → Project Settings → API.'
      : 'Add SUPABASE_SERVICE_ROLE_KEY to apps/web/.env.local and restart the dev server.',
  });
}
