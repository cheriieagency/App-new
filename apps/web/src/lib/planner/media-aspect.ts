/**
 * Post Studio frame sizes for feed photos / carousels / Reels / Stories.
 * IG & Facebook feed: 1:1, 4:5, 3:4, 1.91:1. Vertical: 9:16.
 */

import type { SocialPlatform } from '@/lib/mock-content-planner';

export type MediaAspectRatio = '1:1' | '4:5' | '3:4' | '1.91:1' | '9:16';

export type ContentFormat = 'post' | 'reel' | 'carousel' | 'story';

export const MEDIA_ASPECT_OPTIONS: {
  id: MediaAspectRatio;
  label: string;
  hint: string;
}[] = [
  { id: '4:5', label: '4:5', hint: 'Portrait feed' },
  { id: '3:4', label: '3:4', hint: 'Tall feed' },
  { id: '1:1', label: '1:1', hint: 'Square' },
  { id: '1.91:1', label: '1.91:1', hint: 'Landscape' },
  { id: '9:16', label: '9:16', hint: 'Vertical' },
];

export function isMediaAspectRatio(v: unknown): v is MediaAspectRatio {
  return (
    v === '1:1' ||
    v === '4:5' ||
    v === '3:4' ||
    v === '1.91:1' ||
    v === '9:16'
  );
}

export function mediaAspectTailwind(ratio: MediaAspectRatio): string {
  if (ratio === '1:1') return 'aspect-square';
  if (ratio === '9:16') return 'aspect-[9/16]';
  if (ratio === '3:4') return 'aspect-[3/4]';
  if (ratio === '1.91:1') return 'aspect-[1.91/1]';
  return 'aspect-[4/5]';
}

export function defaultMediaAspect(
  platforms: SocialPlatform[],
  format?: ContentFormat
): MediaAspectRatio {
  if (format === 'reel' || format === 'story') return '9:16';
  const onlyTikTok = platforms.length === 1 && platforms[0] === 'tiktok';
  return onlyTikTok ? '9:16' : '4:5';
}

/**
 * Frame sizes offered for the current format + platforms.
 * Reel / Story lock to 9:16; Post / Carousel use feed ratios.
 */
export function mediaAspectChoices(
  platforms: SocialPlatform[],
  media: { type: string }[],
  format?: ContentFormat
): MediaAspectRatio[] {
  if (format === 'reel' || format === 'story') {
    return ['9:16'];
  }

  const hasMeta =
    platforms.includes('instagram') || platforms.includes('facebook');
  const hasTikTok = platforms.includes('tiktok');
  const isPhotoOrCarousel =
    format === 'carousel' ||
    media.length > 1 ||
    media.some((m) => m.type === 'image');

  const ordered: MediaAspectRatio[] = [];
  const add = (r: MediaAspectRatio) => {
    if (!ordered.includes(r)) ordered.push(r);
  };

  // Feed formats — match Seen-style ratio set.
  if (hasMeta || !platforms.length) {
    add('4:5');
    add('3:4');
    add('1:1');
    add('1.91:1');
  }
  if (hasTikTok && isPhotoOrCarousel) {
    add('4:5');
    add('1:1');
    add('9:16');
  }
  if (hasTikTok && !hasMeta && !isPhotoOrCarousel) {
    add('9:16');
  }
  if (!ordered.length) {
    add('4:5');
    add('1:1');
  }
  return ordered;
}

/** Clamp so IG/FB feed posts never preview as 9:16. */
export function aspectForPlatform(
  platform: SocialPlatform,
  selected: MediaAspectRatio
): MediaAspectRatio {
  if (
    (platform === 'instagram' || platform === 'facebook') &&
    selected === '9:16'
  ) {
    return '4:5';
  }
  return selected;
}
