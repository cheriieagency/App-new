/** Demo CRM subscribers + broadcasts for creator email dashboard. */

import {
  buildCommunityAccessEmail,
  type CommunityAccessEmailInput,
} from '@/lib/community-access-email';

export type SubscriberSource =
  | 'community_member'
  | 'ebook_purchaser'
  | 'webinar_attendee'
  | 'vip_access'
  | 'store_purchase'
  | 'imported_list';

export type EmailSubscriber = {
  id: string;
  user_id: string | null;
  name: string;
  email: string;
  image: string | null;
  source: SubscriberSource;
  source_label: string;
  tags: string[];
  community_id: number | null;
  subscribed_at: string;
};

export type EmailBroadcast = {
  id: string;
  subject: string;
  body: string;
  image_url?: string | null;
  audience: string;
  audience_label: string;
  recipient_count: number;
  open_rate: number;
  click_rate: number;
  status: 'sent' | 'draft' | 'test';
  sent_at: string;
};

export type EmailAutomationTrigger =
  | 'purchase_community_access'
  | 'community_join'
  | 'webinar_rsvp'
  | 'ebook_download';

export type EmailAutomation = {
  id: string;
  name: string;
  description: string;
  trigger: EmailAutomationTrigger;
  trigger_label: string;
  /** Subject template shown in the automations list. */
  subject: string;
  /** Email body template ({first_name}, {community} supported). */
  body: string;
  status: 'active' | 'paused';
  sent_count: number;
  last_sent_at: string | null;
  /** Optional brand scope — null = all workspaces. */
  community_id: number | null;
};

export const AUTOMATION_TRIGGER_OPTIONS: {
  value: EmailAutomationTrigger;
  label: string;
  defaultName: string;
  defaultSubject: string;
  defaultBody: string;
}[] = [
  {
    value: 'purchase_community_access',
    label: 'Product purchase → community access',
    defaultName: 'Community access after purchase',
    defaultSubject: "You're in — access {community}",
    defaultBody:
      'Hi {first_name},\n\nThanks for your purchase. Open your community here:\n{community_url}\n\nSee you inside!',
  },
  {
    value: 'community_join',
    label: 'New community member',
    defaultName: 'Welcome to community',
    defaultSubject: 'Welcome to {community}',
    defaultBody:
      'Hi {first_name},\n\nWelcome to {community}. We’re glad you’re here.\n\nExplore the feed, classroom and upcoming events.',
  },
  {
    value: 'webinar_rsvp',
    label: 'Event RSVP',
    defaultName: 'Webinar confirmation',
    defaultSubject: "You're registered — see you live",
    defaultBody:
      'Hi {first_name},\n\nYou’re registered for the next live session in {community}.\nWe’ll send the link before we go live.',
  },
  {
    value: 'ebook_download',
    label: 'Lead magnet / e-book',
    defaultName: 'E-book delivery',
    defaultSubject: 'Your download is ready',
    defaultBody:
      'Hi {first_name},\n\nHere’s your download from {community}. Enjoy!',
  },
];

function triggerLabel(trigger: EmailAutomationTrigger): string {
  return (
    AUTOMATION_TRIGGER_OPTIONS.find((o) => o.value === trigger)?.label ?? trigger
  );
}

/** One automated community email that was sent (purchase unlock or member auto). */
export type CommunityAutomationEmail = {
  id: string;
  community_id: number;
  community_name: string;
  kind: 'purchase_access' | 'member_auto';
  kind_label: string;
  subject: string;
  recipient_name: string;
  recipient_email: string;
  /** Product title when kind is purchase_access. */
  product_title?: string | null;
  sent_at: string;
};

export type BroadcastAnalytics = {
  sent: number;
  delivered: number;
  bounced: number;
  opens: number;
  unique_opens: number;
  clicks: number;
  unique_clicks: number;
  unsubscribed: number;
  spam_complaints: number;
  open_rate: number;
  click_rate: number;
  /** Click-to-open rate (unique clicks / unique opens). */
  ctor: number;
  delivery_rate: number;
  devices: { label: string; pct: number }[];
  top_links: { label: string; url: string; clicks: number }[];
  opens_by_hour: { label: string; opens: number }[];
};

