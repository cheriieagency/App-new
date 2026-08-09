import {
  createManagedCommunity,
  listManagedCommunities,
  managedCommunityAsWorkspace,
} from '@/lib/mock-community-admin';
import type { SocialPlatform } from '@/lib/mock-content-planner';

export async function GET() {
  const communities = listManagedCommunities();
  return Response.json({
    workspaces: communities.map(managedCommunityAsWorkspace),
    communities,
    demo: true,
  });
}

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
