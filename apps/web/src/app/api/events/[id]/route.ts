import sql from '@/app/api/utils/sql';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const [event] = await sql`
      SELECT
        e.*,
        COUNT(r.user_id)::int AS attendee_count,
        COALESCE(
          json_agg(
            json_build_object('id', u.id, 'name', u.name, 'image', u.image)
            ORDER BY r.event_id
          ) FILTER (WHERE u.id IS NOT NULL),
          '[]'
        ) AS attendees
      FROM events e
      LEFT JOIN rsvps r  ON r.event_id = e.id
      LEFT JOIN "user" u ON u.id = r.user_id
      WHERE e.id = ${Number(id)}
      GROUP BY e.id
    `;
    if (!event) return Response.json({ error: 'Not found' }, { status: 404 });
    return Response.json(event);
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Failed to fetch event' }, { status: 500 });
  }
}
