/** Demo CRM subscribers + broadcasts for creator email dashboard. */

export type SubscriberSource =
  | 'community_member'
  | 'ebook_purchaser'
  | 'webinar_attendee'
  | 'vip_access'
  | 'store_purchase';

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
    { label: 'Öppna event', url: 'https://nordiccreator.app/events/live' },
    { label: 'Classroom', url: 'https://nordiccreator.app/classroom' },
    { label: 'Store', url: 'https://nordiccreator.app/store' },
    { label: 'Community', url: 'https://nordiccreator.app/community' },
    { label: 'Avsluta prenumeration', url: 'https://nordiccreator.app/unsubscribe' },
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
};

export const AUDIENCE_OPTIONS = [
  { value: 'all', label: 'Alla medlemmar' },
  { value: 'community_member', label: 'Endast VIP Community' },
  { value: 'ebook_purchaser', label: 'Endast E-boksköpare' },
  { value: 'webinar_attendee', label: 'Endast Webinar-deltagare' },
  { value: 'vip_access', label: 'Endast VIP Access' },
  { value: 'store_purchase', label: 'Endast Store-köpare' },
] as const;

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

/** Runtime syncs (join / purchase) in demo mode. */
let extraSubscribers: EmailSubscriber[] = [];
let extraBroadcasts: EmailBroadcast[] = [];
let nextSubId = 200;
let nextBroadcastId = 50;

const SEED: EmailSubscriber[] = [
  {
    id: 'sub-1',
    user_id: 'seed-1',
    name: 'Emma Lindqvist',
    email: 'emma@example.com',
    image: null,
    source: 'community_member',
    source_label: SOURCE_LABELS.community_member,
    tags: ['Community Member', 'VIP'],
    community_id: 101,
    subscribed_at: daysAgo(40),
  },
  {
    id: 'sub-2',
    user_id: 'seed-2',
    name: 'Marcus Björk',
    email: 'marcus@example.com',
    image: null,
    source: 'ebook_purchaser',
    source_label: SOURCE_LABELS.ebook_purchaser,
    tags: ['E-Book Purchaser'],
    community_id: 101,
    subscribed_at: daysAgo(28),
  },
  {
    id: 'sub-3',
    user_id: 'seed-3',
    name: 'Astrid Karlsson',
    email: 'astrid@example.com',
    image: null,
    source: 'webinar_attendee',
    source_label: SOURCE_LABELS.webinar_attendee,
    tags: ['Webinar Attendee', 'Community Member'],
    community_id: 102,
    subscribed_at: daysAgo(21),
  },
  {
    id: 'sub-4',
    user_id: 'seed-5',
    name: 'Linn Petersson',
    email: 'linn@example.com',
    image: null,
    source: 'vip_access',
    source_label: SOURCE_LABELS.vip_access,
    tags: ['VIP Access', 'Community Member'],
    community_id: 101,
    subscribed_at: daysAgo(12),
  },
  {
    id: 'sub-5',
    user_id: 'seed-8',
    name: 'Nora Ek',
    email: 'nora@example.com',
    image: null,
    source: 'store_purchase',
    source_label: SOURCE_LABELS.store_purchase,
    tags: ['Store Purchase'],
    community_id: 102,
    subscribed_at: daysAgo(10),
  },
  {
    id: 'sub-6',
    user_id: 'ebba-demo',
    name: 'Ebba Brobeck',
    email: 'ebbabrobeck@test.se',
    image: null,
    source: 'community_member',
    source_label: SOURCE_LABELS.community_member,
    tags: ['Community Member', 'Owner'],
    community_id: 101,
    subscribed_at: daysAgo(90),
  },
  {
    id: 'sub-7',
    user_id: 'seed-9',
    name: 'Felix Åberg',
    email: 'felix@example.com',
    image: null,
    source: 'ebook_purchaser',
    source_label: SOURCE_LABELS.ebook_purchaser,
    tags: ['E-Book Purchaser', 'Webinar Attendee'],
    community_id: 101,
    subscribed_at: daysAgo(4),
  },
  {
    id: 'sub-8',
    user_id: null,
    name: 'Sara Magnusson',
    email: 'sara@example.com',
    image: null,
    source: 'webinar_attendee',
    source_label: SOURCE_LABELS.webinar_attendee,
    tags: ['Webinar Attendee'],
    community_id: 102,
    subscribed_at: daysAgo(2),
  },
];

