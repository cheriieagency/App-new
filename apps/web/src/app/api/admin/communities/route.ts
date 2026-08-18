/**
 * GET  /api/admin/communities?workspaceId=…
 * POST /api/admin/communities — create community bound to active workspace.
 */

import { cookies } from 'next/headers';
import sql from '@/app/api/utils/sql';
import { ensureCommunitiesSchema } from '@/lib/communities/schema';
import { persistCommunityToDatabase } from '@/lib/communities/persist';
import {
  ACTIVE_WORKSPACE_COOKIE,
  ACTIVE_WORKSPACE_COOKIE_ALIAS,
} from '@/lib/social/oauth-workspace';
import {
  createManagedCommunity,
  listManagedCommunities,
  type ManagedCommunity,
} from '@/lib/mock-community-admin';
import {
  managedToSearchable,
  publishCommunityToPublicCatalog,
} from '@/lib/public-communities-store';
import { resolveStrictUserWorkspace } from '@/lib/social/resolve-user-workspace';
import { requireApiSession } from '@/lib/auth/require-api-session';

const CATEGORIES = [
  'Marketing',
  'E-commerce',
  'Coaching',
  'Health & Fitness',
  'Lifestyle',
  'Tech',
  'Other',
] as const;

function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 64) || `community-${Date.now().toString(36)}`
  );
}

function resolveWorkspaceId(
  bodyWorkspaceId: string | null | undefined,
  url: URL,
  jar: Awaited<ReturnType<typeof cookies>>,
  requestHeaders?: Headers
): string | null {
  return (
    bodyWorkspaceId?.trim() ||
    url.searchParams.get('workspaceId')?.trim() ||
    requestHeaders?.get('x-workspace-id')?.trim() ||
    requestHeaders?.get('x-active-workspace-id')?.trim() ||
    jar.get(ACTIVE_WORKSPACE_COOKIE)?.value ||
    jar.get(ACTIVE_WORKSPACE_COOKIE_ALIAS)?.value ||
    null
  );
}

function mapRow(row: Record<string, unknown>): ManagedCommunity & {
  workspace_id: string | null;
  is_free: boolean;
  monthly_price_sek: number;
  cover_url: string | null;
} {
  const id = Number(row.id);
  const name = String(row.name ?? 'Community');
  const slug = String(row.slug ?? `community-${id}`);
  const avatar =
    (row.avatar_url as string | null) ||
    (row.creator_image as string | null) ||
    null;
  const cover =
    (row.cover_url as string | null) ||
    (row.cover_image as string | null) ||
    null;
  const isFree =
    row.is_free === undefined || row.is_free === null
      ? Number(row.monthly_price_sek ?? 0) <= 0
      : Boolean(row.is_free);
  return {
    id,
    name,
    slug,
    description: String(row.description ?? ''),
    category: String(row.category ?? 'Other'),
    cover_color: String(row.cover_color ?? '#2B2568'),
    member_count: Number(row.member_count ?? 1),
    is_published: row.is_published !== false,
    handle: `@${slug.replace(/-/g, '')}`,
    avatar_url: avatar,
    channels: ['instagram', 'tiktok', 'linkedin'],
    workspace_id: (row.workspace_id as string | null) ?? null,
    is_free: isFree,
    monthly_price_sek: Number(row.monthly_price_sek ?? 0),
    cover_url: cover,
  };
}

