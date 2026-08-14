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
  type VisionPin,
} from '@/lib/mock-content-planner';

function sanitizeVisionPins(raw: unknown): VisionPin[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  return raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const row = item as Record<string, unknown>;
      const url = typeof row.url === 'string' ? row.url.trim() : '';
      if (!url) return null;
      return {
        id:
          typeof row.id === 'string' && row.id.trim()
            ? row.id.trim()
            : `pin-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        url,
        title: typeof row.title === 'string' ? row.title.trim() : '',
        note: typeof row.note === 'string' ? row.note.trim() : '',
        created_at:
          typeof row.created_at === 'string' && row.created_at
            ? row.created_at
            : new Date().toISOString(),
      } satisfies VisionPin;
    })
    .filter((p): p is VisionPin => !!p);
}

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
          vision_pins: sanitizeVisionPins(body.vision_pins),
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