const SEED_BROADCASTS: EmailBroadcast[] = [
  {
    id: 'bc-1',
    subject: 'Välkommen till Creator Lab 🎉',
    body: 'Hej {first_name}!\n\nKul att du är med i communityn.',
    audience: 'all',
    audience_label: 'Alla medlemmar',
    recipient_count: 48,
    open_rate: 62.4,
    click_rate: 18.2,
    status: 'sent',
    sent_at: daysAgo(14),
  },
  {
    id: 'bc-2',
    subject: 'Din e-bok väntar — ladda ned här',
    body: 'Hej {first_name},\n\nHär är länken till din e-bok.',
    audience: 'ebook_purchaser',
    audience_label: 'Endast E-boksköpare',
    recipient_count: 19,
    open_rate: 71.1,
    click_rate: 34.5,
    status: 'sent',
    sent_at: daysAgo(7),
  },
  {
    id: 'bc-3',
    subject: 'Påminnelse: Live i morgon kl 18',
    body: 'Hej {first_name}!\n\nVi ses live imorgon.',
    audience: 'webinar_attendee',
    audience_label: 'Endast Webinar-deltagare',
    recipient_count: 31,
    open_rate: 54.8,
    click_rate: 22.0,
    status: 'sent',
    sent_at: daysAgo(3),
  },
];

function allSubscribers(): EmailSubscriber[] {
  const byEmail = new Map<string, EmailSubscriber>();
  for (const s of [...SEED, ...extraSubscribers]) {
    byEmail.set(s.email.toLowerCase(), s);
  }
  return Array.from(byEmail.values()).sort(
    (a, b) => new Date(b.subscribed_at).getTime() - new Date(a.subscribed_at).getTime()
  );
}

export function listEmailSubscribers(opts?: {
  tag?: string;
  q?: string;
  community_id?: number;
}) {
  let list = allSubscribers();
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

export function listEmailBroadcasts() {
  return [...extraBroadcasts, ...SEED_BROADCASTS].sort(
    (a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime()
  );
}

export function getEmailCrmStats() {
  const subscribers = allSubscribers();
  const broadcasts = listEmailBroadcasts().filter((b) => b.status === 'sent');
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
  email: string;
  name: string;
  user_id?: string | null;
  image?: string | null;
  source: SubscriberSource;
  community_id?: number | null;
  extra_tags?: string[];
}): EmailSubscriber {
  const email = input.email.trim().toLowerCase();
  const existing = allSubscribers().find((s) => s.email.toLowerCase() === email);
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
    extraSubscribers = [
      updated,
      ...extraSubscribers.filter((s) => s.email.toLowerCase() !== email),
    ];
    // Also override seed via extras
    return updated;
  }

  const created: EmailSubscriber = {
    id: `sub-${nextSubId++}`,
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
  extraSubscribers = [created, ...extraSubscribers];
  return created;
}

export function createBroadcast(input: {
  subject: string;
  body: string;
  audience: string;
  image_url?: string | null;
  status?: 'sent' | 'test';
}): EmailBroadcast {
  const audienceOpt =
    AUDIENCE_OPTIONS.find((a) => a.value === input.audience) ?? AUDIENCE_OPTIONS[0];
  const recipients =
    input.audience === 'all'
      ? allSubscribers()
      : allSubscribers().filter((s) => s.source === input.audience);
  const count = Math.max(recipients.length, input.status === 'test' ? 1 : 0);
  const broadcast: EmailBroadcast = {
    id: `bc-${nextBroadcastId++}`,
    subject: input.subject,
    body: input.body,
    image_url: input.image_url ?? null,
    audience: input.audience,
    audience_label: audienceOpt.label,
    recipient_count: count,
    open_rate: input.status === 'test' ? 0 : 0,
    click_rate: 0,
    status: input.status ?? 'sent',
    sent_at: new Date().toISOString(),
  };
  if (input.status !== 'test') {
    // Simulate early engagement metrics for sent broadcasts.
    broadcast.open_rate = Math.round((48 + (count % 20)) * 10) / 10;
    broadcast.click_rate = Math.round((12 + (count % 15)) * 10) / 10;
    broadcast.status = 'sent';
  }
  extraBroadcasts = [broadcast, ...extraBroadcasts];
  return broadcast;
}

export function applyMergeTags(body: string, firstName: string) {
  return body.replace(/\{first_name\}/gi, firstName || 'där');
}

export function getMockEmailCrmPayload(opts?: {
  tag?: string;
  q?: string;
  community_id?: number;
}) {
  const subscribers = listEmailSubscribers(opts);
  const broadcasts = listEmailBroadcasts();
  const global = getEmailCrmStats();
  // Scope headline stats to the active brand when community_id is set.
  const total_subscribers = opts?.community_id
    ? subscribers.length
    : global.total_subscribers;
  return {
    ...global,
    total_subscribers,
    average_open_rate: global.average_open_rate,
    subscribers,
    broadcasts,
    audiences: AUDIENCE_OPTIONS,
    tags: [
      'all',
      ...Array.from(new Set(allSubscribers().flatMap((s) => s.tags))),
    ],
    demo: true as const,
  };
}
