/**
 * GET/POST/PATCH/DELETE /api/admin/workspaces
 * Durable brand workspaces + bio profile_data when DATABASE_URL is set.
 */

import { requireApiSession } from '@/lib/auth/require-api-session';
import { requireLimit } from '@/lib/plan-guard';
import type { SocialPlatform } from '@/lib/mock-content-planner';
import {
  blankWorkspaceProfile,
  deleteWorkspaceProfile,
  listWorkspaceProfiles,
  profileAsBrandWorkspace,
  type WorkspaceBioData,
  type WorkspaceProfile,
} from '@/lib/mock-workspace-profiles';
import {
  deleteDurableWorkspaceProfile,
  ensureDurableDefaultWorkspace,
  listDurableWorkspaceProfiles,
  upsertDurableWorkspaceProfile,
} from '@/lib/workspaces/persist';
import {
  createManagedCommunity,
  listManagedCommunities,
  managedCommunityAsWorkspace,
} from '@/lib/mock-community-admin';

function useDb() {
  return Boolean(process.env.DATABASE_URL?.trim());
}

export async function GET() {
  const session = await requireApiSession();
  if (!session.ok) return session.response;

  if (!useDb()) {
    const profiles = listWorkspaceProfiles();
    const communities = listManagedCommunities();
    return Response.json({
      workspaces:
        profiles.length > 0
          ? profiles.map(profileAsBrandWorkspace)
          : communities.map(managedCommunityAsWorkspace),
      communities,
      profiles,
      demo: true,
    });
  }

  try {
    const profiles = await ensureDurableDefaultWorkspace({
      userId: session.user.id,
      name: session.user.name
        ? `${session.user.name.split(' ')[0]}'s Workspace`
        : undefined,
    });
    return Response.json({
      workspaces: profiles.map(profileAsBrandWorkspace),
      profiles,
      communities: [],
      demo: false,
    });
  } catch (error) {
    console.error('[GET /api/admin/workspaces]', error);
    return Response.json(
      {
        error: 'list_failed',
        profiles: [],
        workspaces: [],
        demo: false,
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const session = await requireApiSession();
  if (!session.ok) return session.response;

  try {
    const body = await request.json();
    const name = String(body.name ?? '').trim();
    const handle = String(body.handle ?? '').trim();
    const channels = Array.isArray(body.channels)
      ? (body.channels as SocialPlatform[])
      : [];
    if (!name) {
      return Response.json({ error: 'name required' }, { status: 400 });
    }

    if (!useDb()) {
      const existingCount =
        typeof body.existingCount === 'number'
          ? body.existingCount
          : listWorkspaceProfiles().length || listManagedCommunities().length;
      const limitGate = await requireLimit(
        'maxWorkspaces',
        existingCount,
        request.headers
      );
      if (limitGate) return limitGate;

      const community = createManagedCommunity({ name, handle, channels });
      return Response.json({
        ok: true,
        workspace: managedCommunityAsWorkspace(community),
        community,
        clientWorkspaceId: body.clientWorkspaceId ?? null,
        workspaces: listManagedCommunities().map(managedCommunityAsWorkspace),
        demo: true,
      });
    }

    const existing = await listDurableWorkspaceProfiles(session.user.id);
    const limitGate = await requireLimit(
      'maxWorkspaces',
      existing.length,
      request.headers
    );
    if (limitGate) return limitGate;

    const profile = blankWorkspaceProfile();
    profile.id =
      (typeof body.clientWorkspaceId === 'string' &&
        body.clientWorkspaceId.trim()) ||
      `ws-${Date.now().toString(36)}`;
    profile.name = name;
    profile.handle =
      handle ||
      `@${name.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 24) || 'brand'}`;
    profile.channels = channels;
    profile.bio.display_name = name;
    profile.bio.handle = profile.handle;
    profile.color = '#2B2568';

    const saved = await upsertDurableWorkspaceProfile({
      userId: session.user.id,
      profile,
    });
    const profiles = await listDurableWorkspaceProfiles(session.user.id);

    return Response.json({
      ok: true,
      profile: saved,
      workspace: profileAsBrandWorkspace(saved),
      profiles,
      workspaces: profiles.map(profileAsBrandWorkspace),
      demo: false,
    });
  } catch (error) {
    console.error('[POST /api/admin/workspaces]', error);
    return Response.json(
      {
        error: 'create_failed',
        message: error instanceof Error ? error.message : 'Failed',
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  const session = await requireApiSession();
  if (!session.ok) return session.response;

  if (!useDb()) {
    return Response.json(
      { error: 'database_required', message: 'DATABASE_URL required' },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const id = String(body.id ?? '').trim();
    if (!id) return Response.json({ error: 'id required' }, { status: 400 });

    const existing = await listDurableWorkspaceProfiles(session.user.id);
    const current = existing.find((w) => w.id === id);
    if (!current) return Response.json({ error: 'Not found' }, { status: 404 });

    const next: WorkspaceProfile = { ...current };
    if (typeof body.name === 'string') next.name = body.name.trim() || next.name;
    if (typeof body.handle === 'string') next.handle = body.handle.trim() || next.handle;
    if (Array.isArray(body.channels)) {
      next.channels = body.channels as SocialPlatform[];
    }
    if (body.bio && typeof body.bio === 'object') {
      next.bio = { ...next.bio, ...(body.bio as Partial<WorkspaceBioData>) };
    }
    if (body.profile && typeof body.profile === 'object') {
      Object.assign(next, body.profile as Partial<WorkspaceProfile>);
      next.id = id;
    }

    const saved = await upsertDurableWorkspaceProfile({
      userId: session.user.id,
      profile: next,
    });
    return Response.json({ ok: true, profile: saved, demo: false });
  } catch (error) {
    console.error('[PATCH /api/admin/workspaces]', error);
    return Response.json(
      {
        error: 'update_failed',
        message: error instanceof Error ? error.message : 'Failed',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const session = await requireApiSession();
  if (!session.ok) return session.response;

  const url = new URL(request.url);
  const id = url.searchParams.get('id')?.trim() || '';
  if (!id) return Response.json({ error: 'id required' }, { status: 400 });

  if (!useDb()) {
    const { remaining } = deleteWorkspaceProfile(id);
    return Response.json({ ok: true, profiles: remaining, demo: true });
  }

  try {
    const ok = await deleteDurableWorkspaceProfile({
      userId: session.user.id,
      id,
    });
    if (!ok) return Response.json({ error: 'Not found' }, { status: 404 });
    const profiles = await listDurableWorkspaceProfiles(session.user.id);
    return Response.json({ ok: true, profiles, demo: false });
  } catch (error) {
    console.error('[DELETE /api/admin/workspaces]', error);
    return Response.json(
      {
        error: 'delete_failed',
        message: error instanceof Error ? error.message : 'Failed',
      },
      { status: 500 }
    );
  }
}
