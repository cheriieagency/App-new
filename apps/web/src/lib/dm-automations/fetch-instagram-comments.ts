/**
 * Shared Instagram comment fetch for Comment-to-DM (poll + developer tools).
 *
 * Strategy:
 * 1. Try Instagram user token first (often has comment read scopes).
 * 2. Fall back to Page access token.
 * 3. Hit both graph.facebook.com and graph.instagram.com for IG tokens.
 * 4. Prefer `/{media-id}/comments`, then nested `comments` on media list.
 */

const FB_GRAPH = 'https://graph.facebook.com/v21.0';
const IG_GRAPH = 'https://graph.instagram.com/v21.0';

export type FetchedIgComment = {
  id: string;
  text: string;
  username: string | null;
  fromId: string | null;
  createdTime: string | null;
  mediaId: string | null;
};

export type FetchIgCommentsResult = {
  success: boolean;
  comments: FetchedIgComment[];
  mediaScanned: number;
  tokenUsed: 'page' | 'instagram' | null;
  error?: string;
  metaError?: unknown;
};

type TokenAttempt = {
  kind: 'page' | 'instagram';
  token: string;
  graphBase: string;
};

function buildTokenAttempts(input: {
  pageAccessToken?: string | null;
  accessToken?: string | null;
}): TokenAttempt[] {
  const out: TokenAttempt[] = [];
  const seen = new Set<string>();
  const page = String(input.pageAccessToken || '').trim();
  const ig = String(input.accessToken || '').trim();

  // IG user token first — Page tokens often list media but return empty comments
  // without instagram_manage_comments.
  if (ig) {
    const fbKey = `ig:${FB_GRAPH}:${ig}`;
    if (!seen.has(fbKey)) {
      seen.add(fbKey);
      out.push({ kind: 'instagram', token: ig, graphBase: FB_GRAPH });
    }
    const igKey = `ig:${IG_GRAPH}:${ig}`;
    if (!seen.has(igKey)) {
      seen.add(igKey);
      out.push({ kind: 'instagram', token: ig, graphBase: IG_GRAPH });
    }
  }
  if (page) {
    const key = `page:${FB_GRAPH}:${page}`;
    if (!seen.has(key)) {
      seen.add(key);
      out.push({ kind: 'page', token: page, graphBase: FB_GRAPH });
    }
  }
  return out;
}

function mapComment(
  c: {
    id?: string;
    text?: string;
    username?: string;
    from?: { id?: string; username?: string };
    timestamp?: string;
    created_time?: string;
  },
  mediaId: string
): FetchedIgComment | null {
  if (!c.id) return null;
  return {
    id: String(c.id),
    text: String(c.text || ''),
    username:
      (c.username && String(c.username)) ||
      (c.from?.username && String(c.from.username)) ||
      null,
    fromId: c.from?.id ? String(c.from.id) : null,
    createdTime:
      (c.timestamp && String(c.timestamp)) ||
      (c.created_time && String(c.created_time)) ||
      null,
    mediaId,
  };
}

async function listRecentMediaIds(input: {
  igUserId: string;
  accessToken: string;
  graphBase: string;
  limit: number;
}): Promise<{
  mediaIds: string[];
  commentsCountSum?: number;
  error?: string;
  metaError?: unknown;
}> {
  const limit = Math.min(Math.max(input.limit, 1), 25);

  async function request(fields: string) {
    const url = new URL(
      `${input.graphBase}/${encodeURIComponent(input.igUserId)}/media`
    );
    url.searchParams.set('fields', fields);
    url.searchParams.set('limit', String(limit));
    url.searchParams.set('access_token', input.accessToken);
    const res = await fetch(url.toString());
    const json = (await res.json().catch(() => ({}))) as {
      data?: Array<{
        id?: string;
        comments_count?: number | string;
        timestamp?: string;
        media_type?: string;
        children?: { data?: Array<{ id?: string }> };
      }>;
      error?: { message?: string; code?: number };
    };
    return { res, json };
  }

  try {
    let { res, json } = await request(
      'id,comments_count,timestamp,media_type,children{id}'
    );
    if (!res.ok || json.error) {
      ({ res, json } = await request('id,comments_count,timestamp'));
    }
    if (!res.ok || json.error) {
      ({ res, json } = await request('id,timestamp'));
    }
    if (!res.ok || json.error) {
      return {
        mediaIds: [],
        commentsCountSum: 0,
        error:
          json.error?.message ||
          `Failed to list Instagram media (HTTP ${res.status})`,
        metaError: json.error || json,
      };
    }

    const ranked = (json.data || [])
      .map((m) => ({
        id: String(m.id || '').trim(),
        commentsCount: Number(m.comments_count) || 0,
        ts: m.timestamp ? Date.parse(String(m.timestamp)) : 0,
        mediaType: String(m.media_type || '').toUpperCase(),
      }))
      .filter((m) => m.id)
      .sort((a, b) => {
        if (b.commentsCount !== a.commentsCount) {
          return b.commentsCount - a.commentsCount;
        }
        return b.ts - a.ts;
      });

    const totalCommentCount = ranked.reduce((n, m) => n + m.commentsCount, 0);
    if (totalCommentCount > 0 || ranked.length > 0) {
      console.warn('[ig-comments] media list', {
        graphHost: input.graphBase.includes('instagram.com')
          ? 'instagram'
          : 'facebook',
        media: ranked.length,
        commentsCountSum: totalCommentCount,
        withComments: ranked.filter((m) => m.commentsCount > 0).length,
      });
    }

    const newest = (json.data || [])
      .map((m) => String(m.id || '').trim())
      .filter(Boolean)
      .slice(0, 5);

    const ordered: string[] = [];
    const seen = new Set<string>();
    // Only parent media ids — carousel children do not support /comments.
    for (const id of [
      ...ranked.filter((m) => m.commentsCount > 0).map((m) => m.id),
      ...newest,
      ...ranked.map((m) => m.id),
    ]) {
      if (seen.has(id)) continue;
      seen.add(id);
      ordered.push(id);
      if (ordered.length >= limit) break;
    }

    return { mediaIds: ordered, commentsCountSum: totalCommentCount };
  } catch (error) {
    return {
      mediaIds: [],
      commentsCountSum: 0,
      error: error instanceof Error ? error.message : 'network_error',
    };
  }
}

