'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Bookmark,
  Heart,
  MessageCircle,
  MoreHorizontal,
  Music2,
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

type PreviewTab = 'instagram' | 'tiktok' | 'linkedin' | 'youtube';

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

function InstagramPreview({
  username,
  caption,
  items,
}: {
  username: string;
  caption: string;
  items: PlannerMediaItem[];
}) {
  const [slide, setSlide] = useState(0);
  const current = items[slide] ?? items[0];
  const isCarousel = items.length > 1;
  const isVideo = current?.type === 'video';

  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-zinc-200 shadow-sm max-w-[320px] mx-auto">
      <div className="flex items-center gap-2.5 px-3 h-12 border-b border-zinc-100">
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 p-[2px]">
          <div className="w-full h-full rounded-full bg-white p-[1px]">
            <div className="w-full h-full rounded-full bg-zinc-200" />
          </div>
        </div>
        <p className="text-xs font-extrabold text-[#262626] flex-1 truncate">{username}</p>
        <MoreHorizontal size={16} className="text-[#262626]" />
      </div>

      <div className="relative aspect-square bg-zinc-100">
        <MediaSlide item={current} className="absolute inset-0 w-full h-full" />
        {isVideo && (
          <span className="absolute top-2 right-2 text-[10px] font-extrabold text-white bg-black/55 px-2 py-0.5 rounded-md">
            VIDEO
          </span>
        )}
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

  return (
    <div className="relative mx-auto w-[240px] aspect-[9/16] rounded-[1.75rem] overflow-hidden bg-black border-[3px] border-zinc-800 shadow-lg">
      <MediaSlide item={item} className="absolute inset-0 w-full h-full" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />

      <div className="absolute right-2 bottom-28 flex flex-col items-center gap-4 text-white">
        <div className="w-10 h-10 rounded-full bg-zinc-300 border-2 border-white" />
        {[
          { icon: Heart, label: '12.4K' },
          { icon: MessageCircle, label: '842' },
          { icon: Bookmark, label: '1.1K' },
          { icon: Share2, label: 'Share' },
        ].map(({ icon: Icon, label }) => (
          <div key={label} className="flex flex-col items-center gap-0.5">
            <Icon size={22} fill="white" />
            <span className="text-[9px] font-bold">{label}</span>
          </div>
        ))}
        <div className="w-9 h-9 rounded-full bg-zinc-800 border border-white/40 flex items-center justify-center mt-1">
          <Music2 size={14} className="text-white" style={{ animation: 'spin 4s linear infinite' }} />
        </div>
      </div>

      <div className="absolute left-3 right-14 bottom-4 text-white">
        <p className="text-sm font-extrabold mb-1">@{username.replace(/^@/, '')}</p>
        <p className="text-[11px] font-medium leading-snug line-clamp-3 mb-2">{caption}</p>
        <div className="flex items-center gap-1.5 text-[10px] font-bold opacity-90">
          <Music2 size={11} />
          <span className="truncate">Original ljud — {username}</span>
        </div>
      </div>
    </div>
  );
}

function LinkedInPreview({
  name,
  headline,
  caption,
  items,
}: {
  name: string;
  headline: string;
  caption: string;
  items: PlannerMediaItem[];
}) {
  const [expanded, setExpanded] = useState(false);
  const preview = caption.length > 160 && !expanded ? `${caption.slice(0, 160)}…` : caption;
  const item = items[0];

  return (
    <div className="bg-white rounded-xl border border-zinc-200 shadow-sm max-w-[360px] mx-auto overflow-hidden">
      <div className="p-3 flex items-start gap-2.5">
        <div className="w-10 h-10 rounded-full bg-[#0A66C2]/15 flex-shrink-0" />
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

export default function FeedPreview({
  caption,
  mediaItems,
  platforms,
  youtube,
  username = '@nordic.creator',
  displayName = 'Nordic Creator',
}: {
  caption: string;
  mediaItems: PlannerMediaItem[];
  platforms: SocialPlatform[];
  youtube?: YoutubeMeta | null;
  username?: string;
  displayName?: string;
}) {
  const tabs = useMemo(() => {
    const all: { key: PreviewTab; label: string }[] = [
      { key: 'instagram', label: 'Instagram' },
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
          <InstagramPreview username={username} caption={caption} items={mediaItems} />
        )}
        {active === 'tiktok' && (
          <TikTokPreview username={username} caption={caption} items={mediaItems} />
        )}
        {active === 'linkedin' && (
          <LinkedInPreview
            name={displayName}
            headline="Creator · Nordic Creator Platform"
            caption={caption}
            items={mediaItems}
          />
        )}
        {active === 'youtube' && (
          <YouTubePreview caption={caption} items={mediaItems} youtube={youtube} />
        )}
      </div>
    </div>
  );
}
