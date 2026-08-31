'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Bookmark,
  Heart,
  MessageCircle,
  MoreHorizontal,
  Play,
  Send,
  Share2,
  ThumbsUp,
  Volume2,
} from 'lucide-react';
import type {
  PlannerMediaItem,
  SocialPlatform,
  YoutubeMeta,
} from '@/lib/mock-content-planner';

type PreviewTab = 'instagram' | 'facebook' | 'tiktok' | 'linkedin' | 'youtube';

function MediaSlide({
  item,
  className = '',
}: {
  item?: PlannerMediaItem | null;
  className?: string;
}) {
  if (!item) {
    return (
      <div
        className={`bg-zinc-200 flex items-center justify-center text-xs font-bold text-zinc-400 ${className}`}
      >
        Ingen media
      </div>
    );
  }
  if (item.type === 'video') {
    return (
      <video src={item.url} className={`object-cover ${className}`} muted playsInline loop />
    );
  }
  return <img src={item.url} alt="" className={`object-cover ${className}`} />;
}

/** Meta feed: posts/carousels = 4:5, video/Reels = 9:16. */
function metaMediaAspect(items: PlannerMediaItem[]): 'post' | 'video' {
  const isCarousel = items.length > 1;
  if (isCarousel) return 'post';
  if (items[0]?.type === 'video') return 'video';
  return 'post';
}

