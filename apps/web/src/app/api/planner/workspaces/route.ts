import {
  createBrandWorkspace,
  listBrandWorkspaces,
  type SocialPlatform,
} from '@/lib/mock-content-planner';

export async function GET() {
  return Response.json({ workspaces: listBrandWorkspaces(), demo: true });
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
    const workspace = createBrandWorkspace({ name, handle, channels });
    return Response.json({
      workspace,
      workspaces: listBrandWorkspaces(),
    });
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Failed' }, { status: 500 });
  }
}
