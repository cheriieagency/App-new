/**
 * Durable workspace profiles (bio blocks, brand meta) on public.workspaces.
 */

import sql from '@/app/api/utils/sql';
import {
  blankWorkspaceProfile,
  type WorkspaceProfile,
} from '@/lib/mock-workspace-profiles';
import type { SocialPlatform } from '@/lib/mock-content-planner';

let schemaReady: Promise<void> | null = null;

export async function ensureWorkspaceProfilesSchema(): Promise<void> {
  if (!process.env.DATABASE_URL?.trim()) return;
  if (schemaReady) return schemaReady;

  schemaReady = (async () => {
    await sql`
      CREATE TABLE IF NOT EXISTS public.workspaces (
        id                      text PRIMARY KEY,
        user_id                 text NOT NULL,
        name                    text,
        slug                    text,
        default_community_slug  text,
        custom_domain           text,
        custom_domain_verified  boolean NOT NULL DEFAULT false,
        created_at              timestamptz NOT NULL DEFAULT now(),
        updated_at              timestamptz NOT NULL DEFAULT now()
      )
    `;
    await sql`
      ALTER TABLE public.workspaces
        ADD COLUMN IF NOT EXISTS handle text,
        ADD COLUMN IF NOT EXISTS avatar_url text,
        ADD COLUMN IF NOT EXISTS color text DEFAULT '#2B2568',
        ADD COLUMN IF NOT EXISTS channels jsonb NOT NULL DEFAULT '[]'::jsonb,
        ADD COLUMN IF NOT EXISTS profile_data jsonb NOT NULL DEFAULT '{}'::jsonb
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS workspaces_user_idx
        ON public.workspaces (user_id)
    `;
  })().catch((error) => {
    schemaReady = null;
    throw error;
  });

  return schemaReady;
}

function mergeProfile(
  id: string,
  userId: string,
  row: Record<string, unknown>
): WorkspaceProfile {
  const base = blankWorkspaceProfile();
  const stored = (row.profile_data as Partial<WorkspaceProfile>) || {};
  const channels = Array.isArray(row.channels)
    ? (row.channels as SocialPlatform[])
    : Array.isArray(stored.channels)
      ? stored.channels
      : [];

  return {
    ...base,
    ...stored,
    id,
    name: String(row.name || stored.name || 'Workspace'),
    handle: String(row.handle || stored.handle || '@'),
    avatar_url:
      (row.avatar_url as string | null) ?? stored.avatar_url ?? null,
    color: String(row.color || stored.color || '#2B2568'),
    channels,
    bio: {
      ...base.bio,
      ...(stored.bio || {}),
      display_name:
        stored.bio?.display_name ||
        String(row.name || stored.name || ''),
      handle: stored.bio?.handle || String(row.handle || stored.handle || '@'),
    },
    analytics: { ...base.analytics, ...(stored.analytics || {}) },
    community: { ...base.community, ...(stored.community || {}) },
    email: { ...base.email, ...(stored.email || {}) },
    planner: { ...base.planner, ...(stored.planner || {}) },
  };
}

export async function listDurableWorkspaceProfiles(
  userId: string
): Promise<WorkspaceProfile[]> {
  if (!process.env.DATABASE_URL?.trim()) return [];
  await ensureWorkspaceProfilesSchema();
  const rows = await sql`
    SELECT id, user_id, name, handle, avatar_url, color, channels, profile_data
    FROM public.workspaces
    WHERE user_id::text = ${userId}
    ORDER BY created_at ASC NULLS LAST, id ASC
  `;
  return (rows || []).map((raw) => {
    const row = raw as Record<string, unknown>;
    return mergeProfile(String(row.id), userId, row);
  });
}

export async function upsertDurableWorkspaceProfile(input: {
  userId: string;
  profile: WorkspaceProfile;
}): Promise<WorkspaceProfile> {
  await ensureWorkspaceProfilesSchema();
  const p = input.profile;
  const id = p.id?.trim() || `ws-${Date.now().toString(36)}`;
  const profileData = {
    ...p,
    id,
  };

  await sql`
    INSERT INTO public.workspaces (
      id, user_id, name, handle, avatar_url, color, channels, profile_data, updated_at
    ) VALUES (
      ${id},
      ${input.userId},
      ${p.name},
      ${p.handle},
      ${p.avatar_url},
      ${p.color || '#2B2568'},
      ${JSON.stringify(p.channels || [])},
      ${JSON.stringify(profileData)},
      now()
    )
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      handle = EXCLUDED.handle,
      avatar_url = EXCLUDED.avatar_url,
      color = EXCLUDED.color,
      channels = EXCLUDED.channels,
      profile_data = EXCLUDED.profile_data,
      updated_at = now()
    WHERE public.workspaces.user_id::text = ${input.userId}
  `;

  const list = await listDurableWorkspaceProfiles(input.userId);
  return list.find((w) => w.id === id) || { ...p, id };
}

export async function deleteDurableWorkspaceProfile(input: {
  userId: string;
  id: string;
}): Promise<boolean> {
  await ensureWorkspaceProfilesSchema();
  const rows = await sql`
    DELETE FROM public.workspaces
    WHERE id = ${input.id} AND user_id::text = ${input.userId}
    RETURNING id
  `;
  return Array.isArray(rows) && rows.length > 0;
}

export async function ensureDurableDefaultWorkspace(input: {
  userId: string;
  name?: string;
}): Promise<WorkspaceProfile[]> {
  const existing = await listDurableWorkspaceProfiles(input.userId);
  if (existing.length > 0) return existing;

  const name = input.name?.trim() || 'My workspace';
  const id = `default-${input.userId.slice(0, 12)}`;
  const profile = blankWorkspaceProfile();
  profile.id = id;
  profile.name = name;
  profile.handle = `@${name.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 24) || 'workspace'}`;
  profile.bio.display_name = name;
  profile.bio.handle = profile.handle;
  profile.color = '#2B2568';

  await upsertDurableWorkspaceProfile({
    userId: input.userId,
    profile,
  });
  return listDurableWorkspaceProfiles(input.userId);
}