/** Derive richer demo analytics from broadcast summary rates. */
export function getBroadcastAnalytics(b: EmailBroadcast): BroadcastAnalytics {
  const sent = Math.max(0, b.recipient_count);
  const seed = b.id.split('').reduce((n, c) => n + c.charCodeAt(0), 0);
  const bounceRate = sent === 0 ? 0 : 0.8 + (seed % 20) / 10; // ~0.8–2.7%
  const bounced = Math.round((sent * bounceRate) / 100);
  const delivered = Math.max(0, sent - bounced);
  const unique_opens = Math.round((delivered * b.open_rate) / 100);
  const opens = Math.round(unique_opens * (1.12 + (seed % 8) / 100));
  const unique_clicks = Math.round((delivered * b.click_rate) / 100);
  const clicks = Math.round(unique_clicks * (1.08 + (seed % 6) / 100));
  const unsubscribed = Math.max(0, Math.round(delivered * (0.002 + (seed % 5) / 1000)));
  const spam_complaints = Math.max(0, Math.round(delivered * (0.0005 + (seed % 3) / 10000)));
  const ctor =
    unique_opens === 0 ? 0 : Math.round((unique_clicks / unique_opens) * 1000) / 10;
  const delivery_rate =
    sent === 0 ? 0 : Math.round((delivered / sent) * 1000) / 10;

  const mobilePct = 48 + (seed % 25);
  const desktopPct = Math.max(10, 100 - mobilePct - (8 + (seed % 7)));
  const tabletPct = Math.max(0, 100 - mobilePct - desktopPct);

  const linkPool = [
    { label: 'Öppna event', url: 'https://clikd.app/events/live' },
    { label: 'Classroom', url: 'https://clikd.app/classroom' },
    { label: 'Store', url: 'https://clikd.app/store' },
    { label: 'Community', url: 'https://clikd.app/community' },
    { label: 'Avsluta prenumeration', url: 'https://clikd.app/unsubscribe' },
  ];
  const top_links = linkPool.slice(0, 3 + (seed % 2)).map((link, i) => ({
    ...link,
    clicks: Math.max(
      0,
      Math.round(unique_clicks * (0.45 - i * 0.12) * (1 + ((seed + i) % 5) / 20))
    ),
  }));

  // Relative open volume across the first 12 hours after send.
  const weights = [4, 12, 18, 22, 16, 10, 8, 6, 5, 4, 3, 2];
  const weightSum = weights.reduce((a, w) => a + w, 0);
  const opens_by_hour = weights.map((w, i) => ({
    label: `+${i}h`,
    opens: Math.round((opens * w) / weightSum),
  }));

  return {
    sent,
    delivered,
    bounced,
    opens,
    unique_opens,
    clicks,
    unique_clicks,
    unsubscribed,
    spam_complaints,
    open_rate: b.open_rate,
    click_rate: b.click_rate,
    ctor,
    delivery_rate,
    devices: [
      { label: 'Mobil', pct: mobilePct },
      { label: 'Desktop', pct: desktopPct },
      { label: 'Surfplatta', pct: tabletPct },
    ],
    top_links,
    opens_by_hour,
  };
}

export const SOURCE_LABELS: Record<SubscriberSource, string> = {
  community_member: 'Community Member',
  ebook_purchaser: 'E-Book Purchaser',
  webinar_attendee: 'Webinar Attendee',
  vip_access: 'VIP Access',
  store_purchase: 'Store Purchase',
  imported_list: 'Imported List',
};

export const AUDIENCE_OPTIONS = [
  { value: 'all', label: 'Alla medlemmar' },
  { value: 'community_member', label: 'Endast VIP Community' },
  { value: 'ebook_purchaser', label: 'Endast E-boksköpare' },
  { value: 'webinar_attendee', label: 'Endast Webinar-deltagare' },
  { value: 'vip_access', label: 'Endast VIP Access' },
  { value: 'store_purchase', label: 'Endast Store-köpare' },
  { value: 'imported_list', label: 'Imported list' },
] as const;

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

