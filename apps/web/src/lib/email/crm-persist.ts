/**
 * Durable Email CRM persistence — subscribers, automations, Resend tracking.
 * Falls back to in-memory mock helpers when DATABASE_URL is missing.
 */

import sql from '@/app/api/utils/sql';
import {
  AUTOMATION_TRIGGER_OPTIONS,
  applyMergeTags,
  listCommunityAutomationEmails,
  listEmailAutomations,
  logCommunityAutomationEmail,
  setEmailAutomationStatus as setMockAutomationStatus,
  syncSubscriber,
  upsertEmailAutomation as upsertMockAutomation,
  type EmailAutomation,
  type EmailAutomationTrigger,
  type SubscriberSource,
  type UpsertAutomationInput,
} from '@/lib/mock-email-crm';
import { sendEmail } from '@/lib/email/send';
import { BroadcastEmail } from '@/lib/email/templates/BroadcastEmail';
import { buildUnsubscribeUrl } from '@/lib/email/unsubscribe';
import { getSiteUrl } from '@/lib/site';
import * as React from 'react';

let schemaReady: Promise<void> | null = null;

export async function ensureEmailCrmSchema(): Promise<void> {
  if (!process.env.DATABASE_URL?.trim()) return;
  if (schemaReady) return schemaReady;

  schemaReady = (async () => {
    await sql`
      CREATE TABLE IF NOT EXISTS email_automations (
        id            text PRIMARY KEY,
        creator_id    text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
        community_id  integer REFERENCES communities(id) ON DELETE SET NULL,
        name          text NOT NULL,
        description   text NOT NULL DEFAULT '',
        trigger       text NOT NULL,
        subject       text NOT NULL,
        body          text NOT NULL,
        status        text NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active', 'paused')),
        sent_count    integer NOT NULL DEFAULT 0,
        last_sent_at  timestamptz,
        created_at    timestamptz NOT NULL DEFAULT now(),
        updated_at    timestamptz NOT NULL DEFAULT now()
      )
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS email_automations_creator_idx
        ON email_automations (creator_id, status)
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS email_message_tracking (
        resend_id     text PRIMARY KEY,
        broadcast_id  integer REFERENCES email_broadcasts(id) ON DELETE CASCADE,
        creator_id    text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
        email         text NOT NULL,
        opened        boolean NOT NULL DEFAULT false,
        clicked       boolean NOT NULL DEFAULT false,
        created_at    timestamptz NOT NULL DEFAULT now(),
        opened_at     timestamptz,
        clicked_at    timestamptz
      )
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS email_message_tracking_broadcast_idx
        ON email_message_tracking (broadcast_id)
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS email_automation_sends (
        id              serial PRIMARY KEY,
        automation_id   text REFERENCES email_automations(id) ON DELETE SET NULL,
        creator_id      text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
        community_id    integer,
        community_name  text,
        kind            text NOT NULL DEFAULT 'member_auto',
        subject         text NOT NULL,
        recipient_name  text NOT NULL,
        recipient_email text NOT NULL,
        resend_id       text,
        sent_at         timestamptz NOT NULL DEFAULT now()
      )
    `;
  })().catch((error) => {
    schemaReady = null;
    throw error;
  });

  return schemaReady;
}

function triggerLabel(trigger: EmailAutomationTrigger): string {
  return (
    AUTOMATION_TRIGGER_OPTIONS.find((o) => o.value === trigger)?.label ?? trigger
  );
}

function mapAutomationRow(r: Record<string, unknown>): EmailAutomation {
  const trigger = String(r.trigger) as EmailAutomationTrigger;
  return {
    id: String(r.id),
    name: String(r.name ?? ''),
    description: String(r.description ?? ''),
    trigger,
    trigger_label: triggerLabel(trigger),
    subject: String(r.subject ?? ''),
    body: String(r.body ?? ''),
    status: r.status === 'paused' ? 'paused' : 'active',
    sent_count: Number(r.sent_count) || 0,
    last_sent_at: r.last_sent_at ? String(r.last_sent_at) : null,
    community_id: r.community_id != null ? Number(r.community_id) : null,
  };
}

/** Seed the 4 default automations once for a creator (active by default). */
async function ensureDefaultAutomations(creatorId: string): Promise<void> {
  const existing = await sql`
    SELECT id FROM email_automations WHERE creator_id = ${creatorId} LIMIT 1
  `;
  if (Array.isArray(existing) && existing.length > 0) return;

  for (const opt of AUTOMATION_TRIGGER_OPTIONS) {
    const id = `auto-${creatorId.slice(0, 8)}-${opt.value}`;
    await sql`
      INSERT INTO email_automations (
        id, creator_id, community_id, name, description, trigger, subject, body, status
      )
      VALUES (
        ${id},
        ${creatorId},
        ${null},
        ${opt.defaultName},
        ${`Automated email for ${opt.label.toLowerCase()}.`},
        ${opt.value},
        ${opt.defaultSubject},
        ${opt.defaultBody},
        'active'
      )
      ON CONFLICT (id) DO NOTHING
    `;
  }
}

