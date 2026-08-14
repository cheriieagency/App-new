/**
 * GET /api/auth/callback/meta
 *
 * 1) Authenticated session
 * 2) Resolve owned workspace (state/cookie → primary → auto-create)
 * 3) Exchange Meta code → long-lived token → Pages/IG
 * 4) Persist social_accounts with user_id + owned workspace_id
 * 5) Redirect /admin/settings/socials?success=…
 *
 * Never redirects with workspace_forbidden — falls back / creates instead.
 */

import { NextResponse } from 'next/server';
import { cookies, headers } from 'next/headers';
import { auth } from '@/lib/auth';
import {
  META_OAUTH_STATE_COOKIE,
  decodeMetaOAuthState,
  exchangeCodeForShortLivedToken,
  exchangeForLongLivedToken,
  resolveMetaPagesAndInstagram,
  type MetaOAuthTarget,
} from '@/lib/meta/oauth';
import { upsertMetaSocialAccounts } from '@/lib/meta/social-accounts';
import {
  ACTIVE_WORKSPACE_COOKIE,
  ACTIVE_WORKSPACE_COOKIE_ALIAS,
  baseOAuthState,
  resolveOAuthWorkspaceId,
  setActiveWorkspaceCookies,
} from '@/lib/social/oauth-workspace';
import {
  createDefaultWorkspaceForUser,
  resolveWorkspaceForOAuthUser,
  userOwnsWorkspace,
} from '@/lib/social/workspace-access';

