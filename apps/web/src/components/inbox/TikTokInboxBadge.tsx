'use client';

/**
 * Compact TikTok brand badge for Social Inbox thread rows.
 */

import { TikTokIcon } from '@/components/icons/SocialBrandIcons';

export function TikTokInboxBadge({
  size = 'sm',
  className = '',
}: {
  size?: 'sm' | 'md';
  className?: string;
}) {
  const box = size === 'md' ? 'h-5 w-5' : 'h-4 w-4';
  const icon = size === 'md' ? 12 : 9;
  return (
    <span
      className={`inline-flex ${box} items-center justify-center rounded-md bg-slate-900 text-white shadow-sm ${className}`}
      title="TikTok"
      aria-label="TikTok"
    >
      <TikTokIcon size={icon} />
    </span>
  );
}
