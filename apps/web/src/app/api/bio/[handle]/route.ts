/**
 * GET /api/bio/[handle] — public link-in-bio profile from Postgres.
 */

import sql from '@/app/api/utils/sql';
import { ensureWorkspaceProfilesSchema } from '@/lib/workspaces/persist';
import {
  blankWorkspaceProfile,
  getWorkspaceProfileByHandle,
  type WorkspaceProfile,
} from '@/lib/mock-workspace-profiles';
import type { SocialPlatform } from '@/lib/mock-content-planner';

type Ctx = { params: Promise<{ handle: string }> };

function normalizeHandle(raw: string): string {
  return decodeURIComponent(raw || '')
    .trim()
    .replace(/^@/, '')
    .toLowerCase();
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
      return Response.json({ error: 'not_found', profile: null }, { status: 404 });
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
         OR lower(COALESCE(slug, '')) = ${handle}
      LIMIT 1
    `;
    const row = rows?.[0] as Record<string, unknown> | undefined;
    if (!row) {
      return Response.json({ error: 'not_found', profile: null }, { status: 404 });
    }

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
  } catch (error) {
    console.error('[GET /api/bio/[handle]]', error);
    return Response.json(
      { error: 'load_failed', profile: null },
      { status: 500 }
    );
  }
}
