import { missingEnvKeys, missingEnvResponse, tiktokEnv } from '@/lib/config/env';

/**
 * TikTok OAuth / publishing status endpoint (stub).
 * Requires TIKTOK_CLIENT_KEY + TIKTOK_CLIENT_SECRET in apps/web/.env.local.
 */
export async function GET() {
  const missing = missingEnvKeys(...tiktokEnv.requiredKeys);
  if (missing.length) {
    return missingEnvResponse(missing, 'TikTok Developer API');
  }

  return Response.json({
    ok: true,
    configured: true,
    clientKeyPresent: Boolean(tiktokEnv.clientKey()),
  });
}

export async function POST() {
  const missing = missingEnvKeys(...tiktokEnv.requiredKeys);
  if (missing.length) {
    return missingEnvResponse(missing, 'TikTok Developer API');
  }

  return Response.json({
    ok: true,
    hint: 'TikTok publish stub — connect upload / inbox once OAuth is live.',
  });
}
