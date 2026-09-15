'use client';

/**
 * Three iPhones in a sunfeather (half-moon) fan.
 * Each screen mirrors a real Instagram feed post (header → 1:1 media → actions → likes → caption).
 */

import Image from 'next/image';
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal } from 'lucide-react';
import { ltEyebrow, ltSection } from '@/components/landing/landingType';

const PHONES = [
  {
    src: '/landing/phones/post-vanity.png',
    alt: 'Beauty flatlay social post',
    handle: 'clikd',
    caption: 'Morning essentials',
    likes: '2,418',
    posted: '2 hours ago',
    className:
      'z-10 -rotate-[14deg] translate-y-12 sm:translate-y-16 -translate-x-1 sm:-translate-x-2 origin-bottom',
  },
  {
    src: '/landing/phones/post-pearls.png',
    alt: 'Pearl back editorial social post',
    handle: 'clikd',
    caption: 'Quiet luxury, always',
    likes: '5,102',
    posted: '15 days ago',
    className:
      'z-30 rotate-0 -translate-y-3 sm:-translate-y-8 scale-[1.05] sm:scale-[1.12] origin-bottom',
  },
  {
    src: '/landing/phones/post-brass.png',
    alt: 'Brass bud vases social post',
    handle: 'clikd',
    caption: 'Studio stills for the feed',
    likes: '3,874',
    posted: '7 hours ago',
    className:
      'z-20 rotate-[14deg] translate-y-12 sm:translate-y-16 translate-x-1 sm:translate-x-2 origin-bottom',
  },
] as const;

