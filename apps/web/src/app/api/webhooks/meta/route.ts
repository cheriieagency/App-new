import { missingEnvKeys, missingEnvResponse, metaEnv } from '@/lib/config/env';

/**
 * Meta / Instagram Graph webhook.
 * GET — hub challenge verification · POST — event delivery (stub until wired).
 */
export async function GET(request: Request) {
  const missing = missingEnvKeys(...metaEnv.requiredKeys);
  if (missing.length) {
    return missingEnvResponse(missing, 'Meta / Instagram Graph API');
  }

  const url = new URL(request.url);
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token && token === metaEnv.webhookVerifyToken()) {
    return new Response(challenge ?? '', { status: 200 });
  }

  return Response.json({ error: 'verification_failed' }, { status: 403 });
}

export async function POST() {
  const missing = missingEnvKeys(...metaEnv.requiredKeys);
  if (missing.length) {
    return missingEnvResponse(missing, 'Meta / Instagram Graph API');
  }

  // Event handling lands here once Inbox / publishing is connected to Graph API.
  return Response.json({ ok: true, received: true });
}