export async function listPersistedAutomations(input: {
  creatorId: string;
  communityId?: number;
}): Promise<EmailAutomation[]> {
  if (!process.env.DATABASE_URL?.trim()) {
    return listEmailAutomations({ community_id: input.communityId });
  }
  try {
    await ensureEmailCrmSchema();
    await ensureDefaultAutomations(input.creatorId);
    const rows = input.communityId
      ? await sql`
          SELECT * FROM email_automations
          WHERE creator_id = ${input.creatorId}
            AND (community_id IS NULL OR community_id = ${input.communityId})
          ORDER BY created_at DESC
        `
      : await sql`
          SELECT * FROM email_automations
          WHERE creator_id = ${input.creatorId}
          ORDER BY created_at DESC
        `;
    return ((rows as Array<Record<string, unknown>>) || []).map(mapAutomationRow);
  } catch (error) {
    console.warn('[email/crm] list automations failed', error);
    return listEmailAutomations({ community_id: input.communityId });
  }
}

export async function upsertPersistedAutomation(
  creatorId: string,
  input: UpsertAutomationInput
): Promise<EmailAutomation> {
  if (!process.env.DATABASE_URL?.trim()) {
    return upsertMockAutomation(input);
  }
  await ensureEmailCrmSchema();
  const trigger = input.trigger;
  const defaults =
    AUTOMATION_TRIGGER_OPTIONS.find((o) => o.value === trigger) ??
    AUTOMATION_TRIGGER_OPTIONS[0];
  const id = input.id?.trim() || `auto-${Date.now().toString(36)}`;
  const name = input.name.trim() || defaults.defaultName;
  const description =
    (input.description ?? '').trim() ||
    `Automated email for ${defaults.label.toLowerCase()}.`;
  const subject = input.subject.trim() || defaults.defaultSubject;
  const body = input.body.trim() || defaults.defaultBody;
  const status = input.status ?? 'active';
  const communityId =
    input.community_id !== undefined ? input.community_id : null;

  await sql`
    INSERT INTO email_automations (
      id, creator_id, community_id, name, description, trigger, subject, body, status, updated_at
    )
    VALUES (
      ${id}, ${creatorId}, ${communityId}, ${name}, ${description},
      ${trigger}, ${subject}, ${body}, ${status}, now()
    )
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      trigger = EXCLUDED.trigger,
      subject = EXCLUDED.subject,
      body = EXCLUDED.body,
      status = EXCLUDED.status,
      community_id = EXCLUDED.community_id,
      updated_at = now()
      WHERE email_automations.creator_id = ${creatorId}
  `;

  const rows = await sql`
    SELECT * FROM email_automations WHERE id = ${id} AND creator_id = ${creatorId} LIMIT 1
  `;
  if (Array.isArray(rows) && rows[0]) return mapAutomationRow(rows[0] as Record<string, unknown>);
  return upsertMockAutomation(input);
}

export async function setPersistedAutomationStatus(
  creatorId: string,
  id: string,
  status: 'active' | 'paused'
): Promise<EmailAutomation | null> {
  if (!process.env.DATABASE_URL?.trim()) {
    return setMockAutomationStatus(id, status);
  }
  await ensureEmailCrmSchema();
  const rows = await sql`
    UPDATE email_automations
    SET status = ${status}, updated_at = now()
    WHERE id = ${id} AND creator_id = ${creatorId}
    RETURNING *
  `;
  if (!Array.isArray(rows) || !rows[0]) return null;
  return mapAutomationRow(rows[0] as Record<string, unknown>);
}

export async function listPersistedCommunityEmails(input: {
  creatorId: string;
  communityId?: number;
}) {
  if (!process.env.DATABASE_URL?.trim()) {
    return listCommunityAutomationEmails({ community_id: input.communityId });
  }
  try {
    await ensureEmailCrmSchema();
    const rows = input.communityId
      ? await sql`
          SELECT * FROM email_automation_sends
          WHERE creator_id = ${input.creatorId}
            AND community_id = ${input.communityId}
          ORDER BY sent_at DESC
          LIMIT 50
        `
      : await sql`
          SELECT * FROM email_automation_sends
          WHERE creator_id = ${input.creatorId}
          ORDER BY sent_at DESC
          LIMIT 50
        `;
    return ((rows as Array<Record<string, unknown>>) || []).map((r) => ({
      id: String(r.id),
      community_id: Number(r.community_id) || 0,
      community_name: String(r.community_name ?? ''),
      kind: (r.kind === 'purchase_access' ? 'purchase_access' : 'member_auto') as
        | 'purchase_access'
        | 'member_auto',
      kind_label:
        r.kind === 'purchase_access' ? 'Purchase access' : 'Automation',
      subject: String(r.subject ?? ''),
      recipient_name: String(r.recipient_name ?? ''),
      recipient_email: String(r.recipient_email ?? ''),
      preview: String(r.subject ?? ''),
      sent_at: String(r.sent_at ?? ''),
    }));
  } catch {
    return listCommunityAutomationEmails({ community_id: input.communityId });
  }
}

