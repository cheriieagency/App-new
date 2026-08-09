/** In-memory public live sessions for demo (shareable outside community). */

export type LiveChatMessage = {
  id: string;
  name: string;
  msg: string;
  created_at: string;
};

export type LiveBroadcastSession = {
  slug: string;
  title: string;
  creator_name: string;
  community_name: string | null;
  is_live: boolean;
  viewer_count: number;
  started_at: string | null;
  ended_at: string | null;
  chat: LiveChatMessage[];
  /** Anyone with the link can watch — not gated to community membership. */
  public: true;
};

const sessions = new Map<string, LiveBroadcastSession>();
let chatSeq = 1;

export function getLiveSession(slug: string): LiveBroadcastSession | null {
  const key = slug.trim().toLowerCase();
  if (!key) return null;
  return sessions.get(key) ?? null;
}

export function upsertLiveSession(input: {
  slug: string;
  title?: string;
  creator_name?: string;
  community_name?: string | null;
  is_live?: boolean;
  viewer_count?: number;
}): LiveBroadcastSession {
  const slug = input.slug.trim().toLowerCase();
  const existing = sessions.get(slug);
  const now = new Date().toISOString();
  const next: LiveBroadcastSession = {
    slug,
    title: input.title?.trim() || existing?.title || 'Live Sändning',
    creator_name: input.creator_name?.trim() || existing?.creator_name || 'Creator',
    community_name:
      input.community_name !== undefined
        ? input.community_name
        : (existing?.community_name ?? null),
    is_live: input.is_live ?? existing?.is_live ?? false,
    viewer_count: input.viewer_count ?? existing?.viewer_count ?? 0,
    started_at: existing?.started_at ?? null,
    ended_at: existing?.ended_at ?? null,
    chat: existing?.chat ?? [],
    public: true,
  };

  if (next.is_live && !next.started_at) next.started_at = now;
  if (!next.is_live && existing?.is_live) next.ended_at = now;

  sessions.set(slug, next);
  return next;
}

export function bumpLiveViewers(slug: string, delta = 1): LiveBroadcastSession | null {
  const session = getLiveSession(slug);
  if (!session) return null;
  session.viewer_count = Math.max(0, session.viewer_count + delta);
  sessions.set(slug, session);
  return session;
}

export function addLiveChatMessage(
  slug: string,
  input: { name: string; msg: string }
): LiveChatMessage | null {
  const session = getLiveSession(slug);
  if (!session || !session.is_live) return null;
  const message: LiveChatMessage = {
    id: `msg-${chatSeq++}`,
    name: input.name.trim() || 'Gäst',
    msg: input.msg.trim(),
    created_at: new Date().toISOString(),
  };
  if (!message.msg) return null;
  session.chat = [...session.chat.slice(-80), message];
  sessions.set(slug, session);
  return message;
}
