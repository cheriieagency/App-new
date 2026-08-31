/**
 * TikTok DM persistence — conversations + messages for Social Inbox.
 */

import sql from '@/app/api/utils/sql';

let schemaReady: Promise<void> | null = null;

export type TikTokConversationRow = {
  id: string;
  workspace_id: string;
  user_id: string | null;
  tiktok_user_id: string;
  username: string;
  avatar_url: string | null;
  last_message: string;
  updated_at: string;
};

export type TikTokMessageRow = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  media_url: string | null;
  is_outgoing: boolean;
  created_at: string;
};

export type TikTokInboxThread = {
  id: string;
  platform: 'tiktok';
  channel: 'dm';
  name: string;
  handle: string;
  preview: string;
  time: string;
  unread: boolean;
  recipient_id: string;
  conversation_id: string;
  avatar_url: string | null;
  messages: Array<{
    id: string;
    from: 'them' | 'you';
    text: string;
    time: string;
    media_url?: string | null;
  }>;
};

async function safe(label: string, run: () => Promise<unknown>) {
  try {
    await run();
  } catch (error) {
    console.warn(`[tiktok/inbox] heal skipped (${label})`, error);
  }
}

export async function ensureTikTokInboxSchema(): Promise<void> {
  if (!process.env.DATABASE_URL?.trim()) return;
  if (schemaReady) return schemaReady;

  schemaReady = (async () => {
    await sql`
      CREATE TABLE IF NOT EXISTS public.tiktok_conversations (
        id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        workspace_id    text NOT NULL,
        user_id         text,
        tiktok_user_id  text NOT NULL,
        username        text NOT NULL DEFAULT '',
        avatar_url      text,
        last_message    text NOT NULL DEFAULT '',
        updated_at      timestamptz NOT NULL DEFAULT now(),
        created_at      timestamptz NOT NULL DEFAULT now()
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS public.tiktok_messages (
        id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        conversation_id  uuid NOT NULL REFERENCES public.tiktok_conversations(id) ON DELETE CASCADE,
        sender_id        text NOT NULL DEFAULT '',
        content          text NOT NULL DEFAULT '',
        media_url        text,
        is_outgoing      boolean NOT NULL DEFAULT false,
        external_id      text,
        created_at       timestamptz NOT NULL DEFAULT now()
      )
    `;
    await safe('conversations_uidx', () => sql`
      CREATE UNIQUE INDEX IF NOT EXISTS tiktok_conversations_ws_user_uidx
        ON public.tiktok_conversations (workspace_id, tiktok_user_id)
    `);
    await safe('conversations_updated_idx', () => sql`
      CREATE INDEX IF NOT EXISTS tiktok_conversations_ws_updated_idx
        ON public.tiktok_conversations (workspace_id, updated_at DESC)
    `);
    await safe('messages_conv_idx', () => sql`
      CREATE INDEX IF NOT EXISTS tiktok_messages_conversation_idx
        ON public.tiktok_messages (conversation_id, created_at ASC)
    `);
    await safe('messages_external_uidx', () => sql`
      CREATE UNIQUE INDEX IF NOT EXISTS tiktok_messages_external_uidx
        ON public.tiktok_messages (external_id)
        WHERE external_id IS NOT NULL AND external_id <> ''
    `);
    await safe('conversations_external_id', () => sql`
      ALTER TABLE public.tiktok_messages
        ADD COLUMN IF NOT EXISTS external_id text
    `);
    // Older DBs may have created tiktok_conversations without user_id.
    await safe('conversations_user_id', () => sql`
      ALTER TABLE public.tiktok_conversations
        ADD COLUMN IF NOT EXISTS user_id text
    `);
    await safe('conversations_avatar_url', () => sql`
      ALTER TABLE public.tiktok_conversations
        ADD COLUMN IF NOT EXISTS avatar_url text
    `);
    await safe('conversations_last_message', () => sql`
      ALTER TABLE public.tiktok_conversations
        ADD COLUMN IF NOT EXISTS last_message text NOT NULL DEFAULT ''
    `);
  })().catch((error) => {
    schemaReady = null;
    throw error;
  });

  return schemaReady;
}

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return 'now';
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

