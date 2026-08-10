import sql from '@/app/api/utils/sql';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import {
  applyMergeTags,
  createBroadcast,
  getMockEmailCrmPayload,
  listCommunityAutomationEmails,
  listEmailAutomations,
  listEmailSubscribers,
  setEmailAutomationStatus,
  syncSubscriber,
  upsertEmailAutomation,
  type EmailAutomationTrigger,
  type SubscriberSource,
} from '@/lib/mock-email-crm';

async function requireSession() {
  return auth.api.getSession({ headers: await headers() });
}

export async function GET(request: Request) {
  const session = await requireSession();
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const tag = searchParams.get('tag') ?? undefined;
  const q = searchParams.get('q') ?? undefined;
  const communityId = searchParams.get('community_id');
  const cid = communityId ? Number(communityId) : undefined;

  if (!process.env.DATABASE_URL?.trim()) {
    return Response.json(getMockEmailCrmPayload({ tag, q, community_id: cid }));
  }

  try {
    const rows = await sql`
      SELECT id, user_id, name, email, image, source, tags, community_id, subscribed_at
      FROM email_subscribers
      WHERE creator_id = ${session.user.id}
      ORDER BY subscribed_at DESC
      LIMIT 500
    `;
    if (!Array.isArray(rows) || rows.length === 0) {
      return Response.json(getMockEmailCrmPayload({ tag, q, community_id: cid }));
    }

    const broadcasts = await sql`
      SELECT * FROM email_broadcasts
      WHERE creator_id = ${session.user.id}
      ORDER BY sent_at DESC
      LIMIT 50
    `;

    let subscribers = (rows as Array<Record<string, unknown>>).map((r) => ({
      id: String(r.id),
      user_id: (r.user_id as string) ?? null,
      name: String(r.name ?? ''),
      email: String(r.email ?? ''),
      image: (r.image as string) ?? null,
      source: String(r.source ?? 'community_member') as SubscriberSource,
      source_label: String(r.source ?? 'Community Member'),
      tags: Array.isArray(r.tags) ? (r.tags as string[]) : [],
      community_id: r.community_id != null ? Number(r.community_id) : null,
      subscribed_at: String(r.subscribed_at),
    }));

    if (tag && tag !== 'all') {
      subscribers = subscribers.filter(
        (s) => s.source === tag || s.tags.some((t) => t.toLowerCase().includes(tag.toLowerCase()))
      );
    }
    if (q?.trim()) {
      const qq = q.trim().toLowerCase();
      subscribers = subscribers.filter(
        (s) => s.name.toLowerCase().includes(qq) || s.email.toLowerCase().includes(qq)
      );
    }

    const sent = (broadcasts as Array<Record<string, unknown>>).filter(
      (b) => b.status === 'sent'
    );
    const avgOpen =
      sent.length === 0
        ? 0
        : sent.reduce((n, b) => n + Number(b.open_rate ?? 0), 0) / sent.length;

    return Response.json({
      total_subscribers: subscribers.length,
      average_open_rate: Math.round(avgOpen * 10) / 10,
      total_broadcasts: sent.length,
      subscribers,
      broadcasts,
      automations: listEmailAutomations({ community_id: cid }),
      community_emails: listCommunityAutomationEmails({ community_id: cid }),
      audiences: getMockEmailCrmPayload().audiences,
      tags: ['all', ...Array.from(new Set(subscribers.flatMap((s) => s.tags)))],
      demo: false,
    });
  } catch (error) {
    console.error(error);
    return Response.json(getMockEmailCrmPayload({ tag, q, community_id: cid }));
  }
}

