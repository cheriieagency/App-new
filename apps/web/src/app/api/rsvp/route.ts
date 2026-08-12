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
    }

    await sql`INSERT INTO rsvps (event_id, user_id) VALUES (${event_id}, ${session.user.id})`;

    // Auto-sync webinar attendees into the event creator's Email CRM (DB + memory).
    syncSubscriber({
      email: session.user.email,
      name: session.user.name || 'Medlem',
      user_id: session.user.id,
      image: session.user.image ?? null,
      source: 'webinar_attendee',
      extra_tags: ['Webinar Attendee'],
    });

    if (process.env.DATABASE_URL?.trim()) {
      try {
        const events = await sql`
          SELECT creator_id, community_id FROM events WHERE id = ${event_id} LIMIT 1
        `;
        const creatorId = events?.[0]?.creator_id as string | undefined;
        const communityId =
          events?.[0]?.community_id != null ? Number(events[0].community_id) : null;
        if (creatorId && session.user.email) {
          await sql`
            INSERT INTO email_subscribers (
              creator_id, user_id, name, email, image, source, tags, community_id
            )
            VALUES (
              ${creatorId},
              ${session.user.id},
              ${session.user.name || 'Medlem'},
              ${session.user.email},
              ${session.user.image ?? null},
              'webinar_attendee',
              ${['Webinar Attendee']},
              ${communityId}
            )
            ON CONFLICT (creator_id, email) DO UPDATE SET
              tags = (
                SELECT ARRAY(SELECT DISTINCT unnest(email_subscribers.tags || EXCLUDED.tags))
              ),
              community_id = COALESCE(EXCLUDED.community_id, email_subscribers.community_id),
              updated_at = now()
          `;
        }
      } catch (e) {
        console.error('[rsvp] email CRM sync failed', e);
      }
    }

    return Response.json({ rsvpd: true });
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