/** Upsert a contact into the creator's durable subscriber list. */
export async function persistSubscriber(input: {
  creatorId: string;
  email: string;
  name: string;
  userId?: string | null;
  image?: string | null;
  source: SubscriberSource;
  communityId?: number | null;
  tags?: string[];
}): Promise<void> {
  const email = input.email.trim().toLowerCase();
  if (!email) return;

  syncSubscriber({
    email,
    name: input.name,
    user_id: input.userId,
    image: input.image,
    source: input.source,
    community_id: input.communityId,
    extra_tags: input.tags,
  });

  if (!process.env.DATABASE_URL?.trim()) return;
  try {
    await ensureEmailCrmSchema();
    const tags = input.tags?.length ? input.tags : [];
    await sql`
      INSERT INTO email_subscribers (
        creator_id, user_id, name, email, image, source, tags, community_id
      )
      VALUES (
        ${input.creatorId},
        ${input.userId ?? null},
        ${input.name},
        ${email},
        ${input.image ?? null},
        ${input.source},
        ${tags},
        ${input.communityId ?? null}
      )
      ON CONFLICT (creator_id, email) DO UPDATE SET
        name = EXCLUDED.name,
        user_id = COALESCE(EXCLUDED.user_id, email_subscribers.user_id),
        image = COALESCE(EXCLUDED.image, email_subscribers.image),
        source = EXCLUDED.source,
        tags = (
          SELECT ARRAY(SELECT DISTINCT unnest(email_subscribers.tags || EXCLUDED.tags))
        ),
        community_id = COALESCE(EXCLUDED.community_id, email_subscribers.community_id),
        updated_at = now()
    `;
  } catch (error) {
    console.warn('[email/crm] persistSubscriber failed', error);
  }
}

export type FireAutomationInput = {
  creatorId: string;
  communityId: number;
  communityName: string;
  communityUrl?: string;
  trigger: EmailAutomationTrigger;
  recipientEmail: string;
  recipientName: string;
  /** When true, skip Resend and only log (tests). */
  dryRun?: boolean;
};

/**
 * Find active automations for trigger + community and send via Resend.
 */