export async function GET(request: Request) {
  const session = await requireApiSession();
  if (!session.ok) {
    return Response.json(
      { error: 'Unauthorized', communities: [] },
      { status: 401 }
    );
  }

  const userId = session.user.id;
  const url = new URL(request.url);
  const jar = await cookies();
  const preferred = resolveWorkspaceId(null, url, jar, request.headers);

  const access = await resolveStrictUserWorkspace({
    userId,
    preferredWorkspaceId: preferred,
    email: session.user.email,
  });
  if (!access.ok) {
    return Response.json(
      {
        error: access.error,
        communities: [],
        community: null,
        workspace_id: preferred,
      },
      { status: access.status === 400 ? 400 : 403 }
    );
  }
  const workspaceId = access.workspaceId;

  await ensureCommunitiesSchema();

  if (!process.env.DATABASE_URL?.trim()) {
    const all = listManagedCommunities();
    const scoped = all.filter(
      (c) =>
        c.workspace_id === workspaceId ||
        (c as ManagedCommunity & { creator_id?: string }).creator_id === userId
    );
    return Response.json({
      communities: scoped,
      community: scoped[0] ?? null,
      workspace_id: workspaceId,
      demo: true,
    });
  }

  try {
    // Workspace-scoped list: owned workspace, creator/user id, or owner membership.
    const rows = await sql`
      SELECT *
      FROM communities
      WHERE workspace_id = ${workspaceId}
        AND (
          workspace_id IN (
            SELECT id FROM public.workspaces WHERE user_id::text = ${userId}
          )
          OR creator_id::text = ${userId}
          OR user_id::text = ${userId}
          OR EXISTS (
            SELECT 1 FROM community_memberships cm
            WHERE cm.community_id = communities.id
              AND cm.user_id::text = ${userId}
              AND cm.role = 'owner'
          )
        )
      ORDER BY created_at DESC NULLS LAST, name ASC
    `;

    const list = (Array.isArray(rows) ? rows : []).map((r) =>
      mapRow(r as Record<string, unknown>)
    );

    return Response.json({
      communities: list,
      community: list[0] ?? null,
      workspace_id: workspaceId,
      demo: false,
    });
  } catch (error) {
    console.error('[GET /api/admin/communities]', error);
    return Response.json(
      {
        communities: [],
        community: null,
        workspace_id: workspaceId,
        demo: false,
        error: 'list_failed',
        message:
          error instanceof Error ? error.message : 'Failed to load communities',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const session = await requireApiSession();
  if (!session.ok) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;
  const url = new URL(request.url);
  const jar = await cookies();
  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    body = {};
  }

  const preferred = resolveWorkspaceId(
    typeof body.workspaceId === 'string'
      ? body.workspaceId
      : typeof body.workspace_id === 'string'
        ? body.workspace_id
        : typeof body.activeWorkspaceId === 'string'
          ? body.activeWorkspaceId
          : null,
    url,
    jar,
    request.headers
  );

  const access = await resolveStrictUserWorkspace({
    userId,
    preferredWorkspaceId: preferred,
    email: session.user.email,
  });
  if (!access.ok) {
    return Response.json(
      { error: access.error || 'workspace_forbidden' },
      { status: access.status === 400 ? 400 : 403 }
    );
  }
  const workspaceId = access.workspaceId;

  const name = String(body.name ?? '').trim();
  if (!name) {
    return Response.json(
      { error: 'name_required', message: 'Community name is required.' },
      { status: 400 }
    );
  }

  const requestedSlug = String(body.slug ?? '').trim();
  const baseSlug = slugify(requestedSlug || name);
  const description = String(body.description ?? '').trim();
  const categoryRaw = String(body.category ?? 'Other').trim();
  const category = CATEGORIES.includes(categoryRaw as (typeof CATEGORIES)[number])
    ? categoryRaw
    : 'Other';
  const avatarUrl =
    (typeof body.avatar_url === 'string' && body.avatar_url.trim()) ||
    (typeof body.avatarUrl === 'string' && body.avatarUrl.trim()) ||
    null;
  const coverUrl =
    (typeof body.cover_url === 'string' && body.cover_url.trim()) ||
    (typeof body.coverUrl === 'string' && body.coverUrl.trim()) ||
    null;
  // Prefer explicit booleans; otherwise treat price > 0 as paid.
  const monthlyPriceInput = Math.max(
    0,
    Math.round(Number(body.monthly_price_sek ?? body.monthlyPriceSek ?? 0))
  );
  let isFree: boolean;
  if (typeof body.is_free === 'boolean') isFree = body.is_free;
  else if (typeof body.isFree === 'boolean') isFree = body.isFree;
  else isFree = monthlyPriceInput <= 0;
  const monthlyPrice = isFree ? 0 : monthlyPriceInput;

  await ensureCommunitiesSchema();

  // Demo / no DB — still bind to owned workspace + public catalog.
  if (!process.env.DATABASE_URL?.trim()) {
    const community = createManagedCommunity({
      name,
      description,
      cover_color: '#2B2568',
      workspaceId,
      skipWorkspaceProfile: false,
    }) as ManagedCommunity & {
      workspace_id?: string;
      is_free?: boolean;
      monthly_price_sek?: number;
      cover_url?: string | null;
      creator_id?: string;
    };
    community.workspace_id = workspaceId;
    community.creator_id = userId;
    community.is_free = isFree;
    community.monthly_price_sek = monthlyPrice;
    community.avatar_url = avatarUrl || community.avatar_url;
    community.cover_url = coverUrl;
    community.category = category;
    community.slug = baseSlug;
    publishCommunityToPublicCatalog(
      managedToSearchable(community, {
        creatorName: session.user.name,
        creatorImage: session.user.image,
        isJoined: true,
      })
    );
    return Response.json({
      success: true,
      community,
      public_url: `/communities/${community.slug || community.id}`,
      workspace_id: workspaceId,
      demo: true,
    });
  }

  try {
    const slug = `${baseSlug}-${Date.now().toString(36).slice(-4)}`;
    const saved = await persistCommunityToDatabase({
      name,
      slug,
      description: description || 'Your creator community.',
      category,
      coverColor: '#2B2568',
      avatarUrl,
      coverUrl,
      isFree,
      monthlyPriceSek: monthlyPrice,
      isPublished: true,
      userId,
      userName: session.user.name,
      userImage: session.user.image,
      workspaceId,
    });

    if (!saved.ok) {
      return Response.json(
        { error: 'create_failed', message: saved.error },
        { status: saved.status }
      );
    }

    const community = mapRow(saved.community);
    publishCommunityToPublicCatalog(
      managedToSearchable(community, {
        creatorName: session.user.name,
        creatorImage: session.user.image,
        isJoined: true,
      })
    );

    return Response.json({
      success: true,
      community,
      public_url: `/communities/${community.slug || community.id}`,
      workspace_id: workspaceId,
      demo: false,
    });
  } catch (error) {
    console.error('[POST /api/admin/communities]', error);
    return Response.json(
      {
        error: 'create_failed',
        message:
          error instanceof Error ? error.message : 'Failed to create community',
      },
      { status: 500 }
    );
  }
}
