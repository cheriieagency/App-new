import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import {
  listSocialAccounts,
  setSocialConnection,
  type ConnectedSocialAccount,
  type SocialPlatform,
} from '@/lib/mock-content-planner';
import { listMetaSocialAccountsForUser } from '@/lib/meta/social-accounts';
import { listOAuthSocialAccountsForUser } from '@/lib/social/oauth-accounts';

function mergeAccounts(
  base: ConnectedSocialAccount[],
  connected: ConnectedSocialAccount[]
): ConnectedSocialAccount[] {
  const map = new Map(base.map((a) => [a.platform, a]));
  for (const m of connected) {
    map.set(m.platform, m);
  }
  return [...map.values()];
}

export async function GET() {
  const base = listSocialAccounts();
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return Response.json({ accounts: base, demo: true });
  }

  const [meta, oauth] = await Promise.all([
    listMetaSocialAccountsForUser(session.user.id),
    listOAuthSocialAccountsForUser(session.user.id, ['youtube', 'linkedin']),
  ]);
  const live = [...meta, ...oauth];
  const accounts = mergeAccounts(base, live);
  const hasIg = meta.some((a) => a.platform === 'instagram' && a.connected);
  const hasFb = meta.some((a) => a.platform === 'facebook' && a.connected);
  return Response.json({
    accounts,
    demo: !process.env.DATABASE_URL?.trim() && live.length === 0,
    meta_connected: meta.length > 0,
    needs_ig_business: hasFb && !hasIg,
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const platform = body.platform as SocialPlatform;
    const connect = Boolean(body.connect);
    if (!platform) {
      return Response.json({ error: 'platform required' }, { status: 400 });
    }

    // Demo OAuth: instantly toggles connection state.
    // Live connects use /api/auth/{meta,youtube,linkedin}/login instead.
    const account = setSocialConnection(platform, connect);
    return Response.json({ account, accounts: listSocialAccounts() });
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Failed' }, { status: 500 });
  }
}
