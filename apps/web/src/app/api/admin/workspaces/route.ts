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

export async function POST(request: Request) {
  try {
    // Workspace / brand count gated by plan (Starter/Creator = 1, Pro = 3).
    const existing =
      listWorkspaceProfiles().length || listManagedCommunities().length;
    const limitGate = await requireLimit('maxWorkspaces', existing, request.headers);
    if (limitGate) return limitGate;

    const body = await request.json();
    const name = String(body.name ?? '').trim();
    const handle = String(body.handle ?? '').trim();
    const channels = Array.isArray(body.channels)
      ? (body.channels as SocialPlatform[])
      : [];
    if (!name) {
      return Response.json({ error: 'name required' }, { status: 400 });
    }
    const community = createManagedCommunity({ name, handle, channels });
    return Response.json({
      workspace: managedCommunityAsWorkspace(community),
      community,
      workspaces: listManagedCommunities().map(managedCommunityAsWorkspace),
    });
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Failed' }, { status: 500 });
  }
}
