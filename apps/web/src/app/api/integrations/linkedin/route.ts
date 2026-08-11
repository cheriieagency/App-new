import { missingEnvKeys, missingEnvResponse, linkedinEnv } from '@/lib/config/env';

/**
 * LinkedIn Share / Graph status endpoint (stub).
 * Requires LINKEDIN_CLIENT_ID + LINKEDIN_CLIENT_SECRET in apps/web/.env.local.
 */
export async function GET() {
  const missing = missingEnvKeys(...linkedinEnv.requiredKeys);
  if (missing.length) {
    return missingEnvResponse(missing, 'LinkedIn Share & Graph API');
  }

  return Response.json({
    ok: true,
    configured: true,
    clientIdPresent: Boolean(linkedinEnv.clientId()),
  });
}

export async function POST() {
  const missing = missingEnvKeys(...linkedinEnv.requiredKeys);
  if (missing.length) {
    return missingEnvResponse(missing, 'LinkedIn Share & Graph API');
  }

  return Response.json({
    ok: true,
    hint: 'LinkedIn share stub — wire UGC posts once OAuth is live.',
  });
}
