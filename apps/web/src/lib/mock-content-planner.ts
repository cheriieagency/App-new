/** In-memory Social Media Content Planner (demo). */

export type SocialPlatform = 'instagram' | 'tiktok' | 'linkedin' | 'youtube';

export type ContentTone = 'inspirerande' | 'professionell' | 'saljig' | 'casual';

export type PlannerPostStatus = 'draft' | 'scheduled' | 'published';

export type MediaKind = 'image' | 'video' | 'carousel';

export type PlannerMediaItem = {
  id: string;
  url: string;
  type: 'image' | 'video';
};

export type YoutubePrivacy = 'public' | 'unlisted' | 'private';

export type YoutubeMeta = {
  title: string;
  privacy: YoutubePrivacy;
  is_shorts: boolean;
  category: string;
  tags: string[];
};

export type PlannerPost = {
  id: string;
  caption: string;
  platforms: SocialPlatform[];
  status: PlannerPostStatus;
  scheduled_at: string | null;
  published_at: string | null;
  /** @deprecated Prefer media_items — kept for backward-compatible reads. */
  media_url: string | null;
  media_type: MediaKind | null;
  media_items: PlannerMediaItem[];
  youtube?: YoutubeMeta | null;
  idea_title?: string;
  created_at: string;
};

export type ConnectedSocialAccount = {
  platform: SocialPlatform;
  connected: boolean;
  handle: string | null;
  display_name: string | null;
  avatar_url: string | null;
  connected_at: string | null;
  /** YouTube: subscriber count when connected. */
  subscriber_count?: number | null;
};

export type AiContentIdea = {
  id: string;
  title: string;
  hook: string;
  template: string;
  captions: Partial<Record<SocialPlatform, string>>;
};

const now = Date.now();
const day = 24 * 60 * 60 * 1000;
const hour = 60 * 60 * 1000;

let postSeq = 10;
let mediaSeq = 100;

function normalizeMedia(
  media_items?: PlannerMediaItem[] | null,
  media_url?: string | null,
  media_type?: MediaKind | 'image' | 'video' | null
): { media_items: PlannerMediaItem[]; media_url: string | null; media_type: MediaKind | null } {
  if (media_items && media_items.length > 0) {
    const kind: MediaKind =
      media_items.length > 1
        ? 'carousel'
        : media_items[0].type === 'video'
          ? 'video'
          : 'image';
    return {
      media_items: media_items.slice(0, 10),
      media_url: media_items[0].url,
      media_type: kind,
    };
  }
  if (media_url) {
    const type = media_type === 'video' ? 'video' : 'image';
    return {
      media_items: [{ id: `legacy-${mediaSeq++}`, url: media_url, type }],
      media_url,
      media_type: type,
    };
  }
  return { media_items: [], media_url: null, media_type: null };
}

const posts: PlannerPost[] = [
  {
    id: 'post-1',
    caption:
      '3 misstag som kostar dig kunder online 👇\n\n1. Ingen tydlig CTA\n2. För långa videos\n3. Inget social proof\n\n#ehandel #tips #nordiccreator',
    platforms: ['instagram', 'tiktok'],
    status: 'scheduled',
    scheduled_at: new Date(now + 1 * day).toISOString(),
    published_at: null,
    media_url: null,
    media_type: null,
    media_items: [],
    idea_title: '3 misstag i e-handel',
    created_at: new Date(now - 2 * day).toISOString(),
  },
  {
    id: 'post-2',
    caption:
      'Så bygger du en community som faktiskt köper.\n\nVärde först. Erbjudande sen. Relation alltid.\n\n#community #creator #linkedin',
    platforms: ['linkedin'],
    status: 'scheduled',
    scheduled_at: new Date(now + 3 * day).toISOString(),
    published_at: null,
    media_url: null,
    media_type: null,
    media_items: [],
    idea_title: 'Community som konverterar',
    created_at: new Date(now - 1 * day).toISOString(),
  },
  {
    id: 'post-3',
    caption:
      'Behind the scenes från dagens livesändning 🎥\nVilken del vill ni se mer av?\n\n#bts #live #creatorlife',
    platforms: ['instagram'],
    status: 'published',
    scheduled_at: new Date(now - 1 * day).toISOString(),
    published_at: new Date(now - 1 * day).toISOString(),
    media_url: 'https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=800&q=80',
    media_type: 'image',
    media_items: [
      {
        id: 'm1',
        url: 'https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=800&q=80',
        type: 'image',
      },
    ],
    created_at: new Date(now - 3 * day).toISOString(),
  },
  {
    id: 'post-4',
    caption: 'Utkast: lansering av nya digitala produkten…',
    platforms: ['instagram', 'linkedin'],
    status: 'draft',
    scheduled_at: null,
    published_at: null,
    media_url: null,
    media_type: null,
    media_items: [],
    created_at: new Date(now - 4 * hour).toISOString(),
  },
  {
    id: 'post-5',
    caption:
      'Quick tip: Batcha 5 reels på en eftermiddag.\nDin framtida jag kommer tacka dig 🙌\n\n#contentcreator #productivity',
    platforms: ['tiktok', 'instagram', 'youtube'],
    status: 'scheduled',
    scheduled_at: new Date(now + 5 * day).toISOString(),
    published_at: null,
    media_url: null,
    media_type: null,
    media_items: [],
    youtube: {
      title: 'Batcha 5 reels på en eftermiddag',
      privacy: 'public',
      is_shorts: true,
      category: 'Education',
      tags: ['contentcreator', 'productivity', 'shorts'],
    },
    created_at: new Date(now - 5 * day).toISOString(),
  },
];

