'use client';

import Image, { type ImageProps } from 'next/image';
import { useMemo, useState } from 'react';

type OptimizedImageProps = Omit<ImageProps, 'src' | 'alt'> & {
  src: string | null | undefined;
  alt: string;
  /** Fallback when src is empty or fails to load. */
  fallbackSrc?: string;
};

/**
 * Social CDNs rotate regional hosts (tiktokcdn-eu, p16-common-sign.*, signed query
 * URLs). Serving them unoptimized avoids next/image hostname config crashes.
 */
function isVolatileSocialCdn(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return (
    host.includes('tiktokcdn') ||
    host.includes('ttlivecdn') ||
    host.includes('tiktok.com') ||
    host.includes('fbcdn.net') ||
    host.includes('cdninstagram.com') ||
    host.includes('instagram.com') ||
    host.includes('googleusercontent.com') ||
    host.includes('ggpht.com') ||
    host.includes('ytimg.com') ||
    host.includes('licdn.com') ||
    host.includes('pinimg.com') ||
    host.includes('twimg.com') ||
    host.includes('discordapp.com') ||
    host.includes('discordcdn.com')
  );
}

function shouldUnoptimize(src: string): boolean {
  if (src.startsWith('data:') || src.startsWith('blob:')) return true;
  if (src.startsWith('/')) return false;
  try {
    const { hostname, search } = new URL(src);
    if (!hostname) return true;
    // Signed TikTok/Meta URLs often break the optimizer and rotate hosts.
    if (isVolatileSocialCdn(hostname)) return true;
    if (search.includes('x-signature') || search.includes('x-expires')) return true;
    return false;
  } catch {
    return true;
  }
}

/**
 * next/image wrapper for avatars, covers, and media thumbnails.
 * Falls back gracefully for blob/data URLs and broken remotes.
 */
export default function OptimizedImage({
  src,
  alt,
  fallbackSrc,
  className,
  onError,
  ...rest
}: OptimizedImageProps) {
  const resolved = (src || fallbackSrc || '').trim();
  const [failed, setFailed] = useState(false);
  const unoptimized = useMemo(
    () => !resolved || shouldUnoptimize(resolved) || Boolean(rest.unoptimized),
    [resolved, rest.unoptimized]
  );

  if (!resolved || failed) {
    if (rest.fill) {
      return (
        <span
          className={`bg-slate-100 ${className || ''}`}
          aria-hidden={alt ? undefined : true}
          role={alt ? 'img' : undefined}
          aria-label={alt || undefined}
        />
      );
    }
    const w = typeof rest.width === 'number' ? rest.width : 40;
    const h = typeof rest.height === 'number' ? rest.height : 40;
    return (
      <span
        className={`inline-block bg-slate-100 ${className || ''}`}
        style={{ width: w, height: h }}
        aria-hidden={alt ? undefined : true}
        role={alt ? 'img' : undefined}
        aria-label={alt || undefined}
      />
    );
  }

  return (
    <Image
      src={resolved}
      alt={alt}
      className={className}
      unoptimized={unoptimized}
      onError={(e) => {
        setFailed(true);
        onError?.(e);
      }}
      {...rest}
    />
  );
}
