'use client';

import { useMemo, useState, type DragEvent, type ReactNode } from 'react';
import {
  Bookmark,
  CalendarDays,
  Check,
  ChevronDown,
  Clapperboard,
  GripVertical,
  Heart,
  Images,
  Image as ImageIcon,
  LayoutGrid,
  Lock,
  Menu,
  MoreHorizontal,
  Plus,
  UserPlus,
} from 'lucide-react';
import { toast } from 'sonner';
import type { BrandWorkspace, PlannerPost, SocialPlatform } from '@/lib/mock-content-planner';
import { useLocale } from '@/lib/locale-context';
import { t, tf } from '@/lib/i18n';

type FeedPlatform = 'instagram' | 'tiktok';

type DragPayload = {
  kind: 'scheduled' | 'draft';
  id: string;
};

function mediaKind(post: PlannerPost): 'reel' | 'carousel' | 'photo' {
  if (post.media_type === 'video' || post.media_items.some((m) => m.type === 'video')) {
    return 'reel';
  }
  if (post.media_items.length > 1 || post.media_type === 'carousel') return 'carousel';
  return 'photo';
}

function thumb(post: PlannerPost): string | null {
  return post.media_items[0]?.url || post.media_url;
}

function formatViews(seed: string): string {
  let n = 0;
  for (let i = 0; i < seed.length; i++) n = (n + seed.charCodeAt(i) * (i + 1)) % 90000;
  const v = 1200 + n;
  if (v >= 10000) return `${(v / 1000).toFixed(1)}K`;
  if (v >= 1000) return `${(v / 1000).toFixed(1)}K`;
  return String(v);
}

async function upsertSchedule(
  post: PlannerPost,
  scheduledAt: string,
  platform: SocialPlatform
) {
  const platforms = post.platforms.includes(platform)
    ? post.platforms
    : [...post.platforms, platform];
  const r = await fetch('/api/planner', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'upsert',
      id: post.id,
      title: post.title,
      caption: post.caption,
      hashtags: post.hashtags,
      platforms,
      workflow: 'SCHEDULED',
      scheduled_at: scheduledAt,
      media_url: post.media_url,
      media_type: post.media_type,
      media_items: post.media_items,
      project: post.project,
      actor: 'Ebba',
    }),
  });
  if (!r.ok) throw new Error('Failed to update schedule');
  return r.json();
}

/** Spread scheduled times so grid order maps to chronological publish order. */
function scheduleTimesForCount(count: number): string[] {
  const base = Date.now() + 6 * 60 * 60 * 1000;
  const step = 12 * 60 * 60 * 1000;
  return Array.from({ length: count }, (_, i) => new Date(base + i * step).toISOString());
}

function Avatar({
  workspace,
  sizeClass,
  ringClass,
}: {
  workspace: BrandWorkspace | null;
  sizeClass: string;
  ringClass?: string;
}) {
  return (
    <div
      className={`${sizeClass} rounded-full overflow-hidden flex-shrink-0 ${ringClass || ''}`}
      style={{ background: workspace?.color || '#E11D48' }}
    >
      {workspace?.avatar_url ? (
        <img src={workspace.avatar_url} alt="" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-white font-black text-lg">
          {(workspace?.name?.[0] || 'N').toUpperCase()}
        </div>
      )}
    </div>
  );
}

function StatusCorner({
  isPublished,
  isScheduled,
  dark,
}: {
  isPublished: boolean;
  isScheduled: boolean;
  dark?: boolean;
}) {
  if (isPublished) {
    return (
      <span
        className={`absolute bottom-1 left-1 w-[18px] h-[18px] rounded-full flex items-center justify-center ${
          dark ? 'bg-emerald-400 text-black' : 'bg-emerald-500 text-white'
        }`}
        title="Published"
      >
        <Check size={10} strokeWidth={3} />
      </span>
    );
  }
  if (isScheduled) {
    return (
      <span
        className={`absolute bottom-1 left-1 w-[18px] h-[18px] rounded-full flex items-center justify-center ${
          dark ? 'bg-sky-400 text-black' : 'bg-sky-500 text-white'
        }`}
        title="Scheduled"
      >
        <CalendarDays size={10} />
      </span>
    );
  }
  return null;
}