/**
 * In-memory CRM buckets keyed by creatorId so demo mode never leaks
 * subscribers / broadcasts / automations across logged-in users.
 */
type CreatorCrmBucket = {
  subscribers: EmailSubscriber[];
  broadcasts: EmailBroadcast[];
  automations: EmailAutomation[];
  communityEmails: CommunityAutomationEmail[];
  nextSubId: number;
  nextBroadcastId: number;
  nextAutomationId: number;
  nextCommunityEmailId: number;
  automationSendBump: Map<string, number>;
  automationLastSent: Map<string, string>;
};

const creatorBuckets = new Map<string, CreatorCrmBucket>();

function normalizeCreatorId(creatorId?: string | null): string {
  const id = String(creatorId ?? '').trim();
  if (!id) {
    throw new Error('creatorId_required');
  }
  return id;
}

function getCreatorBucket(creatorId: string): CreatorCrmBucket {
  const key = normalizeCreatorId(creatorId);
  let bucket = creatorBuckets.get(key);
  if (!bucket) {
    bucket = {
      subscribers: [],
      broadcasts: [],
      automations: [],
      communityEmails: [],
      nextSubId: 1,
      nextBroadcastId: 1,
      nextAutomationId: 1,
      nextCommunityEmailId: 1,
      automationSendBump: new Map(),
      automationLastSent: new Map(),
    };
    creatorBuckets.set(key, bucket);
  }
  return bucket;
}

function allSubscribers(creatorId: string): EmailSubscriber[] {
  const bucket = getCreatorBucket(creatorId);
  const byEmail = new Map<string, EmailSubscriber>();
  for (const s of bucket.subscribers) {
    byEmail.set(s.email.toLowerCase(), s);
  }
  return Array.from(byEmail.values()).sort(
    (a, b) => new Date(b.subscribed_at).getTime() - new Date(a.subscribed_at).getTime()
  );
}

export function listEmailSubscribers(opts: {
  creatorId: string;
  tag?: string;
  q?: string;
  community_id?: number;
}) {
  let list = allSubscribers(opts.creatorId);
  if (opts?.community_id) {
    // Strict brand scope — only contacts acquired via this workspace.
    list = list.filter((s) => s.community_id === opts.community_id);
  }
  if (opts?.tag && opts.tag !== 'all') {
    const tag = opts.tag.toLowerCase();
    list = list.filter(
      (s) =>
        s.source === opts.tag ||
        s.tags.some((t) => t.toLowerCase().includes(tag)) ||
        s.source_label.toLowerCase().includes(tag)
    );
  }
  if (opts?.q?.trim()) {
    const q = opts.q.trim().toLowerCase();
    list = list.filter(
      (s) =>
        s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q)
    );
  }
  return list;
}

