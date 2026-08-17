import sql from '@/app/api/utils/sql';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { resendEnv } from '@/lib/config/env';
import {
  ensureEmailCrmSchema,
  listPersistedAutomations,
  listPersistedCommunityEmails,
  persistSubscriber,
  deletePersistedAutomation,
  setPersistedAutomationStatus,
  upsertPersistedAutomation,
} from '@/lib/email/crm-persist';
import {
  AUDIENCE_OPTIONS,
  applyMergeTags,
  createBroadcast,
  getMockEmailCrmPayload,
  syncSubscriber,
  type EmailAutomationTrigger,
  type SubscriberSource,
} from '@/lib/mock-email-crm';

async function requireSession() {
  return auth.api.getSession({ headers: await headers() });
}

async function emptyEmailCrmPayload(creatorId: string, cid?: number) {
  const automations = await listPersistedAutomations({
    creatorId,
    communityId: cid,
  });
  const community_emails = await listPersistedCommunityEmails({
    creatorId,
    communityId: cid,
  });
  return {
    total_subscribers: 0,
    average_open_rate: 0,
    total_broadcasts: 0,
    subscribers: [] as unknown[],
    broadcasts: [] as unknown[],
    automations,
    community_emails,
    audiences: AUDIENCE_OPTIONS,
    tags: ['all'],
    demo: false as const,
    email_provider_ready: Boolean(resendEnv.apiKey()),
  };
}

