/**
 * GET  /api/admin/communities?workspaceId=…
 * POST /api/admin/communities — create community bound to active workspace.
 */

import { cookies, headers } from 'next/headers';
import { auth } from '@/lib/auth';
import sql from '@/app/api/utils/sql';
import { ensureCommunitiesSchema } from '@/lib/communities/schema';
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
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized', communities: [] }, { status: 401 });
  }

  const url = new URL(request.url);
  const jar = await cookies();
  const workspaceId = resolveWorkspaceId(null, url, jar, request.headers);

  await ensureCommunitiesSchema();

  if (!process.env.DATABASE_URL?.trim()) {
    const all = listManagedCommunities();
    const scoped = workspaceId
      ? all.filter((c) => c.workspace_id === workspaceId)
      : all;
    return Response.json({
      communities: scoped,
      community: scoped[0] ?? null,
      workspace_id: workspaceId,
      demo: true,
    });
  }

  try {
    // Strict workspace binding: only communities for the active workspace.
    const rows = workspaceId
      ? await sql`
          SELECT *
          FROM communities
          WHERE workspace_id = ${workspaceId}
          ORDER BY created_at DESC NULLS LAST, name ASC
        `
      : await sql`
          SELECT *
          FROM communities
          WHERE creator_id = ${session.user.id}
             OR id IN (
               SELECT community_id FROM community_memberships
               WHERE user_id = ${session.user.id} AND role IN ('owner', 'moderator')
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
    return Response.json({
      communities: [],
      community: null,
      workspace_id: workspaceId,
      demo: true,
      error: 'list_failed',
    });
  }
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const jar = await cookies();
  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    body = {};
  }

  const workspaceId = resolveWorkspaceId(
    typeof body.workspaceId === 'string'
      ? body.workspaceId
      : typeof body.workspace_id === 'string'
        ? body.workspace_id
        : null,
    url,
    jar,
    request.headers
  );

  if (!workspaceId) {
    return Response.json(
      { error: 'missing_workspace_id', message: 'Active workspace is required.' },
      { status: 400 }
    );
  }

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
  const isFree = body.is_free !== false && body.isFree !== false;
  const monthlyPrice = isFree
    ? 0
    : Math.max(0, Math.round(Number(body.monthly_price_sek ?? body.monthlyPriceSek ?? 0)));

  await ensureCommunitiesSchema();

  // Demo / no DB — still bind to workspace + public catalog.
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
    };
    community.workspace_id = workspaceId;
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

    let rows: Record<string, unknown>[] = [];
    try {
      rows = (await sql`
        INSERT INTO communities (
          name, slug, description, category,
          creator_id, creator_name, creator_image,
          avatar_url, cover_url, cover_image, cover_color,
          member_count, is_featured, is_published,
          workspace_id, is_free, monthly_price_sek
        ) VALUES (
          ${name},
          ${slug},
          ${description || 'Your creator community.'},
          ${category},
          ${session.user.id},
          ${session.user.name || 'Creator'},
          ${session.user.image ?? null},
          ${avatarUrl},
          ${coverUrl},
          ${coverUrl},
          ${'#2B2568'},
          ${1},
          ${false},
          ${true},
          ${workspaceId},
          ${isFree},
          ${monthlyPrice}
        )
        RETURNING *
      `) as Record<string, unknown>[];
    } catch (fkError) {
      console.warn('[POST /api/admin/communities] retry without creator_id', fkError);
      rows = (await sql`
        INSERT INTO communities (
          name, slug, description, category,
          creator_name, creator_image,
          avatar_url, cover_url, cover_image, cover_color,
          member_count, is_featured, is_published,
          workspace_id, is_free, monthly_price_sek
        ) VALUES (
          ${name},
          ${slug},
          ${description || 'Your creator community.'},
          ${category},
          ${session.user.name || 'Creator'},
          ${session.user.image ?? null},
          ${avatarUrl},
          ${coverUrl},
          ${coverUrl},
          ${'#2B2568'},
          ${1},
          ${false},
          ${true},
          ${workspaceId},
          ${isFree},
          ${monthlyPrice}
        )
        RETURNING *
      `) as Record<string, unknown>[];
    }

    const row = rows?.[0];
    if (!row?.id) {
      return Response.json(
        { error: 'create_failed', message: 'Insert returned no row.' },
        { status: 500 }
      );
    }

    try {
      await sql`
        INSERT INTO community_memberships (user_id, community_id, role)
        VALUES (${session.user.id}, ${Number(row.id)}, 'owner')
        ON CONFLICT (user_id, community_id) DO UPDATE SET role = 'owner'
      `;
    } catch (membershipError) {
      console.warn('[POST /api/admin/communities] owner membership', membershipError);
    }

    const community = mapRow(row);
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
