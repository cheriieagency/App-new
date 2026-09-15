/**
 * Post Studio frame sizes for feed photos / carousels.
 * IG & Facebook: 1:1 or 4:5. TikTok photo/carousel: 1:1, 4:5, or 9:16.
 */

import type { SocialPlatform } from '@/lib/mock-content-planner';

export type MediaAspectRatio = '1:1' | '4:5' | '9:16';

export const MEDIA_ASPECT_OPTIONS: {
  id: MediaAspectRatio;
  label: string;
  hint: string;
}[] = [
  { id: '1:1', label: '1:1', hint: 'Square' },
  { id: '4:5', label: '4:5', hint: 'Portrait' },
  { id: '9:16', label: '9:16', hint: 'Vertical' },
];

export function isMediaAspectRatio(v: unknown): v is MediaAspectRatio {
  return v === '1:1' || v === '4:5' || v === '9:16';
}

export function mediaAspectTailwind(ratio: MediaAspectRatio): string {
  if (ratio === '1:1') return 'aspect-square';
  if (ratio === '9:16') return 'aspect-[9/16]';
  return 'aspect-[4/5]';
}

export function defaultMediaAspect(
  platforms: SocialPlatform[]
): MediaAspectRatio {
  const onlyTikTok = platforms.length === 1 && platforms[0] === 'tiktok';
  return onlyTikTok ? '9:16' : '4:5';
}

/**
 * Which frame sizes to offer based on selected platforms + media.
 * Single Meta videos stay Reels (9:16) in preview and don't need this picker.
 */
export function mediaAspectChoices(
  platforms: SocialPlatform[],
  media: { type: string }[]
): MediaAspectRatio[] {
  const hasMeta =
    platforms.includes('instagram') || platforms.includes('facebook');
  const hasTikTok = platforms.includes('tiktok');
  const isPhotoOrCarousel =
    media.length > 1 || media.some((m) => m.type === 'image');

  const ordered: MediaAspectRatio[] = [];
  const add = (r: MediaAspectRatio) => {
    if (!ordered.includes(r)) ordered.push(r);
  };

  if (hasMeta) {
    add('1:1');
    add('4:5');
  }
  if (hasTikTok && isPhotoOrCarousel) {
    add('1:1');
    add('4:5');
    add('9:16');
  }
  if (hasTikTok && !hasMeta && !isPhotoOrCarousel) {
    add('9:16');
  }
  if (!ordered.length) {
    add('1:1');
    add('4:5');
  }
  return ordered;
}

/** Clamp so IG/FB never preview as 9:16 feed posts. */
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
