/**
 * Map live platform media (IG / FB / TikTok) into PlannerPost shapes for the calendar.
 */

import type {
  PlannerPost,
  SocialPlatform,
} from '@/lib/mock-content-planner';
import type { UnifiedPostMetric } from '@/lib/analytics/unified-posts';

/** Stable id prefix so we never confuse platform imports with Clikd drafts. */
export const PLATFORM_POST_ID_PREFIX = 'platform:';

export function isPlatformImportedPost(post: PlannerPost): boolean {
  return (
    post.source === 'platform' ||
    String(post.id || '').startsWith(PLATFORM_POST_ID_PREFIX) ||
    String(post.id || '').startsWith('meta-ig-')
  );
}

function mediaKindFromType(
  mediaType?: string
): PlannerPost['media_type'] {
  const t = String(mediaType || '').toUpperCase();
  if (t.includes('VIDEO') || t === 'REELS' || t === 'REEL') return 'video';
  if (t.includes('CAROUSEL')) return 'carousel';
  if (t.includes('IMAGE') || t.includes('PHOTO')) return 'image';
  return mediaType ? 'image' : null;
}

/** Raw platform media id from unified / legacy planner ids. */
export function platformMediaKey(id: string, platform?: string): string {
  const raw = String(id || '');
  if (raw.startsWith(PLATFORM_POST_ID_PREFIX)) {
    return raw.slice(PLATFORM_POST_ID_PREFIX.length).toLowerCase();
  }
  if (raw.startsWith('meta-ig-')) {
    return `instagram:${raw.slice('meta-ig-'.length)}`.toLowerCase();
  }
  if (platform && !raw.includes(':')) {
    return `${platform}:${raw}`.toLowerCase();
  }
  return raw.toLowerCase();
}

export function unifiedPostToPlannerPost(
  post: UnifiedPostMetric,
  project: string
): PlannerPost {
  const publishedAt = post.publishedAt || new Date().toISOString();
  const mediaType = mediaKindFromType(post.mediaType);
  const caption = post.caption || post.title || '';
  const hashtags = (caption.match(/#[\wåäöÅÄÖ]+/gi) ?? []).join(' ');

  return {
    id: `${PLATFORM_POST_ID_PREFIX}${post.id}`,
    title: post.title || `${post.platform} post`,
    caption,
    hashtags,
    platforms: [post.platform as SocialPlatform],
    workflow: 'PUBLISHED',
    status: 'published',
    scheduled_at: null,
    published_at: publishedAt,
    media_url: post.mediaUrl || null,
    media_type: mediaType,
    media_items: post.mediaUrl
      ? [
          {
            id: `media-${post.id}`,
            url: post.mediaUrl,
            type: mediaType === 'video' ? 'video' : 'image',
          },
        ]
      : [],
    media_urls: post.mediaUrl ? [post.mediaUrl] : [],
    project,
    campaigns: [],
    assignees: [],
    subtasks: [],
    auto_post: false,
    activity: [
      {
        id: `act-${post.id}`,
        text: 'Imported from connected social profile',
        created_at: publishedAt,
        visibility: 'public',
      },
    ],
    comments: [],
    created_at: publishedAt,
    created_by: 'platform',
    source: 'platform',
    permalink: post.permalink || null,
  };
}

/**
 * Merge Clikd planner posts with live platform posts for calendar display.
 * Drops platform rows that already match a Clikd post (same media id / permalink).
 */
export function mergePlannerWithPlatformPosts(
  clikdPosts: PlannerPost[],
  platformPosts: PlannerPost[]
): PlannerPost[] {
  const taken = new Set<string>();

  for (const p of clikdPosts) {
    taken.add(platformMediaKey(p.id));
    if (p.permalink) taken.add(`url:${p.permalink.trim().toLowerCase()}`);
    // Legacy Meta sync ids already in DB / memory
    if (p.id.startsWith('meta-ig-')) {
      taken.add(platformMediaKey(p.id));
    }
    // Caption+day fingerprint for soft dedupe when ids differ
    const day = (p.published_at || p.scheduled_at || '').slice(0, 10);
    const cap = (p.caption || p.title || '').trim().slice(0, 48).toLowerCase();
    if (day && cap) {
      for (const plat of p.platforms) {
        taken.add(`fp:${plat}:${day}:${cap}`);
      }
    }
  }

  const extras = platformPosts.filter((p) => {
    const key = platformMediaKey(p.id);
    if (taken.has(key)) return false;
    if (p.permalink && taken.has(`url:${p.permalink.trim().toLowerCase()}`)) {
      return false;
    }
    const day = (p.published_at || '').slice(0, 10);
    const cap = (p.caption || p.title || '').trim().slice(0, 48).toLowerCase();
    const plat = p.platforms[0];
    if (day && cap && plat && taken.has(`fp:${plat}:${day}:${cap}`)) {
      return false;
    }
    return true;
  });

  return [...clikdPosts, ...extras];
}
