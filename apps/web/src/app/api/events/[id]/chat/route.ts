import sql from '@/app/api/utils/sql';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const messages = await sql`
      SELECT * FROM event_chat
      WHERE event_id = ${Number(id)}
      ORDER BY created_at ASC
      LIMIT 100
    `;
    return Response.json(messages);
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Failed to fetch chat' }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await params;
    const { message } = await request.json();
    if (!message?.trim()) return Response.json({ error: 'Empty message' }, { status: 400 });

    const [row] = await sql`
      INSERT INTO event_chat (event_id, user_id, user_name, user_image, message)
      VALUES (${Number(id)}, ${session.user.id}, ${session.user.name}, ${session.user.image ?? null}, ${message.trim()})
      RETURNING *
    `;
    return Response.json(row);
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Failed to send message' }, { status: 500 });
  }
}
