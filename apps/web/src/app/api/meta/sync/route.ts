import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import {
  getMetaSyncSnapshot,
  syncMetaDataForUser,
} from '@/lib/meta/sync';

/**
 * GET /api/meta/sync — return last synced Meta snapshot (or sync if missing).
 * GET /api/meta/sync?force=1 — always refresh from Graph (live Inbox).
 * POST /api/meta/sync — force refresh from Graph API.
 */
export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const force =
    new URL(request.url).searchParams.get('force') === '1' ||
    new URL(request.url).searchParams.get('force') === 'true';

  let snapshot = force ? null : getMetaSyncSnapshot(session.user.id);
  if (!snapshot) {
    try {
      snapshot = await syncMetaDataForUser(session.user.id);
    } catch (error) {
      console.error('[api/meta/sync] GET sync failed', error);
      // On force refresh, fall back to the last good snapshot if Graph fails.
      const cached = getMetaSyncSnapshot(session.user.id);
      return Response.json({
        synced: Boolean(cached),
        snapshot: cached,
        error: error instanceof Error ? error.message : 'Sync failed',
      });
    }
  }

  return Response.json({ synced: true, snapshot });
}

export async function POST() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const snapshot = await syncMetaDataForUser(session.user.id);
    return Response.json({ synced: true, snapshot });
  } catch (error) {
    console.warn(
      '[Analytics API] No social accounts found for user. Returning onboarding fallback data.',
      error
    );
    // Soft-fail — never crash Analytics / Inbox hydration in production.
    return Response.json({
      synced: false,
      snapshot: null,
      error: error instanceof Error ? error.message : 'Sync failed',
      message:
        'Connect an Instagram Business account under Settings → Socials to load live analytics.',
      cta: { label: 'Connect social accounts', href: '/admin/settings/socials' },
    });
  }
}
