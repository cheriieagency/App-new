import sql from '@/app/api/utils/sql';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

export async function GET() {
  try {
    const products = await sql`SELECT * FROM products ORDER BY price ASC`;
    return Response.json(products);
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { name, description, price, type } = await request.json();
    if (!name || price === undefined)
      return Response.json({ error: 'Missing fields' }, { status: 400 });
    const result = await sql`
      INSERT INTO products (name, description, price, currency, type)
      VALUES (${name}, ${description ?? null}, ${Number(price)}, 'SEK', ${type ?? 'ebook'})
      RETURNING *
    `;
    return Response.json(result[0]);
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Failed to create product' }, { status: 500 });
  }
}