function InstagramPreview({
  username,
  caption,
  items,
  brandAvatar,
  brandColor,
}: {
  username: string;
  caption: string;
  items: PlannerMediaItem[];
  brandAvatar?: string | null;
  brandColor?: string;
}) {
  const [slide, setSlide] = useState(0);
  const current = items[slide] ?? items[0];
  const isCarousel = items.length > 1;
  const format = metaMediaAspect(items);
  const isVideoFormat = format === 'video';

  const avatar = (
    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 p-[2px]">
      <div className="w-full h-full rounded-full bg-white p-[1px] overflow-hidden">
        {brandAvatar ? (
          <img src={brandAvatar} alt="" className="w-full h-full object-cover rounded-full" />
        ) : (
          <div
            className="w-full h-full rounded-full flex items-center justify-center text-[10px] font-black text-white"
            style={{ background: brandColor || '#E11D48' }}
          >
            {username.replace('@', '')[0]?.toUpperCase() || 'B'}
          </div>
        )}
      </div>
    </div>
  );

  // Reels / video — 9:16 phone frame
  if (isVideoFormat) {
    return (
      <div className="relative mx-auto w-[220px] aspect-[9/16] rounded-[1.75rem] overflow-hidden bg-black border-[3px] border-zinc-800 shadow-lg">
        <MediaSlide item={current} className="absolute inset-0 w-full h-full" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/25" />
        <div className="absolute top-3 inset-x-3 flex items-center gap-2 text-white">
          {avatar}
          <p className="text-[11px] font-extrabold truncate flex-1">{username}</p>
          <span className="text-[9px] font-black uppercase tracking-wide bg-white/20 px-1.5 py-0.5 rounded">
            Reel
          </span>
        </div>
        <div className="absolute right-2.5 bottom-28 flex flex-col items-center gap-4 text-white">
          <Heart size={22} fill="white" />
          <MessageCircle size={22} />
          <Send size={20} />
          <Bookmark size={20} />
          <MoreHorizontal size={18} />
        </div>
        <div className="absolute left-3 right-14 bottom-4 text-white">
          <p className="text-xs font-extrabold mb-1">{username}</p>
          <p className="text-[11px] font-medium leading-snug line-clamp-3">{caption}</p>
        </div>
      </div>
    );
  }

  // Feed post / carousel — 4:5
  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-zinc-200 shadow-sm max-w-[280px] mx-auto">
      <div className="flex items-center gap-2.5 px-3 h-12 border-b border-zinc-100">
        {avatar}
        <p className="text-xs font-extrabold text-[#262626] flex-1 truncate">{username}</p>
        <MoreHorizontal size={16} className="text-[#262626]" />
      </div>

      <div className="relative aspect-[4/5] bg-zinc-100">
        <MediaSlide item={current} className="absolute inset-0 w-full h-full" />
        {isCarousel && (
          <>
            <div className="absolute inset-y-0 left-0 w-1/3" onClick={() => setSlide((s) => Math.max(0, s - 1))} />
            <div
              className="absolute inset-y-0 right-0 w-1/3"
              onClick={() => setSlide((s) => Math.min(items.length - 1, s + 1))}
            />
            <div className="absolute bottom-2 inset-x-0 flex justify-center gap-1">
              {items.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSlide(i)}
                  className={`w-1.5 h-1.5 rounded-full ${i === slide ? 'bg-[#0095f6]' : 'bg-white/70'}`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <div className="px-3 py-2.5">
        <div className="flex items-center gap-3 mb-2">
          <Heart size={20} className="text-[#262626]" />
          <MessageCircle size={20} className="text-[#262626]" />
          <Send size={20} className="text-[#262626]" />
          <div className="flex-1" />
          <Bookmark size={20} className="text-[#262626]" />
        </div>
        <p className="text-xs text-[#262626] leading-relaxed">
          <span className="font-extrabold mr-1">{username}</span>
          {caption.split('\n').slice(0, 3).join(' ')}
        </p>
      </div>
    </div>
  );
}

function FacebookPreview({
  username,
  caption,
  items,
  brandAvatar,
  brandColor,
}: {
  username: string;
  caption: string;
  items: PlannerMediaItem[];
  brandAvatar?: string | null;
  brandColor?: string;
}) {
  const [slide, setSlide] = useState(0);
  const current = items[slide] ?? items[0];
  const isCarousel = items.length > 1;
  const format = metaMediaAspect(items);
  const isVideoFormat = format === 'video';
  const pageName = username.replace(/^@/, '') || 'Page';

  const avatar = brandAvatar ? (
    <img
      src={brandAvatar}
      alt=""
      className="w-9 h-9 rounded-full object-cover flex-shrink-0"
    />
  ) : (
    <div
      className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-black"
      style={{ background: brandColor || '#1877F2' }}
    >
      {pageName[0]?.toUpperCase() || 'F'}
    </div>
  );

  // Facebook Reels / video — 9:16
  if (isVideoFormat) {
    return (
      <div className="relative mx-auto w-[220px] aspect-[9/16] rounded-[1.75rem] overflow-hidden bg-black border-[3px] border-zinc-800 shadow-lg">
        <MediaSlide item={current} className="absolute inset-0 w-full h-full" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/20" />
        <div className="absolute top-3 inset-x-3 flex items-center gap-2 text-white">
          {avatar}
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-extrabold truncate">{pageName}</p>
            <p className="text-[9px] font-bold text-white/70">Reel · Just now</p>
          </div>
        </div>
        <div className="absolute right-2.5 bottom-28 flex flex-col items-center gap-4 text-white">
          <ThumbsUp size={22} />
          <MessageCircle size={22} />
          <Share2 size={20} />
        </div>
        <div className="absolute left-3 right-14 bottom-4 text-white">
          <p className="text-xs font-extrabold mb-1">{pageName}</p>
          <p className="text-[11px] font-medium leading-snug line-clamp-3">{caption}</p>
        </div>
      </div>
    );
  }

  // Facebook feed post / carousel — 4:5
  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-zinc-200 shadow-sm max-w-[300px] mx-auto">
      <div className="flex items-start gap-2.5 px-3 pt-3 pb-2">
        {avatar}
        <div className="min-w-0 flex-1">
          <p className="text-xs font-extrabold text-[#050505] truncate">{pageName}</p>
          <p className="text-[10px] font-medium text-zinc-500">Just now · 🌐</p>
        </div>
        <MoreHorizontal size={16} className="text-zinc-500" />
      </div>
      <p className="px-3 pb-2 text-xs text-[#050505] leading-relaxed line-clamp-3">
        {caption.split('\n').slice(0, 3).join(' ')}
      </p>

      <div className="relative aspect-[4/5] bg-zinc-100 border-y border-zinc-100">
        <MediaSlide item={current} className="absolute inset-0 w-full h-full" />
        {isCarousel && (
          <>
            <div className="absolute inset-y-0 left-0 w-1/3" onClick={() => setSlide((s) => Math.max(0, s - 1))} />
            <div
              className="absolute inset-y-0 right-0 w-1/3"
              onClick={() => setSlide((s) => Math.min(items.length - 1, s + 1))}
            />
            <div className="absolute bottom-2 inset-x-0 flex justify-center gap-1">
              {items.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSlide(i)}
                  className={`w-1.5 h-1.5 rounded-full ${i === slide ? 'bg-[#1877F2]' : 'bg-white/70'}`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <div className="grid grid-cols-3 border-t border-zinc-100">
        {[
          { icon: ThumbsUp, label: 'Like' },
          { icon: MessageCircle, label: 'Comment' },
          { icon: Share2, label: 'Share' },
        ].map(({ icon: Icon, label }) => (
          <button
            key={label}
            type="button"
            className="h-11 min-h-[44px] flex items-center justify-center gap-1.5 text-xs font-bold text-zinc-600 hover:bg-zinc-50"
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>
    </div>
  );
}

function TikTokPreview({
  username,
  caption,
  items,
}: {
  username: string;
  caption: string;
  items: PlannerMediaItem[];
}) {
  const item = items.find((m) => m.type === 'video') ?? items[0];
  const handle = `@${username.replace(/^@/, '')}`;

  return (
    <div className="relative mx-auto w-[200px] aspect-[9/19.5] rounded-[2rem] overflow-hidden bg-black border-[3px] border-zinc-800 shadow-lg">
      <MediaSlide item={item} className="absolute inset-0 w-full h-full" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/10" />

      {/* Status bar — notch area */}
      <div className="absolute top-0 inset-x-0 h-8 flex items-center justify-center">
        <div className="w-20 h-5 rounded-b-xl bg-black" />
      </div>

      {/* TikTok top bar: "Following | For You" tabs */}
      <div className="absolute top-9 inset-x-0 flex items-center justify-center gap-3">
        <span className="text-[10px] font-semibold text-white/50">Following</span>
        <span className="text-[10px] font-extrabold text-white border-b-2 border-white pb-0.5">
          For You
        </span>
      </div>

      {/* Right action bar — sits near the bottom edge */}
      <div className="absolute right-2 bottom-4 flex flex-col items-center gap-2 text-white">
        <div className="relative mb-0.5">
          <div className="w-8 h-8 rounded-full bg-zinc-400 border-[1.5px] border-white overflow-hidden">
            <div className="w-full h-full bg-gradient-to-br from-zinc-300 to-zinc-500" />
          </div>
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-[#FE2C55] flex items-center justify-center">
            <span className="text-[9px] font-black text-white leading-none">+</span>
          </div>
        </div>

        <div className="flex flex-col items-center gap-0.5">
          <Heart size={20} strokeWidth={2} />
          <span className="text-[9px] font-bold leading-none">12.4K</span>
        </div>

        <div className="flex flex-col items-center gap-0.5">
          <MessageCircle size={20} strokeWidth={2} />
          <span className="text-[9px] font-bold leading-none">842</span>
        </div>

        <div className="flex flex-col items-center gap-0.5">
          <Bookmark size={18} strokeWidth={2} />
          <span className="text-[9px] font-bold leading-none">1.1K</span>
        </div>

        <div className="flex flex-col items-center gap-0.5">
          <Share2 size={18} strokeWidth={2} />
          <span className="text-[9px] font-bold leading-none">Share</span>
        </div>

        <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-zinc-900 via-zinc-700 to-zinc-900 border-[2px] border-zinc-600 flex items-center justify-center">
          <div
            className="w-3 h-3 rounded-full bg-zinc-400"
            style={{ animation: 'spin 4s linear infinite' }}
          />
        </div>
      </div>

      {/* Bottom left: handle + caption */}
      <div className="absolute left-2.5 right-12 bottom-3 text-white">
        <p className="text-[11px] font-extrabold mb-0.5 drop-shadow-sm">{handle}</p>
        <p className="text-[10px] font-medium leading-snug line-clamp-2 drop-shadow-sm">
          {caption}
        </p>
      </div>

      {/* Bottom nav bar — home indicator */}
      <div className="absolute bottom-0 inset-x-0 h-5 flex items-center justify-center">
        <div className="w-24 h-1 rounded-full bg-white/40" />
      </div>
    </div>
  );
}

function LinkedInPreview({
  name,
  headline,
  caption,
  items,
  brandAvatar,
  brandColor,
}: {
  name: string;
  headline: string;
  caption: string;
  items: PlannerMediaItem[];
  brandAvatar?: string | null;
  brandColor?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const preview = caption.length > 160 && !expanded ? `${caption.slice(0, 160)}…` : caption;
  const item = items[0];

  return (
    <div className="bg-white rounded-xl border border-zinc-200 shadow-sm max-w-[360px] mx-auto overflow-hidden">
      <div className="p-3 flex items-start gap-2.5">
        {brandAvatar ? (
          <img
            src={brandAvatar}
            alt=""
            className="w-10 h-10 rounded-full object-cover flex-shrink-0"
          />
        ) : (
          <div
            className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-black"
            style={{ background: brandColor || '#0A66C2' }}
          >
            {name[0]}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-extrabold text-[#191919] truncate">{name}</p>
          <p className="text-[11px] text-zinc-500 truncate">{headline}</p>
          <span className="inline-flex mt-1 text-[9px] font-extrabold uppercase tracking-wide text-[#0A66C2] bg-[#0A66C2]/10 px-1.5 py-0.5 rounded">
            Företag
          </span>
        </div>
        <MoreHorizontal size={16} className="text-zinc-400" />
      </div>

      <div className="px-3 pb-2">
        <p className="text-sm text-[#191919] whitespace-pre-wrap leading-relaxed">
          {preview}
          {caption.length > 160 && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="ml-1 text-[#0A66C2] font-bold"
            >
              {expanded ? 'Visa mindre' : 'Se mer'}
            </button>
          )}
        </p>
      </div>

      {item && (
        <div className="relative aspect-video bg-zinc-100 border-y border-zinc-100">
          <MediaSlide item={item} className="absolute inset-0 w-full h-full" />
        </div>
      )}

      <div className="grid grid-cols-3 border-t border-zinc-100">
        {[
          { icon: ThumbsUp, label: 'Gilla' },
          { icon: MessageCircle, label: 'Kommentera' },
          { icon: Share2, label: 'Dela' },
        ].map(({ icon: Icon, label }) => (
          <button
            key={label}
            type="button"
            className="h-11 min-h-[44px] flex items-center justify-center gap-1.5 text-xs font-bold text-zinc-600 hover:bg-zinc-50"
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>
    </div>
  );
}

function YouTubePreview({
  caption,
  items,
  youtube,
}: {
  caption: string;
  items: PlannerMediaItem[];
  youtube?: YoutubeMeta | null;
}) {
  const [mode, setMode] = useState<'shorts' | 'standard'>(
    youtube?.is_shorts === false ? 'standard' : 'shorts'
  );

  useEffect(() => {
    setMode(youtube?.is_shorts === false ? 'standard' : 'shorts');
  }, [youtube?.is_shorts]);

  const item = items.find((m) => m.type === 'video') ?? items[0];
  const title = youtube?.title || caption.split('\n')[0] || 'Videotitel';

  return (
    <div className="space-y-3">
      <div className="flex gap-1 p-1 rounded-xl bg-zinc-100 w-fit mx-auto">
        {(
          [
            { key: 'shorts' as const, label: 'YouTube Shorts' },
            { key: 'standard' as const, label: 'Standard Video' },
          ] as const
        ).map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setMode(key)}
            className={`h-9 min-h-[36px] px-3 rounded-lg text-[11px] font-extrabold transition-colors ${
              mode === key
                ? 'bg-white text-[#2c3340] shadow-sm'
                : 'text-zinc-500 hover:text-[#2c3340]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === 'shorts' ? (
        <div className="relative mx-auto w-[220px] aspect-[9/16] rounded-2xl overflow-hidden bg-black border border-zinc-800 shadow-lg">
          <MediaSlide item={item} className="absolute inset-0 w-full h-full" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
          <div className="absolute right-2 bottom-24 flex flex-col items-center gap-4 text-white">
            <Heart size={22} />
            <MessageCircle size={22} />
            <Share2 size={22} />
          </div>
          <div className="absolute left-3 right-12 bottom-4 text-white">
            <button
              type="button"
              className="mb-2 h-8 px-3 rounded-full bg-red-600 text-[11px] font-extrabold"
            >
              Prenumerera
            </button>
            <p className="text-xs font-extrabold line-clamp-2 mb-1">{title}</p>
            <p className="text-[10px] opacity-80 line-clamp-2">{caption}</p>
          </div>
        </div>
      ) : (
        <div className="max-w-[360px] mx-auto bg-white rounded-xl border border-zinc-200 overflow-hidden shadow-sm">
          <div className="relative aspect-video bg-zinc-900">
            <MediaSlide item={item} className="absolute inset-0 w-full h-full opacity-90" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="w-12 h-12 rounded-full bg-red-600/90 flex items-center justify-center">
                <Play size={22} className="text-white ml-0.5" fill="white" />
              </span>
            </div>
            <span className="absolute bottom-2 right-2 text-[10px] font-bold text-white bg-black/70 px-1.5 py-0.5 rounded">
              0:45
            </span>
          </div>
          <div className="p-3 space-y-2">
            <p className="text-sm font-extrabold text-[#0f0f0f] leading-snug line-clamp-2">
              {title}
            </p>
            <p className="text-[11px] text-zinc-500 font-medium">
              1,2 tn visningar · Just nu
            </p>
            <div className="rounded-lg bg-zinc-100 p-2.5">
              <p className="text-[10px] font-black uppercase tracking-wide text-zinc-400 mb-1">
                Beskrivning
              </p>
              <p className="text-xs text-zinc-600 whitespace-pre-wrap line-clamp-4">{caption}</p>
            </div>
            <div className="flex items-center gap-2 text-zinc-500">
              <Volume2 size={14} />
              <span className="text-[11px] font-bold">
                {youtube?.privacy === 'private'
                  ? 'Privat'
                  : youtube?.privacy === 'unlisted'
                    ? 'Olistad'
                    : 'Offentlig'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Per-platform handle map so each preview shows the connected account's real username. */
export type PlatformHandles = Partial<Record<SocialPlatform, string>>;

export default function FeedPreview({
  caption,
  mediaItems,
  platforms,
  youtube,
  username = '@nordic.creator',
  displayName = 'clikd:',
  brandAvatar = null,
  brandColor,
  platformHandles,
}: {
  caption: string;
  mediaItems: PlannerMediaItem[];
  platforms: SocialPlatform[];
  youtube?: YoutubeMeta | null;
  username?: string;
  displayName?: string;
  brandAvatar?: string | null;
  brandColor?: string;
  /** Per-platform handles from connected social accounts. Falls back to `username`. */
  platformHandles?: PlatformHandles;
}) {
  const tabs = useMemo(() => {
    const all: { key: PreviewTab; label: string }[] = [
      { key: 'instagram', label: 'Instagram' },
      { key: 'facebook', label: 'Facebook' },
      { key: 'tiktok', label: 'TikTok' },
      { key: 'linkedin', label: 'LinkedIn' },
      { key: 'youtube', label: 'YouTube' },
    ];
    const selected = all.filter((t) => platforms.includes(t.key));
    return selected.length ? selected : all;
  }, [platforms]);

  const [tab, setTab] = useState<PreviewTab>(tabs[0]?.key ?? 'instagram');

  // Keep active tab valid when platforms change.
  const active = tabs.some((t) => t.key === tab) ? tab : tabs[0]?.key ?? 'instagram';

  return (
    <div className="rounded-2xl border border-zinc-100 bg-zinc-50/80 p-3 sm:p-4">
      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">
        Live feed-förhandsvisning
      </p>
      <div className="flex gap-1 overflow-x-auto scrollbar-none mb-4 -mx-1 px-1">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`h-10 min-h-[44px] px-3 rounded-xl text-[11px] font-extrabold whitespace-nowrap flex-shrink-0 transition-colors ${
              active === key
                ? 'bg-[var(--nc-coral)] text-white'
                : 'bg-white text-zinc-500 border border-zinc-100 hover:text-[#2c3340]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="min-h-[280px]">
        {active === 'instagram' && (
          <InstagramPreview
            username={platformHandles?.instagram || username}
            caption={caption}
            items={mediaItems}
            brandAvatar={brandAvatar}
            brandColor={brandColor}
          />
        )}
        {active === 'facebook' && (
          <FacebookPreview
            username={platformHandles?.facebook || username}
            caption={caption}
            items={mediaItems}
            brandAvatar={brandAvatar}
            brandColor={brandColor}
          />
        )}
        {active === 'tiktok' && (
          <TikTokPreview username={platformHandles?.tiktok || username} caption={caption} items={mediaItems} />
        )}
        {active === 'linkedin' && (
          <LinkedInPreview
            name={displayName}
            headline={`${displayName} · Brand page`}
            caption={caption}
            items={mediaItems}
            brandAvatar={brandAvatar}
            brandColor={brandColor}
          />
        )}
        {active === 'youtube' && (
          <YouTubePreview caption={caption} items={mediaItems} youtube={youtube} />
        )}
      </div>
    </div>
  );
}