/** Upsert conversation + insert inbound message (idempotent via external_id). */
export async function ingestTikTokIncomingMessage(input: {
  workspaceId: string;
  userId?: string | null;
  tiktokUserId: string;
  username?: string | null;
  avatarUrl?: string | null;
  content: string;
  mediaUrl?: string | null;
  senderId?: string | null;
  externalId?: string | null;
  createdAt?: string | null;
}): Promise<{ conversationId: string; messageId: string } | null> {
  if (!process.env.DATABASE_URL?.trim()) return null;
  await ensureTikTokInboxSchema();

  const tiktokUserId = input.tiktokUserId.trim();
  const content = input.content.trim();
  if (!tiktokUserId || (!content && !input.mediaUrl)) return null;

  const username =
    (input.username || '').trim().replace(/^@/, '') || tiktokUserId.slice(0, 12);
  const externalId = input.externalId?.trim() || null;

  if (externalId) {
    const existing = await sql`
      SELECT id, conversation_id
      FROM public.tiktok_messages
      WHERE external_id = ${externalId}
      LIMIT 1
    `;
    if (existing?.[0]) {
      return {
        conversationId: String(existing[0].conversation_id),
        messageId: String(existing[0].id),
      };
    }
  }

  const convRows = await sql`
    INSERT INTO public.tiktok_conversations
      (workspace_id, user_id, tiktok_user_id, username, avatar_url, last_message, updated_at)
    VALUES (
      ${input.workspaceId},
      ${input.userId ?? null},
      ${tiktokUserId},
      ${username},
      ${input.avatarUrl ?? null},
      ${content.slice(0, 500)},
      now()
    )
    ON CONFLICT (workspace_id, tiktok_user_id) DO UPDATE SET
      username = CASE
        WHEN EXCLUDED.username <> '' THEN EXCLUDED.username
        ELSE public.tiktok_conversations.username
      END,
      avatar_url = COALESCE(EXCLUDED.avatar_url, public.tiktok_conversations.avatar_url),
      last_message = EXCLUDED.last_message,
      updated_at = now(),
      user_id = COALESCE(public.tiktok_conversations.user_id, EXCLUDED.user_id)
    RETURNING id
  `;
  const conversationId = String(convRows?.[0]?.id || '');
  if (!conversationId) return null;

  const createdAt = input.createdAt
    ? new Date(input.createdAt).toISOString()
    : new Date().toISOString();

  const msgRows = await sql`
    INSERT INTO public.tiktok_messages
      (conversation_id, sender_id, content, media_url, is_outgoing, external_id, created_at)
    VALUES (
      ${conversationId},
      ${input.senderId?.trim() || tiktokUserId},
      ${content},
      ${input.mediaUrl ?? null},
      false,
      ${externalId},
      ${createdAt}
    )
    RETURNING id
  `;

  return {
    conversationId,
    messageId: String(msgRows?.[0]?.id || ''),
  };
}

/** Persist an outgoing reply after a successful TikTok send. */
export async function recordTikTokOutgoingMessage(input: {
  conversationId: string;
  senderId: string;
  content: string;
  mediaUrl?: string | null;
  externalId?: string | null;
}): Promise<TikTokMessageRow | null> {
  if (!process.env.DATABASE_URL?.trim()) return null;
  await ensureTikTokInboxSchema();

  const content = input.content.trim();
  if (!content && !input.mediaUrl) return null;

  const msgRows = await sql`
    INSERT INTO public.tiktok_messages
      (conversation_id, sender_id, content, media_url, is_outgoing, external_id, created_at)
    VALUES (
      ${input.conversationId},
      ${input.senderId},
      ${content},
      ${input.mediaUrl ?? null},
      true,
      ${input.externalId ?? null},
      now()
    )
    RETURNING id, conversation_id, sender_id, content, media_url, is_outgoing, created_at
  `;
  await sql`
    UPDATE public.tiktok_conversations
    SET last_message = ${content.slice(0, 500)}, updated_at = now()
    WHERE id = ${input.conversationId}
  `;

  const row = msgRows?.[0] as Record<string, unknown> | undefined;
  if (!row) return null;
  return {
    id: String(row.id),
    conversation_id: String(row.conversation_id),
    sender_id: String(row.sender_id || ''),
    content: String(row.content || ''),
    media_url: (row.media_url as string | null) ?? null,
    is_outgoing: Boolean(row.is_outgoing),
    created_at: String(row.created_at),
  };
}