async function listCommentsOnMedia(input: {
  mediaId: string;
  accessToken: string;
  graphBase: string;
  limit: number;
}): Promise<{ comments: FetchedIgComment[]; error?: string }> {
  const url = new URL(
    `${input.graphBase}/${encodeURIComponent(input.mediaId)}/comments`
  );
  url.searchParams.set('fields', 'id,text,username,timestamp');
  url.searchParams.set('limit', String(input.limit));
  url.searchParams.set('access_token', input.accessToken);

  try {
    const res = await fetch(url.toString());
    const json = (await res.json().catch(() => ({}))) as {
      data?: Array<{
        id?: string;
        text?: string;
        username?: string;
        from?: { id?: string; username?: string };
        timestamp?: string;
        created_time?: string;
      }>;
      error?: { message?: string };
    };

    if (!res.ok || json.error) {
      return {
        comments: [],
        error:
          json.error?.message ||
          `Failed to fetch comments for media ${input.mediaId} (HTTP ${res.status})`,
      };
    }

    const comments: FetchedIgComment[] = [];
    for (const c of json.data || []) {
      const mapped = mapComment(c, input.mediaId);
      if (mapped) comments.push(mapped);
    }
    return { comments };
  } catch (error) {
    return {
      comments: [],
      error: error instanceof Error ? error.message : 'network_error',
    };
  }
}

/** Nested comments fallback — some tokens only populate this field. */
async function listCommentsNestedOnMedia(input: {
  igUserId: string;
  accessToken: string;
  graphBase: string;
  mediaLimit: number;
  commentsPerMedia: number;
}): Promise<{ comments: FetchedIgComment[]; error?: string }> {
  const url = new URL(
    `${input.graphBase}/${encodeURIComponent(input.igUserId)}/media`
  );
  url.searchParams.set(
    'fields',
    `id,comments.limit(${input.commentsPerMedia}){id,text,username,timestamp}`
  );
  url.searchParams.set('limit', String(input.mediaLimit));
  url.searchParams.set('access_token', input.accessToken);

  try {
    const res = await fetch(url.toString());
    const json = (await res.json().catch(() => ({}))) as {
      data?: Array<{
        id?: string;
        comments?: {
          data?: Array<{
            id?: string;
            text?: string;
            username?: string;
            from?: { id?: string; username?: string };
            timestamp?: string;
            created_time?: string;
          }>;
        };
      }>;
      error?: { message?: string };
    };
    if (!res.ok || json.error) {
      return {
        comments: [],
        error: json.error?.message || `nested_comments_failed_${res.status}`,
      };
    }
    const comments: FetchedIgComment[] = [];
    for (const media of json.data || []) {
      const mediaId = media.id ? String(media.id) : '';
      if (!mediaId) continue;
      for (const c of media.comments?.data || []) {
        const mapped = mapComment(c, mediaId);
        if (mapped) comments.push(mapped);
      }
    }
    return { comments };
  } catch (error) {
    return {
      comments: [],
      error: error instanceof Error ? error.message : 'network_error',
    };
  }
}

/**
 * Fetch newest comments across recent media.
 */
