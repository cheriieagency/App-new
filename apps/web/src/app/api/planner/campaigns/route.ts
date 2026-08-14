/**
 * GET/POST /api/planner/campaigns
 * Campaign labels are scoped to the authenticated session user.
 */

import { requireApiSession } from '@/lib/auth/require-api-session';
import {
  createCampaignLabel,
  deleteCampaignLabel,
  listCampaignLabels,
  listPostsForCampaign,
  updateCampaignLabel,
} from '@/lib/mock-content-planner';

export async function GET(request: Request) {
  const session = await requireApiSession();
  if (!session.ok) return session.response;

  const userId = session.user.id;
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const project = searchParams.get('project') || undefined;
  if (id) {
    return Response.json({
      campaign: listCampaignLabels(userId).find((c) => c.id === id) ?? null,
      posts: listPostsForCampaign(id, project, userId),
    });
  }
  return Response.json({ campaigns: listCampaignLabels(userId) });
}

export async function POST(request: Request) {
  const session = await requireApiSession();
  if (!session.ok) return session.response;

  const userId = session.user.id;

  try {
    const body = await request.json();
    const action = String(body.action ?? 'create');

    if (action === 'create') {
      const campaign = createCampaignLabel({
        name: String(body.name ?? ''),
        color: typeof body.color === 'string' ? body.color : undefined,
        description:
          typeof body.description === 'string' ? body.description : undefined,
        ownerUserId: userId,
      });
      return Response.json({
        campaign,
        campaigns: listCampaignLabels(userId),
      });
    }

    if (action === 'update') {
      const campaign = updateCampaignLabel(
        String(body.id ?? ''),
        {
          name: typeof body.name === 'string' ? body.name : undefined,
          color: typeof body.color === 'string' ? body.color : undefined,
          description:
            typeof body.description === 'string' ? body.description : undefined,
        },
        userId
      );
      if (!campaign) {
        return Response.json({ error: 'Not found' }, { status: 404 });
      }
      return Response.json({
        campaign,
        campaigns: listCampaignLabels(userId),
      });
    }

    if (action === 'delete') {
      const ok = deleteCampaignLabel(String(body.id ?? ''), userId);
      return Response.json({ ok, campaigns: listCampaignLabels(userId) });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Failed' }, { status: 500 });
  }
}
