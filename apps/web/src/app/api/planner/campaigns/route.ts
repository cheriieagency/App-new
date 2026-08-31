/**
 * GET/POST /api/planner/campaigns
 * Projects (campaign labels) scoped to the authenticated user + workspace.
 * Persists to planner_campaigns when DATABASE_URL is set.
 */

import { cookies } from 'next/headers';
import { requireApiSession } from '@/lib/auth/require-api-session';
import {
  ACTIVE_WORKSPACE_COOKIE,
  ACTIVE_WORKSPACE_COOKIE_ALIAS,
} from '@/lib/social/oauth-workspace';
import { resolveStrictUserWorkspace } from '@/lib/social/resolve-user-workspace';
import {
  createCampaignLabel,
  deleteCampaignLabel,
  getCampaignLabel,
  listCampaignLabels,
  listPostsForCampaign,
  reorderCampaignLabels,
  updateCampaignLabel,
  type VisionPin,
} from '@/lib/mock-content-planner';
import {
  createDurableCampaign,
  deleteDurableCampaign,
  getDurableCampaign,
  listDurableCampaigns,
  reorderDurableCampaigns,
  updateDurableCampaign,
} from '@/lib/planner/campaigns';
import { listDurablePlannerPosts } from '@/lib/planner/posts';

function useDurable(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}

async function resolveWorkspaceId(
  request: Request,
  userId: string,
  email?: string | null
): Promise<string> {
  const url = new URL(request.url);
  const jar = await cookies();
  const preferred =
    url.searchParams.get('workspaceId')?.trim() ||
    request.headers.get('x-workspace-id')?.trim() ||
    request.headers.get('x-active-workspace-id')?.trim() ||
    jar.get(ACTIVE_WORKSPACE_COOKIE)?.value ||
    jar.get(ACTIVE_WORKSPACE_COOKIE_ALIAS)?.value ||
    null;

  const access = await resolveStrictUserWorkspace({
    userId,
    preferredWorkspaceId: preferred,
    email: email ?? null,
  });
  if (!access.ok) return preferred || userId;
  return access.workspaceId;
}

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
  const durable = useDurable();

  try {
    if (durable) {
      const workspaceId = await resolveWorkspaceId(
        request,
        userId,
        session.user.email
      );
      if (id) {
        const campaign = await getDurableCampaign({
          workspaceId,
          userId,
          id,
        });
        const allPosts = await listDurablePlannerPosts({
          userId,
          project,
          workspaceId,
        });
        const posts = allPosts.filter((p) =>
          (p.campaigns ?? []).includes(id)
        );
        return Response.json({
          campaign,
          posts,
          demo: false,
        });
      }
      const campaigns = await listDurableCampaigns({ workspaceId, userId });
      return Response.json({ campaigns, demo: false });
    }

    if (id) {
      return Response.json({
        campaign: getCampaignLabel(id, userId),
        posts: listPostsForCampaign(id, project, userId),
        demo: true,
      });
    }
    return Response.json({ campaigns: listCampaignLabels(userId), demo: true });
  } catch (error) {
    console.error('[GET /api/planner/campaigns]', error);
    // Never soft-fallback to mock when DATABASE_URL is set — that looks like data loss.
    if (useDurable()) {
      return Response.json(
        {
          error: 'load_failed',
          message:
            error instanceof Error ? error.message : 'Failed to load campaigns',
          campaigns: id ? undefined : [],
          campaign: id ? null : undefined,
          posts: id ? [] : undefined,
          demo: false,
        },
        { status: 500 }
      );
    }
    if (id) {
      return Response.json({
        campaign: getCampaignLabel(id, userId),
        posts: listPostsForCampaign(id, project, userId),
        demo: true,
      });
    }
    return Response.json({
      campaigns: listCampaignLabels(userId),
      demo: true,
    });
  }
}

export async function POST(request: Request) {
  const session = await requireApiSession();
  if (!session.ok) return session.response;

  const userId = session.user.id;

  try {
    const body = await request.json();
    const action = String(body.action ?? 'create');
    const durable = useDurable();
    const workspaceId = durable
      ? await resolveWorkspaceId(request, userId, session.user.email)
      : userId;

    if (action === 'create') {
      const campaign = durable
        ? await createDurableCampaign({
            workspaceId,
            userId,
            name: String(body.name ?? ''),
            color: typeof body.color === 'string' ? body.color : undefined,
            description:
              typeof body.description === 'string' ? body.description : undefined,
          })
        : createCampaignLabel({
            name: String(body.name ?? ''),
            color: typeof body.color === 'string' ? body.color : undefined,
            description:
              typeof body.description === 'string' ? body.description : undefined,
            ownerUserId: userId,
          });
      const campaigns = durable
        ? await listDurableCampaigns({ workspaceId, userId })
        : listCampaignLabels(userId);
      return Response.json({ campaign, campaigns });
    }

    if (action === 'update') {
      const goalMetricRaw = body.goal_metric;
      const goalMetric =
        goalMetricRaw === 'views' || goalMetricRaw === 'engagement'
          ? goalMetricRaw
          : undefined;
      const patch = {
        name: typeof body.name === 'string' ? body.name : undefined,
        color: typeof body.color === 'string' ? body.color : undefined,
        description:
          typeof body.description === 'string' ? body.description : undefined,
        vision_pins: sanitizeVisionPins(body.vision_pins),
        goal_metric: goalMetric,
        goal_target:
          body.goal_target !== undefined ? Number(body.goal_target) : undefined,
        goal_current:
          body.goal_current !== undefined ? Number(body.goal_current) : undefined,
      };
      const campaign = durable
        ? await updateDurableCampaign({
            workspaceId,
            userId,
            id: String(body.id ?? ''),
            ...patch,
          })
        : updateCampaignLabel(String(body.id ?? ''), patch, userId);
      if (!campaign) {
        return Response.json({ error: 'Not found' }, { status: 404 });
      }
      const campaigns = durable
        ? await listDurableCampaigns({ workspaceId, userId })
        : listCampaignLabels(userId);
      return Response.json({ campaign, campaigns });
    }

    if (action === 'delete') {
      const ok = durable
        ? await deleteDurableCampaign({
            workspaceId,
            userId,
            id: String(body.id ?? ''),
          })
        : deleteCampaignLabel(String(body.id ?? ''), userId);
      const campaigns = durable
        ? await listDurableCampaigns({ workspaceId, userId })
        : listCampaignLabels(userId);
      return Response.json({ ok, campaigns });
    }

    if (action === 'reorder') {
      const orderedIds = Array.isArray(body.orderedIds)
        ? body.orderedIds.map((id: unknown) => String(id)).filter(Boolean)
        : [];
      const campaigns = durable
        ? await reorderDurableCampaigns({
            workspaceId,
            userId,
            orderedIds,
          })
        : reorderCampaignLabels(orderedIds, userId);
      return Response.json({ campaigns });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('[POST /api/planner/campaigns]', error);
    return Response.json({ error: 'Failed' }, { status: 500 });
  }
}
