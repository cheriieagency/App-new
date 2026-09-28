/**
 * Admin bio builder — durable publish to bio_blocks + workspace profile_data.
 * Public /bio/{handle} reads workspaces.profile_data first.
 */

import { bioBlockSlug } from '@/lib/bio-utm';
import { registerBioBlocksAsDestinations } from '@/lib/bio-clicks/persist';
import sql from '@/app/api/utils/sql';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { DEFAULT_BIO_THEME, normalizeBioTheme } from '@/lib/bio-theme';
import {
  blankWorkspaceProfile,
  type WorkspaceBioBlock,
  type WorkspaceProfile,
} from '@/lib/mock-workspace-profiles';
import {
  listDurableWorkspaceProfiles,
  upsertDurableWorkspaceProfile,
} from '@/lib/workspaces/persist';

/** Empty bio until the creator adds real blocks — no seeded demo products. */
const DEFAULT_BLOCKS: Array<Record<string, unknown>> = [];

let bioSchemaReady: Promise<void> | null = null;

async function ensureBioBlocksSchema(): Promise<void> {
  if (!process.env.DATABASE_URL?.trim()) return;
  if (bioSchemaReady) return bioSchemaReady;
  bioSchemaReady = (async () => {
    await sql`
      CREATE TABLE IF NOT EXISTS bio_blocks (
        id           bigserial PRIMARY KEY,
        user_id      text NOT NULL,
        blocks       jsonb NOT NULL DEFAULT '[]'::jsonb,
        handle       text,
        display_name text,
        bio_text     text,
        avatar_url   text,
        social_links jsonb NOT NULL DEFAULT '[]'::jsonb,
        theme        jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at   timestamptz NOT NULL DEFAULT now(),
        updated_at   timestamptz NOT NULL DEFAULT now()
      )
    `;
    await sql`
      ALTER TABLE bio_blocks
        ADD COLUMN IF NOT EXISTS social_links jsonb NOT NULL DEFAULT '[]'::jsonb
    `;
    await sql`
      ALTER TABLE bio_blocks
        ADD COLUMN IF NOT EXISTS theme jsonb NOT NULL DEFAULT '{}'::jsonb
    `;
    await sql`
      CREATE UNIQUE INDEX IF NOT EXISTS bio_blocks_user_uidx
        ON bio_blocks (user_id)
    `;
  })().catch((error) => {
    bioSchemaReady = null;
    throw error;
  });
  return bioSchemaReady;
}

export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    if (!process.env.DATABASE_URL?.trim()) {
      return Response.json({
        blocks: DEFAULT_BLOCKS,
        handle: session.user.name?.toLowerCase().replace(/\s+/g, '') ?? 'creator',
        display_name: session.user.name ?? 'Creator',
        bio_text: '',
        avatar_url: session.user.image ?? null,
        social_links: [],
        theme: DEFAULT_BIO_THEME,
        demo: true,
      });
    }

    try {
      await ensureBioBlocksSchema();
      const rows = await sql`
        SELECT * FROM bio_blocks WHERE user_id = ${session.user.id}
      `;

      if (rows.length === 0) {
        return Response.json({
          blocks: DEFAULT_BLOCKS,
          handle: session.user.name?.toLowerCase().replace(/\s+/g, '') ?? 'creator',
          display_name: session.user.name ?? 'Creator',
          bio_text: '',
          avatar_url: session.user.image ?? null,
          social_links: [],
          theme: DEFAULT_BIO_THEME,
        });
      }

      const row = rows[0] as Record<string, unknown>;
      return Response.json({
        ...row,
        social_links: Array.isArray(row.social_links) ? row.social_links : [],
        theme: normalizeBioTheme(row.theme as Parameters<typeof normalizeBioTheme>[0]),
      });
    } catch (dbError) {
      console.error(dbError);
      return Response.json({ error: 'Failed to fetch bio' }, { status: 500 });
    }
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Failed to fetch bio' }, { status: 500 });
  }
}

