/**
 * GET /api/admin/google/health
 * Reports whether Google OAuth / API keys are configured (no secrets leaked).
 */

import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { googleEnv, youtubeEnv, appBaseUrl } from '@/lib/config/env';

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const clientId = Boolean(googleEnv.clientId());
  const clientSecret = Boolean(googleEnv.clientSecret());
  const pickerKey = Boolean(googleEnv.pickerApiKey());
  const driveKey = Boolean(googleEnv.driveApiKey());
  const calendarKey = Boolean(googleEnv.calendarApiKey());
  const youtubeKey = Boolean(youtubeEnv.apiKey());
  const origin = appBaseUrl(new URL(request.url).origin);

  const oauthReady = clientId && clientSecret;
  const issues: string[] = [];
  if (!clientId) issues.push('GOOGLE_CLIENT_ID missing');
  if (!clientSecret) issues.push('GOOGLE_CLIENT_SECRET missing');
  if (!pickerKey && !driveKey) {
    issues.push(
      'Optional: set GOOGLE_DRIVE_API_KEY or NEXT_PUBLIC_GOOGLE_API_KEY for Picker'
    );
  }

  return Response.json({
    ok: oauthReady,
    oauthReady,
    keys: {
      GOOGLE_CLIENT_ID: clientId,
      GOOGLE_CLIENT_SECRET: clientSecret,
      GOOGLE_DRIVE_API_KEY: driveKey,
      GOOGLE_CALENDAR_API_KEY: calendarKey,
      NEXT_PUBLIC_GOOGLE_API_KEY: pickerKey,
      YOUTUBE_API_KEY: youtubeKey,
    },
    redirectUris: [
      `${origin}/api/auth/callback/google`,
      `${origin}/api/auth/callback/youtube`,
    ],
    scopes: [
      'openid',
      'userinfo.email',
      'userinfo.profile',
      'drive.readonly',
      'calendar.events',
    ],
    issues,
    hint: oauthReady
      ? 'OAuth credentials present. Connect Google in Settings → Integrations, then enable Calendar on coaching blocks.'
      : 'Add GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET to apps/web/.env.local and restart the dev server.',
  });
}
