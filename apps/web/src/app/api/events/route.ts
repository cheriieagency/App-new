import sql from '@/app/api/utils/sql';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { createMockEvent, getMockEvents } from '@/lib/mock-events';

function normalizeLocationType(v: unknown): 'online' | 'in_person' {
  return v === 'in_person' ? 'in_person' : 'online';
}

function normalizeAudience(v: unknown): 'invite_only' | 'selected' | 'community' {
  if (v === 'invite_only' || v === 'selected') return v;
  return 'community';
}

function normalizeInvites(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((id): id is string => typeof id === 'string' && id.trim().length > 0);
}

export async function GET() {
  try {
    if (!process.env.DATABASE_URL?.trim()) {
      return Response.json(getMockEvents());
    }

    const events = await sql`
      SELECT
        e.*,
        COUNT(r.user_id)::int AS attendee_count,
        COALESCE(
          json_agg(
            json_build_object('name', u.name, 'image', u.image)
            ORDER BY r.event_id
          ) FILTER (WHERE u.id IS NOT NULL),
          '[]'
        ) AS top_attendees
      FROM events e
      LEFT JOIN rsvps r      ON r.event_id = e.id
      LEFT JOIN "user" u     ON u.id = r.user_id
      GROUP BY e.id
      ORDER BY e.start_time ASC
    `;
    return Response.json(Array.isArray(events) ? events : []);
  } catch (error) {
    console.error(error);
    if (!process.env.DATABASE_URL?.trim()) {
      return Response.json(getMockEvents());
    }
    return Response.json({ error: 'Failed to load events' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await request.json();
    const {
      title,
      description,
      start_time,
      stream_url,
      image_url,
      speaker_name,
      speaker_bio,
      category,
    } = body;
    if (!title || !start_time) return Response.json({ error: 'Missing fields' }, { status: 400 });

    const location_type = normalizeLocationType(body.location_type);
    const location_address =
      typeof body.location_address === 'string' && body.location_address.trim()
        ? body.location_address.trim()
        : null;
    const audience = normalizeAudience(body.audience);
    const invited_member_ids = normalizeInvites(body.invited_member_ids);

    try {
      const result = await sql`
        INSERT INTO events (
          title, description, start_time, stream_url, image_url,
          speaker_name, speaker_bio, category,
          location_type, location_address, audience, invited_member_ids
        )
        VALUES (
          ${title}, ${description ?? null}, ${start_time},
          ${location_type === 'online' ? (stream_url ?? null) : null},
          ${image_url ?? null},
          ${speaker_name ?? 'Sofia Bergström'}, ${speaker_bio ?? null}, ${category ?? 'Webinar'},
          ${location_type}, ${location_type === 'in_person' ? location_address : null},
          ${audience}, ${invited_member_ids}
        )
        RETURNING *
      `;
      return Response.json(result[0]);
    } catch (dbError) {
      console.error(dbError);
      if (!process.env.DATABASE_URL?.trim()) {
        const mock = createMockEvent({
          title,
          description,
          start_time,
          stream_url: location_type === 'online' ? stream_url : null,
          image_url,
          speaker_name,
          speaker_bio,
          category,
          location_type,
          location_address: location_type === 'in_person' ? location_address : null,
          audience,
          invited_member_ids,
        });
        return Response.json(mock);
      }
      return Response.json(
        {
          error: 'create_failed',
          message:
            dbError instanceof Error ? dbError.message : 'Failed to create event',
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Failed to create event' }, { status: 500 });
  }
}