/** iPhone 15 Pro frame ≈ 393×852 (9:19.5) with Instagram feed chrome inside. */
function IPhonePost({
  src,
  alt,
  handle,
  caption,
  likes,
  posted,
  className,
}: (typeof PHONES)[number]) {
  return (
    <div
      className={`relative w-[138px] sm:w-[172px] md:w-[200px] lg:w-[224px] shrink-0 ${className}`}
      style={{ aspectRatio: '9 / 19.5' }}
    >
      {/* Hardware shell */}
      <div className="absolute inset-0 rounded-[1.7rem] sm:rounded-[2.05rem] md:rounded-[2.35rem] bg-[#0F0E0D] p-[5px] sm:p-[6px] md:p-[7px] shadow-[0_30px_64px_-22px_rgba(44,38,33,0.5)]">
        <span
          className="absolute -left-[1.5px] top-[17%] h-[7%] w-[1.5px] rounded-l-full bg-[#2A2622]"
          aria-hidden
        />
        <span
          className="absolute -left-[1.5px] top-[27%] h-[11%] w-[1.5px] rounded-l-full bg-[#2A2622]"
          aria-hidden
        />
        <span
          className="absolute -left-[1.5px] top-[40%] h-[11%] w-[1.5px] rounded-l-full bg-[#2A2622]"
          aria-hidden
        />
        <span
          className="absolute -right-[1.5px] top-[30%] h-[14%] w-[1.5px] rounded-r-full bg-[#2A2622]"
          aria-hidden
        />

        {/* Screen */}
        <div className="relative flex h-full w-full flex-col overflow-hidden rounded-[1.4rem] sm:rounded-[1.7rem] md:rounded-[1.95rem] bg-white">
          {/* Dynamic Island */}
          <div
            className="pointer-events-none absolute top-[7px] left-1/2 z-30 h-[18px] w-[26%] -translate-x-1/2 rounded-full bg-black sm:top-[9px] sm:h-[20px]"
            aria-hidden
          />

          {/* Status bar */}
          <div className="relative z-20 flex shrink-0 items-center justify-between px-3.5 pt-[11px] sm:px-4 sm:pt-[13px]">
            <span className="w-10 text-[9px] sm:text-[10px] font-inter font-semibold tracking-tight text-black tabular-nums">
              9:41
            </span>
            <div className="flex w-10 items-center justify-end gap-[3px]" aria-hidden>
              {/* Signal */}
              <svg width="14" height="9" viewBox="0 0 14 9" className="text-black">
                <rect x="0" y="6" width="2.2" height="3" rx="0.4" fill="currentColor" />
                <rect x="3.5" y="4" width="2.2" height="5" rx="0.4" fill="currentColor" />
                <rect x="7" y="2" width="2.2" height="7" rx="0.4" fill="currentColor" />
                <rect x="10.5" y="0" width="2.2" height="9" rx="0.4" fill="currentColor" />
              </svg>
              {/* Wi‑Fi */}
              <svg width="13" height="9" viewBox="0 0 13 9" className="text-black">
                <path
                  d="M6.5 8.2a.9.9 0 1 0 0-1.8.9.9 0 0 0 0 1.8Zm-3.3-2.4a4.7 4.7 0 0 1 6.6 0l-.9.9a3.4 3.4 0 0 0-4.8 0l-.9-.9Zm-2-2A7.5 7.5 0 0 1 11.8 3.8l-.9.9a6.1 6.1 0 0 0-8.8 0l-.9-.9Z"
                  fill="currentColor"
                />
              </svg>
              {/* Battery */}
              <span className="relative ml-[1px] h-[8px] w-[18px] rounded-[2px] border border-black/90">
                <span className="absolute inset-[1.5px] right-[2.5px] rounded-[0.5px] bg-black" />
                <span className="absolute -right-[3px] top-[2px] h-[4px] w-[1.5px] rounded-r-[0.5px] bg-black/90" />
              </span>
            </div>
          </div>

          {/* Instagram post — flex column so proportions stay clean */}
          <div className="relative z-10 flex min-h-0 flex-1 flex-col pt-1">
            {/* Post header */}
            <div className="flex shrink-0 items-center gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2">
              <span className="relative h-[22px] w-[22px] sm:h-[26px] sm:w-[26px] shrink-0 rounded-full bg-gradient-to-tr from-[#F9CE34] via-[#EE2A7B] to-[#6228D7] p-[1.5px]">
                <span className="flex h-full w-full items-center justify-center rounded-full bg-white p-[1px]">
                  <span className="flex h-full w-full items-center justify-center rounded-full bg-[#2C3B2E] text-[7px] sm:text-[8px] font-inter font-semibold text-white">
                    C.
                  </span>
                </span>
              </span>
              <p className="min-w-0 flex-1 truncate text-left text-[9px] sm:text-[10px] font-inter font-semibold text-black leading-none">
                {handle}
              </p>
              <MoreHorizontal
                size={14}
                strokeWidth={2}
                className="shrink-0 text-black"
                aria-hidden
              />
            </div>

            {/* 4:5 feed media (Instagram portrait) */}
            <div className="relative w-full shrink-0 bg-[#F0EFEA]" style={{ aspectRatio: '4 / 5' }}>
              <Image
                src={src}
                alt={alt}
                fill
                sizes="(max-width: 640px) 138px, (max-width: 768px) 172px, 224px"
                className="object-cover"
              />
            </div>

            {/* Action row */}
            <div className="flex shrink-0 items-center justify-between px-2.5 sm:px-3 pt-2 pb-1">
              <div className="flex items-center gap-3 sm:gap-3.5">
                <Heart size={15} strokeWidth={1.7} className="text-black sm:h-4 sm:w-4" />
                <MessageCircle size={15} strokeWidth={1.7} className="text-black sm:h-4 sm:w-4" />
                <Send size={14} strokeWidth={1.7} className="text-black sm:h-[15px] sm:w-[15px]" />
              </div>
              <Bookmark size={15} strokeWidth={1.7} className="text-black sm:h-4 sm:w-4" />
            </div>

            {/* Likes */}
            <p className="shrink-0 px-2.5 sm:px-3 text-left text-[9px] sm:text-[10px] font-inter font-semibold text-black leading-none">
              {likes} likes
            </p>

            {/* Caption */}
            <p className="mt-1 shrink-0 px-2.5 sm:px-3 text-left text-[9px] sm:text-[10px] font-inter text-black leading-snug line-clamp-2">
              <span className="font-semibold">{handle}</span>{' '}
              <span className="font-normal">{caption}</span>
            </p>

            {/* Timestamp */}
            <p className="mt-1 shrink-0 px-2.5 sm:px-3 text-left text-[7px] sm:text-[8px] font-inter font-medium uppercase tracking-wide text-[#8A857D]">
              {posted}
            </p>

            {/* Spacer pushes home indicator down */}
            <div className="min-h-[6px] flex-1" />

            {/* Home indicator */}
            <div className="flex shrink-0 justify-center pb-[6px] sm:pb-[8px]" aria-hidden>
              <span className="h-[3px] w-[32%] rounded-full bg-black/20" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Sunfeather phone fan — Instagram posts under #the-platform. */
export function SocialPhonesFanSection() {
  return (
    <section
      id="posted-on-social"
      className="relative overflow-hidden bg-[#F9F8F6] py-16 sm:py-20 lg:py-24"
      aria-label="Content posted across social"
    >
      <div className="relative mx-auto max-w-5xl px-4 text-center sm:px-6">
        <p className={`${ltEyebrow} mb-3`}>From studio to feed</p>
        <h2 className={`${ltSection} mx-auto max-w-xl`}>
          Plan once. <em className="font-normal italic">Post everywhere.</em>
        </h2>

        <div className="relative mt-12 flex min-h-[360px] items-end justify-center -space-x-9 pb-6 sm:mt-16 sm:min-h-[440px] sm:-space-x-11 sm:pb-8 md:min-h-[520px] md:-space-x-14 lg:mt-20 lg:min-h-[580px]">
          <div
            className="pointer-events-none absolute bottom-8 left-1/2 h-10 w-[72%] max-w-lg -translate-x-1/2 rounded-[100%] bg-[#2C2621]/10 blur-2xl sm:bottom-10"
            aria-hidden
          />
          {PHONES.map((phone) => (
            <IPhonePost key={phone.src} {...phone} />
          ))}
        </div>
      </div>
    </section>
  );
}