export async function GET(request: Request) {
  const session = await requireSession();
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const tag = searchParams.get('tag') ?? undefined;
  const q = searchParams.get('q') ?? undefined;
  const communityId = searchParams.get('community_id');
  const parsedCid = communityId != null && communityId !== '' ? Number(communityId) : NaN;
  // Ignore mock/0/invalid ids so the CRM still returns creator-level contacts.
  const cid =
    Number.isFinite(parsedCid) && parsedCid > 0 ? parsedCid : undefined;
  const providerReady = Boolean(resendEnv.apiKey());

  if (!process.env.DATABASE_URL?.trim()) {
    return Response.json({
      ...getMockEmailCrmPayload({ tag, q, community_id: cid }),
      email_provider_ready: providerReady,
    });
  }

  try {
    await ensureEmailCrmSchema();

    // Scope by creator; when a community is selected, prefer that brand's contacts.
    const rows = cid
      ? await sql`
          SELECT id, user_id, name, email, image, source, tags, community_id, subscribed_at
          FROM email_subscribers
          WHERE creator_id = ${session.user.id}
            AND (community_id = ${cid} OR community_id IS NULL)
          ORDER BY subscribed_at DESC
          LIMIT 500
        `
      : await sql`
          SELECT id, user_id, name, email, image, source, tags, community_id, subscribed_at
          FROM email_subscribers
          WHERE creator_id = ${session.user.id}
          ORDER BY subscribed_at DESC
          LIMIT 500
        `;

    if (!Array.isArray(rows) || rows.length === 0) {
      // Real empty CRM — do not inject seed/mock contacts when DB is configured.
      return Response.json(await emptyEmailCrmPayload(session.user.id, cid));
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

    const automations = await listPersistedAutomations({
      creatorId: session.user.id,
      communityId: cid,
    });
    const community_emails = await listPersistedCommunityEmails({
      creatorId: session.user.id,
      communityId: cid,
    });

    return Response.json({
      total_subscribers: subscribers.length,
      average_open_rate: Math.round(avgOpen * 10) / 10,
      total_broadcasts: sent.length,
      subscribers,
      broadcasts,
      automations,
      community_emails,
      audiences: AUDIENCE_OPTIONS,
      tags: ['all', ...Array.from(new Set(subscribers.flatMap((s) => s.tags)))],
      demo: false,
      email_provider_ready: providerReady,
    });
  } catch (error) {
    console.error('[GET /api/admin/email]', error);
    return Response.json({
      ...(await emptyEmailCrmPayload(session.user.id, cid)),
      error: 'load_failed',
    });
  }
}

export async function POST(request: Request) {
  const session = await requireSession();
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const action = String(body.action ?? 'send');

    if (process.env.DATABASE_URL?.trim()) {
      await ensureEmailCrmSchema();
    }

    if (action === 'toggle_automation') {
      const id = String(body.id ?? '');
      const status = body.status === 'paused' ? 'paused' : 'active';
      const automation = await setPersistedAutomationStatus(
        session.user.id,
        id,
        status
      );
      if (!automation) {
        return Response.json({ error: 'Automation not found' }, { status: 404 });
      }
      return Response.json({
        success: true,
        automation,
        demo: !process.env.DATABASE_URL?.trim(),
      });
    }

    if (action === 'delete_automation') {
      const id = String(body.id ?? '').trim();
      if (!id) {
        return Response.json({ error: 'id required' }, { status: 400 });
      }
      const deleted = await deletePersistedAutomation(session.user.id, id);
      if (!deleted) {
        return Response.json({ error: 'Automation not found' }, { status: 404 });
      }
      return Response.json({
        success: true,
        deleted: true,
        demo: !process.env.DATABASE_URL?.trim(),
      });
    }

    if (action === 'upsert_automation') {
      const trigger = String(body.trigger ?? 'community_join') as EmailAutomationTrigger;
      const name = String(body.name ?? '').trim();
      const subject = String(body.subject ?? '').trim();
      const bodyText = String(body.body ?? '').trim();
      if (!name || !subject || !bodyText) {
        return Response.json(
          { error: 'name, subject, and body are required' },
          { status: 400 }
        );
      }
      const parsedCommunity = Number(body.community_id);
      const communityId =
        body.community_id != null &&
        body.community_id !== '' &&
        Number.isFinite(parsedCommunity) &&
        parsedCommunity > 0
          ? parsedCommunity
          : null;

      const automation = await upsertPersistedAutomation(session.user.id, {
        id: body.id ? String(body.id) : undefined,
        name,
        description:
          body.description != null ? String(body.description) : undefined,
        trigger,
        subject,
        body: bodyText,
        status: body.status === 'paused' ? 'paused' : 'active',
        community_id: communityId,
      });
      return Response.json({
        success: true,
        automation,
        demo: !process.env.DATABASE_URL?.trim(),
      });
    }

    // Import existing community members into this creator's Email CRM.
    if (action === 'sync_community_members') {
      const communityId = Number(body.community_id);
      if (!communityId || Number.isNaN(communityId)) {
        return Response.json({ error: 'community_id required' }, { status: 400 });
      }
      if (!process.env.DATABASE_URL?.trim()) {
        return Response.json({
          success: true,
          imported: 0,
          demo: true,
          message: 'No DATABASE_URL — nothing to import',
        });
      }

      const owned = await sql`
        SELECT id FROM communities
        WHERE id = ${communityId}
          AND (
            creator_id::text = ${session.user.id}
            OR workspace_id = ${session.user.id}
            OR workspace_id IN (
              SELECT id FROM public.workspaces WHERE user_id::text = ${session.user.id}
            )
          )
        LIMIT 1
      `;
      if (!Array.isArray(owned) || owned.length === 0) {
        return Response.json({ error: 'Community not found for this workspace' }, { status: 404 });
      }

      const members = await sql`
        SELECT u.id AS user_id, u.name, u.email, u.image
        FROM community_memberships m
        JOIN "user" u ON u.id = m.user_id
        WHERE m.community_id = ${communityId}
          AND u.email IS NOT NULL
          AND TRIM(u.email) <> ''
      `;

      let imported = 0;
      for (const row of members as Array<Record<string, unknown>>) {
        const email = String(row.email ?? '')
          .toLowerCase()
          .trim();
        if (!email) continue;
        const name = String(row.name ?? email.split('@')[0] ?? 'Member');
        const userId = (row.user_id as string) ?? null;
        const image = (row.image as string) ?? null;
        try {
          const ok = await persistSubscriber({
            creatorId: session.user.id,
            email,
            name,
            userId,
            image,
            source: 'community_member',
            communityId,
            tags: ['Community Member'],
          });
          if (ok) imported += 1;
        } catch (e) {
          console.error('[email sync_community_members]', e);
        }
      }

      return Response.json({ success: true, imported, community_id: communityId, demo: false });
    }

    if (action === 'import_subscribers') {
      const rawContacts = Array.isArray(body.contacts) ? body.contacts : [];
      const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      let imported = 0;
      let skipped = 0;
      const errors: string[] = [];

      for (const row of rawContacts.slice(0, 5000)) {
        if (!row || typeof row !== 'object') {
          skipped += 1;
          continue;
        }
        const contact = row as Record<string, unknown>;
        const email = String(contact.email || '')
          .toLowerCase()
          .trim();
        const name = String(contact.name || '').trim() || email.split('@')[0] || 'Subscriber';
        if (!email || !emailRe.test(email)) {
          skipped += 1;
          if (email) errors.push(`Invalid email: ${email}`);
          continue;
        }
        const ok = await persistSubscriber({
          creatorId: session.user.id,
          email,
          name,
          source: 'imported_list',
          communityId: null,
          tags: ['Imported List'],
        });
        if (ok) imported += 1;
        else skipped += 1;
      }

      return Response.json({
        success: true,
        imported,
        skipped,
        errors: errors.slice(0, 20),
        demo: !process.env.DATABASE_URL?.trim(),
      });
    }

    // Auto-sync from join / purchase flows.
    if (action === 'sync') {
      const source = (body.source as SubscriberSource) || 'community_member';
      const communityId =
        body.community_id != null && body.community_id !== ''
          ? Number(body.community_id)
          : null;

      // Attribute the contact to the community creator (seller), not the buyer session.
      let creatorId = session.user.id;
      if (communityId && process.env.DATABASE_URL?.trim()) {
        try {
          const owners = await sql`
            SELECT creator_id FROM communities WHERE id = ${communityId} LIMIT 1
          `;
          const ownerId = owners?.[0]?.creator_id as string | undefined;
          if (ownerId) creatorId = ownerId;
        } catch (e) {
          console.error('[email sync] creator lookup failed', e);
        }
      }

      const email = String(body.email || session.user.email || '')
        .toLowerCase()
        .trim();
      const name = String(body.name || session.user.name || 'Medlem');
      const userId = (body.user_id as string | undefined) ?? session.user.id;
      const image =
        (body.image as string | null | undefined) ?? session.user.image ?? null;
      const tags = Array.isArray(body.tags)
        ? (body.tags as string[])
        : undefined;

      await persistSubscriber({
        creatorId,
        email,
        name,
        userId,
        image,
        source,
        communityId,
        tags,
      });

      const subscriber = syncSubscriber({
        email,
        name,
        user_id: userId,
        image,
        source,
        community_id: communityId,
        extra_tags: tags,
      });

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
