import sql from '@/app/api/utils/sql';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { fireEmailAutomations, persistSubscriber } from '@/lib/email/crm-persist';
import { syncSubscriber } from '@/lib/mock-email-crm';
import { getSiteUrl } from '@/lib/site';

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

    // Auto-sync webinar attendees + fire RSVP automation for the event creator.
    if (process.env.DATABASE_URL?.trim()) {
      try {
        const events = await sql`
          SELECT e.creator_id, e.community_id, e.title, c.name AS community_name
          FROM events e
          LEFT JOIN communities c ON c.id = e.community_id
          WHERE e.id = ${event_id}
          LIMIT 1
        `;
        const creatorId = events?.[0]?.creator_id as string | undefined;
        const communityId =
          events?.[0]?.community_id != null ? Number(events[0].community_id) : null;
        const communityName =
          String(events?.[0]?.community_name ?? '').trim() ||
          String(events?.[0]?.title ?? 'Event');
        if (creatorId && session.user.email && communityId) {
          await persistSubscriber({
            creatorId,
            email: session.user.email,
            name: session.user.name || 'Medlem',
            userId: session.user.id,
            image: session.user.image ?? null,
            source: 'webinar_attendee',
            communityId,
            tags: ['Webinar Attendee'],
          });
          void fireEmailAutomations({
            creatorId,
            communityId,
            communityName,
            communityUrl: `${getSiteUrl()}/community/${communityId}`,
            trigger: 'webinar_rsvp',
            recipientEmail: session.user.email,
            recipientName: session.user.name || 'Medlem',
          }).catch((err) => console.warn('[rsvp] automation failed', err));
        } else {
          syncSubscriber({
            email: session.user.email,
            name: session.user.name || 'Medlem',
            user_id: session.user.id,
            image: session.user.image ?? null,
            source: 'webinar_attendee',
            extra_tags: ['Webinar Attendee'],
          });
        }
      } catch (e) {
        console.error('[rsvp] email CRM sync failed', e);
      }
    } else {
      syncSubscriber({
        email: session.user.email,
        name: session.user.name || 'Medlem',
        user_id: session.user.id,
        image: session.user.image ?? null,
        source: 'webinar_attendee',
        extra_tags: ['Webinar Attendee'],
      });
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
