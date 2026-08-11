import { verifyUnsubscribeToken } from '@/lib/email/unsubscribe';
import sql from '@/app/api/utils/sql';

/**
 * POST /api/unsubscribe — GDPR one-click / confirm unsubscribe.
 * Body: { token }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const token = String(body.token ?? '').trim();
    const email = verifyUnsubscribeToken(token);
    if (!email) {
      return Response.json({ error: 'Invalid or expired unsubscribe token' }, { status: 400 });
    }

    if (process.env.DATABASE_URL?.trim()) {
      try {
        // Soft-remove from CRM lists (all creators that have this address).
        await sql`
          DELETE FROM email_subscribers
          WHERE lower(email) = ${email}
        `;
      } catch (err) {
        console.error('[unsubscribe] db error', err);
      }
    }

    return Response.json({ success: true, email });
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Unsubscribe failed' }, { status: 500 });
  }
}
