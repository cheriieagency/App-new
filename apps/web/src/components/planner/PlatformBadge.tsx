'use client';

import {
  FacebookIcon,
  InstagramIcon,
  LinkedInIcon,
  TikTokIcon,
  YouTubeIcon,
} from '@/components/icons/SocialBrandIcons';
import { PLATFORM_META, type SocialPlatform } from '@/lib/mock-content-planner';

const ICONS = {
  instagram: InstagramIcon,
  tiktok: TikTokIcon,
  linkedin: LinkedInIcon,
  youtube: YouTubeIcon,
  facebook: FacebookIcon,
} as const;

export function PlatformBadge({
  platform,
  size = 'sm',
}: {
  platform: SocialPlatform;
  size?: 'sm' | 'md';
}) {
  const Icon = ICONS[platform];
  const meta = PLATFORM_META[platform];
  const dim = size === 'md' ? 14 : 11;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-extrabold ${
        size === 'md' ? 'text-[11px] px-2.5 py-1' : 'text-[10px] px-2 py-0.5'
      }`}
      style={{
        background: `color-mix(in srgb, ${meta.color} 12%, white)`,
        color: meta.color,
      }}
      title={meta.label}
    >
      <Icon size={dim} />
      {meta.label}
    </span>
  );
}

export function PlatformIcon({
  platform,
  size = 14,
}: {
  platform: SocialPlatform;
  size?: number;
}) {
  const Icon = ICONS[platform];
  const meta = PLATFORM_META[platform];
  return (
    <span
      className="inline-flex items-center justify-center w-7 h-7 rounded-lg"
      style={{
        background: `color-mix(in srgb, ${meta.color} 14%, white)`,
        color: meta.color,
      }}
      title={meta.label}
    >
      <Icon size={size} />
    </span>
  );
}
