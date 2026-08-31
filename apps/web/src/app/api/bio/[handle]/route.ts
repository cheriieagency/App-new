/**
 * GET /api/bio/[handle] — public link-in-bio profile from Postgres.
 * Prefer workspaces.profile_data (per brand); fall back to bio_blocks by handle.
 */

import sql from '@/app/api/utils/sql';
import { ensureWorkspaceProfilesSchema } from '@/lib/workspaces/persist';
import {
  blankWorkspaceProfile,
  getWorkspaceProfileByHandle,
  type WorkspaceProfile,
} from '@/lib/mock-workspace-profiles';
import type { SocialPlatform } from '@/lib/mock-content-planner';
import { DEFAULT_BIO_THEME, normalizeBioTheme } from '@/lib/bio-theme';

type Ctx = { params: Promise<{ handle: string }> };

function normalizeHandle(raw: string): string {
  return decodeURIComponent(raw || '')
    .trim()
    .replace(/^@/, '')
    .toLowerCase();
}

function profileFromBioBlocksRow(
  row: Record<string, unknown>,
  handle: string
): WorkspaceProfile {
  const base = blankWorkspaceProfile();
  const theme = normalizeBioTheme(
    row.theme as Parameters<typeof normalizeBioTheme>[0]
  );
  const socialLinks = Array.isArray(row.social_links) ? row.social_links : [];
  const blocks = Array.isArray(row.blocks) ? row.blocks : [];
  return {
    ...base,
    id: `bio-${String(row.user_id || handle)}`,
    name: String(row.display_name || handle),
    handle: `@${handle}`,
    avatar_url: (row.avatar_url as string | null) ?? null,
    bio: {
      ...base.bio,
      profile_photo: (row.avatar_url as string | null) ?? null,
      display_name: String(row.display_name || handle),
      handle,
      bio_text: String(row.bio_text || ''),
      theme: theme || DEFAULT_BIO_THEME,
      theme_label: 'Custom',
      blocks: blocks as WorkspaceProfile['bio']['blocks'],
      social_links: socialLinks as WorkspaceProfile['bio']['social_links'],
    },
  };
}

export async function GET(_request: Request, context: Ctx) {
  const { handle: raw } = await context.params;
  const handle = normalizeHandle(raw);
  if (!handle) {
    return Response.json({ error: 'not_found', profile: null }, { status: 404 });
  }

  if (!process.env.DATABASE_URL?.trim()) {
    const profile = getWorkspaceProfileByHandle(handle);
    if (!profile) {
      return Response.json({ error: 'not_found', profile: null, demo: true }, { status: 404 });
    }
    return Response.json({ profile, demo: true });
  }

  try {
    await ensureWorkspaceProfilesSchema();
    const rows = await sql`
      SELECT id, user_id, name, handle, avatar_url, color, channels, profile_data
      FROM public.workspaces
      WHERE lower(regexp_replace(COALESCE(handle, ''), '^@', '')) = ${handle}
         OR lower(regexp_replace(COALESCE(profile_data->>'handle', ''), '^@', '')) = ${handle}
         OR lower(regexp_replace(COALESCE(profile_data->'bio'->>'handle', ''), '^@', '')) = ${handle}
         OR lower(COALESCE(slug, '')) = ${handle}
      LIMIT 1
    `;
    const row = rows?.[0] as Record<string, unknown> | undefined;
    if (row) {
      const stored = (row.profile_data as Partial<WorkspaceProfile>) || {};
      const base = blankWorkspaceProfile();
      const profile: WorkspaceProfile = {
        ...base,
        ...stored,
        id: String(row.id),
        name: String(row.name || stored.name || 'Creator'),
        handle: String(row.handle || stored.handle || `@${handle}`),
        avatar_url: (row.avatar_url as string | null) ?? stored.avatar_url ?? null,
        color: String(row.color || stored.color || '#2B2568'),
        channels: Array.isArray(row.channels)
          ? (row.channels as SocialPlatform[])
          : stored.channels || [],
        bio: {
          ...base.bio,
          ...(stored.bio || {}),
        },
      };

      return Response.json({ profile, demo: false });
    }

    // Fallback: legacy / user-scoped bio_blocks published by handle.
    try {
      const bioRows = await sql`
        SELECT *
        FROM bio_blocks
        WHERE lower(regexp_replace(COALESCE(handle, ''), '^@', '')) = ${handle}
        ORDER BY updated_at DESC NULLS LAST
        LIMIT 1
      `;
      const bioRow = bioRows?.[0] as Record<string, unknown> | undefined;
      if (bioRow) {
        return Response.json({
          profile: profileFromBioBlocksRow(bioRow, handle),
          demo: false,
          source: 'bio_blocks',
        });
      }
    } catch (bioErr) {
      console.warn('[GET /api/bio/[handle]] bio_blocks fallback', bioErr);
    }

    return Response.json({ error: 'not_found', profile: null }, { status: 404 });
  } catch (error) {
    console.error('[GET /api/bio/[handle]]', error);
    return Response.json(
      { error: 'load_failed', profile: null },
      { status: 500 }
    );
  }
}
