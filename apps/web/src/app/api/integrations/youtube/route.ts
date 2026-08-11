import { missingEnvKeys, missingEnvResponse, youtubeEnv } from '@/lib/config/env';

/**
 * YouTube Data API v3 status / upload stub.
 * Requires YOUTUBE_API_KEY (and Google OAuth for uploads) in apps/web/.env.local.
 */
export async function GET() {
  const missing = missingEnvKeys(...youtubeEnv.requiredKeys);
  if (missing.length) {
    return missingEnvResponse(missing, 'YouTube Data API v3');
  }

  return Response.json({
    ok: true,
    configured: true,
    apiKeyPresent: Boolean(youtubeEnv.apiKey()),
    oauthReady: missingEnvKeys(...youtubeEnv.oauthRequiredKeys).length === 0,
  });
}

export async function POST() {
  const missingApi = missingEnvKeys(...youtubeEnv.requiredKeys);
  if (missingApi.length) {
    return missingEnvResponse(missingApi, 'YouTube Data API v3');
  }

  const missingOauth = missingEnvKeys(...youtubeEnv.oauthRequiredKeys);
  if (missingOauth.length) {
    return missingEnvResponse(missingOauth, 'YouTube upload (Google OAuth)');
  }

  return Response.json({
    ok: true,
    hint: 'YouTube upload stub — wire resumable upload once OAuth tokens are stored.',
  });
}