function clearOAuthState(res: NextResponse) {
  res.cookies.set(META_OAUTH_STATE_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
}

function successLabel(target: MetaOAuthTarget): string {
  if (target === 'instagram') return 'instagram_connected';
  if (target === 'facebook') return 'facebook_connected';
  return 'meta_connected';
}

function failRedirect(
  origin: string,
  reason: string,
  detail?: string
): NextResponse {
  const dest = new URL('/admin/settings/socials', origin);
  dest.searchParams.set('error', reason);
  if (detail) {
    dest.searchParams.set('detail', detail.slice(0, 180));
  }
  const res = NextResponse.redirect(dest);
  clearOAuthState(res);
  return res;
}

async function resolveOwnedWorkspaceForMeta(input: {
  userId: string;
  email?: string | null;
  preferredWorkspaceId?: string | null;
}): Promise<string | null> {
  // Preferred (state/cookie) → primary → auto-create. Never "forbidden".
  const access = await resolveWorkspaceForOAuthUser({
    userId: input.userId,
    preferredWorkspaceId: input.preferredWorkspaceId,
    email: input.email,
  });

  if (access.ok && (await userOwnsWorkspace(input.userId, access.workspaceId))) {
    return access.workspaceId;
  }

  // Extra safety: mint a fresh per-user workspace if ownership check lagged.
  const created = await createDefaultWorkspaceForUser({
    userId: input.userId,
    email: input.email,
  });
  if (created && (await userOwnsWorkspace(input.userId, created))) {
    return created;
  }

  return null;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const oauthError = url.searchParams.get('error');
  const oauthErrorDesc = url.searchParams.get('error_description');
  const origin = url.origin;

  if (oauthError) {
    return failRedirect(
      origin,
      'meta_fetch_failed',
      oauthErrorDesc || oauthError
    );
  }
  if (!code) {
    return failRedirect(origin, 'meta_fetch_failed', 'missing_code');
  }

  const jar = await cookies();
  const expectedState = jar.get(META_OAUTH_STATE_COOKIE)?.value;
  if (
    !state ||
    !expectedState ||
    (state !== expectedState &&
      baseOAuthState(state) !== baseOAuthState(expectedState))
  ) {
    return failRedirect(origin, 'meta_fetch_failed', 'invalid_state');
  }

  const decoded = decodeMetaOAuthState(baseOAuthState(state));
  const target: MetaOAuthTarget = decoded?.target ?? 'both';

  const preferredWorkspaceId =
    resolveOAuthWorkspaceId({
      state,
      jarGet: (name) => jar.get(name)?.value,
    }) ||
    jar.get(ACTIVE_WORKSPACE_COOKIE)?.value ||
    jar.get(ACTIVE_WORKSPACE_COOKIE_ALIAS)?.value ||
    null;

  // 1) Authenticated session
  let session: Awaited<ReturnType<typeof auth.api.getSession>> = null;
  try {
    session = await auth.api.getSession({ headers: await headers() });
  } catch (error) {
    console.warn('[meta/callback] session read failed', error);
  }

  const sessionUser = session?.user;
  const userId = sessionUser?.id?.trim();
  if (!sessionUser || !userId) {
    return failRedirect(origin, 'unauthorized', 'missing_session');
  }

  // 2) Robust workspace resolution — never workspace_forbidden
  const workspaceId = await resolveOwnedWorkspaceForMeta({
    userId,
    email: sessionUser.email ?? null,
    preferredWorkspaceId,
  });

  if (!workspaceId) {
    return failRedirect(
      origin,
      'meta_fetch_failed',
      'workspace_create_failed'
    );
  }

  try {
    // 3) Token exchange
    let longLived: { access_token: string; expires_in?: number };
    try {
      const shortLived = await exchangeCodeForShortLivedToken(code, origin);
      longLived = await exchangeForLongLivedToken(shortLived.access_token);
    } catch (error) {
      console.error('[meta/callback] token exchange failed', error);
      return failRedirect(
        origin,
        'meta_fetch_failed',
        error instanceof Error ? error.message : 'token_exchange_failed'
      );
    }

    // Pages + Instagram
    let resolved: Awaited<ReturnType<typeof resolveMetaPagesAndInstagram>>;
    try {
      resolved = await resolveMetaPagesAndInstagram(longLived.access_token);
    } catch (error) {
      console.error('[meta/callback] graph fetch failed', error);
      return failRedirect(
        origin,
        'meta_fetch_failed',
        error instanceof Error ? error.message : 'graph_fetch_failed'
      );
    }

    const realPages = resolved.pages.filter(
      (p) => p.access_token && !String(p.id).startsWith('user-')
    );
    const hasIg = Boolean(resolved.instagram?.id);
    const hasFb = realPages.length > 0;

    if (!hasIg && !hasFb) {
      return failRedirect(
        origin,
        'meta_fetch_failed',
        'no_pages_or_instagram_business_account'
      );
    }

    if (target === 'instagram' && !hasIg) {
      return failRedirect(
        origin,
        'no_instagram_business_account',
        'Instagram Business account not found on Pages or Business Portfolio'
      );
    }

    // 4) Persist with guaranteed user_id + owned workspace_id
    try {
      await upsertMetaSocialAccounts({
        userId,
        pages: resolved.pages,
        userAccessToken: longLived.access_token,
        expiresIn: longLived.expires_in,
        target,
        workspaceId,
        instagram: resolved.instagram,
        instagramPage: resolved.instagramPage,
      });
    } catch (error) {
      console.error('[meta/callback] persist failed', error);
      const msg = error instanceof Error ? error.message : 'persist_failed';
      // Never surface workspace_forbidden to the user — treat as soft persist error.
      const safe =
        /workspace_forbidden/i.test(msg) ? 'workspace_bind_retry' : msg;
      return failRedirect(origin, 'meta_fetch_failed', safe);
    }

    // Page-only subscribed_apps
    try {
      const { subscribePagesAndInstagramAfterOAuth } = await import(
        '@/lib/meta/subscribe-webhooks'
      );
      const primaryPageToken =
        resolved.instagramPage?.access_token ||
        realPages[0]?.access_token ||
        null;
      const subscribeResults = await subscribePagesAndInstagramAfterOAuth({
        pages: realPages,
        fallbackPageAccessToken: primaryPageToken,
      });
      console.log(
        '[meta/callback] subscribed_apps',
        subscribeResults.map(
          (r) =>
            `${r.targetId}:${r.ok ? 'ok' : r.error}${r.usedFallback ? ':fallback' : ''}`
        )
      );
    } catch (subError) {
      console.warn('[meta/callback] subscribed_apps skipped', subError);
    }

    if ((target === 'instagram' || target === 'both') && hasIg) {
      try {
        const { syncMetaDataForUser } = await import('@/lib/meta/sync');
        await syncMetaDataForUser(userId);
      } catch (syncError) {
        console.warn('[meta/callback] sync skipped', syncError);
      }
    }

    // 5) Success — bind active workspace cookie to the owned id used for save
    const dest = new URL('/admin/settings/socials', origin);
    dest.searchParams.set('success', successLabel(target));
    if (target === 'both' && hasFb && !hasIg) {
      dest.searchParams.set('warning', 'no_instagram');
    }
    if (resolved.source !== 'me_accounts') {
      dest.searchParams.set('source', resolved.source);
    }
    if (preferredWorkspaceId && preferredWorkspaceId !== workspaceId) {
      dest.searchParams.set('workspace_fallback', workspaceId);
    }
    const res = NextResponse.redirect(dest);
    clearOAuthState(res);
    setActiveWorkspaceCookies(res, workspaceId);
    return res;
  } catch (error) {
    console.error('[meta/callback]', error);
    return failRedirect(
      origin,
      'meta_fetch_failed',
      error instanceof Error ? error.message : 'unknown_error'
    );
  }
}
