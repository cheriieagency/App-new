import {
  createCampaignLabel,
  deleteCampaignLabel,
  listCampaignLabels,
  listPostsForCampaign,
  updateCampaignLabel,
} from '@/lib/mock-content-planner';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const project = searchParams.get('project') || undefined;
  if (id) {
    return Response.json({
      campaign: listCampaignLabels().find((c) => c.id === id) ?? null,
      posts: listPostsForCampaign(id, project),
    });
  }
  return Response.json({ campaigns: listCampaignLabels() });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const action = String(body.action ?? 'create');

    if (action === 'create') {
      const campaign = createCampaignLabel({
        name: String(body.name ?? ''),
        color: typeof body.color === 'string' ? body.color : undefined,
        description: typeof body.description === 'string' ? body.description : undefined,
      });
      return Response.json({ campaign, campaigns: listCampaignLabels() });
    }

    if (action === 'update') {
      const campaign = updateCampaignLabel(String(body.id ?? ''), {
        name: typeof body.name === 'string' ? body.name : undefined,
        color: typeof body.color === 'string' ? body.color : undefined,
        description: typeof body.description === 'string' ? body.description : undefined,
      });
      if (!campaign) return Response.json({ error: 'Not found' }, { status: 404 });
      return Response.json({ campaign, campaigns: listCampaignLabels() });
    }

    if (action === 'delete') {
      const ok = deleteCampaignLabel(String(body.id ?? ''));
      return Response.json({ ok, campaigns: listCampaignLabels() });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Failed' }, { status: 500 });
  }
}
