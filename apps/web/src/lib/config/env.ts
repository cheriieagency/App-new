/**
 * Central typed environment config for clikd: (apps/web).
 *
 * All external API keys should be read through this module so developers can
 * trace consumption in one place. Copy `apps/web/.env.example` → `.env.local`.
 */

import { isDummyEnvValue } from '@/lib/auth-env';

/** Trim + treat empty / placeholder template values as unset. */
function readEnv(name: string): string | undefined {
  const raw = process.env[name];
  if (isDummyEnvValue(raw)) return undefined;
  const trimmed = raw!.trim();
  // Catch .env.example style placeholders: YOUR_*, pk_test_YOUR_*, sk-proj-YOUR_*
  if (/YOUR_[A-Z0-9_]+/i.test(trimmed)) return undefined;
  if (/_HERE$/i.test(trimmed)) return undefined;
  return trimmed;
}

/** True when every listed key is present and non-dummy. */
export function hasEnv(...names: string[]): boolean {
  return names.every((name) => Boolean(readEnv(name)));
}

/** Keys from `names` that are missing or still placeholders. */
export function missingEnvKeys(...names: string[]): string[] {
  return names.filter((name) => !readEnv(name));
}

/**
 * JSON 503 response when required secrets are missing.
 * Points developers at apps/web/.env.local (see .env.example).
 */
export function missingEnvResponse(keys: string[], integration: string): Response {
  const unique = [...new Set(keys)];
  const message =
    `${integration} is not configured. Missing: ${unique.join(', ')}. ` +
    `Add them to apps/web/.env.local (see apps/web/.env.example).`;
  console.warn(`[env] ${message}`);
  return Response.json(
    {
      error: 'missing_env',
      integration,
      missing: unique,
      hint: 'Copy apps/web/.env.example → apps/web/.env.local and fill in real values.',
      message,
    },
    { status: 503 }
  );
}

// ---------------------------------------------------------------------------
// 1. AI Copilot & LLM
// ---------------------------------------------------------------------------
export const openaiEnv = {
  /** OpenAI secret key — used by /api/ai/* routes */
  apiKey: () => readEnv('OPENAI_API_KEY'),
  /** Default chat model (e.g. gpt-4o) */
  model: () => readEnv('OPENAI_MODEL') ?? 'gpt-4o',
  requiredKeys: ['OPENAI_API_KEY'] as const,
};

// ---------------------------------------------------------------------------
// 2. Meta / Instagram Graph API
// ---------------------------------------------------------------------------
export const metaEnv = {
  appId: () => readEnv('META_APP_ID'),
  appSecret: () => readEnv('META_APP_SECRET'),
  webhookVerifyToken: () => readEnv('META_WEBHOOK_VERIFY_TOKEN'),
  requiredKeys: ['META_APP_ID', 'META_APP_SECRET', 'META_WEBHOOK_VERIFY_TOKEN'] as const,
};

// ---------------------------------------------------------------------------
// 3. TikTok Developer API
// ---------------------------------------------------------------------------
export const tiktokEnv = {
  clientKey: () => readEnv('TIKTOK_CLIENT_KEY'),
  clientSecret: () => readEnv('TIKTOK_CLIENT_SECRET'),
  requiredKeys: ['TIKTOK_CLIENT_KEY', 'TIKTOK_CLIENT_SECRET'] as const,
};

// ---------------------------------------------------------------------------
// 4. LinkedIn Share & Graph API
// ---------------------------------------------------------------------------
export const linkedinEnv = {
  clientId: () => readEnv('LINKEDIN_CLIENT_ID'),
  clientSecret: () => readEnv('LINKEDIN_CLIENT_SECRET'),
  requiredKeys: ['LINKEDIN_CLIENT_ID', 'LINKEDIN_CLIENT_SECRET'] as const,
};

// ---------------------------------------------------------------------------
// 5. YouTube Data API v3 + Google OAuth
// ---------------------------------------------------------------------------
export const youtubeEnv = {
  apiKey: () => readEnv('YOUTUBE_API_KEY'),
  googleClientId: () => readEnv('GOOGLE_CLIENT_ID'),
  googleClientSecret: () => readEnv('GOOGLE_CLIENT_SECRET'),
  requiredKeys: ['YOUTUBE_API_KEY'] as const,
  oauthRequiredKeys: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'] as const,
};

// ---------------------------------------------------------------------------
// 6. Payments & Checkout (Stripe)
// ---------------------------------------------------------------------------
export const stripeEnv = {
  /** Browser-safe publishable key */
  publishableKey: () => readEnv('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY'),
  secretKey: () => readEnv('STRIPE_SECRET_KEY'),
  webhookSecret: () => readEnv('STRIPE_WEBHOOK_SECRET'),
  requiredKeys: ['STRIPE_SECRET_KEY'] as const,
  webhookRequiredKeys: ['STRIPE_WEBHOOK_SECRET'] as const,
};

// ---------------------------------------------------------------------------
// 7. Supabase / Database & Auth
// ---------------------------------------------------------------------------
export const supabaseEnv = {
  url: () => readEnv('NEXT_PUBLIC_SUPABASE_URL'),
  anonKey: () => readEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
  serviceRoleKey: () => readEnv('SUPABASE_SERVICE_ROLE_KEY'),
  requiredKeys: [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  ] as const,
};

/** Postgres URL used by better-auth + SQL helpers (Neon / Supabase / local). */
export const databaseEnv = {
  url: () => readEnv('DATABASE_URL'),
  requiredKeys: ['DATABASE_URL'] as const,
};

/** Aggregated export — prefer named groups above when importing. */
export const env = {
  openai: openaiEnv,
  meta: metaEnv,
  tiktok: tiktokEnv,
  linkedin: linkedinEnv,
  youtube: youtubeEnv,
  stripe: stripeEnv,
  supabase: supabaseEnv,
  database: databaseEnv,
} as const;
