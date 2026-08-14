/**
 * GET/POST /api/admin/products
 * Admin product catalog — strictly scoped to session user (creator_id).
 */

import { cookies } from 'next/headers';
import sql from '@/app/api/utils/sql';
import { requireApiSession } from '@/lib/auth/require-api-session';
import {
  ACTIVE_WORKSPACE_COOKIE,
  ACTIVE_WORKSPACE_COOKIE_ALIAS,
} from '@/lib/social/oauth-workspace';
import { resolveStrictUserWorkspace } from '@/lib/social/resolve-user-workspace';
import {
  demoCreateStoreProduct,
  kindForType,
  listDemoStoreProducts,
  type StoreKind,
  type StoreProductType,
} from '@/lib/mock-store';
import {
  normalizeCollectFields,
  normalizeOrderBump,
} from '@/lib/store-collect-fields';

function normalizeProduct(row: Record<string, unknown>) {
  const type = String(row.type ?? 'other') as StoreProductType;
  return {
    id: Number(row.id),
    name: String(row.name ?? ''),
    description: (row.description as string | null) ?? null,
    price: Number(row.price ?? 0),
    currency: String(row.currency ?? 'SEK'),
    type,
    kind: (row.kind as StoreKind) || kindForType(type),
    image_url: (row.image_url as string | null) ?? null,
    community_id:
      row.community_id != null ? Number(row.community_id) : null,
    workspace_id: (row.workspace_id as string | null) ?? null,
    creator_id: (row.creator_id as string | null) ?? null,
    is_published: row.is_published !== false,
    created_at: String(row.created_at ?? new Date().toISOString()),
    collect_fields: normalizeCollectFields(row.collect_fields),
    order_bump: normalizeOrderBump(row.order_bump),
  };
}

async function assertCommunityOwnedByUser(
  userId: string,
  communityId: number
): Promise<boolean> {
  try {
    const rows = await sql`
      SELECT id
      FROM communities
      WHERE id = ${communityId}
        AND (
          creator_id::text = ${userId}
          OR workspace_id IN (
            SELECT id FROM public.workspaces WHERE user_id::text = ${userId}
          )
        )
      LIMIT 1
    `;
    return Array.isArray(rows) && Boolean(rows[0]?.id);
  } catch {
    return false;
  }
}

export async function GET(request: Request) {
  const session = await requireApiSession();
  if (!session.ok) return session.response;

  const userId = session.user.id;
  const url = new URL(request.url);
  const jar = await cookies();
  const preferred =
    url.searchParams.get('workspaceId')?.trim() ||
    request.headers.get('x-workspace-id')?.trim() ||
    jar.get(ACTIVE_WORKSPACE_COOKIE)?.value ||
    jar.get(ACTIVE_WORKSPACE_COOKIE_ALIAS)?.value ||
    null;

  const access = await resolveStrictUserWorkspace({
    userId,
    preferredWorkspaceId: preferred,
    email: session.user.email,
  });
  if (!access.ok) {
    return Response.json(
      { error: access.error, products: [] },
      { status: access.status === 400 ? 400 : 403 }
    );
  }

  try {
    if (!process.env.DATABASE_URL?.trim()) {
      return Response.json({
        products: listDemoStoreProducts(undefined, {
          includeDrafts: true,
          creatorId: userId,
        }),
        workspace_id: access.workspaceId,
        demo: true,
      });
    }

    const rows = await sql`
      SELECT *
      FROM products
      WHERE creator_id::text = ${userId}
         OR workspace_id = ${access.workspaceId}
      ORDER BY created_at DESC NULLS LAST, id DESC
    `;

    return Response.json({
      products: (Array.isArray(rows) ? rows : []).map((r) =>
        normalizeProduct(r as Record<string, unknown>)
      ),
      workspace_id: access.workspaceId,
      demo: false,
    });
  } catch (error) {
    console.error('[GET /api/admin/products]', error);
    return Response.json({ products: [], error: 'list_failed' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await requireApiSession();
  if (!session.ok) return session.response;

  const userId = session.user.id;
  const jar = await cookies();

  try {
    const body = await request.json();
    const { name, description, price, type, kind, community_id, image_url } =
      body as {
        name?: string;
        description?: string;
        price?: number;
        type?: string;
        kind?: string;
        community_id?: number;
        image_url?: string;
        workspaceId?: string;
        workspace_id?: string;
      };

    if (!name || price === undefined) {
      return Response.json({ error: 'Missing fields' }, { status: 400 });
    }

    const preferred =
      (typeof body.workspaceId === 'string' && body.workspaceId.trim()) ||
      (typeof body.workspace_id === 'string' && body.workspace_id.trim()) ||
      jar.get(ACTIVE_WORKSPACE_COOKIE)?.value ||
      jar.get(ACTIVE_WORKSPACE_COOKIE_ALIAS)?.value ||
      null;

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

    if (community_id != null && process.env.DATABASE_URL?.trim()) {
      const owned = await assertCommunityOwnedByUser(userId, Number(community_id));
      if (!owned) {
        return Response.json(
          { error: 'community_forbidden' },
          { status: 403 }
        );
      }
    }

    const productType = (type as StoreProductType) ?? 'ebook';
    const productKind = (kind as StoreKind) || kindForType(productType);
    const collect_fields = normalizeCollectFields(body.collect_fields);
    const order_bump = normalizeOrderBump(body.order_bump);

    if (!process.env.DATABASE_URL?.trim()) {
      const product = demoCreateStoreProduct({
        name,
        description: description ?? null,
        price: Number(price),
        type: productType,
        kind: productKind,
        image_url: image_url ?? null,
        community_id: community_id ?? null,
        workspace_id: access.workspaceId,
        creator_id: userId,
        is_published: true,
        collect_fields,
        order_bump,
      });
      return Response.json({ product, workspace_id: access.workspaceId });
    }

    const result = await sql`
      INSERT INTO products (
        creator_id, community_id, workspace_id, name, description, price, currency,
        type, kind, image_url, collect_fields, order_bump
      )
      VALUES (
        ${userId},
        ${community_id ?? null},
        ${access.workspaceId},
        ${name},
        ${description ?? null},
        ${Number(price)},
        'SEK',
        ${productType},
        ${productKind},
        ${image_url ?? null},
        ${JSON.stringify(collect_fields)},
        ${JSON.stringify(order_bump)}
      )
      RETURNING *
    `;
    return Response.json({
      product: normalizeProduct(result[0] as Record<string, unknown>),
      workspace_id: access.workspaceId,
    });
  } catch (error) {
    console.error('[POST /api/admin/products]', error);
    return Response.json({ error: 'Failed to create product' }, { status: 500 });
  }
}