export async function fireEmailAutomations(
  input: FireAutomationInput
): Promise<{ sent: number; skipped: number }> {
  const email = input.recipientEmail.trim().toLowerCase();
  if (!email) return { sent: 0, skipped: 1 };

  let automations: EmailAutomation[] = [];
  if (process.env.DATABASE_URL?.trim()) {
    try {
      await ensureEmailCrmSchema();
      await ensureDefaultAutomations(input.creatorId);
      const rows = await sql`
        SELECT * FROM email_automations
        WHERE creator_id = ${input.creatorId}
          AND status = 'active'
          AND trigger = ${input.trigger}
          AND (community_id IS NULL OR community_id = ${input.communityId})
      `;
      automations = ((rows as Array<Record<string, unknown>>) || []).map(
        mapAutomationRow
      );
    } catch (error) {
      console.warn('[email/crm] load automations for fire failed', error);
      automations = listEmailAutomations({ community_id: input.communityId }).filter(
        (a) => a.status === 'active' && a.trigger === input.trigger
      );
    }
  } else {
    automations = listEmailAutomations({ community_id: input.communityId }).filter(
      (a) => a.status === 'active' && a.trigger === input.trigger
    );
  }

  if (automations.length === 0) return { sent: 0, skipped: 1 };

  const firstName =
    input.recipientName.trim().split(/\s+/)[0] || email.split('@')[0] || 'there';
  const origin = getSiteUrl();
  const communityUrl =
    input.communityUrl || `${origin}/community/${input.communityId}`;
  let sent = 0;

  for (const auto of automations) {
    const subject = auto.subject
      .replace(/\{community\}/gi, input.communityName)
      .replace(/\{first_name\}/gi, firstName)
      .replace(/\{community_url\}/gi, communityUrl);
    const body = applyMergeTags(auto.body, firstName)
      .replace(/\{community\}/gi, input.communityName)
      .replace(/\{community_url\}/gi, communityUrl);

    let resendId: string | null = null;
    if (!input.dryRun) {
      const result = await sendEmail({
        to: email,
        subject,
        unsubscribeEmail: email,
        tags: [
          { name: 'category', value: 'crm_automation' },
          { name: 'trigger', value: input.trigger.slice(0, 40) },
        ],
        react: React.createElement(BroadcastEmail, {
          subject,
          bodyContent: body,
          firstName,
          unsubscribeUrl: buildUnsubscribeUrl(email, origin),
          workspaceName: input.communityName,
        }),
      });
      if (!result.ok) {
        console.warn('[email/crm] automation send failed', auto.id, result.error);
        continue;
      }
      resendId = result.id;
      sent += 1;
    }

    const kind =
      input.trigger === 'purchase_community_access'
        ? 'purchase_access'
        : 'member_auto';

    logCommunityAutomationEmail({
      community_id: input.communityId,
      community_name: input.communityName,
      kind,
      kind_label: auto.trigger_label,
      subject,
      recipient_name: input.recipientName,
      recipient_email: email,
      preview: body.slice(0, 160),
    });

    if (process.env.DATABASE_URL?.trim()) {
      try {
        await sql`
          UPDATE email_automations
          SET sent_count = sent_count + 1, last_sent_at = now(), updated_at = now()
          WHERE id = ${auto.id} AND creator_id = ${input.creatorId}
        `;
        await sql`
          INSERT INTO email_automation_sends (
            automation_id, creator_id, community_id, community_name,
            kind, subject, recipient_name, recipient_email, resend_id
          )
          VALUES (
            ${auto.id}, ${input.creatorId}, ${input.communityId},
            ${input.communityName}, ${kind}, ${subject},
            ${input.recipientName}, ${email}, ${resendId}
          )
        `;
      } catch (error) {
        console.warn('[email/crm] log automation send failed', error);
      }
    }
  }

  return { sent, skipped: automations.length - sent };
}

/** Store Resend message ids for a broadcast so webhooks can update open/click rates. */
export async function trackBroadcastMessages(input: {
  creatorId: string;
  broadcastId: number;
  messages: Array<{ email: string; resendId: string }>;
}): Promise<void> {
  if (!process.env.DATABASE_URL?.trim()) return;
  try {
    await ensureEmailCrmSchema();
    for (const msg of input.messages) {
      if (!msg.resendId || msg.resendId === 'sent') continue;
      await sql`
        INSERT INTO email_message_tracking (
          resend_id, broadcast_id, creator_id, email
        )
        VALUES (
          ${msg.resendId}, ${input.broadcastId}, ${input.creatorId},
          ${msg.email.toLowerCase()}
        )
        ON CONFLICT (resend_id) DO NOTHING
      `;
    }
  } catch (error) {
    console.warn('[email/crm] trackBroadcastMessages failed', error);
  }
}

/** Apply a Resend open/click event and recompute broadcast rates. */
export async function applyResendEngagementEvent(input: {
  resendId: string;
  type: 'opened' | 'clicked';
}): Promise<boolean> {
  if (!process.env.DATABASE_URL?.trim()) return false;
  try {
    await ensureEmailCrmSchema();
    const rows =
      input.type === 'opened'
        ? await sql`
            UPDATE email_message_tracking
            SET opened = true, opened_at = COALESCE(opened_at, now())
            WHERE resend_id = ${input.resendId}
            RETURNING broadcast_id
          `
        : await sql`
            UPDATE email_message_tracking
            SET clicked = true, clicked_at = COALESCE(clicked_at, now())
            WHERE resend_id = ${input.resendId}
            RETURNING broadcast_id
          `;
    const broadcastId = rows?.[0]?.broadcast_id as number | undefined;
    if (!broadcastId) return false;

    const stats = await sql`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE opened)::int AS opens,
        COUNT(*) FILTER (WHERE clicked)::int AS clicks
      FROM email_message_tracking
      WHERE broadcast_id = ${broadcastId}
    `;
    const total = Number(stats?.[0]?.total) || 0;
    const opens = Number(stats?.[0]?.opens) || 0;
    const clicks = Number(stats?.[0]?.clicks) || 0;
    if (total <= 0) return true;
    const openRate = Math.round((opens / total) * 1000) / 10;
    const clickRate = Math.round((clicks / total) * 1000) / 10;
    await sql`
      UPDATE email_broadcasts
      SET open_rate = ${openRate}, click_rate = ${clickRate}
      WHERE id = ${broadcastId}
    `;
    return true;
  } catch (error) {
    console.warn('[email/crm] applyResendEngagementEvent failed', error);
    return false;
  }
}