const socialAccounts: ConnectedSocialAccount[] = [
  {
    platform: 'instagram',
    connected: true,
    handle: '@nordic.creator',
    display_name: 'Nordic Creator',
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=nc-ig',
    connected_at: new Date(now - 30 * day).toISOString(),
  },
  {
    platform: 'tiktok',
    connected: false,
    handle: null,
    display_name: null,
    avatar_url: null,
    connected_at: null,
  },
  {
    platform: 'linkedin',
    connected: true,
    handle: 'Nordic Creator AB',
    display_name: 'Nordic Creator',
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=nc-li',
    connected_at: new Date(now - 12 * day).toISOString(),
  },
  {
    platform: 'youtube',
    connected: false,
    handle: null,
    display_name: null,
    avatar_url: null,
    connected_at: null,
    subscriber_count: null,
  },
];

const TONE_FLAVOR: Record<ContentTone, string> = {
  inspirerande: 'Du klarar det — börja idag.',
  professionell: 'Här är en konkret, beprövad approach.',
  saljig: 'Redo att ta nästa steg? Länken i bio.',
  casual: 'Okej, real talk — det här funkar faktiskt.',
};

const HASHTAGS: Record<SocialPlatform, string[]> = {
  instagram: ['#contentcreator', '#reels', '#nordiccreator', '#tips'],
  tiktok: ['#fyp', '#creator', '#tips', '#learnontiktok'],
  linkedin: ['#entreprenörskap', '#contentmarketing', '#leadership', '#b2b'],
  youtube: ['#youtube', '#creator', '#tutorial'],
};

export function mediaTypeBadge(items: PlannerMediaItem[]): string {
  if (!items.length) return 'Ingen media';
  if (items.length > 1) return `Karusell (${items.length} bilder)`;
  return items[0].type === 'video' ? 'Video' : 'Bild';
}

export function listPlannerPosts(): PlannerPost[] {
  return [...posts].sort((a, b) => {
    const aTime = a.scheduled_at || a.created_at;
    const bTime = b.scheduled_at || b.created_at;
    return new Date(aTime).getTime() - new Date(bTime).getTime();
  });
}

export function getPlannerPost(id: string): PlannerPost | null {
  return posts.find((p) => p.id === id) ?? null;
}

export function upsertPlannerPost(
  input: Partial<PlannerPost> & { caption: string; platforms: SocialPlatform[] }
): PlannerPost {
  const media = normalizeMedia(input.media_items, input.media_url, input.media_type);
  const existing = input.id ? posts.find((p) => p.id === input.id) : null;
  if (existing) {
    Object.assign(existing, {
      caption: input.caption,
      platforms: input.platforms,
      status: input.status ?? existing.status,
      scheduled_at:
        input.scheduled_at !== undefined ? input.scheduled_at : existing.scheduled_at,
      published_at:
        input.published_at !== undefined ? input.published_at : existing.published_at,
      media_url: media.media_url,
      media_type: media.media_type,
      media_items: media.media_items,
      youtube: input.youtube !== undefined ? input.youtube : existing.youtube,
      idea_title: input.idea_title ?? existing.idea_title,
    });
    return existing;
  }

  const post: PlannerPost = {
    id: `post-${++postSeq}`,
    caption: input.caption,
    platforms: input.platforms,
    status: input.status ?? 'draft',
    scheduled_at: input.scheduled_at ?? null,
    published_at: input.published_at ?? null,
    media_url: media.media_url,
    media_type: media.media_type,
    media_items: media.media_items,
    youtube: input.youtube ?? null,
    idea_title: input.idea_title,
    created_at: new Date().toISOString(),
  };
  posts.push(post);
  return post;
}

export function deletePlannerPost(id: string): boolean {
  const idx = posts.findIndex((p) => p.id === id);
  if (idx < 0) return false;
  posts.splice(idx, 1);
  return true;
}

export function listSocialAccounts(): ConnectedSocialAccount[] {
  return socialAccounts.map((a) => ({ ...a }));
}

