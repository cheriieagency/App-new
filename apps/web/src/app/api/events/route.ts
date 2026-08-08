import sql from '@/app/api/utils/sql';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { MOCK_EVENTS } from '@/lib/mock-demo-content';

export async function GET() {
  try {
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
    if (!Array.isArray(events) || events.length === 0) {
      return Response.json(MOCK_EVENTS);
    }
    return Response.json(events);
  } catch (error) {
    console.error(error);
    return Response.json(MOCK_EVENTS);
  }
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const {
      title,
      description,
      start_time,
      stream_url,
      image_url,
      speaker_name,
      speaker_bio,
      category,
    } = await request.json();
    if (!title || !start_time) return Response.json({ error: 'Missing fields' }, { status: 400 });
    const result = await sql`
      INSERT INTO events (title, description, start_time, stream_url, image_url, speaker_name, speaker_bio, category)
      VALUES (${title}, ${description ?? null}, ${start_time}, ${stream_url ?? null}, ${image_url ?? null},
              ${speaker_name ?? 'Sofia Bergström'}, ${speaker_bio ?? null}, ${category ?? 'Webinar'})
      RETURNING *
    `;
    return Response.json(result[0]);
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Failed to create event' }, { status: 500 });
  }
}
