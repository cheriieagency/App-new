import sql from '@/app/api/utils/sql';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { syncSubscriber } from '@/lib/mock-email-crm';

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { event_id } = await request.json();
    if (!event_id) return Response.json({ error: 'Missing event_id' }, { status: 400 });

    const existing = await sql`
      SELECT 1 FROM rsvps WHERE event_id = ${event_id} AND user_id = ${session.user.id}
    `;

    if (existing.length > 0) {
      await sql`DELETE FROM rsvps WHERE event_id = ${event_id} AND user_id = ${session.user.id}`;
      return Response.json({ rsvpd: false });
    } else {
      await sql`INSERT INTO rsvps (event_id, user_id) VALUES (${event_id}, ${session.user.id})`;
      // Auto-sync webinar attendees into Email CRM.
      syncSubscriber({
        email: session.user.email,
        name: session.user.name || 'Medlem',
        user_id: session.user.id,
        image: session.user.image ?? null,
        source: 'webinar_attendee',
        extra_tags: ['Webinar Attendee'],
      });
      return Response.json({ rsvpd: true });
    }
  } catch (error) {
    console.error(error);
    if (!process.env.DATABASE_URL?.trim()) {
      syncSubscriber({
        email: session.user.email,
        name: session.user.name || 'Medlem',
        user_id: session.user.id,
        image: session.user.image ?? null,
        source: 'webinar_attendee',
        extra_tags: ['Webinar Attendee'],
      });
      return Response.json({ rsvpd: true, demo: true });
    }
    return Response.json({ error: 'Failed to toggle RSVP' }, { status: 500 });
  }
}
