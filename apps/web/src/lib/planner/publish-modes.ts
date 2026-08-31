/**
 * Rella-style publish modes for Content Planner posts.
 */

export type PublishMode =
  | 'auto_publish'
  | 'notification_reminder'
  | 'tiktok_draft';

export const DEFAULT_PUBLISH_MODE: PublishMode = 'auto_publish';

export const PUBLISH_MODE_OPTIONS: {
  id: PublishMode;
  title: string;
  description: string;
}[] = [
  {
    id: 'auto_publish',
    title: 'Auto-Publish',
    description: 'Direct API publish for standard videos and captions.',
  },
  {
    id: 'notification_reminder',
    title: 'Trending Sound / Manual Push',
    description:
      'Saves a reminder with media, caption, and deep links so you can post manually with a trending sound.',
  },
  {
    id: 'tiktok_draft',
    title: 'TikTok Draft',
    description: 'Uploads the video to your TikTok drafts / inbox folder.',
  },
];

export function parsePublishMode(raw: unknown): PublishMode {
  const value = String(raw || '')
    .trim()
    .toLowerCase();
  if (value === 'notification_reminder') return 'notification_reminder';
  if (value === 'tiktok_draft') return 'tiktok_draft';
  return 'auto_publish';
}

/** Deep links for manual camera post flows (Rella-style). */
export const MANUAL_PUBLISH_DEEP_LINKS = {
  instagram: 'instagram://camera',
  tiktok: 'snssdk1128://',
} as const;
