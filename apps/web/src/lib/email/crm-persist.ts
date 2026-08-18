/**
 * Durable Email CRM persistence — subscribers, automations, Resend tracking.
 * Falls back to in-memory mock helpers when DATABASE_URL is missing.
 */

import sql from '@/app/api/utils/sql';
import {
  AUTOMATION_TRIGGER_OPTIONS,
  applyMergeTags,
  deleteEmailAutomation as deleteMockAutomation,
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
/** Bump when new CRM tables/columns are added so hot servers re-heal. */
const EMAIL_CRM_SCHEMA_VERSION = 3;
let schemaVersionApplied = 0;

async function safeAlter(label: string, run: () => Promise<unknown>) {
  try {
    await run();
  } catch (error) {
    console.warn(`[email/crm] schema heal skipped (${label})`, error);
  }
}

export async function ensureEmailCrmSchema(): Promise<void> {
  if (!process.env.DATABASE_URL?.trim()) return;
  if (schemaReady && schemaVersionApplied >= EMAIL_CRM_SCHEMA_VERSION) {
    return schemaReady;
  }

  schemaReady = (async () => {
    // Subscribers first — GET /api/admin/email + sync/import depend on this table.
    await sql`
      CREATE TABLE IF NOT EXISTS email_subscribers (
        id              serial PRIMARY KEY,
        creator_id      text NOT NULL,
        user_id         text,
        name            text NOT NULL DEFAULT '',
        email           text NOT NULL,
        image           text,
        source          text NOT NULL DEFAULT 'community_member',
        tags            text[] NOT NULL DEFAULT '{}',
        community_id    integer,
        subscribed_at   timestamptz NOT NULL DEFAULT now(),
        updated_at      timestamptz NOT NULL DEFAULT now(),
        UNIQUE (creator_id, email)
      )
    `;
    await safeAlter('email_subscribers.creator_id', () =>
      sql`ALTER TABLE email_subscribers ADD COLUMN IF NOT EXISTS creator_id text`
    );
    await safeAlter('email_subscribers.user_id', () =>
      sql`ALTER TABLE email_subscribers ADD COLUMN IF NOT EXISTS user_id text`
    );
    await safeAlter('email_subscribers.name', () =>
      sql`ALTER TABLE email_subscribers ADD COLUMN IF NOT EXISTS name text DEFAULT ''`
    );
    await safeAlter('email_subscribers.email', () =>
      sql`ALTER TABLE email_subscribers ADD COLUMN IF NOT EXISTS email text`
    );
    await safeAlter('email_subscribers.image', () =>
      sql`ALTER TABLE email_subscribers ADD COLUMN IF NOT EXISTS image text`
    );
    await safeAlter('email_subscribers.source', () =>
      sql`ALTER TABLE email_subscribers ADD COLUMN IF NOT EXISTS source text DEFAULT 'community_member'`
    );
    await safeAlter('email_subscribers.tags', () =>
      sql`ALTER TABLE email_subscribers ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}'`
    );
    await safeAlter('email_subscribers.community_id', () =>
      sql`ALTER TABLE email_subscribers ADD COLUMN IF NOT EXISTS community_id integer`
    );
    await safeAlter('email_subscribers.subscribed_at', () =>
      sql`ALTER TABLE email_subscribers ADD COLUMN IF NOT EXISTS subscribed_at timestamptz DEFAULT now()`
    );
    await safeAlter('email_subscribers.updated_at', () =>
      sql`ALTER TABLE email_subscribers ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now()`
    );
    // Required for ON CONFLICT (creator_id, email) in persist/sync paths.
    await safeAlter('email_subscribers_creator_email_uidx', () => sql`
      CREATE UNIQUE INDEX IF NOT EXISTS email_subscribers_creator_email_uidx
        ON email_subscribers (creator_id, email)
    `);
    await safeAlter('email_subscribers_creator_idx', () => sql`
      CREATE INDEX IF NOT EXISTS email_subscribers_creator_idx
        ON email_subscribers (creator_id, subscribed_at DESC)
    `);

    // Broadcasts before message_tracking (FK target).
    await sql`
      CREATE TABLE IF NOT EXISTS email_broadcasts (
        id                serial PRIMARY KEY,
        creator_id        text NOT NULL,
        subject           text NOT NULL,
        body              text NOT NULL DEFAULT '',
        audience          text NOT NULL DEFAULT 'all',
        audience_label    text NOT NULL DEFAULT 'All subscribers',
        recipient_count   integer NOT NULL DEFAULT 0,
        open_rate         numeric(6, 1) NOT NULL DEFAULT 0,
        click_rate        numeric(6, 1) NOT NULL DEFAULT 0,
        status            text NOT NULL DEFAULT 'sent',
        image_url         text,
        sent_at           timestamptz NOT NULL DEFAULT now(),
        created_at        timestamptz NOT NULL DEFAULT now()
      )
    `;
    await safeAlter('email_broadcasts.creator_id', () =>
      sql`ALTER TABLE email_broadcasts ADD COLUMN IF NOT EXISTS creator_id text`
    );
    await safeAlter('email_broadcasts.subject', () =>
      sql`ALTER TABLE email_broadcasts ADD COLUMN IF NOT EXISTS subject text`
    );
    await safeAlter('email_broadcasts.body', () =>
      sql`ALTER TABLE email_broadcasts ADD COLUMN IF NOT EXISTS body text DEFAULT ''`
    );
    await safeAlter('email_broadcasts.audience', () =>
      sql`ALTER TABLE email_broadcasts ADD COLUMN IF NOT EXISTS audience text DEFAULT 'all'`
    );
    await safeAlter('email_broadcasts.audience_label', () =>
      sql`ALTER TABLE email_broadcasts ADD COLUMN IF NOT EXISTS audience_label text DEFAULT 'All subscribers'`
    );
    await safeAlter('email_broadcasts.recipient_count', () =>
      sql`ALTER TABLE email_broadcasts ADD COLUMN IF NOT EXISTS recipient_count integer DEFAULT 0`
    );
    await safeAlter('email_broadcasts.open_rate', () =>
      sql`ALTER TABLE email_broadcasts ADD COLUMN IF NOT EXISTS open_rate numeric(6, 1) DEFAULT 0`
    );
    await safeAlter('email_broadcasts.click_rate', () =>
      sql`ALTER TABLE email_broadcasts ADD COLUMN IF NOT EXISTS click_rate numeric(6, 1) DEFAULT 0`
    );
    await safeAlter('email_broadcasts.status', () =>
      sql`ALTER TABLE email_broadcasts ADD COLUMN IF NOT EXISTS status text DEFAULT 'sent'`
    );
    await safeAlter('email_broadcasts.image_url', () =>
      sql`ALTER TABLE email_broadcasts ADD COLUMN IF NOT EXISTS image_url text`
    );
    await safeAlter('email_broadcasts.sent_at', () =>
      sql`ALTER TABLE email_broadcasts ADD COLUMN IF NOT EXISTS sent_at timestamptz DEFAULT now()`
    );
    await safeAlter('email_broadcasts_creator_idx', () => sql`
      CREATE INDEX IF NOT EXISTS email_broadcasts_creator_idx
        ON email_broadcasts (creator_id, sent_at DESC)
    `);

    await sql`
      CREATE TABLE IF NOT EXISTS email_automations (
        id            text PRIMARY KEY,
        creator_id    text NOT NULL,
        community_id  integer,
        name          text NOT NULL,
        description   text NOT NULL DEFAULT '',
        trigger       text NOT NULL,
        subject       text NOT NULL,
        body          text NOT NULL,
        status        text NOT NULL DEFAULT 'active',
        sent_count    integer NOT NULL DEFAULT 0,
        last_sent_at  timestamptz,
        created_at    timestamptz NOT NULL DEFAULT now(),
        updated_at    timestamptz NOT NULL DEFAULT now()
      )
    `;
    await safeAlter('email_automations_creator_idx', () => sql`
      CREATE INDEX IF NOT EXISTS email_automations_creator_idx
        ON email_automations (creator_id, status)
    `);

    // No hard FK to email_broadcasts — heal even if older DBs diverge.
    await sql`
      CREATE TABLE IF NOT EXISTS email_message_tracking (
        resend_id     text PRIMARY KEY,
        broadcast_id  integer,
        creator_id    text NOT NULL,
        email         text NOT NULL,
        opened        boolean NOT NULL DEFAULT false,
        clicked       boolean NOT NULL DEFAULT false,
        created_at    timestamptz NOT NULL DEFAULT now(),
        opened_at     timestamptz,
        clicked_at    timestamptz
      )
    `;
    await safeAlter('email_message_tracking.broadcast_id', () =>
      sql`ALTER TABLE email_message_tracking ADD COLUMN IF NOT EXISTS broadcast_id integer`
    );
    await safeAlter('email_message_tracking_broadcast_idx', () => sql`
      CREATE INDEX IF NOT EXISTS email_message_tracking_broadcast_idx
        ON email_message_tracking (broadcast_id)
    `);

    await sql`
      CREATE TABLE IF NOT EXISTS email_automation_sends (
        id              serial PRIMARY KEY,
        automation_id   text,
        creator_id      text NOT NULL,
        community_id    integer,
        community_name  text,
        kind            text NOT NULL DEFAULT 'member_auto',
        subject         text NOT NULL,
        recipient_name  text NOT NULL,
        recipient_email text NOT NULL,
        product_title   text,
        resend_id       text,
        sent_at         timestamptz NOT NULL DEFAULT now()
      )
    `;
    await safeAlter('email_automation_sends.product_title', () =>
      sql`ALTER TABLE email_automation_sends ADD COLUMN IF NOT EXISTS product_title text`
    );
    await safeAlter('email_automation_sends_creator_idx', () => sql`
      CREATE INDEX IF NOT EXISTS email_automation_sends_creator_idx
        ON email_automation_sends (creator_id, sent_at DESC)
    `);

    schemaVersionApplied = EMAIL_CRM_SCHEMA_VERSION;
  })().catch((error) => {
    schemaReady = null;
    schemaVersionApplied = 0;
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

/** List automations — never auto-seed placeholders; creators add their own. */
export async function listPersistedAutomations(input: {
  creatorId: string;
  communityId?: number;
}): Promise<EmailAutomation[]> {
  if (!process.env.DATABASE_URL?.trim()) {
    return listEmailAutomations({ community_id: input.communityId });
  }
  try {
    await ensureEmailCrmSchema();
    // One-time cleanup of legacy seeded defaults (auto-{creatorPrefix}-{trigger}).
    await purgeLegacySeedAutomations(input.creatorId);
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
    return [];
  }
}

/** Remove the old ensureDefaultAutomations seed rows if still present. */
async function purgeLegacySeedAutomations(creatorId: string): Promise<void> {
  const prefix = `auto-${creatorId.slice(0, 8)}-`;
  for (const opt of AUTOMATION_TRIGGER_OPTIONS) {
    const id = `${prefix}${opt.value}`;
    try {
      await sql`
        DELETE FROM email_automations
        WHERE creator_id = ${creatorId} AND id = ${id}
      `;
    } catch {
      // ignore — table may be mid-heal
    }
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
  return {
    id,
    name,
    description,
    trigger,
    trigger_label: triggerLabel(trigger),
    subject,
    body,
    status,
    sent_count: 0,
    last_sent_at: null,
    community_id: communityId,
  };
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

/** Permanently delete an automation owned by this creator. */
export async function deletePersistedAutomation(
  creatorId: string,
  id: string
): Promise<boolean> {
  if (!process.env.DATABASE_URL?.trim()) {
    return deleteMockAutomation(id);
  }
  await ensureEmailCrmSchema();
  const rows = await sql`
    DELETE FROM email_automations
    WHERE id = ${id} AND creator_id = ${creatorId}
    RETURNING id
  `;
  return Array.isArray(rows) && rows.length > 0;
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
    return [];
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
}): Promise<boolean> {
  const email = input.email.trim().toLowerCase();
  if (!email) return false;

  if (!process.env.DATABASE_URL?.trim()) {
    syncSubscriber({
      email,
      name: input.name,
      user_id: input.userId,
      image: input.image,
      source: input.source,
      community_id: input.communityId,
      extra_tags: input.tags,
    });
    return true;
  }
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
    return true;
  } catch (error) {
    console.warn('[email/crm] persistSubscriber failed', error);
    return false;
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
      automations = [];
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
      .replace(/\{name\}/gi, input.recipientName || firstName)
      .replace(/\{email\}/gi, email)
      .replace(/\{community_url\}/gi, communityUrl);
    const body = applyMergeTags(auto.body, firstName, {
      name: input.recipientName || firstName,
      email,
      community: input.communityName,
      communityUrl,
    });

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

/** Persist a community-related email send so Email CRM history survives reloads. */
export async function recordPersistedCommunityEmailSend(input: {
  creatorId: string;
  communityId: number;
  communityName: string;
  kind: 'purchase_access' | 'member_auto';
  subject: string;
  recipientName: string;
  recipientEmail: string;
  resendId?: string | null;
  productTitle?: string | null;
}): Promise<boolean> {
  const recipientEmail = input.recipientEmail.trim().toLowerCase();
  if (!recipientEmail) return false;

  if (!process.env.DATABASE_URL?.trim()) {
    logCommunityAutomationEmail({
      community_id: input.communityId,
      community_name: input.communityName,
      kind: input.kind,
      kind_label:
        input.kind === 'purchase_access' ? 'Purchase access' : 'Automation',
      subject: input.subject,
      recipient_name: input.recipientName,
      recipient_email: recipientEmail,
      product_title: input.productTitle ?? null,
    });
    return true;
  }

  try {
    await ensureEmailCrmSchema();
    await sql`
      INSERT INTO email_automation_sends (
        automation_id, creator_id, community_id, community_name,
        kind, subject, recipient_name, recipient_email, product_title, resend_id
      )
      VALUES (
        NULL, ${input.creatorId}, ${input.communityId}, ${input.communityName},
        ${input.kind}, ${input.subject}, ${input.recipientName},
        ${recipientEmail}, ${input.productTitle ?? null}, ${input.resendId ?? null}
      )
    `;
    return true;
  } catch (error) {
    console.warn('[email/crm] recordPersistedCommunityEmailSend failed', error);
    return false;
  }
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
