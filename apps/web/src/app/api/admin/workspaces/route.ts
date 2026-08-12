import {
  createManagedCommunity,
  listManagedCommunities,
  managedCommunityAsWorkspace,
} from '@/lib/mock-community-admin';
import type { SocialPlatform } from '@/lib/mock-content-planner';
import {
  listWorkspaceProfiles,
  profileAsBrandWorkspace,
} from '@/lib/mock-workspace-profiles';
import { requireLimit } from '@/lib/plan-guard';

export async function GET() {
  const communities = listManagedCommunities();
  const profiles = listWorkspaceProfiles();
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

/**
 * Secondary sync for managed communities.
 * The admin UI creates workspaces client-side (localStorage) via WorkspaceContext;
 * this route mirrors a community record and enforces plan seat limits.
 */
export async function POST(request: Request) {
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

    // Prefer client-reported count (server memory is not shared with the browser store).
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
    });
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Failed' }, { status: 500 });
  }
}