export default function FeedGridPlanner({
  posts,
  workspace,
  onOpen,
  onRefresh,
  /** When set from platform pills, drives IG/TT feed (hides local toggle). */
  activePlatform,
}: {
  posts: PlannerPost[];
  workspace: BrandWorkspace | null;
  onOpen: (post: PlannerPost) => void;
  onRefresh: () => void;
  activePlatform?: FeedPlatform | 'all' | null;
}) {
  const { locale } = useLocale();
  const [platformLocal, setPlatformLocal] = useState<FeedPlatform>('instagram');
  const platform: FeedPlatform =
    activePlatform === 'instagram' || activePlatform === 'tiktok'
      ? activePlatform
      : platformLocal;
  const showPlatformToggle = activePlatform !== 'instagram' && activePlatform !== 'tiktok';
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const published = useMemo(
    () =>
      posts
        .filter(
          (p) =>
            (p.workflow === 'PUBLISHED' || p.status === 'published') &&
            p.platforms.includes(platform)
        )
        .sort(
          (a, b) =>
            new Date(b.published_at || b.scheduled_at || b.created_at).getTime() -
            new Date(a.published_at || a.scheduled_at || a.created_at).getTime()
        ),
    [posts, platform]
  );

  const scheduled = useMemo(
    () =>
      posts
        .filter(
          (p) =>
            (p.workflow === 'SCHEDULED' || p.status === 'scheduled') &&
            p.platforms.includes(platform) &&
            p.workflow !== 'PUBLISHED'
        )
        .sort(
          (a, b) =>
            new Date(a.scheduled_at || a.created_at).getTime() -
            new Date(b.scheduled_at || b.created_at).getTime()
        ),
    [posts, platform]
  );

  const drafts = useMemo(
    () =>
      posts.filter(
        (p) =>
          (p.workflow === 'IDEA' ||
            p.workflow === 'IN_PROGRESS' ||
            p.workflow === 'READY' ||
            p.status === 'draft') &&
          p.workflow !== 'SCHEDULED' &&
          p.workflow !== 'PUBLISHED' &&
          (p.platforms.includes(platform) || p.platforms.length === 0)
      ),
    [posts, platform]
  );

  const gridPosts = useMemo(() => [...published, ...scheduled], [published, scheduled]);
  const minTiles = 9;
  const tileCount = Math.max(minTiles, Math.ceil(gridPosts.length / 3) * 3 || 9);

  const handle = workspace?.handle || '@creator';
  const handleClean = handle.replace(/^@/, '');
  const displayName = workspace?.name || 'Creator';
  const followers = '48.2K';
  const following = '312';
  const likes = '1.2M';
  const bioIg = 'Nordic creator · Digital products & live ✨';
  const bioTt = 'Tips, reels & community growth 🚀';
  const linkLabel = `linkin.bio/${handleClean}`;

  const parseDrag = (e: DragEvent): DragPayload | null => {
    try {
      const raw = e.dataTransfer.getData('application/x-nc-feed');
      if (!raw) return null;
      return JSON.parse(raw) as DragPayload;
    } catch {
      return null;
    }
  };

  const startDrag = (e: DragEvent, payload: DragPayload) => {
    e.dataTransfer.setData('application/x-nc-feed', JSON.stringify(payload));
    e.dataTransfer.effectAllowed = 'move';
    setDraggingId(payload.id);
  };

  const applyScheduledOrder = async (nextScheduled: PlannerPost[]) => {
    setSaving(true);
    try {
      const times = scheduleTimesForCount(nextScheduled.length);
      for (let i = 0; i < nextScheduled.length; i++) {
        await upsertSchedule(nextScheduled[i], times[i], platform);
      }
      await onRefresh();
      toast.success(t('gridOrderUpdated', locale));
    } catch {
      toast.error(t('gridOrderFailed', locale));
    } finally {
      setSaving(false);
      setDraggingId(null);
      setDragOverIndex(null);
    }
  };

  const onDropAt = async (gridIndex: number, e: DragEvent) => {
    e.preventDefault();
    const payload = parseDrag(e);
    setDragOverIndex(null);
    if (!payload || saving) return;

    const publishedCount = published.length;
    let targetScheduledIndex = Math.max(0, gridIndex - publishedCount);

    if (payload.kind === 'scheduled') {
      const from = scheduled.findIndex((p) => p.id === payload.id);
      if (from < 0) return;
      const next = [...scheduled];
      const [moved] = next.splice(from, 1);
      if (targetScheduledIndex > next.length) targetScheduledIndex = next.length;
      if (from < targetScheduledIndex) targetScheduledIndex -= 1;
      targetScheduledIndex = Math.max(0, Math.min(targetScheduledIndex, next.length));
      next.splice(targetScheduledIndex, 0, moved);
      await applyScheduledOrder(next);
      return;
    }

    const draft = drafts.find((p) => p.id === payload.id) || posts.find((p) => p.id === payload.id);
    if (!draft) return;
    const next = [...scheduled];
    if (targetScheduledIndex > next.length) targetScheduledIndex = next.length;
    next.splice(targetScheduledIndex, 0, draft);
    await applyScheduledOrder(next);
  };

  const renderTile = (index: number, opts: { dark: boolean; aspect: string }) => {
    const post = gridPosts[index];
    const isPublished =
      !!post && (post.workflow === 'PUBLISHED' || post.status === 'published');
    const isScheduled = !!post && !isPublished;
    const over = dragOverIndex === index;
    const kind = post ? mediaKind(post) : null;

    return (
      <div
        key={`tile-${index}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOverIndex(index);
        }}
        onDragLeave={() => {
          if (dragOverIndex === index) setDragOverIndex(null);
        }}
        onDrop={(e) => void onDropAt(index, e)}
        className={`relative ${opts.aspect} overflow-hidden ${
          opts.dark ? 'bg-[#161616]' : 'bg-[#efefef]'
        } ${over ? 'ring-2 ring-inset ring-[var(--nc-coral)] z-[1]' : ''} ${
          draggingId && post?.id === draggingId ? 'opacity-40' : ''
        }`}
      >
        {post ? (
          <button
            type="button"
            draggable={isScheduled}
            onDragStart={(e) => {
              if (!isScheduled) {
                e.preventDefault();
                return;
              }
              startDrag(e, { kind: 'scheduled', id: post.id });
            }}
            onDragEnd={() => {
              setDraggingId(null);
              setDragOverIndex(null);
            }}
            onClick={() => onOpen(post)}
            className={`absolute inset-0 w-full h-full text-left ${
              isScheduled ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'
            }`}
          >
            {thumb(post) ? (
              <img
                src={thumb(post)!}
                alt=""
                className="w-full h-full object-cover pointer-events-none"
                draggable={false}
              />
            ) : (
              <div
                className={`w-full h-full flex items-center justify-center px-1 ${
                  opts.dark
                    ? 'bg-gradient-to-br from-zinc-700 to-zinc-900'
                    : 'bg-gradient-to-br from-zinc-300 to-zinc-400'
                }`}
              >
                <p className="text-[9px] font-bold text-white text-center line-clamp-3">
                  {post.title || 'Post'}
                </p>
              </div>
            )}

            {/* Platform-native media indicators (top-right) */}
            {platform === 'instagram' && kind === 'carousel' && (
              <span className="absolute top-1.5 right-1.5 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                <Images size={14} strokeWidth={2.25} fill="currentColor" className="text-white" />
              </span>
            )}
            {platform === 'instagram' && kind === 'reel' && (
              <span className="absolute top-1.5 right-1.5 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                <Clapperboard size={14} strokeWidth={2.25} />
              </span>
            )}
            {platform === 'tiktok' && (
              <span className="absolute bottom-1.5 left-1.5 flex items-center gap-0.5 text-white text-[10px] font-semibold drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M8 5v14l11-7z" />
                </svg>
                {formatViews(post.id)}
              </span>
            )}

            <StatusCorner
              isPublished={isPublished}
              isScheduled={isScheduled}
              dark={opts.dark}
            />

            {isScheduled && (
              <span className="absolute top-1 left-1 w-4 h-4 rounded bg-black/45 text-white flex items-center justify-center">
                <GripVertical size={10} />
              </span>
            )}
            {isPublished && (
              <span className="absolute top-1 left-1 w-4 h-4 rounded bg-black/35 text-white/90 flex items-center justify-center">
                <Lock size={9} />
              </span>
            )}
          </button>
        ) : (
          <div
            className={`absolute inset-0 ${
              over
                ? opts.dark
                  ? 'bg-white/10'
                  : 'bg-[var(--nc-coral)]/10'
                : ''
            }`}
          />
        )}
      </div>
    );
  };

  const phoneShell = (children: ReactNode, dark: boolean) => (
    <div className="relative w-full max-w-[340px]">
      <div
        className={`rounded-[2.55rem] p-[11px] shadow-2xl ${
          dark
            ? 'bg-gradient-to-b from-[#2a2a2a] via-[#111] to-black'
            : 'bg-gradient-to-b from-[#3a3a3c] via-[#1c1c1e] to-[#0a0a0a]'
        }`}
      >
        <div
          className={`rounded-[2rem] overflow-hidden flex flex-col h-[680px] ${
            dark ? 'bg-black text-white' : 'bg-white text-[#262626]'
          }`}
        >
          {/* Status bar / Dynamic Island */}
          <div className="relative h-11 flex-shrink-0">
            <div className="absolute left-5 top-[14px] text-[11px] font-semibold tracking-tight">
              9:41
            </div>
            <div className="absolute left-1/2 -translate-x-1/2 top-2 w-[96px] h-[28px] bg-black rounded-full" />
            <div
              className={`absolute right-5 top-[16px] flex items-center gap-1 ${
                dark ? 'text-white' : 'text-black'
              }`}
            >
              <div className="w-[15px] h-[9px] rounded-[2px] border border-current opacity-80 relative">
                <div className="absolute inset-[1.5px] right-[3px] bg-current rounded-[1px]" />
              </div>
            </div>
          </div>
          {children}
          {/* Home indicator */}
          <div className="pb-2 pt-1.5 flex justify-center flex-shrink-0" aria-hidden>
            <div
              className={`w-[120px] h-[4px] rounded-full ${dark ? 'bg-white/80' : 'bg-black'}`}
            />
          </div>
        </div>
      </div>
    </div>
  );

  const instagramFeed = (
    <>
      {/* Top nav — username row */}
      <div className="h-11 px-3 flex items-center justify-between flex-shrink-0 border-b border-black/[0.06]">
        <button type="button" className="w-9 h-9 flex items-center justify-center" aria-label="Add">
          <Plus size={24} strokeWidth={1.75} />
        </button>
        <button type="button" className="flex items-center gap-1 min-w-0">
          <span className="text-[15px] font-semibold tracking-tight truncate">{handleClean}</span>
          <ChevronDown size={14} strokeWidth={2.5} className="opacity-70" />
        </button>
        <button type="button" className="w-9 h-9 flex items-center justify-center" aria-label="Menu">
          <Menu size={22} strokeWidth={1.75} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-none">
        {/* Profile header */}
        <div className="px-3 pt-2 pb-2">
          <div className="flex items-center gap-5">
            <Avatar
              workspace={workspace}
              sizeClass="w-[78px] h-[78px]"
              ringClass="ring-[1.5px] ring-[#dbdbdb] ring-offset-2"
            />
            <div className="flex-1 grid grid-cols-3 text-center">
              <div>
                <p className="text-[16px] font-semibold leading-none">{gridPosts.length}</p>
                <p className="text-[12px] mt-0.5 text-[#262626]">{t('postsStatLabel', locale)}</p>
              </div>
              <div>
                <p className="text-[16px] font-semibold leading-none">{followers}</p>
                <p className="text-[12px] mt-0.5 text-[#262626]">{t('followersLabel', locale)}</p>
              </div>
              <div>
                <p className="text-[16px] font-semibold leading-none">{following}</p>
                <p className="text-[12px] mt-0.5 text-[#262626]">{t('followingLabel', locale)}</p>
              </div>
            </div>
          </div>

          <div className="mt-2.5">
            <p className="text-[13px] font-semibold leading-tight">{displayName}</p>
            <p className="text-[13px] leading-[17px] mt-0.5 whitespace-pre-line">{bioIg}</p>
            <a
              href={`https://linkin.bio/${handleClean}`}
              onClick={(e) => e.preventDefault()}
              className="text-[13px] font-semibold text-[#00376b] mt-0.5 inline-block"
            >
              {linkLabel}
            </a>
          </div>

          {/* Action buttons */}
          <div className="flex gap-1.5 mt-3">
            <button
              type="button"
              className="flex-1 h-8 rounded-lg bg-[#efefef] text-[13px] font-semibold"
            >
              {t('editProfile', locale)}
            </button>
            <button
              type="button"
              className="flex-1 h-8 rounded-lg bg-[#efefef] text-[13px] font-semibold"
            >
              {t('shareProfileBtn', locale)}
            </button>
            <button
              type="button"
              className="h-8 w-8 rounded-lg bg-[#efefef] flex items-center justify-center"
              aria-label="Suggested"
            >
              <UserPlus size={16} strokeWidth={2} />
            </button>
          </div>

          {/* Highlights */}
          <div className="flex gap-3.5 mt-4 overflow-x-auto scrollbar-none pb-1">
            {['New', 'Tips', 'Live', 'Shop'].map((label, i) => (
              <div key={label} className="flex flex-col items-center gap-1 w-[62px] flex-shrink-0">
                <div
                  className={`w-[58px] h-[58px] rounded-full p-[2px] ${
                    i === 0 ? 'border border-dashed border-[#dbdbdb]' : 'bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] p-[2px]'
                  }`}
                >
                  <div className="w-full h-full rounded-full bg-white p-[2px]">
                    <div
                      className={`w-full h-full rounded-full overflow-hidden ${
                        i === 0 ? 'bg-[#fafafa] flex items-center justify-center' : ''
                      }`}
                      style={
                        i > 0
                          ? {
                              backgroundImage: `url(https://images.unsplash.com/photo-${
                                ['1515886657613-9f3515b0c78f', '1495474472287-4d71bcdd2085', '1556742049-0cfed4f6a45d'][
                                  i - 1
                                ]
                              }?w=120&q=80)`,
                              backgroundSize: 'cover',
                            }
                          : undefined
                      }
                    >
                      {i === 0 && <Plus size={18} className="text-[#262626]" strokeWidth={1.5} />}
                    </div>
                  </div>
                </div>
                <span className="text-[11px] truncate w-full text-center">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-t border-[#dbdbdb] mt-1">
          <button
            type="button"
            className="flex-1 h-11 flex items-center justify-center border-b-[1.5px] border-black"
            aria-label="Posts grid"
          >
            <LayoutGrid size={22} strokeWidth={1.75} />
          </button>
          <button
            type="button"
            className="flex-1 h-11 flex items-center justify-center text-[#8e8e8e]"
            aria-label="Reels"
          >
            <Clapperboard size={22} strokeWidth={1.5} />
          </button>
          <button
            type="button"
            className="flex-1 h-11 flex items-center justify-center text-[#8e8e8e]"
            aria-label="Tagged"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="5" />
              <circle cx="12" cy="10" r="2.5" />
              <path d="M7 18c.8-2.2 2.7-3.5 5-3.5s4.2 1.3 5 3.5" />
            </svg>
          </button>
        </div>

        {/* 3-column grid — 3:4 tiles (portrait feed preview) */}
        <div className="grid grid-cols-3 gap-[1px] bg-[#dbdbdb]">
          {Array.from({ length: tileCount }).map((_, index) =>
            renderTile(index, { dark: false, aspect: 'aspect-[3/4]' })
          )}
        </div>
      </div>
    </>
  );

  const tiktokFeed = (
    <>
      {/* Top nav */}
      <div className="h-11 px-3 flex items-center justify-between flex-shrink-0">
        <button type="button" className="w-9 h-9 flex items-center justify-center" aria-label="Add">
          <Plus size={22} strokeWidth={2} />
        </button>
        <button type="button" className="flex items-center gap-1 min-w-0">
          <span className="text-[16px] font-bold tracking-tight truncate text-[#161823]">
            {handleClean}
          </span>
          <ChevronDown size={14} strokeWidth={2.5} className="text-[#161823]" />
        </button>
        <button
          type="button"
          className="w-9 h-9 flex items-center justify-center text-[#161823]"
          aria-label="More"
        >
          <MoreHorizontal size={22} strokeWidth={2} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-none bg-white">
        {/* Centered TikTok profile — light mode */}
        <div className="flex flex-col items-center px-4 pt-1 pb-3">
          <Avatar
            workspace={workspace}
            sizeClass="w-[92px] h-[92px]"
            ringClass="ring-[1.5px] ring-[#e3e3e4]"
          />
          <p className="mt-3 text-[17px] font-bold tracking-tight text-[#161823]">
            @{handleClean}
          </p>

          <div className="flex items-stretch justify-center gap-0 mt-3.5 w-full max-w-[280px]">
            <div className="flex-1 text-center px-2">
              <p className="text-[17px] font-bold leading-none text-[#161823]">{following}</p>
              <p className="text-[12px] text-[#161823]/70 mt-1">{t('followingLabel', locale)}</p>
            </div>
            <div className="w-px bg-[#161823]/12 my-1" />
            <div className="flex-1 text-center px-2">
              <p className="text-[17px] font-bold leading-none text-[#161823]">{followers}</p>
              <p className="text-[12px] text-[#161823]/70 mt-1">{t('followersLabel', locale)}</p>
            </div>
            <div className="w-px bg-[#161823]/12 my-1" />
            <div className="flex-1 text-center px-2">
              <p className="text-[17px] font-bold leading-none text-[#161823]">{likes}</p>
              <p className="text-[12px] text-[#161823]/70 mt-1">{t('likesLabel', locale)}</p>
            </div>
          </div>

          <div className="flex gap-2 mt-4 w-full max-w-[300px]">
            <button
              type="button"
              className="flex-1 h-9 rounded-md bg-[#f1f1f2] text-[#161823] text-[14px] font-semibold"
            >
              {t('editProfile', locale)}
            </button>
            <button
              type="button"
              className="flex-1 h-9 rounded-md bg-[#f1f1f2] text-[#161823] text-[14px] font-semibold"
            >
              {t('shareProfileBtn', locale)}
            </button>
            <button
              type="button"
              className="h-9 w-9 rounded-md bg-[#f1f1f2] text-[#161823] flex items-center justify-center"
              aria-label="Bookmark"
            >
              <Bookmark size={16} />
            </button>
          </div>

          <p className="mt-3.5 text-[13px] text-center text-[#161823] leading-snug max-w-[280px]">
            {bioTt}
          </p>
          <a
            href={`https://linkin.bio/${handleClean}`}
            onClick={(e) => e.preventDefault()}
            className="mt-1.5 text-[13px] font-semibold text-[#fe2c55]"
          >
            {linkLabel}
          </a>
        </div>

        {/* Tabs — Videos / Favorites / Liked */}
        <div className="flex border-b border-[#e3e3e4]">
          <button
            type="button"
            className="flex-1 h-11 flex items-center justify-center border-b-2 border-[#161823] text-[#161823]"
            aria-label="Videos"
          >
            <LayoutGrid size={18} strokeWidth={2.25} />
          </button>
          <button
            type="button"
            className="flex-1 h-11 flex items-center justify-center text-[#161823]/35"
            aria-label="Private"
          >
            <Lock size={18} strokeWidth={2} />
          </button>
          <button
            type="button"
            className="flex-1 h-11 flex items-center justify-center text-[#161823]/35"
            aria-label="Liked"
          >
            <Heart size={18} strokeWidth={2} />
          </button>
        </div>

        {/* TikTok video grid — taller tiles, tight gaps */}
        <div className="grid grid-cols-3 gap-[1px] bg-[#e3e3e4]">
          {Array.from({ length: tileCount }).map((_, index) =>
            renderTile(index, { dark: false, aspect: 'aspect-[3/4]' })
          )}
        </div>
      </div>
    </>
  );

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,380px)_1fr] gap-5 items-start">
      <div className="flex flex-col items-center">
        {showPlatformToggle && (
          <div className="inline-flex p-1 rounded-xl bg-zinc-100 mb-4">
            {(
              [
                { key: 'instagram' as const, label: 'Instagram' },
                { key: 'tiktok' as const, label: 'TikTok' },
              ] as const
            ).map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => setPlatformLocal(p.key)}
                className={`h-10 min-h-[44px] px-4 rounded-lg text-xs font-extrabold transition-colors ${
                  platform === p.key
                    ? 'bg-white text-[#2c3340] shadow-sm'
                    : 'text-zinc-500 hover:text-[#2c3340]'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        )}

        {phoneShell(platform === 'instagram' ? instagramFeed : tiktokFeed, false)}

        <p className="text-[11px] text-zinc-400 font-medium mt-3 text-center max-w-[320px]">
          {t('dragTilesHint', locale)}
          {saving ? ` ${t('savingEllipsis', locale)}` : ''}
        </p>
      </div>

      <aside className="bg-white border border-slate-200/80 rounded-2xl shadow-[0_1px_2px_rgba(15,23,42,0.03)] p-4 sm:p-5 min-h-[320px]">
        <div className="flex items-center justify-between gap-2 mb-1">
          <h3 className="text-sm font-black text-[#2c3340]">{t('draftBank', locale)}</h3>
          <span className="text-[10px] font-bold text-zinc-400 bg-zinc-100 px-2 py-1 rounded-full">
            {tf('ideasCountLabel', locale, { n: drafts.length })}
          </span>
        </div>
        <p className="text-xs text-zinc-500 font-medium mb-4">
          {t('draftBankHint', locale)}
        </p>

        {drafts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-200 bg-slate-50/80 py-12 text-center">
            <p className="text-sm font-bold text-zinc-400">{t('noDraftsYet', locale)}</p>
            <p className="text-xs text-zinc-400 mt-1">{t('createIdeasHint', locale)}</p>
          </div>
        ) : (
          <ul className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
            {drafts.map((draft) => (
              <li
                key={draft.id}
                draggable
                onDragStart={(e) => startDrag(e, { kind: 'draft', id: draft.id })}
                onDragEnd={() => {
                  setDraggingId(null);
                  setDragOverIndex(null);
                }}
                className={`rounded-2xl border border-zinc-100 bg-white p-3 flex items-center gap-3 cursor-grab active:cursor-grabbing shadow-sm hover:border-[var(--nc-coral)]/40 transition-colors ${
                  draggingId === draft.id ? 'opacity-50' : ''
                }`}
              >
                <div className="w-14 h-14 rounded-xl overflow-hidden bg-zinc-100 flex-shrink-0">
                  {thumb(draft) ? (
                    <img src={thumb(draft)!} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-300">
                      <ImageIcon size={18} />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-extrabold text-[#2c3340] truncate">
                    {draft.title || draft.idea_title || t('untitledPost', locale)}
                  </p>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide mt-0.5">
                    {draft.workflow.replace('_', ' ')}
                  </p>
                </div>
                <GripVertical size={14} className="text-zinc-300 flex-shrink-0" />
              </li>
            ))}
          </ul>
        )}
      </aside>
    </div>
  );
}