export async function POST(request: Request) {
  const session = await requireSession();
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const action = String(body.action ?? 'send');

    if (action === 'toggle_automation') {
      const id = String(body.id ?? '');
      const status = body.status === 'paused' ? 'paused' : 'active';
      const automation = setEmailAutomationStatus(id, status);
      if (!automation) {
        return Response.json({ error: 'Automation not found' }, { status: 404 });
      }
      return Response.json({ success: true, automation, demo: true });
    }

    if (action === 'upsert_automation') {
      const trigger = String(body.trigger ?? 'community_join') as EmailAutomationTrigger;
      const automation = upsertEmailAutomation({
        id: body.id ? String(body.id) : undefined,
        name: String(body.name ?? ''),
        description: body.description != null ? String(body.description) : undefined,
        trigger,
        subject: String(body.subject ?? ''),
        body: String(body.body ?? ''),
        status: body.status === 'paused' ? 'paused' : 'active',
        community_id:
          body.community_id != null && body.community_id !== ''
            ? Number(body.community_id)
            : null,
      });
      return Response.json({ success: true, automation, demo: true });
    }

    // Auto-sync from join / purchase flows.
    if (action === 'sync') {
      const source = (body.source as SubscriberSource) || 'community_member';
      const subscriber = syncSubscriber({
        email: String(body.email || session.user.email),
        name: String(body.name || session.user.name || 'Medlem'),
        user_id: body.user_id ?? session.user.id,
        image: body.image ?? session.user.image ?? null,
        source,
        community_id: body.community_id != null ? Number(body.community_id) : null,
        extra_tags: Array.isArray(body.tags) ? body.tags : undefined,
      });

      if (process.env.DATABASE_URL?.trim()) {
        try {
          await sql`
            INSERT INTO email_subscribers (
              creator_id, user_id, name, email, image, source, tags, community_id
            )
            VALUES (
              ${session.user.id},
              ${subscriber.user_id},
              ${subscriber.name},
              ${subscriber.email},
              ${subscriber.image},
              ${subscriber.source},
              ${subscriber.tags},
              ${subscriber.community_id}
            )
            ON CONFLICT (creator_id, email) DO UPDATE SET
              name = EXCLUDED.name,
              tags = (
                SELECT ARRAY(SELECT DISTINCT unnest(email_subscribers.tags || EXCLUDED.tags))
              ),
              source = EXCLUDED.source,
              community_id = COALESCE(EXCLUDED.community_id, email_subscribers.community_id),
              updated_at = now()
          `;
        } catch (e) {
          console.error(e);
        }
      }

      return Response.json({ success: true, subscriber, demo: !process.env.DATABASE_URL?.trim() });
    }

    if (action === 'send' || action === 'test') {
      const subject = String(body.subject ?? '').trim();
      const emailBody = String(body.body ?? '').trim();
      const audience = String(body.audience ?? 'all');
      const image_url =
        typeof body.image_url === 'string' && body.image_url.trim()
          ? body.image_url.trim()
          : null;
      if (!subject || !emailBody) {
        return Response.json({ error: 'subject and body required' }, { status: 400 });
      }

      const firstName = (session.user.name || 'Ebba').split(' ')[0];
      const preview = applyMergeTags(emailBody, firstName);

      const broadcast = createBroadcast({
        subject,
        body: emailBody,
        audience,
        image_url,
        status: action === 'test' ? 'test' : 'sent',
      });

      if (process.env.DATABASE_URL?.trim() && action === 'send') {
        try {
          await sql`
            INSERT INTO email_broadcasts (
              creator_id, subject, body, audience, audience_label,
              recipient_count, open_rate, click_rate, status
            )
            VALUES (
              ${session.user.id},
              ${broadcast.subject},
              ${broadcast.body},
              ${broadcast.audience},
              ${broadcast.audience_label},
              ${broadcast.recipient_count},
              ${broadcast.open_rate},
              ${broadcast.click_rate},
              'sent'
            )
          `;
        } catch (e) {
          console.error(e);
        }
      }

      return Response.json({
        success: true,
        broadcast,
        preview,
        demo: !process.env.DATABASE_URL?.trim(),
      });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error(error);
    if (!process.env.DATABASE_URL?.trim()) {
      return Response.json({ success: true, demo: true });
    }
    return Response.json({ error: 'Failed' }, { status: 500 });
  }
}

/** Helper used by other routes without auth re-check in demo. */
export function syncEmailSubscriberDemo(input: {
  email: string;
  name: string;
  user_id?: string | null;
  source: SubscriberSource;
  community_id?: number | null;
}) {
  return syncSubscriber(input);
}

// silence unused import warning for list in GET fallback paths
void listEmailSubscribers;
