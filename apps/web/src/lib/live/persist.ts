/**
 * Durable live broadcast sessions + chat messages.
 */

import sql from '@/app/api/utils/sql';
import type {
  LiveBroadcastSession,
  LiveChatMessage,
} from '@/lib/mock-live-broadcast';

let schemaReady: Promise<void> | null = null;

export async function ensureLiveSchema(): Promise<void> {
  if (!process.env.DATABASE_URL?.trim()) return;
  if (schemaReady) return schemaReady;

  schemaReady = (async () => {
    await sql`
      CREATE TABLE IF NOT EXISTS public.live_sessions (
        slug            text PRIMARY KEY,
        title           text NOT NULL DEFAULT 'Live',
        creator_name    text NOT NULL DEFAULT 'Creator',
        creator_user_id text,
        community_name  text,
        is_live         boolean NOT NULL DEFAULT false,
        viewer_count    integer NOT NULL DEFAULT 0,
        started_at      timestamptz,
        ended_at        timestamptz,
        created_at      timestamptz NOT NULL DEFAULT now(),
        updated_at      timestamptz NOT NULL DEFAULT now()
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS public.live_chat_messages (
        id           text PRIMARY KEY,
        slug         text NOT NULL REFERENCES public.live_sessions(slug) ON DELETE CASCADE,
        name         text NOT NULL DEFAULT 'Gäst',
        msg          text NOT NULL,
        created_at   timestamptz NOT NULL DEFAULT now()
      )
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS live_chat_slug_idx
        ON public.live_chat_messages (slug, created_at DESC)
    `;
  })().catch((error) => {
    schemaReady = null;
    throw error;
  });

  return schemaReady;
}

async function loadChat(slug: string): Promise<LiveChatMessage[]> {
  const rows = await sql`
    SELECT id, name, msg, created_at
    FROM public.live_chat_messages
    WHERE slug = ${slug}
    ORDER BY created_at ASC
    LIMIT 100
  `;
  return (rows || []).map((r) => {
    const row = r as Record<string, unknown>;
    return {
      id: String(row.id),
      name: String(row.name ?? 'Gäst'),
      msg: String(row.msg ?? ''),
      created_at: String(row.created_at ?? new Date().toISOString()),
    };
  });
}

function rowToSession(
  row: Record<string, unknown>,
  chat: LiveChatMessage[]
): LiveBroadcastSession {
  return {
    slug: String(row.slug),
    title: String(row.title ?? 'Live'),
    creator_name: String(row.creator_name ?? 'Creator'),
    community_name: (row.community_name as string | null) ?? null,
    is_live: Boolean(row.is_live),
    viewer_count: Math.max(0, Number(row.viewer_count) || 0),
    started_at: row.started_at ? String(row.started_at) : null,
    ended_at: row.ended_at ? String(row.ended_at) : null,
    chat,
    public: true,
  };
}

export async function getDurableLiveSession(
  slugRaw: string
): Promise<LiveBroadcastSession | null> {
  if (!process.env.DATABASE_URL?.trim()) return null;
  await ensureLiveSchema();
  const slug = slugRaw.trim().toLowerCase();
  if (!slug) return null;
  const rows = await sql`
    SELECT * FROM public.live_sessions WHERE slug = ${slug} LIMIT 1
  `;
  const row = rows?.[0] as Record<string, unknown> | undefined;
  if (!row) return null;
  const chat = await loadChat(slug);
  return rowToSession(row, chat);
}

export async function upsertDurableLiveSession(input: {
  slug: string;
  title?: string;
  creator_name?: string;
  creator_user_id?: string | null;
  community_name?: string | null;
  is_live?: boolean;
  viewer_count?: number;
}): Promise<LiveBroadcastSession> {
  await ensureLiveSchema();
  const slug = input.slug.trim().toLowerCase();
  const existing = await getDurableLiveSession(slug);
  const now = new Date().toISOString();

  const title = input.title?.trim() || existing?.title || 'Live Sändning';
  const creator_name =
    input.creator_name?.trim() || existing?.creator_name || 'Creator';
  const community_name =
    input.community_name !== undefined
      ? input.community_name
      : (existing?.community_name ?? null);
  const is_live = input.is_live ?? existing?.is_live ?? false;
  const viewer_count =
    input.viewer_count ?? existing?.viewer_count ?? 0;

  let started_at = existing?.started_at ?? null;
  let ended_at = existing?.ended_at ?? null;
  if (is_live && !started_at) started_at = now;
  if (!is_live && existing?.is_live) ended_at = now;

  await sql`
    INSERT INTO public.live_sessions (
      slug, title, creator_name, creator_user_id, community_name,
      is_live, viewer_count, started_at, ended_at, updated_at
    ) VALUES (
      ${slug},
      ${title},
      ${creator_name},
      ${input.creator_user_id ?? null},
      ${community_name},
      ${is_live},
      ${Math.max(0, Math.round(viewer_count))},
      ${started_at},
      ${ended_at},
      now()
    )
    ON CONFLICT (slug) DO UPDATE SET
      title = EXCLUDED.title,
      creator_name = EXCLUDED.creator_name,
      creator_user_id = COALESCE(EXCLUDED.creator_user_id, public.live_sessions.creator_user_id),
      community_name = EXCLUDED.community_name,
      is_live = EXCLUDED.is_live,
      viewer_count = EXCLUDED.viewer_count,
      started_at = EXCLUDED.started_at,
      ended_at = EXCLUDED.ended_at,
      updated_at = now()
  `;

  return (
    (await getDurableLiveSession(slug)) || {
      slug,
      title,
      creator_name,
      community_name,
      is_live,
      viewer_count: Math.max(0, Math.round(viewer_count)),
      started_at,
      ended_at,
      chat: existing?.chat ?? [],
      public: true,
    }
  );
}

export async function bumpDurableLiveViewers(
  slugRaw: string,
  delta = 1
): Promise<LiveBroadcastSession | null> {
  await ensureLiveSchema();
  const slug = slugRaw.trim().toLowerCase();
  const rows = await sql`
    UPDATE public.live_sessions
    SET
      viewer_count = GREATEST(0, viewer_count + ${delta}),
      updated_at = now()
    WHERE slug = ${slug}
    RETURNING *
  `;
  if (!rows?.[0]) return null;
  const chat = await loadChat(slug);
  return rowToSession(rows[0] as Record<string, unknown>, chat);
}

export async function addDurableLiveChatMessage(
  slugRaw: string,
  input: { name: string; msg: string }
): Promise<LiveChatMessage | null> {
  await ensureLiveSchema();
  const slug = slugRaw.trim().toLowerCase();
  const session = await getDurableLiveSession(slug);
  if (!session || !session.is_live) return null;

  const msg = input.msg.trim();
  if (!msg) return null;

  const id = `msg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  const name = input.name.trim() || 'Gäst';
  const created_at = new Date().toISOString();

  await sql`
    INSERT INTO public.live_chat_messages (id, slug, name, msg, created_at)
    VALUES (${id}, ${slug}, ${name}, ${msg}, ${created_at})
  `;

  // Keep chat window bounded.
  await sql`
    DELETE FROM public.live_chat_messages
    WHERE slug = ${slug}
      AND id NOT IN (
        SELECT id FROM public.live_chat_messages
        WHERE slug = ${slug}
        ORDER BY created_at DESC
        LIMIT 80
      )
  `;

  return { id, name, msg, created_at };
}