export function setSocialConnection(
  platform: SocialPlatform,
  connect: boolean
): ConnectedSocialAccount {
  const acc = socialAccounts.find((a) => a.platform === platform);
  if (!acc) {
    throw new Error('Unknown platform');
  }
  if (connect) {
    const handles: Record<SocialPlatform, string> = {
      instagram: '@nordic.creator',
      tiktok: '@nordiccreator',
      linkedin: 'Nordic Creator AB',
      youtube: '@NordicCreator',
    };
    const names: Record<SocialPlatform, string> = {
      instagram: 'Nordic Creator',
      tiktok: 'Nordic Creator',
      linkedin: 'Nordic Creator',
      youtube: 'Nordic Creator Channel',
    };
    acc.connected = true;
    acc.handle = handles[platform];
    acc.display_name = names[platform];
    acc.avatar_url = `https://api.dicebear.com/7.x/avataaars/svg?seed=nc-${platform}`;
    acc.connected_at = new Date().toISOString();
    acc.subscriber_count = platform === 'youtube' ? 12840 : null;
  } else {
    acc.connected = false;
    acc.handle = null;
    acc.display_name = null;
    acc.avatar_url = null;
    acc.connected_at = null;
    acc.subscriber_count = null;
  }
  return { ...acc };
}

function buildCaption(
  prompt: string,
  platform: SocialPlatform,
  tone: ContentTone,
  angle: string
): string {
  const tags = HASHTAGS[platform].join(' ');
  const flavor = TONE_FLAVOR[tone];
  if (platform === 'linkedin') {
    return `${angle}\n\nÄmne: ${prompt}\n\n${flavor}\n\nVad är din erfarenhet?\n\n${tags}`;
  }
  if (platform === 'tiktok') {
    return `${angle} 🔥\n\n${prompt}\n\n${flavor}\n\n${tags}`;
  }
  if (platform === 'youtube') {
    return `${angle}\n\n${prompt}\n\n${flavor}\n\n${tags}`;
  }
  return `${angle}\n\n${prompt}\n\n${flavor}\n\n${tags}`;
}

/** Demo AI: produces 3 unique post ideas with per-platform captions. */
export function generateContentIdeas(input: {
  prompt: string;
  platforms: SocialPlatform[];
  tone: ContentTone;
}): AiContentIdea[] {
  const topic = input.prompt.trim() || 'ditt ämne';
  const platforms = input.platforms.length
    ? input.platforms
    : (['instagram'] as SocialPlatform[]);
  const tone = input.tone;

  const angles = [
    {
      title: `Hook: "${topic}" på 15 sekunder`,
      hook: 'Öppna med ett starkt påstående som stoppar scrollen.',
      template: 'Hook → 3 punkter → CTA',
    },
    {
      title: `Checklist: Gör detta innan du ${topic.toLowerCase()}`,
      hook: 'Checklistor får sparningar och delningar.',
      template: 'Intro → Checklist (5 steg) → Soft CTA',
    },
    {
      title: `Misstag folk gör kring ${topic}`,
      hook: 'Negativ framing skapar nyfikenhet.',
      template: 'Misstag 1–3 → Fix → CTA',
    },
  ];

  return angles.map((a, i) => {
    const captions: Partial<Record<SocialPlatform, string>> = {};
    for (const p of platforms) {
      captions[p] = buildCaption(topic, p, tone, a.hook);
    }
    return {
      id: `idea-${Date.now()}-${i}`,
      title: a.title,
      hook: a.hook,
      template: a.template,
      captions,
    };
  });
}

/** Demo AI polish: rewrite caption in selected tone. */
export function polishCaption(caption: string, tone: ContentTone = 'inspirerande'): string {
  const base = caption.trim() || 'Dela ditt budskap här.';
  const flavor = TONE_FLAVOR[tone];
  const withoutTags = base.replace(/#[\wåäöÅÄÖ]+/gi, '').trim();
  const tags = (base.match(/#[\wåäöÅÄÖ]+/gi) ?? []).join(' ');
  return `${flavor}\n\n${withoutTags}\n\n${tags}`.trim();
}

export const PLATFORM_META: Record<
  SocialPlatform,
  { label: string; color: string; connectLabel: string }
> = {
  instagram: {
    label: 'Instagram',
    color: '#E1306C',
    connectLabel: 'Koppla Instagram Business',
  },
  tiktok: {
    label: 'TikTok',
    color: '#010101',
    connectLabel: 'Koppla TikTok Business',
  },
  linkedin: {
    label: 'LinkedIn',
    color: '#0A66C2',
    connectLabel: 'Koppla LinkedIn Profil / Sida',
  },
  youtube: {
    label: 'YouTube',
    color: '#FF0000',
    connectLabel: 'Koppla YouTube Channel',
  },
};

export const TONE_OPTIONS: { value: ContentTone; label: string }[] = [
  { value: 'inspirerande', label: 'Inspirerande' },
  { value: 'professionell', label: 'Professionell' },
  { value: 'saljig', label: 'Säljig' },
  { value: 'casual', label: 'Casual / Humor' },
];

export const YOUTUBE_CATEGORIES = [
  'Education',
  'Entertainment',
  'Howto & Style',
  'People & Blogs',
  'Science & Technology',
  'Business',
  'Music',
] as const;

export const YOUTUBE_PRIVACY_OPTIONS: { value: YoutubePrivacy; label: string }[] = [
  { value: 'public', label: 'Offentlig (Public)' },
  { value: 'unlisted', label: 'Olistad (Unlisted)' },
  { value: 'private', label: 'Privat (Private)' },
];

export function nextMediaId() {
  return `media-${++mediaSeq}`;
}
