import sql from '@/app/api/utils/sql';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import {
  demoCreateStoreProduct,
  demoDeleteStoreProduct,
  demoUpdateStoreProduct,
  getMockStoreAdmin,
  kindForType,
  listDemoStoreProducts,
  type StoreKind,
  type StoreProductType,
} from '@/lib/mock-store';
import {
  normalizeBillingInterval,
  normalizeCollectFields,
  normalizeFulfillment,
  normalizeOrderBump,
} from '@/lib/store-collect-fields';

async function requireSession() {
  return auth.api.getSession({ headers: await headers() });
}

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
    is_published: row.is_published !== false,
    created_at: String(row.created_at ?? new Date().toISOString()),
    collect_fields: normalizeCollectFields(row.collect_fields),
    order_bump: normalizeOrderBump(row.order_bump),
    billing_interval: normalizeBillingInterval(row.billing_interval),
    fulfillment: normalizeFulfillment(row.fulfillment),
    require_custom_fields: Boolean(row.require_custom_fields),
  };
}

export async function GET(request: Request) {
  const session = await requireSession();
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const communityId = searchParams.get('community_id');
  const cid = communityId ? Number(communityId) : undefined;

  if (!process.env.DATABASE_URL?.trim()) {
    return Response.json(getMockStoreAdmin(cid));
  }

  try {
    const rows = cid
      ? await sql`
          SELECT * FROM products
          WHERE community_id = ${cid}
             OR creator_id = ${session.user.id}
          ORDER BY price ASC, id DESC
        `
      : await sql`
          SELECT * FROM products
          WHERE creator_id = ${session.user.id}
             OR community_id IN (
               SELECT id FROM communities WHERE creator_id = ${session.user.id}
             )
          ORDER BY price ASC, id DESC
        `;

    if (!Array.isArray(rows) || rows.length === 0) {
      return Response.json({ products: [], demo: false });
    }

    return Response.json({
      products: (rows as Array<Record<string, unknown>>).map(normalizeProduct),
      demo: false,
    });
  } catch (error) {
    console.error(error);
    return Response.json(
      { products: [], demo: false, error: 'list_failed' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const session = await requireSession();
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const action = String(body.action ?? 'create');

    if (action === 'create') {
      const name = String(body.name ?? '').trim();
      const price = Number(body.price);
      if (!name || Number.isNaN(price)) {
        return Response.json({ error: 'name and price required' }, { status: 400 });
      }
      const type = (body.type as StoreProductType) || 'ebook';
      const kind = (body.kind as StoreKind) || kindForType(type);
      const community_id =
        body.community_id != null ? Number(body.community_id) : null;
      const description = (body.description as string) || null;
      const image_url = (body.image_url as string) || null;
      const is_published = body.is_published !== false;
      const collect_fields = normalizeCollectFields(body.collect_fields);
      const order_bump = normalizeOrderBump(body.order_bump);

      if (!process.env.DATABASE_URL?.trim()) {
        const product = demoCreateStoreProduct({
          name,
          description,
          price,
          type,
          kind,
          image_url,
          community_id,
          is_published,
          collect_fields,
          order_bump,
        });
        return Response.json({ product, demo: true });
      }

      const rows = await sql`
        INSERT INTO products (
          creator_id, community_id, name, description, price, currency,
          type, kind, image_url, is_published, collect_fields, order_bump
        )
        VALUES (
          ${session.user.id},
          ${community_id},
          ${name},
          ${description},
          ${price},
          'SEK',
          ${type},
          ${kind},
          ${image_url},
          ${is_published},
          ${JSON.stringify(collect_fields)},
          ${JSON.stringify(order_bump)}
        )
        RETURNING *
      `;
      return Response.json({ product: normalizeProduct(rows[0] as Record<string, unknown>) });
    }

    if (action === 'update') {
      const id = Number(body.id);
      if (!id) return Response.json({ error: 'id required' }, { status: 400 });

      const collect_fields =
        body.collect_fields !== undefined
          ? normalizeCollectFields(body.collect_fields)
          : undefined;
      const order_bump =
        body.order_bump !== undefined
          ? normalizeOrderBump(body.order_bump)
          : undefined;

      if (!process.env.DATABASE_URL?.trim()) {
        const product = demoUpdateStoreProduct(id, {
          name: body.name != null ? String(body.name) : undefined,
          description:
            body.description !== undefined
              ? (body.description as string | null)
              : undefined,
          price: body.price != null ? Number(body.price) : undefined,
          type: body.type as StoreProductType | undefined,
          kind: body.kind as StoreKind | undefined,
          image_url:
            body.image_url !== undefined
              ? (body.image_url as string | null)
              : undefined,
          is_published:
            body.is_published !== undefined
              ? Boolean(body.is_published)
              : undefined,
          collect_fields,
          order_bump,
        });
        if (!product) return Response.json({ error: 'Not found' }, { status: 404 });
        return Response.json({ product, demo: true });
      }

      const rows = await sql`
        UPDATE products SET
          name = COALESCE(${body.name ?? null}, name),
          description = COALESCE(${body.description ?? null}, description),
          price = COALESCE(${body.price != null ? Number(body.price) : null}, price),
          type = COALESCE(${body.type ?? null}, type),
          kind = COALESCE(${body.kind ?? null}, kind),
          image_url = COALESCE(${body.image_url ?? null}, image_url),
          is_published = COALESCE(${body.is_published ?? null}, is_published),
          collect_fields = COALESCE(${
            collect_fields ? JSON.stringify(collect_fields) : null
          }, collect_fields),
          order_bump = COALESCE(${
            order_bump ? JSON.stringify(order_bump) : null
          }, order_bump),
          updated_at = now()
        WHERE id = ${id}
        RETURNING *
      `;
      if (!rows[0]) return Response.json({ error: 'Not found' }, { status: 404 });
      return Response.json({
        product: normalizeProduct(rows[0] as Record<string, unknown>),
      });
    }

    if (action === 'toggle_publish') {
      const id = Number(body.id);
      if (!id) return Response.json({ error: 'id required' }, { status: 400 });

      if (!process.env.DATABASE_URL?.trim()) {
        const current = listDemoStoreProducts(undefined, { includeDrafts: true }).find(
          (p) => p.id === id
        );
        if (!current) return Response.json({ error: 'Not found' }, { status: 404 });
        const product = demoUpdateStoreProduct(id, {
          is_published: !current.is_published,
        });
        return Response.json({ product, demo: true });
      }

      const rows = await sql`
        UPDATE products
        SET is_published = NOT is_published, updated_at = now()
        WHERE id = ${id}
        RETURNING *
      `;
      if (!rows[0]) return Response.json({ error: 'Not found' }, { status: 404 });
      return Response.json({
        product: normalizeProduct(rows[0] as Record<string, unknown>),
      });
    }

    if (action === 'delete') {
      const id = Number(body.id);
      if (!id) return Response.json({ error: 'id required' }, { status: 400 });

      if (!process.env.DATABASE_URL?.trim()) {
        demoDeleteStoreProduct(id);
        return Response.json({ success: true, demo: true });
      }

      await sql`DELETE FROM products WHERE id = ${id}`;
      return Response.json({ success: true });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error(error);
    if (!process.env.DATABASE_URL?.trim()) {
      return Response.json({ success: true, demo: true });
    }
    return Response.json({ error: 'Failed to update store' }, { status: 500 });
  }
}