/** List TikTok DM threads for a workspace (Social Inbox shape). */
export async function listTikTokInboxThreads(input: {
  workspaceId: string;
  userId?: string | null;
  limit?: number;
}): Promise<TikTokInboxThread[]> {
  if (!process.env.DATABASE_URL?.trim()) return [];
  await ensureTikTokInboxSchema();

  const limit = Math.min(Math.max(input.limit ?? 40, 1), 80);
  const convRows = await sql`
    SELECT id, workspace_id, tiktok_user_id, username, avatar_url,
           last_message, updated_at
    FROM public.tiktok_conversations
    WHERE workspace_id = ${input.workspaceId}
    ORDER BY updated_at DESC
    LIMIT ${limit}
  `;

  const threads: TikTokInboxThread[] = [];
  for (const raw of convRows || []) {
    const conv = raw as Record<string, unknown>;
    const conversationId = String(conv.id);
    const tiktokUserId = String(conv.tiktok_user_id || '');
    const username = String(conv.username || tiktokUserId);
    const updatedAt = String(conv.updated_at || new Date().toISOString());

    const msgRows = await sql`
      SELECT id, conversation_id, sender_id, content, media_url, is_outgoing, created_at
      FROM public.tiktok_messages
      WHERE conversation_id = ${conversationId}
      ORDER BY created_at ASC
      LIMIT 80
    `;

    const messages = (msgRows || []).map((m) => {
      const row = m as Record<string, unknown>;
      const created = String(row.created_at || updatedAt);
      return {
        id: String(row.id),
        from: (row.is_outgoing ? 'you' : 'them') as 'them' | 'you',
        text: String(row.content || ''),
        time: relativeTime(created),
        media_url: (row.media_url as string | null) ?? null,
      };
    });

    threads.push({
      id: `tt:dm:${conversationId}`,
      platform: 'tiktok',
      channel: 'dm',
      name: username,
      handle: username.startsWith('@') ? username : `@${username}`,
      preview: String(conv.last_message || messages.at(-1)?.text || ''),
      time: relativeTime(updatedAt),
      unread: false,
      recipient_id: tiktokUserId,
      conversation_id: conversationId,
      avatar_url: (conv.avatar_url as string | null) ?? null,
      messages,
    });
  }

  return threads;
}

/** Resolve workspace + owner from a connected TikTok open_id. */
export async function resolveTikTokAccountByOpenId(
  openId: string
): Promise<{ workspaceId: string; userId: string; accessToken: string } | null> {
  if (!process.env.DATABASE_URL?.trim() || !openId.trim()) return null;
  const rows = await sql`
    SELECT user_id, workspace_id, access_token
    FROM public.social_accounts
    WHERE platform = 'tiktok'
      AND platform_user_id = ${openId.trim()}
    ORDER BY updated_at DESC NULLS LAST
    LIMIT 1
  `;
  const row = rows?.[0] as Record<string, unknown> | undefined;
  if (!row?.workspace_id || !row?.access_token) return null;
  return {
    workspaceId: String(row.workspace_id),
    userId: String(row.user_id || ''),
    accessToken: String(row.access_token),
  };
}

export async function getTikTokAccessTokenForWorkspace(input: {
  workspaceId: string;
  userId: string;
}): Promise<{
  accessToken: string;
  openId: string;
  refreshToken: string | null;
  expiresAt: string | null;
} | null> {
  if (!process.env.DATABASE_URL?.trim()) return null;
  const rows = await sql`
    SELECT access_token, refresh_token, expires_at, platform_user_id
    FROM public.social_accounts
    WHERE platform = 'tiktok'
      AND workspace_id::text = ${input.workspaceId}
      AND user_id::text = ${input.userId}
    ORDER BY updated_at DESC NULLS LAST
    LIMIT 1
  `;
  const row = rows?.[0] as Record<string, unknown> | undefined;
  if (!row?.access_token) return null;
  return {
    accessToken: String(row.access_token),
    openId: String(row.platform_user_id || ''),
    refreshToken: (row.refresh_token as string | null) ?? null,
    expiresAt: row.expires_at ? String(row.expires_at) : null,
  };
}

export async function getTikTokConversationForWorkspace(input: {
  conversationId: string;
  workspaceId: string;
}): Promise<TikTokConversationRow | null> {
  if (!process.env.DATABASE_URL?.trim()) return null;
  await ensureTikTokInboxSchema();
  const rows = await sql`
    SELECT id, workspace_id, user_id, tiktok_user_id, username, avatar_url,
           last_message, updated_at
    FROM public.tiktok_conversations
    WHERE id = ${input.conversationId}
      AND workspace_id = ${input.workspaceId}
    LIMIT 1
  `;
  const row = rows?.[0] as Record<string, unknown> | undefined;
  if (!row) return null;
  return {
    id: String(row.id),
    workspace_id: String(row.workspace_id),
    user_id: row.user_id ? String(row.user_id) : null,
    tiktok_user_id: String(row.tiktok_user_id || ''),
    username: String(row.username || ''),
    avatar_url: (row.avatar_url as string | null) ?? null,
    last_message: String(row.last_message || ''),
    updated_at: String(row.updated_at),
  };
}