/** Persist published bio onto the active brand workspace (public /bio/{handle}). */
async function persistWorkspaceBio(input: {
  userId: string;
  workspaceId: string;
  cleanHandle: string;
  displayName: string | null;
  bioText: string | null;
  avatarUrl: string | null;
  socialLinks: unknown;
  theme: ReturnType<typeof normalizeBioTheme>;
  themeLabel: string;
  blocks: Array<Record<string, unknown>>;
}): Promise<WorkspaceProfile | null> {
  if (!process.env.DATABASE_URL?.trim()) return null;
  const list = await listDurableWorkspaceProfiles(input.userId);
  const current =
    list.find((w) => w.id === input.workspaceId) || list[0] || null;
  if (!current && !input.workspaceId) return null;

  const base = current || {
    ...blankWorkspaceProfile(),
    id: input.workspaceId || `ws-${input.userId.slice(0, 12)}`,
    name: input.displayName || 'My Workspace',
  };

  const next: WorkspaceProfile = {
    ...base,
    handle: `@${input.cleanHandle}`,
    avatar_url: input.avatarUrl ?? base.avatar_url,
    bio: {
      ...base.bio,
      profile_photo: input.avatarUrl,
      display_name: input.displayName || base.bio.display_name || base.name,
      handle: input.cleanHandle,
      bio_text: input.bioText ?? '',
      theme: input.theme,
      theme_label: input.themeLabel || base.bio.theme_label || 'Custom',
      blocks: input.blocks as WorkspaceBioBlock[],
      social_links: Array.isArray(input.socialLinks)
        ? (input.socialLinks as { platform: string; url: string }[])
        : base.bio.social_links ?? [],
    },
  };

  return upsertDurableWorkspaceProfile({
    userId: input.userId,
    profile: next,
  });
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const {
      blocks,
      handle,
      display_name,
      bio_text,
      avatar_url,
      social_links,
      theme,
      theme_label,
    } = body as Record<string, unknown>;
    const normalizedTheme = normalizeBioTheme(
      theme as Parameters<typeof normalizeBioTheme>[0]
    );
    const themeLabel =
      (typeof theme_label === 'string' && theme_label.trim()) ||
      'Custom';
    const workspaceId = String(
      body.workspaceId ||
        body.workspace_id ||
        request.headers.get('x-workspace-id') ||
        request.headers.get('x-active-workspace-id') ||
        ''
    ).trim();
    const blockList = Array.isArray(blocks)
      ? (blocks as Array<Record<string, unknown>>)
      : [];

    const cleanHandle = String(handle ?? '')
      .replace(/^@/, '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9._-]/g, '') || 'creator';

    const ensureDestinations = async () => {
      try {
        const withSlugs = blockList.map((b) => ({
          ...b,
          utm_slug: String(
            b.utm_slug ||
              bioBlockSlug(b as { id?: string; title?: string; utm_slug?: string })
          ),
        }));
        await registerBioBlocksAsDestinations({
          workspaceId: workspaceId || `user:${session.user.id}`,
          userId: session.user.id,
          handle: cleanHandle,
          blocks: withSlugs,
        });
      } catch (err) {
        console.warn('[admin/bio] destination register failed', err);
      }
    };

    if (!process.env.DATABASE_URL?.trim()) {
      await ensureDestinations();
      return Response.json({
        success: true,
        first_publish: false,
        handle: cleanHandle,
        theme: normalizedTheme,
        demo: true,
      });
    }

    try {
      await ensureBioBlocksSchema();
      const existing = await sql`SELECT id FROM bio_blocks WHERE user_id = ${session.user.id}`;

      if (existing.length > 0) {
        await sql`
          UPDATE bio_blocks
          SET blocks = ${JSON.stringify(blockList)},
              handle = ${cleanHandle},
              display_name = ${display_name ?? null},
              bio_text = ${bio_text ?? null},
              avatar_url = ${avatar_url ?? null},
              social_links = ${JSON.stringify(social_links ?? [])},
              theme = ${JSON.stringify(normalizedTheme)},
              updated_at = NOW()
          WHERE user_id = ${session.user.id}
        `;
      } else {
        await sql`
          INSERT INTO bio_blocks (
            user_id, blocks, handle, display_name, bio_text, avatar_url, social_links, theme
          )
          VALUES (
            ${session.user.id},
            ${JSON.stringify(blockList)},
            ${cleanHandle},
            ${display_name ?? null},
            ${bio_text ?? null},
            ${avatar_url ?? null},
            ${JSON.stringify(social_links ?? [])},
            ${JSON.stringify(normalizedTheme)}
          )
        `;
      }

      // Public page source of truth — always write the active workspace profile.
      let workspaceProfile: WorkspaceProfile | null = null;
      try {
        workspaceProfile = await persistWorkspaceBio({
          userId: session.user.id,
          workspaceId,
          cleanHandle,
          displayName:
            typeof display_name === 'string' ? display_name : null,
          bioText: typeof bio_text === 'string' ? bio_text : null,
          avatarUrl: typeof avatar_url === 'string' ? avatar_url : null,
          socialLinks: social_links,
          theme: normalizedTheme,
          themeLabel,
          blocks: blockList,
        });
      } catch (wsErr) {
        console.error('[admin/bio] workspace profile_data persist failed', wsErr);
        return Response.json(
          {
            error: 'Failed to publish bio to workspace',
            message:
              wsErr instanceof Error ? wsErr.message : 'Workspace save failed',
          },
          { status: 500 }
        );
      }

      await ensureDestinations();
      return Response.json({
        success: true,
        first_publish: existing.length === 0,
        handle: cleanHandle,
        theme: normalizedTheme,
        workspace_id: workspaceProfile?.id ?? (workspaceId || null),
      });
    } catch (dbError) {
      console.error('[admin/bio] persist failed', dbError);
      return Response.json(
        {
          error: 'Failed to save bio',
          message: dbError instanceof Error ? dbError.message : 'Database error',
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Failed to save bio' }, { status: 500 });
  }
}
