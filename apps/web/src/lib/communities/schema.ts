/**
 * Ensure communities + feed tables have columns the Admin Community UI expects.
 * Safe to run on every request (IF NOT EXISTS).
 */

import sql from '@/app/api/utils/sql';

/** Bump when new healers are added so hot servers re-run. */
const COMMUNITIES_SCHEMA_VERSION = 3;
let schemaVersionApplied = 0;
let schemaReady: Promise<void> | null = null;

async function safeAlter(label: string, run: () => Promise<unknown>) {
  try {
    await run();
  } catch (error) {
    console.warn(`[ensureCommunitiesSchema] skipped (${label})`, error);
  }
}

export async function ensureCommunitiesSchema(): Promise<void> {
  if (!process.env.DATABASE_URL?.trim()) return;
  if (schemaReady && schemaVersionApplied >= COMMUNITIES_SCHEMA_VERSION) {
    return schemaReady;
  }

  schemaReady = (async () => {
    await safeAlter('communities.workspace_pricing', () => sql`
      ALTER TABLE communities
        ADD COLUMN IF NOT EXISTS workspace_id text,
        ADD COLUMN IF NOT EXISTS user_id text,
        ADD COLUMN IF NOT EXISTS avatar_url text,
        ADD COLUMN IF NOT EXISTS cover_url text,
        ADD COLUMN IF NOT EXISTS is_free boolean NOT NULL DEFAULT true,
        ADD COLUMN IF NOT EXISTS monthly_price_sek integer NOT NULL DEFAULT 0
    `);
    await safeAlter('communities.user_id', () =>
      sql`ALTER TABLE communities ADD COLUMN IF NOT EXISTS user_id text`
    );
    await safeAlter('communities_workspace_id_idx', () => sql`
      CREATE INDEX IF NOT EXISTS communities_workspace_id_idx
        ON communities (workspace_id)
        WHERE workspace_id IS NOT NULL AND workspace_id <> ''
    `);
    await safeAlter('communities_user_id_idx', () => sql`
      CREATE INDEX IF NOT EXISTS communities_user_id_idx
        ON communities (user_id)
        WHERE user_id IS NOT NULL AND user_id <> ''
    `);
    // Backfill orphans so revenue + admin filters always have a workspace.
    await safeAlter('communities.workspace_backfill', () => sql`
      UPDATE communities
      SET workspace_id = COALESCE(
        NULLIF(workspace_id, ''),
        NULLIF(creator_id, ''),
        'default-my-workspace'
      )
      WHERE workspace_id IS NULL OR workspace_id = ''
    `);
    // Mirror creator_id onto user_id when user_id is empty.
    await safeAlter('communities.user_id_backfill', () => sql`
      UPDATE communities
      SET user_id = COALESCE(NULLIF(user_id, ''), NULLIF(creator_id, ''))
      WHERE (user_id IS NULL OR user_id = '')
        AND creator_id IS NOT NULL
        AND creator_id <> ''
    `);

    // Pin columns required by /api/admin/community + feed/comments.
    await safeAlter('posts.is_pinned', () =>
      sql`ALTER TABLE posts ADD COLUMN IF NOT EXISTS is_pinned boolean NOT NULL DEFAULT false`
    );
    await safeAlter('posts.pinned_at', () =>
      sql`ALTER TABLE posts ADD COLUMN IF NOT EXISTS pinned_at timestamptz`
    );
    await safeAlter('posts.updated_at', () =>
      sql`ALTER TABLE posts ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now()`
    );
    await safeAlter('posts.community_id', () =>
      sql`ALTER TABLE posts ADD COLUMN IF NOT EXISTS community_id integer`
    );
    await safeAlter('posts_community_pinned_idx', () => sql`
      CREATE INDEX IF NOT EXISTS posts_community_pinned_idx
        ON posts (community_id, is_pinned DESC, created_at DESC)
    `);

    await safeAlter('comments.is_pinned', () =>
      sql`ALTER TABLE comments ADD COLUMN IF NOT EXISTS is_pinned boolean NOT NULL DEFAULT false`
    );
    await safeAlter('comments.pinned_at', () =>
      sql`ALTER TABLE comments ADD COLUMN IF NOT EXISTS pinned_at timestamptz`
    );
    await safeAlter('comments.media_url', () =>
      sql`ALTER TABLE comments ADD COLUMN IF NOT EXISTS media_url text`
    );
    await safeAlter('comments.media_type', () =>
      sql`ALTER TABLE comments ADD COLUMN IF NOT EXISTS media_type text`
    );
    await safeAlter('comments_post_pinned_idx', () => sql`
      CREATE INDEX IF NOT EXISTS comments_post_pinned_idx
        ON comments (post_id, is_pinned DESC, created_at ASC)
    `);

    schemaVersionApplied = COMMUNITIES_SCHEMA_VERSION;
  })().catch((error) => {
    schemaReady = null;
    schemaVersionApplied = 0;
    console.warn('[ensureCommunitiesSchema]', error);
  });

  return schemaReady;
}