export function listEmailBroadcasts(creatorId: string) {
  const bucket = getCreatorBucket(creatorId);
  return [...bucket.broadcasts].sort(
    (a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime()
  );
}

/** Automations available in Email CRM (optionally scoped to a brand). */
export function listEmailAutomations(opts: {
  creatorId: string;
  community_id?: number;
}): EmailAutomation[] {
  const bucket = getCreatorBucket(opts.creatorId);
  return bucket.automations
    .map((a) => {
      const bump = bucket.automationSendBump.get(a.id) ?? 0;
      const last = bucket.automationLastSent.get(a.id) ?? a.last_sent_at;
      return {
        ...a,
        body: a.body || '',
        sent_count: a.sent_count + bump,
        last_sent_at: last,
      };
    })
    .filter(
      (a) =>
        a.community_id == null ||
        opts?.community_id == null ||
        a.community_id === opts.community_id
    );
}

function bumpAutomationSend(creatorId: string, automationId: string) {
  const bucket = getCreatorBucket(creatorId);
  bucket.automationSendBump.set(
    automationId,
    (bucket.automationSendBump.get(automationId) ?? 0) + 1
  );
  bucket.automationLastSent.set(automationId, new Date().toISOString());
}

/** Toggle active/paused for demo automations. */
export function setEmailAutomationStatus(
  creatorId: string,
  id: string,
  status: 'active' | 'paused'
): EmailAutomation | null {
  const bucket = getCreatorBucket(creatorId);
  const idx = bucket.automations.findIndex((a) => a.id === id);
  if (idx < 0) return null;
  bucket.automations[idx] = { ...bucket.automations[idx], status };
  return listEmailAutomations({ creatorId }).find((a) => a.id === id) ?? null;
}

export type UpsertAutomationInput = {
  id?: string;
  name: string;
  description?: string;
  trigger: EmailAutomationTrigger;
  subject: string;
  body: string;
  status?: 'active' | 'paused';
  community_id?: number | null;
};

/** Create or update an automation rule. */
export function upsertEmailAutomation(
  input: UpsertAutomationInput & { creatorId: string }
): EmailAutomation {
  const bucket = getCreatorBucket(input.creatorId);
  const trigger = input.trigger;
  const label = triggerLabel(trigger);
  const defaults =
    AUTOMATION_TRIGGER_OPTIONS.find((o) => o.value === trigger) ??
    AUTOMATION_TRIGGER_OPTIONS[0];

  if (input.id) {
    const idx = bucket.automations.findIndex((a) => a.id === input.id);
    if (idx >= 0) {
      const prev = bucket.automations[idx];
      bucket.automations[idx] = {
        ...prev,
        name: input.name.trim() || prev.name,
        description: (input.description ?? prev.description).trim() || prev.description,
        trigger,
        trigger_label: label,
        subject: input.subject.trim() || prev.subject,
        body: input.body.trim() || prev.body,
        status: input.status ?? prev.status,
        community_id:
          input.community_id !== undefined ? input.community_id : prev.community_id,
      };
      return { ...bucket.automations[idx] };
    }
  }

  const created: EmailAutomation = {
    id: `auto-${bucket.nextAutomationId++}`,
    name: input.name.trim() || defaults.defaultName,
    description:
      (input.description ?? '').trim() ||
      `Automated email for ${label.toLowerCase()}.`,
    trigger,
    trigger_label: label,
    subject: input.subject.trim() || defaults.defaultSubject,
    body: input.body.trim() || defaults.defaultBody,
    status: input.status ?? 'active',
    sent_count: 0,
    last_sent_at: null,
    community_id: input.community_id ?? null,
  };
  bucket.automations = [created, ...bucket.automations];
  return { ...created };
}

/** Remove an automation from the in-memory store. */
export function deleteEmailAutomation(creatorId: string, id: string): boolean {
  const bucket = getCreatorBucket(creatorId);
  const before = bucket.automations.length;
  bucket.automations = bucket.automations.filter((a) => a.id !== id);
  return bucket.automations.length < before;
}

/** Recent automated emails for a community (purchase unlocks + member autos). */
export function listCommunityAutomationEmails(opts: {
  creatorId: string;
  community_id?: number;
}): CommunityAutomationEmail[] {
  const bucket = getCreatorBucket(opts.creatorId);
  const all = [...bucket.communityEmails].sort(
    (a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime()
  );
  if (opts?.community_id != null) {
    return all.filter((e) => e.community_id === opts.community_id);
  }
  return all;
}

export function logCommunityAutomationEmail(
  input: Omit<CommunityAutomationEmail, 'id' | 'sent_at'> & {
    creatorId: string;
    sent_at?: string;
  }
): CommunityAutomationEmail {
  const bucket = getCreatorBucket(input.creatorId);
  const { creatorId: _creatorId, sent_at, ...rest } = input;
  const row: CommunityAutomationEmail = {
    ...rest,
    id: `ce-live-${bucket.nextCommunityEmailId++}`,
    sent_at: sent_at ?? new Date().toISOString(),
  };
  bucket.communityEmails = [row, ...bucket.communityEmails];
  return row;
}

export function getEmailCrmStats(creatorId: string) {
  const subscribers = allSubscribers(creatorId);
  const broadcasts = listEmailBroadcasts(creatorId).filter((b) => b.status === 'sent');
  const avgOpen =
    broadcasts.length === 0
      ? 0
      : broadcasts.reduce((n, b) => n + b.open_rate, 0) / broadcasts.length;
  return {
    total_subscribers: subscribers.length,
    average_open_rate: Math.round(avgOpen * 10) / 10,
    total_broadcasts: broadcasts.length,
  };
}

/** Auto-sync: join community / buy product → email list. */
export function syncSubscriber(input: {
  creatorId: string;
  email: string;
  name: string;
  user_id?: string | null;
  image?: string | null;
  source: SubscriberSource;
  community_id?: number | null;
  extra_tags?: string[];
}): EmailSubscriber {
  const bucket = getCreatorBucket(input.creatorId);
  const email = input.email.trim().toLowerCase();
  const existing = allSubscribers(input.creatorId).find(
    (s) => s.email.toLowerCase() === email
  );
  const label = SOURCE_LABELS[input.source];
  const tags = Array.from(
    new Set([
      ...(existing?.tags ?? []),
      label,
      ...(input.extra_tags ?? []),
    ])
  );

  if (existing) {
    const updated: EmailSubscriber = {
      ...existing,
      name: input.name || existing.name,
      image: input.image ?? existing.image,
      source: existing.source === 'community_member' ? input.source : existing.source,
      source_label: SOURCE_LABELS[
        existing.source === 'community_member' ? input.source : existing.source
      ],
      tags,
      community_id: input.community_id ?? existing.community_id,
    };
    bucket.subscribers = [
      updated,
      ...bucket.subscribers.filter((s) => s.email.toLowerCase() !== email),
    ];
    return updated;
  }

  const created: EmailSubscriber = {
    id: `sub-${bucket.nextSubId++}`,
    user_id: input.user_id ?? null,
    name: input.name,
    email,
    image: input.image ?? null,
    source: input.source,
    source_label: label,
    tags,
    community_id: input.community_id ?? null,
    subscribed_at: new Date().toISOString(),
  };
  bucket.subscribers = [created, ...bucket.subscribers];
  return created;
}

export function createBroadcast(input: {
  creatorId: string;
  subject: string;
  body: string;
  audience: string;
  image_url?: string | null;
  status?: 'sent' | 'test' | 'draft';
  recipient_count?: number;
}): EmailBroadcast {
  const bucket = getCreatorBucket(input.creatorId);
  const audienceOpt =
    AUDIENCE_OPTIONS.find((a) => a.value === input.audience) ?? AUDIENCE_OPTIONS[0];
  const recipients =
    input.audience === 'all'
      ? allSubscribers(input.creatorId)
      : allSubscribers(input.creatorId).filter((s) => s.source === input.audience);
  const count =
    input.recipient_count ??
    Math.max(recipients.length, input.status === 'test' || input.status === 'draft' ? 0 : 0);
  const broadcast: EmailBroadcast = {
    id: `bc-${bucket.nextBroadcastId++}`,
    subject: input.subject,
    body: input.body,
    image_url: input.image_url ?? null,
    audience: input.audience,
    audience_label: audienceOpt.label,
    recipient_count: count,
    open_rate: 0,
    click_rate: 0,
    status: input.status ?? 'sent',
    sent_at: new Date().toISOString(),
  };
  if (broadcast.status === 'sent') {
    // Simulate early engagement metrics for sent broadcasts in demo mode.
    broadcast.open_rate = Math.round((48 + (count % 20)) * 10) / 10;
    broadcast.click_rate = Math.round((12 + (count % 15)) * 10) / 10;
  }
  bucket.broadcasts = [broadcast, ...bucket.broadcasts];
  return broadcast;
}

/** Upsert the single in-progress draft for a creator (demo mode). */
export function upsertDraftBroadcast(input: {
  creatorId: string;
  subject: string;
  body: string;
  audience: string;
  image_url?: string | null;
}): EmailBroadcast {
  const bucket = getCreatorBucket(input.creatorId);
  const audienceOpt =
    AUDIENCE_OPTIONS.find((a) => a.value === input.audience) ?? AUDIENCE_OPTIONS[0];
  const existingIdx = bucket.broadcasts.findIndex((b) => b.status === 'draft');
  const draft: EmailBroadcast = {
    id:
      existingIdx >= 0
        ? bucket.broadcasts[existingIdx].id
        : `bc-${bucket.nextBroadcastId++}`,
    subject: input.subject,
    body: input.body,
    image_url: input.image_url ?? null,
    audience: input.audience,
    audience_label: audienceOpt.label,
    recipient_count: 0,
    open_rate: 0,
    click_rate: 0,
    status: 'draft',
    sent_at: new Date().toISOString(),
  };
  if (existingIdx >= 0) {
    bucket.broadcasts[existingIdx] = draft;
  } else {
    bucket.broadcasts = [draft, ...bucket.broadcasts];
  }
  return draft;
}

export type MergeTagContext = {
  name?: string;
  email?: string;
  community?: string;
  communityUrl?: string;
};

/** Replace personalization brackets in subject/body templates. */
export function applyMergeTags(
  body: string,
  firstName: string,
  ctx?: MergeTagContext
) {
  const name = ctx?.name || firstName || 'there';
  const email = ctx?.email || '';
  const community = ctx?.community || '';
  const communityUrl = ctx?.communityUrl || '';
  return body
    .replace(/\{first_name\}/gi, firstName || 'there')
    .replace(/\{name\}/gi, name)
    .replace(/\{email\}/gi, email)
    .replace(/\{community\}/gi, community)
    .replace(/\{community_url\}/gi, communityUrl);
}

/**
 * Queue the automated post-purchase community invite email (demo CRM).
 * Syncs the buyer as a VIP/community subscriber and logs a 1:1 broadcast.
 */
export function sendCommunityAccessInvite(
  input: CommunityAccessEmailInput & { creatorId: string }
): {
  subscriber: EmailSubscriber;
  broadcast: EmailBroadcast;
  communityUrl: string;
  preview: string;
} {
  const content = buildCommunityAccessEmail(input);
  const subscriber = syncSubscriber({
    creatorId: input.creatorId,
    email: input.buyerEmail,
    name: input.buyerName || content.firstName,
    source: 'vip_access',
    community_id: input.communityId,
    extra_tags: ['Community Access', input.productTitle],
  });
  const personalized = applyMergeTags(content.body, content.firstName);
  const broadcast = createBroadcast({
    creatorId: input.creatorId,
    subject: content.subject,
    body: personalized,
    audience: 'vip_access',
    status: 'sent',
    recipient_count: 1,
  });
  // One-to-one automated send — override aggregate recipient count.
  broadcast.audience_label = 'Community access (auto)';
  broadcast.open_rate = 0;
  broadcast.click_rate = 0;
  bumpAutomationSend(input.creatorId, 'auto-community-access');
  logCommunityAutomationEmail({
    creatorId: input.creatorId,
    community_id: input.communityId,
    community_name: input.communityName,
    kind: 'purchase_access',
    kind_label: 'Purchase → community',
    subject: content.subject,
    recipient_name: input.buyerName || content.firstName,
    recipient_email: input.buyerEmail,
    product_title: input.productTitle,
  });
  return {
    subscriber,
    broadcast,
    communityUrl: content.communityUrl,
    preview: personalized,
  };
}

export function getMockEmailCrmPayload(opts: {
  creatorId: string;
  tag?: string;
  q?: string;
  community_id?: number;
}) {
  const creatorId = opts.creatorId;
  const subscribers = listEmailSubscribers(opts);
  const broadcasts = listEmailBroadcasts(creatorId);
  const automations = listEmailAutomations({
    creatorId,
    community_id: opts?.community_id,
  });
  const community_emails = listCommunityAutomationEmails({
    creatorId,
    community_id: opts?.community_id,
  });
  const stats = getEmailCrmStats(creatorId);
  // Scope headline stats to the active brand when community_id is set.
  const total_subscribers = opts?.community_id
    ? subscribers.length
    : stats.total_subscribers;
  return {
    ...stats,
    total_subscribers,
    average_open_rate: stats.average_open_rate,
    subscribers,
    broadcasts,
    automations,
    community_emails,
    audiences: AUDIENCE_OPTIONS,
    tags: [
      'all',
      ...Array.from(new Set(allSubscribers(creatorId).flatMap((s) => s.tags))),
    ],
    demo: true as const,
  };
}