export async function fetchRecentInstagramComments(input: {
  igUserId: string;
  pageAccessToken?: string | null;
  accessToken?: string | null;
  mediaLimit?: number;
  commentsPerMedia?: number;
  maxComments?: number;
}): Promise<FetchIgCommentsResult> {
  const igUserId = String(input.igUserId || '').trim();
  if (!igUserId) {
    return {
      success: false,
      comments: [],
      mediaScanned: 0,
      tokenUsed: null,
      error: 'Missing Instagram account id',
    };
  }

  const attempts = buildTokenAttempts(input);
  if (attempts.length === 0) {
    return {
      success: false,
      comments: [],
      mediaScanned: 0,
      tokenUsed: null,
      error: 'No Instagram / Page access token available',
    };
  }

  const mediaLimit = Math.min(Math.max(input.mediaLimit ?? 12, 1), 25);
  const commentsPerMedia = Math.min(
    Math.max(input.commentsPerMedia ?? 25, 1),
    50
  );
  const maxComments = Math.min(Math.max(input.maxComments ?? 40, 1), 80);

  let lastError: string | undefined;
  let lastMeta: unknown;
  let lastMediaScanned = 0;
  let lastCommentsCountSum = 0;

  for (let i = 0; i < attempts.length; i += 1) {
    const attempt = attempts[i]!;
    const media = await listRecentMediaIds({
      igUserId,
      accessToken: attempt.token,
      graphBase: attempt.graphBase,
      limit: mediaLimit,
    });
    if (media.error) {
      lastError = media.error;
      lastMeta = media.metaError;
      continue;
    }
    lastMediaScanned = Math.max(lastMediaScanned, media.mediaIds.length);
    lastCommentsCountSum = Math.max(
      lastCommentsCountSum,
      media.commentsCountSum || 0
    );
    if (media.mediaIds.length === 0) {
      continue;
    }

    const comments: FetchedIgComment[] = [];
    const edgeErrors: string[] = [];
    for (const mediaId of media.mediaIds) {
      const edge = await listCommentsOnMedia({
        mediaId,
        accessToken: attempt.token,
        graphBase: attempt.graphBase,
        limit: commentsPerMedia,
      });
      if (edge.error) {
        // Carousel children never support /comments — skip quietly.
        if (/carousel children/i.test(edge.error)) continue;
        edgeErrors.push(edge.error);
        console.warn('[ig-comments] edge error', {
          kind: attempt.kind,
          host: attempt.graphBase.includes('instagram.com')
            ? 'instagram'
            : 'facebook',
          error: edge.error,
        });
        continue;
      }
      if ((media.commentsCountSum || 0) > 0 && edge.comments.length === 0) {
        // Keep going — other media / tokens may still return the comment.
        console.warn('[ig-comments] empty edge despite comments_count', {
          kind: attempt.kind,
          host: attempt.graphBase.includes('instagram.com')
            ? 'instagram'
            : 'facebook',
        });
      }
      comments.push(...edge.comments);
    }

    if (comments.length === 0) {
      const nested = await listCommentsNestedOnMedia({
        igUserId,
        accessToken: attempt.token,
        graphBase: attempt.graphBase,
        mediaLimit,
        commentsPerMedia,
      });
      if (!nested.error && nested.comments.length > 0) {
        comments.push(...nested.comments);
      } else if (nested.error) {
        edgeErrors.push(nested.error);
      }
    }

    if (comments.length === 0) {
      const countHint =
        (media.commentsCountSum || 0) > 0
          ? ` Meta sees ${media.commentsCountSum} comment(s) on your Reel/post but hides the text. Your token permissions are fine — the Meta app is in Development mode (or the permission is only Standard Access). Fix: Meta Developer → App → switch App Mode to Live, and ensure instagram_manage_comments has Advanced Access. For a quick test without going Live: App Roles → add the commenter’s Facebook account as Tester, accept the invite, then comment again from that Instagram.`
          : ' Comment a keyword from a different Instagram account on a recent post.';
      lastError = edgeErrors[0] || `No readable comments.${countHint}`;
      if (i < attempts.length - 1) continue;

      return {
        success: true,
        comments: [],
        mediaScanned: media.mediaIds.length,
        tokenUsed: attempt.kind,
        error: lastError,
      };
    }

    comments.sort((a, b) => {
      const ta = a.createdTime ? Date.parse(a.createdTime) : 0;
      const tb = b.createdTime ? Date.parse(b.createdTime) : 0;
      return tb - ta;
    });

    return {
      success: true,
      comments: comments.slice(0, maxComments),
      mediaScanned: media.mediaIds.length,
      tokenUsed: attempt.kind,
    };
  }

  return {
    success: false,
    comments: [],
    mediaScanned: lastMediaScanned,
    tokenUsed: null,
    error:
      lastError ||
      (lastCommentsCountSum > 0
        ? `Meta reports ${lastCommentsCountSum} comment(s) but none are readable — reconnect Instagram with comment permissions, and test from a different IG account.`
        : 'Failed to fetch Instagram comments'),
    metaError: lastMeta,
  };
}
