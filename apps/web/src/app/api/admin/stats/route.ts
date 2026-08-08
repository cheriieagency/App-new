import sql from '@/app/api/utils/sql';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const [membersResult, rsvpResult, productResult, emailList] = await sql.transaction([
      sql`SELECT COUNT(*)::int AS count FROM "user"`,
      sql`SELECT COUNT(*)::int AS count FROM rsvps`,
      sql`SELECT COUNT(*)::int AS count FROM products`,
      sql`SELECT email, name, "createdAt" AS created_at FROM "user" ORDER BY "createdAt" DESC LIMIT 100`,
    ]);

    const members = membersResult[0]?.count ?? 0;
    const rsvps = rsvpResult[0]?.count ?? 0;
    const products = productResult[0]?.count ?? 0;

    // Simulated revenue: 199 SEK × members + one-time purchases estimate
    const revenue = members * 199 + 4760;

    return Response.json({
      members,
      rsvps,
      products,
      revenue,
      emails: emailList,
    });
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
