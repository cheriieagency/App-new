import sql from '@/app/api/utils/sql';

function normalizeEmail(raw: string) {
  return raw.trim().toLowerCase();
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * POST /api/waitlist
 *
 * Body: { email: string }
 * Returns: { ok: true, queueNumber: number }
 */
export async function POST(request: Request) {
  if (!process.env.DATABASE_URL?.trim()) {
    // Offline/dev-only gate: avoid returning demo success when DB is configured.
    return Response.json(
      { error: 'database_offline' },
      { status: 503 }
    );
  }

  try {
    const body: unknown = await request.json().catch(() => null);
    const emailRaw =
      typeof body === 'object' && body != null ? (body as any).email : undefined;
    const email = typeof emailRaw === 'string' ? normalizeEmail(emailRaw) : '';

    if (!email) {
      return Response.json({ error: 'email_required' }, { status: 400 });
    }
    if (!isValidEmail(email)) {
      return Response.json({ error: 'invalid_email' }, { status: 400 });
    }

    // Insert + return queue number. Queue number = identity id in insertion order.
    // ON CONFLICT keeps queue stable for repeat submissions.
    const rows = await sql`
      INSERT INTO public.waitlist (email)
      VALUES (${email})
      ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
      RETURNING id
    `;

    const queueNumber = Number(rows?.[0]?.id);
    if (!Number.isFinite(queueNumber) || queueNumber <= 0) {
      return Response.json(
        { error: 'queue_number_failed' },
        { status: 500 }
      );
    }

    return Response.json({ ok: true, queueNumber });
  } catch (err) {
    console.error('[waitlist] POST failed', err);
    return Response.json({ error: 'waitlist_failed' }, { status: 500 });
  }
}

