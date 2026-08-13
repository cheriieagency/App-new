import sql from '@/app/api/utils/sql';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
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
    is_published: row.is_published !== false,
    created_at: String(row.created_at ?? new Date().toISOString()),
    collect_fields: normalizeCollectFields(row.collect_fields),
    order_bump: normalizeOrderBump(row.order_bump),
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const communityId = searchParams.get('community_id');
  const cid = communityId ? Number(communityId) : undefined;

  try {
    if (!process.env.DATABASE_URL?.trim()) {
      // In-memory products created in this session only (no seeded catalog).
      return Response.json(listDemoStoreProducts(cid));
    }

    const products = cid
      ? await sql`
          SELECT * FROM products
          WHERE is_published = true
            AND (community_id = ${cid} OR community_id IS NULL)
          ORDER BY price ASC
        `
      : await sql`
          SELECT * FROM products
          WHERE is_published = true
          ORDER BY price ASC
        `;

    if (!Array.isArray(products) || products.length === 0) {
      return Response.json([]);
    }
    return Response.json(
      (products as Array<Record<string, unknown>>).map(normalizeProduct)
    );
  } catch (error) {
    console.error(error);
    return Response.json([]);
  }
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

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
      };

    if (!name || price === undefined) {
      return Response.json({ error: 'Missing fields' }, { status: 400 });
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
        is_published: true,
        collect_fields,
        order_bump,
      });
      return Response.json(product);
    }

    const result = await sql`
      INSERT INTO products (
        creator_id, community_id, name, description, price, currency,
        type, kind, image_url, collect_fields, order_bump
      )
      VALUES (
        ${session.user.id},
        ${community_id ?? null},
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
    return Response.json(normalizeProduct(result[0] as Record<string, unknown>));
  } catch (error) {
    console.error(error);
    if (!process.env.DATABASE_URL?.trim()) {
      return Response.json({ error: 'Failed to create product' }, { status: 500 });
    }
    return Response.json({ error: 'Failed to create product' }, { status: 500 });
  }
}
