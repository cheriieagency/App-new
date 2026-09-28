/**
 * GET  /api/notifications — list in-app bell notifications for the signed-in user
 * PATCH /api/notifications — mark one or all as read
 */

import { requireApiSession } from '@/lib/auth/require-api-session';
import {
  countUnreadNotifications,
  listUserNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/lib/notifications/persist';

export async function GET(request: Request) {
  const session = await requireApiSession();
  if (!session.ok) return session.response;

  if (!process.env.DATABASE_URL?.trim()) {
    return Response.json({
      demo: true,
      items: [],
      unread: 0,
    });
  }

  try {
    const url = new URL(request.url);
    const unreadOnly = url.searchParams.get('unread') === '1';
    const limit = Number(url.searchParams.get('limit') || 30);
    const [items, unread] = await Promise.all([
      listUserNotifications({
        userId: session.user.id,
        limit: Number.isFinite(limit) ? limit : 30,
        unreadOnly,
      }),
      countUnreadNotifications(session.user.id),
    ]);
    return Response.json({ demo: false, items, unread });
  } catch (error) {
    console.error('[GET /api/notifications]', error);
    return Response.json({ error: 'Failed to load notifications' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const session = await requireApiSession();
  if (!session.ok) return session.response;

  if (!process.env.DATABASE_URL?.trim()) {
    return Response.json({ demo: true, ok: true });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as {
      id?: string;
      all?: boolean;
    };

    if (body.all) {
      const n = await markAllNotificationsRead(session.user.id);
      return Response.json({ ok: true, marked: n });
    }

    const id = typeof body.id === 'string' ? body.id.trim() : '';
    if (!id) {
      return Response.json({ error: 'id or all required' }, { status: 400 });
    }

    const ok = await markNotificationRead({
      userId: session.user.id,
      notificationId: id,
    });
    if (!ok) {
      return Response.json({ error: 'not_found' }, { status: 404 });
    }
    return Response.json({ ok: true, marked: 1 });
  } catch (error) {
    console.error('[PATCH /api/notifications]', error);
    return Response.json({ error: 'Failed to update notification' }, { status: 500 });
  }
}
