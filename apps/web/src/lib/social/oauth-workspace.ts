/**
 * Bind OAuth flows to the active Team Workspace / Brand.
 * Cookie names: nc_active_workspace_id (primary) + active_workspace_id (alias).
 */

export const ACTIVE_WORKSPACE_COOKIE = 'nc_active_workspace_id';
export const ACTIVE_WORKSPACE_COOKIE_ALIAS = 'active_workspace_id';

/** Encode workspace into an OAuth state payload: `base~ws~<url-encoded-id>`. */
export function appendWorkspaceToOAuthState(
  baseState: string,
  workspaceId?: string | null
): string {
  const ws = workspaceId?.trim();
  if (!ws) return baseState;
  return `${baseState}~ws~${encodeURIComponent(ws)}`;
}

/** Extract workspace id embedded in OAuth state (if present). */
export function workspaceIdFromOAuthState(
  state: string | null | undefined
): string | null {
  if (!state) return null;
  const marker = '~ws~';
  const idx = state.lastIndexOf(marker);
  if (idx < 0) return null;
  try {
    return decodeURIComponent(state.slice(idx + marker.length)) || null;
  } catch {
    return state.slice(idx + marker.length) || null;
  }
}

/** Strip the workspace suffix so cookie equality checks still work on the base nonce. */
export function baseOAuthState(state: string | null | undefined): string {
  if (!state) return '';
  const marker = '~ws~';
  const idx = state.lastIndexOf(marker);
  return idx >= 0 ? state.slice(0, idx) : state;
}

export function readWorkspaceIdFromCookieHeader(
  cookieHeader: string | null | undefined
): string | null {
  if (!cookieHeader) return null;
  for (const name of [ACTIVE_WORKSPACE_COOKIE, ACTIVE_WORKSPACE_COOKIE_ALIAS]) {
    const match = cookieHeader.match(
      new RegExp(`(?:^|;\\s*)${name}=([^;]+)`)
    );
    if (!match?.[1]) continue;
    try {
      return decodeURIComponent(match[1]);
    } catch {
      return match[1];
    }
  }
  return null;
}

/** Resolve workspace for OAuth callback: state → cookie → null. */
export function resolveOAuthWorkspaceId(input: {
  state?: string | null;
  cookieHeader?: string | null;
  jarGet?: (name: string) => string | undefined;
}): string | null {
  const fromState = workspaceIdFromOAuthState(input.state);
  if (fromState) return fromState;
  if (input.jarGet) {
    const a =
      input.jarGet(ACTIVE_WORKSPACE_COOKIE)?.trim() ||
      input.jarGet(ACTIVE_WORKSPACE_COOKIE_ALIAS)?.trim();
    if (a) {
      try {
        return decodeURIComponent(a);
      } catch {
        return a;
      }
    }
  }
  return readWorkspaceIdFromCookieHeader(input.cookieHeader);
}

export function setActiveWorkspaceCookies(
  res: { cookies: { set: (name: string, value: string, opts: Record<string, unknown>) => void } },
  workspaceId: string
) {
  const opts = {
    httpOnly: false,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  };
  res.cookies.set(ACTIVE_WORKSPACE_COOKIE, workspaceId, opts);
  res.cookies.set(ACTIVE_WORKSPACE_COOKIE_ALIAS, workspaceId, opts);
}
