'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  CalendarDays,
  ChevronDown,
  Download,
  Plus,
  Users,
  Eye,
  Hash,
  Link2,
  Film,
  BookOpen,
  Heart,
  MessageCircle,
  Share2,
  Activity,
  Sparkles,
  Copy,
  Check,
} from 'lucide-react';
import { useWorkspace } from '@/context/WorkspaceContext';
import { AdminPageHeader, adminCardClass, adminKpiClass } from '@/components/admin/AdminUi';
import { useAdminNav } from '@/components/admin/AdminNavContext';
import ConnectSocialsEmpty from '@/components/admin/ConnectSocialsEmpty';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useLanguage } from '@/lib/locale-context';
import { t, tf, localeTag, type Locale } from '@/lib/i18n';
import AnalyticsExportDialog from '@/components/admin/AnalyticsExportDialog';
import { useConnectedSocials } from '@/hooks/useConnectedSocials';
import { useMetaSync } from '@/hooks/useMetaSync';
import {
  useAnalytics,
  type AnalyticsHashtag,
  type AnalyticsPlatformSlice,
} from '@/hooks/useAnalytics';
import IgBusinessRequiredBanner from '@/components/admin/IgBusinessRequiredBanner';
import {
  FacebookIcon,
  InstagramIcon,
  LinkedInIcon,
  TikTokIcon,
  YouTubeIcon,
} from '@/components/icons/SocialBrandIcons';
import {
  bioClicksChart,
  bioRevenueChart,
  buildBioProductPerformance,
  buildBioUtmLinks,
  sumBioRevenueSek,
} from '@/lib/bio-sales';
import { syncWorkspaceBioAnalytics } from '@/lib/mock-workspace-profiles';

const PLATFORM_LABEL: Record<string, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  youtube: 'YouTube',
  linkedin: 'LinkedIn',
  tiktok: 'TikTok',
};

const PLATFORM_ICON: Record<
  string,
  React.ComponentType<{ size?: number; className?: string }>
> = {
  instagram: InstagramIcon,
  facebook: FacebookIcon,
  youtube: YouTubeIcon,
  linkedin: LinkedInIcon,
  tiktok: TikTokIcon,
};

type DateRangePreset = '1w' | '1m' | '3m' | '1y' | '2y' | 'custom';

type AnalyticsDateRange = {
  preset: DateRangePreset;
  from: string; // YYYY-MM-DD
  to: string;
};

function toDateInputValue(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function rangeFromPreset(preset: Exclude<DateRangePreset, 'custom'>): AnalyticsDateRange {
  const to = new Date();
  const from = new Date(to);
  if (preset === '1w') from.setDate(from.getDate() - 7);
  else if (preset === '1m') from.setMonth(from.getMonth() - 1);
  else if (preset === '3m') from.setMonth(from.getMonth() - 3);
  else if (preset === '1y') from.setFullYear(from.getFullYear() - 1);
  else from.setFullYear(from.getFullYear() - 2);
  return { preset, from: toDateInputValue(from), to: toDateInputValue(to) };
}

function formatRangeLabel(range: AnalyticsDateRange, locale: Locale) {
  if (range.preset === '1w') return t('dateRange1Week', locale);
  if (range.preset === '1m') return t('dateRange1Month', locale);
  if (range.preset === '3m') return t('dateRange3Months', locale);
  if (range.preset === '1y') return t('dateRange1Year', locale);
  if (range.preset === '2y') return t('dateRange2Years', locale);
  const from = new Date(`${range.from}T12:00:00`);
  const to = new Date(`${range.to}T12:00:00`);
  const fmt = new Intl.DateTimeFormat(localeTag(locale), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  return `${fmt.format(from)} – ${fmt.format(to)}`;
}

type AnalyticsSubTab =
  | 'analytics'
  | 'overview'
  | 'audience'
  | 'posts'
  | 'reels'
  | 'stories'
  | 'hashtags'
  | 'linkinbio';

type PostPerfRow = {
  id: string;
  title: string;
  platform: string;
  image: string;
  er: number;
  impressions: number;
  likes: number;
  comments: number;
  shares: number;
};

/** Empty engagement shape until Meta Graph insights sync. */
const EMPTY_ENGAGEMENT = {
  reach: 0,
  views: 0,
  followers: 0,
  followersDelta: 0,
  likes: 0,
  comments: 0,
  shares: 0,
  saves: 0,
  engagementRate: 0,
};

/** Dual-line performance chart — solid revenue + dashed visitors, pink end highlight. */
function PerformanceChart({
  revenue,
  visitors,
  days,
  ariaLabel,
}: {
  revenue: number[];
  visitors: number[];
  days: string[];
  ariaLabel: string;
}) {
  const w = 720;
  const h = 220;
  const padX = 8;
  const padY = 24;
  const max = Math.max(...revenue, ...visitors, 1);

  const toPts = (vals: number[]) =>
    vals.map((v, i) => {
      const x = padX + (i / Math.max(vals.length - 1, 1)) * (w - padX * 2);
      const y = h - padY - (v / max) * (h - padY * 2);
      return { x, y };
    });

  const revPts = toPts(revenue);
  const visPts = toPts(visitors);

  const smooth = (pts: { x: number; y: number }[]) => {
    if (pts.length < 2) return '';
    let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i];
      const p1 = pts[i + 1];
      const cx = (p0.x + p1.x) / 2;
      d += ` C ${cx.toFixed(1)} ${p0.y.toFixed(1)}, ${cx.toFixed(1)} ${p1.y.toFixed(1)}, ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`;
    }
    return d;
  };

  const last = revPts[revPts.length - 1];

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-[200px] sm:h-[220px]" role="img" aria-label={ariaLabel}>
        <path
          d={smooth(visPts)}
          fill="none"
          stroke="#CBD5E1"
          strokeWidth="2"
          strokeDasharray="5 6"
          strokeLinecap="round"
        />
        <path
          d={smooth(revPts)}
          fill="none"
          stroke="#0F172A"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {last && (
          <>
            <circle cx={last.x} cy={last.y} r="7" fill="#F472B6" stroke="#fff" strokeWidth="3" />
            <circle cx={last.x} cy={last.y} r="12" fill="#F472B6" fillOpacity="0.15" />
          </>
        )}
      </svg>
      <div className="flex justify-between px-1 -mt-1">
        {days.map((d) => (
          <span
            key={d}
            className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400"
          >
            {d}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function LaterAnalyticsPanel() {
  const { locale } = useLanguage();
  const { activeWorkspace, refreshWorkspaces } = useWorkspace();
  const { setSection } = useAdminNav();
  const {
    hasConnectedSocials,
    hasInstagram,
    needsIgBusiness,
    instagramAccount,
    connectedAccounts,
    isLoading: socialsLoading,
  } = useConnectedSocials();
  const { data: metaSync } = useMetaSync(hasInstagram);
  // Workspace-scoped analytics — aggregates every connected API for this brand.
  const { data: analyticsApi } = useAnalytics(hasConnectedSocials);
  const [sub, setSub] = useState<AnalyticsSubTab>('analytics');
  const [dateRange, setDateRange] = useState<AnalyticsDateRange>(() => rangeFromPreset('1w'));
  const [rangeOpen, setRangeOpen] = useState(false);
  const [draftFrom, setDraftFrom] = useState(dateRange.from);
  const [draftTo, setDraftTo] = useState(dateRange.to);
  const [exportOpen, setExportOpen] = useState(false);
  const [bioTick, setBioTick] = useState(0);

  // Keep Revenue / Link-in-bio in sync with Bio Builder products + checkout sales.
  useEffect(() => {
    if (!activeWorkspace.id) return;
    syncWorkspaceBioAnalytics(activeWorkspace.id, {
      from: dateRange.from,
      to: dateRange.to,
    });
    refreshWorkspaces();
    setBioTick((n) => n + 1);
  }, [
    activeWorkspace.id,
    activeWorkspace.bio.blocks.length,
    dateRange.from,
    dateRange.to,
    refreshWorkspaces,
  ]);

  const bioUtmLinks = useMemo(
    () => buildBioUtmLinks(activeWorkspace),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- bioTick forces recompute after sales/sync
    [activeWorkspace, bioTick]
  );
  const bioTotalClicks = useMemo(
    () => bioUtmLinks.reduce((n, r) => n + r.clicks, 0),
    [bioUtmLinks]
  );
  const bioRevenueSek = useMemo(
    () =>
      sumBioRevenueSek(activeWorkspace.id, {
        from: dateRange.from,
        to: dateRange.to,
      }),
    [activeWorkspace.id, dateRange.from, dateRange.to, bioTick]
  );
  const bioProducts = useMemo(
    () =>
      buildBioProductPerformance(activeWorkspace, {
        from: dateRange.from,
        to: dateRange.to,
      }),
    [activeWorkspace, dateRange.from, dateRange.to, bioTick]
  );
  const bioStoreCvr = useMemo(() => {
    const purchases = bioProducts.reduce((n, p) => n + p.purchases, 0);
    if (bioTotalClicks <= 0) return purchases > 0 ? 100 : 0;
    return Math.round((purchases / bioTotalClicks) * 1000) / 10;
  }, [bioProducts, bioTotalClicks]);

  const chart = activeWorkspace.analytics.revenue_chart;

  const liveMedia = useMemo(() => {
    const fromApi = analyticsApi?.media;
    if (fromApi && fromApi.length > 0) return fromApi;
    return metaSync?.snapshot?.media ?? [];
  }, [analyticsApi?.media, metaSync?.snapshot?.media]);

  const platformSlices = useMemo(() => {
    const fromApi = analyticsApi?.by_platform;
    if (fromApi && Object.keys(fromApi).length > 0) return fromApi;
    const fallback: Record<string, AnalyticsPlatformSlice> = {};
    for (const a of connectedAccounts) {
      fallback[a.platform] = {
        connected: true,
        followers: Number(a.follower_count) || 0,
        handle: a.handle ?? null,
        display_name: a.display_name ?? null,
        avatar_url: a.avatar_url ?? null,
      };
    }
    return fallback;
  }, [analyticsApi?.by_platform, connectedAccounts]);

  const totalFollowers = useMemo(() => {
    const fromTotals = analyticsApi?.totals?.followers ?? analyticsApi?.metrics?.followers;
    if (typeof fromTotals === 'number' && fromTotals > 0) return fromTotals;
    return Object.values(platformSlices).reduce((s, p) => s + (p.followers || 0), 0);
  }, [analyticsApi?.totals?.followers, analyticsApi?.metrics?.followers, platformSlices]);

  const igProfile = useMemo(() => {
    const snap = metaSync?.snapshot?.instagram;
    const slice = platformSlices.instagram;
    const handle =
      (snap?.username ? `@${snap.username.replace(/^@/, '')}` : null) ||
      slice?.handle ||
      instagramAccount?.handle ||
      null;
    const avatar =
      snap?.profile_picture_url ||
      slice?.avatar_url ||
      instagramAccount?.avatar_url ||
      null;
    const followers =
      snap?.followers_count ??
      slice?.followers ??
      instagramAccount?.follower_count ??
      0;
    const displayName =
      snap?.name ||
      slice?.display_name ||
      instagramAccount?.display_name ||
      handle ||
      'Instagram';
    return { handle, avatar, followers, displayName };
  }, [metaSync?.snapshot?.instagram, instagramAccount, platformSlices.instagram]);

  const engagement = useMemo(() => {
    const snap = metaSync?.snapshot;
    const api = analyticsApi?.metrics;
    if (!snap && connectedAccounts.length === 0 && !api) {
      return { ...EMPTY_ENGAGEMENT };
    }
    const likes = snap?.insights.likes ?? api?.likes ?? 0;
    const comments = snap?.insights.comments ?? api?.comments ?? 0;
    const reach = snap?.insights.reach ?? api?.reach ?? 0;
    const impressions = snap?.insights.impressions ?? api?.impressions ?? 0;
    const followers = totalFollowers || api?.followers || igProfile.followers || 0;
    const engagementTotal = likes + comments;
    return {
      reach,
      views: impressions,
      followers,
      followersDelta: 0,
      likes,
      comments,
      shares: 0,
      saves: 0,
      engagementRate:
        api?.engagement_rate ??
        (reach > 0 ? Math.round((engagementTotal / reach) * 1000) / 10 : 0),
    };
  }, [
    metaSync?.snapshot,
    analyticsApi?.metrics,
    connectedAccounts.length,
    totalFollowers,
    igProfile.followers,
  ]);

  /** Map synced IG media into Posts / Reels rows (from workspace analytics API). */
  const { bestPosts, worstPosts, bestReels, worstReels } = useMemo(() => {
    const media = liveMedia;
    const toRow = (item: (typeof media)[number]): PostPerfRow => {
      const likes = item.like_count ?? 0;
      const comments = item.comments_count ?? 0;
      const impressions = Math.max(likes + comments, likes * 8);
      const er =
        impressions > 0
          ? Math.round(((likes + comments) / impressions) * 1000) / 10
          : 0;
      const title =
        item.caption?.split('\n')[0]?.slice(0, 48) ||
        `IG ${item.media_type || 'post'}`;
      return {
        id: item.id,
        title,
        platform: 'Instagram',
        image: item.thumbnail_url || item.media_url || '',
        er,
        impressions,
        likes,
        comments,
        shares: 0,
      };
    };
    const feed = media
      .filter((m) => m.media_type !== 'VIDEO' && m.media_type !== 'REELS')
      .map(toRow)
      .sort((a, b) => b.er - a.er);
    const reels = media
      .filter((m) => m.media_type === 'VIDEO' || m.media_type === 'REELS')
      .map(toRow)
      .sort((a, b) => b.er - a.er);
    const split = (rows: PostPerfRow[]) => {
      if (rows.length === 0) return { best: [] as PostPerfRow[], worst: [] as PostPerfRow[] };
      if (rows.length === 1) return { best: rows, worst: [] as PostPerfRow[] };
      const mid = Math.max(1, Math.ceil(rows.length / 2));
      return { best: rows.slice(0, mid), worst: [...rows].reverse().slice(0, rows.length - mid) };
    };
    const postsSplit = split(feed.length ? feed : media.map(toRow).sort((a, b) => b.er - a.er));
    const reelsSplit = split(reels);
    return {
      bestPosts: postsSplit.best,
      worstPosts: postsSplit.worst,
      bestReels: reelsSplit.best,
      worstReels: reelsSplit.worst,
    };
  }, [liveMedia]);

  const usedHashtags = useMemo<AnalyticsHashtag[]>(() => {
    if (analyticsApi?.hashtags && analyticsApi.hashtags.length > 0) {
      return analyticsApi.hashtags;
    }
    // Client-side fallback from captions when API omits hashtags.
    const map = new Map<string, AnalyticsHashtag>();
    for (const item of liveMedia) {
      const matches = (item.caption || '').match(/#[\p{L}\p{N}_]+/gu) || [];
      for (const raw of matches) {
        const tag = raw.toLowerCase();
        const prev = map.get(tag) || { tag, posts: 0, reach: 0, er: 0, trend: 0 };
        prev.posts += 1;
        prev.reach += Math.max(item.like_count ?? 0, 1);
        map.set(tag, prev);
      }
    }
    return [...map.values()]
      .map((h) => ({
        ...h,
        er:
          h.reach > 0
            ? Math.round(((h.posts * 2) / h.reach) * 1000) / 10
            : 0,
      }))
      .sort((a, b) => b.posts - a.posts)
      .slice(0, 40);
  }, [analyticsApi?.hashtags, liveMedia]);

  // Social engagement chart (Analytics tab) from Meta media; Revenue tab uses bio checkout series.
  const socialActivity = useMemo(() => {
    if (!hasConnectedSocials) return [0, 0, 0, 0, 0, 0, 0];
    if (liveMedia.length >= 7) {
      return liveMedia.slice(0, 7).map((m) => m.like_count ?? 0).reverse();
    }
    return [0, 0, 0, 0, 0, 0, 0];
  }, [hasConnectedSocials, liveMedia]);

  const checkoutRevenueSeries = useMemo(() => {
    const live = bioRevenueChart(activeWorkspace.id, 7);
    if (live.some((v) => v > 0)) return live;
    if (chart.length >= 7 && chart.some((v) => v > 0)) return chart.slice(0, 7);
    return live;
  }, [activeWorkspace.id, chart, bioTick]);

  const checkoutVisitorSeries = useMemo(
    () => bioClicksChart(bioUtmLinks, 7),
    [bioUtmLinks]
  );

  // Legacy aliases used by Analytics engagement chart.
  const revenue = socialActivity;
  const visitors = useMemo(
    () => revenue.map((v, i) => Math.round(v * (0.55 + (i % 3) * 0.08))),
    [revenue]
  );

  const dayLabels = [
    t('dayMon', locale),
    t('dayTue', locale),
    t('dayWed', locale),
    t('dayThu', locale),
    t('dayFri', locale),
    t('daySat', locale),
    t('daySun', locale),
  ];

  const subTabs: { key: AnalyticsSubTab; label: string; icon: React.ElementType }[] = [
    { key: 'analytics', label: t('analyticsTab', locale), icon: Activity },
    { key: 'audience', label: t('analyticsAudience', locale), icon: Users },
    { key: 'posts', label: t('analyticsPosts', locale), icon: BookOpen },
    { key: 'reels', label: t('analyticsReels', locale), icon: Film },
    { key: 'stories', label: t('analyticsStories', locale), icon: Eye },
    { key: 'hashtags', label: t('analyticsHashtags', locale), icon: Hash },
    { key: 'overview', label: t('analyticsOverview', locale), icon: BarChart3 },
    { key: 'linkinbio', label: t('analyticsLinkinBio', locale), icon: Link2 },
  ];

  const activeTabLabel =
    subTabs.find((tab) => tab.key === sub)?.label ?? t('analyticsTab', locale);

  // KPIs: checkout revenue from Link-in-bio sales + social reach from connected APIs.
  const kpis: {
    label: string;
    value: string;
    delta: string;
    deltaTone: 'good' | 'neutral';
    meta: string;
  }[] = [
    {
      label: t('kpiRevenueCheckout', locale),
      value: `${bioRevenueSek || activeWorkspace.analytics.revenue_sek || 0} SEK`,
      delta: '—',
      deltaTone: 'neutral',
      meta: String(bioTotalClicks || activeWorkspace.analytics.utm_total_clicks || 0),
    },
    {
      label: t('kpiFollowers', locale),
      value: formatCompact(totalFollowers || engagement.followers, locale),
      delta: '—',
      deltaTone: 'neutral',
      meta: `${connectedAccounts.length} APIs`,
    },
    {
      label: t('kpiBioStoreCvr', locale),
      value: `${bioStoreCvr}%`,
      delta: '—',
      deltaTone: bioStoreCvr > 0 ? 'good' : 'neutral',
      meta: String(bioProducts.reduce((n, p) => n + p.purchases, 0)),
    },
    {
      label: t('kpiPlannedPosts', locale),
      value: String(
        analyticsApi?.planner_imported ??
          metaSync?.snapshot?.planner_imported ??
          liveMedia.length ??
          0
      ),
      delta: '—',
      deltaTone: 'neutral',
      meta: hasInstagram ? 'Meta' : 'APIs',
    },
  ];

  const topBioProducts = useMemo(
    () =>
      bioProducts.map((p) => ({
        name: p.name,
        category: p.category,
        clicks: p.clicks,
        conversion: p.conversion,
        revenue: `${p.revenue_sek} SEK`,
        live: p.live,
      })),
    [bioProducts]
  );

  const tableHeaders = [
    t('colProduct', locale),
    t('colCategory', locale),
    t('colClicks', locale),
    t('colConversion', locale),
    t('colRevenue', locale),
    t('colStatus', locale),
  ];

  const isBioCommerceTab = sub === 'overview' || sub === 'linkinbio';

  // Social tabs need connected APIs; Revenue + Link in bio come from Bio Builder sales.
  if (!socialsLoading && !hasConnectedSocials && !isBioCommerceTab) {
    return (
      <div className="space-y-6">
        <AdminPageHeader
          eyebrow={t('analyticsAndRevenue', locale)}
          title={activeTabLabel}
        />
        <div className="flex items-center gap-0.5 overflow-x-auto scrollbar-none -mt-2">
          {subTabs.map(({ key, label }) => {
            const active = sub === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSub(key)}
                className={`h-9 min-h-[36px] px-3 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex-shrink-0 ${
                  active
                    ? 'text-slate-900 bg-slate-100'
                    : 'text-slate-400 hover:text-slate-700 hover:bg-slate-50'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
        <ConnectSocialsEmpty />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow={t('analyticsAndRevenue', locale)}
        title={activeTabLabel}
        actions={
          <>
            <Popover
              open={rangeOpen}
              onOpenChange={(open) => {
                setRangeOpen(open);
                if (open) {
                  setDraftFrom(dateRange.from);
                  setDraftTo(dateRange.to);
                }
              }}
            >
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="h-10 min-h-[40px] px-3.5 rounded-xl border border-slate-200/90 bg-white text-xs font-semibold text-slate-600 inline-flex items-center gap-1.5 hover:bg-slate-50 transition-colors"
                  aria-label={t('dateRangePresets', locale)}
                >
                  <CalendarDays size={14} className="text-slate-400" aria-hidden />
                  <span className="max-w-[140px] truncate">
                    {formatRangeLabel(dateRange, locale)}
                  </span>
                  <ChevronDown size={14} className="text-slate-400" aria-hidden />
                </button>
              </PopoverTrigger>
              <PopoverContent
                align="end"
                className="w-[min(320px,92vw)] rounded-2xl border-slate-200/90 bg-white p-0 shadow-xl"
              >
                <div className="px-4 pt-3.5 pb-2">
                  <p className="text-[10px] font-mono font-bold uppercase tracking-[0.12em] text-slate-400">
                    {t('dateRangePresets', locale)}
                  </p>
                </div>
                <div className="px-2 pb-2 space-y-0.5">
                  {(
                    [
                      { key: '1w' as const, labelKey: 'dateRange1Week' as const },
                      { key: '1m' as const, labelKey: 'dateRange1Month' as const },
                      { key: '3m' as const, labelKey: 'dateRange3Months' as const },
                      { key: '1y' as const, labelKey: 'dateRange1Year' as const },
                      { key: '2y' as const, labelKey: 'dateRange2Years' as const },
                    ] as const
                  ).map(({ key, labelKey }) => {
                    const selected = dateRange.preset === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => {
                          setDateRange(rangeFromPreset(key));
                          setRangeOpen(false);
                        }}
                        className={`w-full h-10 min-h-[40px] px-3 rounded-xl text-left text-sm font-semibold transition-colors ${
                          selected
                            ? 'bg-[#E9D5FF]/70 text-[#1a1848]'
                            : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {t(labelKey, locale)}
                      </button>
                    );
                  })}
                </div>

                <div className="border-t border-slate-100 px-4 py-3 space-y-3">
                  <p className="text-[10px] font-mono font-bold uppercase tracking-[0.12em] text-slate-400">
                    {t('dateRangeCustom', locale)}
                  </p>
                  <div className="grid grid-cols-1 gap-2">
                    <label className="space-y-1">
                      <span className="text-[11px] font-semibold text-slate-500">
                        {t('dateRangeFrom', locale)}
                      </span>
                      <input
                        type="date"
                        value={draftFrom}
                        max={draftTo}
                        onChange={(e) => setDraftFrom(e.target.value)}
                        className="w-full h-10 min-h-[40px] rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/5"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="text-[11px] font-semibold text-slate-500">
                        {t('dateRangeTo', locale)}
                      </span>
                      <input
                        type="date"
                        value={draftTo}
                        min={draftFrom}
                        max={toDateInputValue(new Date())}
                        onChange={(e) => setDraftTo(e.target.value)}
                        className="w-full h-10 min-h-[40px] rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/5"
                      />
                    </label>
                  </div>
                  <button
                    type="button"
                    disabled={!draftFrom || !draftTo || draftFrom > draftTo}
                    onClick={() => {
                      setDateRange({
                        preset: 'custom',
                        from: draftFrom,
                        to: draftTo,
                      });
                      setRangeOpen(false);
                    }}
                    className="w-full h-10 min-h-[40px] rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors disabled:opacity-40"
                  >
                    {t('dateRangeApply', locale)}
                  </button>
                </div>
              </PopoverContent>
            </Popover>
            <button
              type="button"
              onClick={() => setExportOpen(true)}
              className="h-10 min-h-[40px] px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
            >
              <Download size={13} /> {t('exportLabel', locale)}
            </button>
          </>
        }
      />

      {needsIgBusiness ? (
        <IgBusinessRequiredBanner showSettingsLink />
      ) : null}

      {connectedAccounts.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {connectedAccounts.map((account) => {
            const Icon = PLATFORM_ICON[account.platform] || InstagramIcon;
            const slice = platformSlices[account.platform];
            const followers =
              slice?.followers || Number(account.follower_count) || 0;
            const handle = slice?.handle || account.handle || account.display_name;
            const avatar = slice?.avatar_url || account.avatar_url;
            return (
              <div
                key={`${account.platform}-${account.handle || account.external_id || 'row'}`}
                className="rounded-2xl border border-slate-200/80 bg-white px-3.5 py-3 flex items-center gap-3 shadow-[0_1px_2px_rgba(15,23,42,0.03)]"
              >
                {avatar ? (
                  <img
                    src={avatar}
                    alt=""
                    className="w-11 h-11 min-h-[44px] min-w-[44px] rounded-full object-cover border-2 border-[#E9D5FF]"
                  />
                ) : (
                  <span className="w-11 h-11 min-h-[44px] min-w-[44px] rounded-full bg-slate-100 inline-flex items-center justify-center text-slate-700">
                    <Icon size={18} />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                    {PLATFORM_LABEL[account.platform] || account.platform}
                  </p>
                  <p className="text-sm font-extrabold text-slate-900 truncate">
                    {handle || PLATFORM_LABEL[account.platform] || account.platform}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                    {t('kpiFollowers', locale)}
                  </p>
                  <p className="text-base font-extrabold tabular-nums text-slate-900">
                    {formatCompact(followers, locale)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      <AnalyticsExportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        workspaceName={activeWorkspace.name}
        rangeLabel={formatRangeLabel(dateRange, locale)}
        kpis={kpis}
        topProducts={topBioProducts}
        engagement={engagement}
      />

      {/* Quiet sub-nav — only shown when drilling into detail tabs */}
      <div className="flex items-center gap-0.5 overflow-x-auto scrollbar-none -mt-2">
        {subTabs.map(({ key, label }) => {
          const active = sub === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setSub(key)}
              className={`h-9 min-h-[36px] px-3 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex-shrink-0 ${
                active
                  ? 'text-slate-900 bg-slate-100'
                  : 'text-slate-400 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {sub === 'analytics' && (
        <AnalyticsOverviewTab
          locale={locale}
          workspaceName={activeWorkspace.name}
          rangeLabel={formatRangeLabel(dateRange, locale)}
          engagement={engagement}
        />
      )}

      {sub === 'overview' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
            {kpis.map((k) => (
              <div key={k.label} className={adminKpiClass}>
                <p className="text-[10px] font-mono font-bold uppercase tracking-[0.12em] text-slate-400">
                  {k.label}
                </p>
                <p className="mt-3 font-clikd-wordmark font-extrabold text-[26px] sm:text-[28px] leading-none text-slate-900 tracking-tight tabular-nums">
                  {k.value}
                </p>
                <div className="mt-3 flex items-center gap-2 flex-wrap">
                  <span
                    className={`text-xs font-bold tabular-nums ${
                      k.deltaTone === 'good' ? 'text-emerald-600' : 'text-slate-500'
                    }`}
                  >
                    {k.delta}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">{k.meta}</span>
                </div>
              </div>
            ))}
          </div>

          <div className={`${adminCardClass} p-5 sm:p-7`}>
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
              <div>
                <h2 className="font-clikd-wordmark font-extrabold text-lg text-slate-900 tracking-tight">
                  {t('performanceCheckoutTitle', locale)}
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  {t('performanceCheckoutSub', locale)}
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs font-medium text-slate-500">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-slate-900" /> {t('chartRevenue', locale)}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-slate-300" /> {t('chartVisitors', locale)}
                </span>
              </div>
            </div>
            <PerformanceChart
              revenue={checkoutRevenueSeries}
              visitors={checkoutVisitorSeries}
              days={dayLabels}
              ariaLabel={t('performanceChartAria', locale)}
            />
          </div>

          <div className={`${adminCardClass} overflow-hidden`}>
            <div className="px-5 sm:px-7 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100">
              <div>
                <h2 className="font-clikd-wordmark font-extrabold text-lg text-slate-900 tracking-tight">
                  {t('topBioProductsTitle', locale)}
                </h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  {t('topBioProductsSub', locale)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSection('biobuilder')}
                className="h-10 min-h-[40px] px-3.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 inline-flex items-center gap-1.5 hover:bg-slate-50 transition-colors self-start"
              >
                <Plus size={14} /> {t('newProduct', locale)}
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-left">
                <thead>
                  <tr className="border-b border-slate-100">
                    {tableHeaders.map((h) => (
                      <th
                        key={h}
                        className="px-5 sm:px-7 py-3 text-[10px] font-mono font-bold uppercase tracking-[0.12em] text-slate-400"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {topBioProducts.length === 0 ? (
                    <tr>
                      <td
                        colSpan={tableHeaders.length}
                        className="px-5 sm:px-7 py-10 text-sm text-slate-400 text-center"
                      >
                        —
                      </td>
                    </tr>
                  ) : (
                    topBioProducts.map((row) => (
                      <tr
                        key={row.name}
                        className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50"
                      >
                        <td className="px-5 sm:px-7 py-4 text-sm font-semibold text-slate-900">
                          {row.name}
                        </td>
                        <td className="px-5 sm:px-7 py-4 text-sm text-slate-500">{row.category}</td>
                        <td className="px-5 sm:px-7 py-4 text-sm font-semibold tabular-nums text-slate-800">
                          {row.clicks.toLocaleString(localeTag(locale))}
                        </td>
                        <td className="px-5 sm:px-7 py-4 text-sm font-bold tabular-nums text-emerald-600">
                          {row.conversion}
                        </td>
                        <td className="px-5 sm:px-7 py-4 text-sm font-semibold tabular-nums text-slate-800">
                          {row.revenue}
                        </td>
                        <td className="px-5 sm:px-7 py-4">
                          <span
                            className={`inline-block w-2 h-2 rounded-full ${
                              row.live ? 'bg-emerald-500' : 'bg-slate-300'
                            }`}
                            title={row.live ? t('statusLive', locale) : t('statusPaused', locale)}
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {sub === 'audience' && (
        <AudienceInsights
          locale={locale}
          workspaceName={activeWorkspace.name}
          followers={totalFollowers || engagement.followers}
          accountCount={
            analyticsApi?.totals?.accounts ??
            analyticsApi?.metrics?.accounts ??
            connectedAccounts.length
          }
          reach={engagement.reach}
          platforms={platformSlices}
        />
      )}

      {sub === 'posts' && (
        <ContentPerformanceTab
          locale={locale}
          rangeLabel={formatRangeLabel(dateRange, locale)}
          compareKey="postsPerformanceCompare"
          reachLabelKey="metricImpressions"
          best={bestPosts}
          worst={worstPosts}
        />
      )}
      {sub === 'reels' && (
        <ContentPerformanceTab
          locale={locale}
          rangeLabel={formatRangeLabel(dateRange, locale)}
          compareKey="reelsPerformanceCompare"
          reachLabelKey="metricPlays"
          best={bestReels}
          worst={worstReels}
        />
      )}
      {sub === 'stories' && (
        <ContentPerformanceTab
          locale={locale}
          rangeLabel={formatRangeLabel(dateRange, locale)}
          compareKey="storiesPerformanceCompare"
          reachLabelKey="metricImpressions"
          best={[]}
          worst={[]}
        />
      )}
      {sub === 'hashtags' && (
        <HashtagsAnalyticsTab
          locale={locale}
          rangeLabel={formatRangeLabel(dateRange, locale)}
          hashtags={usedHashtags}
        />
      )}
      {sub === 'linkinbio' && (
        <LinkInBioAnalyticsTab
          locale={locale}
          rangeLabel={formatRangeLabel(dateRange, locale)}
          totalClicks={bioTotalClicks}
          links={bioUtmLinks}
          onOpenBio={() => setSection('biobuilder')}
        />
      )}
    </div>
  );
}

function formatCompact(n: number, locale: Locale) {
  return new Intl.NumberFormat(localeTag(locale), {
    notation: n >= 10000 ? 'compact' : 'standard',
    maximumFractionDigits: 1,
  }).format(n);
}

function LinkInBioAnalyticsTab({
  locale,
  rangeLabel,
  totalClicks,
  links,
  onOpenBio,
}: {
  locale: Locale;
  rangeLabel: string;
  totalClicks: number;
  links: { title: string; slug: string; clicks: number; unique: number }[];
  onOpenBio: () => void;
}) {
  const ranked = useMemo(
    () => [...links].sort((a, b) => b.clicks - a.clicks),
    [links]
  );
  const maxClicks = Math.max(...ranked.map((l) => l.clicks), 1);
  const totalUnique = ranked.reduce((s, l) => s + l.unique, 0);
  const top = ranked[0] ?? null;
  const uniqueRate =
    totalClicks > 0 ? Math.round((totalUnique / totalClicks) * 1000) / 10 : 0;

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <div className={adminKpiClass}>
          <p className="text-[10px] font-mono font-bold uppercase tracking-[0.12em] text-slate-400">
            {t('colClicks', locale)}
          </p>
          <p className="mt-2 font-clikd-wordmark font-extrabold text-2xl text-slate-900 tabular-nums tracking-tight">
            {formatCompact(totalClicks, locale)}
          </p>
          <p className="mt-2 text-[11px] font-medium text-slate-400">
            {tf('linkInBioSub', locale, { range: rangeLabel })}
          </p>
        </div>
        <div className={adminKpiClass}>
          <p className="text-[10px] font-mono font-bold uppercase tracking-[0.12em] text-slate-400">
            {t('uniqueCol', locale)}
          </p>
          <p className="mt-2 font-clikd-wordmark font-extrabold text-2xl text-slate-900 tabular-nums tracking-tight">
            {formatCompact(totalUnique, locale)}
          </p>
          <p className="mt-2 text-[11px] font-medium text-slate-400">
            {t('linkInBioConversionHint', locale)}
          </p>
        </div>
        <div className={adminKpiClass}>
          <p className="text-[10px] font-mono font-bold uppercase tracking-[0.12em] text-slate-400">
            {t('linkInBioUniqueRate', locale)}
          </p>
          <p className="mt-2 font-clikd-wordmark font-extrabold text-2xl text-slate-900 tabular-nums tracking-tight">
            {uniqueRate}%
          </p>
          <p className="mt-2 text-xs font-bold tabular-nums text-emerald-600">+2.1%</p>
        </div>
        <div className={adminKpiClass}>
          <p className="text-[10px] font-mono font-bold uppercase tracking-[0.12em] text-slate-400">
            {t('linkInBioTopLink', locale)}
          </p>
          <p className="mt-2 font-clikd-wordmark font-extrabold text-lg text-slate-900 tracking-tight truncate">
            {top?.title ?? '—'}
          </p>
          <p className="mt-2 text-[11px] font-mono text-slate-400 truncate">
            {top ? `/r/${top.slug}` : '—'}
          </p>
        </div>
      </div>

      <div className={`${adminCardClass} overflow-hidden`}>
        <div className="px-4 sm:px-5 py-3.5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 inline-flex items-center gap-2">
              <Link2 size={14} className="text-[#F472B6]" aria-hidden />
              {t('linkinBioAnalyticsTitle', locale)}
            </h3>
            <p className="text-[11px] font-medium text-slate-400 mt-0.5">
              {tf('clicksTotalBioUtm', locale, { n: totalClicks })}
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenBio}
            className="h-10 min-h-[40px] px-3.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 inline-flex items-center gap-1.5 hover:bg-slate-50 transition-colors self-start"
          >
            <Plus size={14} /> {t('newProduct', locale)}
          </button>
        </div>

        {ranked.length === 0 ? (
          <p className="py-14 text-center text-sm text-slate-400 font-medium">
            {t('addProductsForLinkPerf', locale)}
          </p>
        ) : (
          <div className="divide-y divide-slate-100">
            {ranked.map((row, i) => {
              const share = Math.round((row.clicks / maxClicks) * 100);
              const clickShare =
                totalClicks > 0 ? Math.round((row.clicks / totalClicks) * 100) : 0;
              return (
                <div
                  key={row.slug}
                  className="px-4 sm:px-5 py-3.5 flex items-center gap-3 min-h-[72px] hover:bg-slate-50/70 transition-colors"
                >
                  <span
                    className={`w-6 h-6 min-h-[24px] min-w-[24px] rounded-md text-[11px] font-extrabold tabular-nums inline-flex items-center justify-center flex-shrink-0 ${
                      i === 0
                        ? 'bg-[#F472B6] text-white'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">
                        {row.title}
                      </p>
                      <span className="hidden sm:inline text-[10px] font-mono font-medium text-slate-400 flex-shrink-0">
                        /r/{row.slug}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="h-1.5 flex-1 max-w-[220px] rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#1a1848]"
                          style={{ width: `${share}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 flex-shrink-0">
                        {clickShare}% {t('linkInBioClickShare', locale)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 sm:gap-5 flex-shrink-0 text-right">
                    <div>
                      <p className="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-400">
                        {t('colClicks', locale)}
                      </p>
                      <p className="text-sm font-extrabold tabular-nums text-slate-900">
                        {formatCompact(row.clicks, locale)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-400">
                        {t('uniqueCol', locale)}
                      </p>
                      <p className="text-sm font-extrabold tabular-nums text-slate-900">
                        {formatCompact(row.unique, locale)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function AnalyticsOverviewTab({
  locale,
  workspaceName,
  rangeLabel,
  engagement,
}: {
  locale: Locale;
  workspaceName: string;
  rangeLabel: string;
  engagement: typeof EMPTY_ENGAGEMENT;
}) {
  const data = engagement;
  const totalEngagement = data.likes + data.comments + data.shares + data.saves;

  const primaryMetrics = [
    {
      key: 'reach',
      label: t('metricReach', locale),
      value: formatCompact(data.reach, locale),
      delta: '—',
      icon: Users,
    },
    {
      key: 'views',
      label: t('metricViews', locale),
      value: formatCompact(data.views, locale),
      delta: '—',
      icon: Eye,
    },
    {
      key: 'followers',
      label: t('kpiFollowers', locale),
      value: formatCompact(data.followers, locale),
      delta: data.followersDelta ? `+${data.followersDelta}` : '—',
      icon: Users,
    },
    {
      key: 'er',
      label: t('metricEngagementRate', locale),
      value: `${data.engagementRate}%`,
      delta: '—',
      icon: Activity,
    },
  ];

  const engagementBreakdown = [
    {
      key: 'likes',
      label: t('metricLikes', locale),
      value: data.likes,
      pct: Math.round((data.likes / totalEngagement) * 100),
      color: '#F472B6',
      icon: Heart,
    },
    {
      key: 'comments',
      label: t('metricComments', locale),
      value: data.comments,
      pct: Math.round((data.comments / totalEngagement) * 100),
      color: '#1a1848',
      icon: MessageCircle,
    },
    {
      key: 'shares',
      label: t('metricShares', locale),
      value: data.shares,
      pct: Math.round((data.shares / totalEngagement) * 100),
      color: '#10B981',
      icon: Share2,
    },
    {
      key: 'saves',
      label: t('metricSaves', locale),
      value: data.saves,
      pct: Math.round((data.saves / totalEngagement) * 100),
      color: '#9089F0',
      icon: BookOpen,
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        {primaryMetrics.map((m) => {
          const Icon = m.icon;
          return (
            <div key={m.key} className={adminKpiClass}>
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] font-mono font-bold uppercase tracking-[0.12em] text-slate-400">
                  {m.label}
                </p>
                <Icon size={14} className="text-slate-300" aria-hidden />
              </div>
              <p className="mt-3 font-clikd-wordmark font-extrabold text-[26px] sm:text-[28px] leading-none text-slate-900 tracking-tight tabular-nums">
                {m.value}
              </p>
              <p className="mt-3 text-xs font-bold tabular-nums text-emerald-600">{m.delta}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
        <div className={`${adminCardClass} p-5 sm:p-6 lg:col-span-1`}>
          <h3 className="font-clikd-wordmark font-extrabold text-base text-slate-900">
            {t('metricEngagementRate', locale)}
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            {tf('engagementRateHint', locale, {
              name: workspaceName,
              range: rangeLabel,
            })}
          </p>
          <div className="mt-6 flex items-end gap-2">
            <p className="font-clikd-wordmark font-extrabold text-5xl sm:text-6xl leading-none text-slate-900 tabular-nums tracking-tight">
              {data.engagementRate}
            </p>
            <span className="text-2xl font-extrabold text-slate-400 mb-1">%</span>
          </div>
          <p className="mt-3 text-xs font-semibold text-emerald-600">
            {t('engagementRateTrend', locale)}
          </p>
          <div className="mt-5 h-2 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-[#F472B6]"
              style={{ width: `${Math.min(100, data.engagementRate * 12)}%` }}
            />
          </div>
          <p className="mt-2 text-[11px] font-medium text-slate-400">
            {t('engagementRateFormula', locale)}
          </p>
        </div>

        <div className={`${adminCardClass} p-5 sm:p-6 lg:col-span-2`}>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-5">
            <div>
              <h3 className="font-clikd-wordmark font-extrabold text-base text-slate-900">
                {t('engagementSummaryTitle', locale)}
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                {t('engagementSummarySub', locale)}
              </p>
            </div>
            <div className="text-left sm:text-right">
              <p className="font-clikd-wordmark font-extrabold text-2xl text-slate-900 tabular-nums">
                {formatCompact(totalEngagement, locale)}
              </p>
              <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                {t('totalEngagement', locale)}
              </p>
            </div>
          </div>

          <div className="flex h-3 rounded-full overflow-hidden bg-slate-100 mb-5">
            {engagementBreakdown.map((row) => (
              <div
                key={row.key}
                className="h-full first:rounded-l-full last:rounded-r-full"
                style={{ width: `${row.pct}%`, background: row.color }}
                title={`${row.label} ${row.pct}%`}
              />
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {engagementBreakdown.map((row) => {
              const Icon = row.icon;
              return (
                <div
                  key={row.key}
                  className="rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3.5 flex items-center gap-3 min-h-[56px]"
                >
                  <span
                    className="w-9 h-9 min-h-[36px] min-w-[36px] rounded-xl inline-flex items-center justify-center flex-shrink-0"
                    style={{ background: `${row.color}22`, color: row.color }}
                  >
                    <Icon size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-800">{row.label}</p>
                    <p className="text-[11px] font-medium text-slate-400">
                      {tf('pctOfEngagement', locale, { n: String(row.pct) })}
                    </p>
                  </div>
                  <p className="text-base font-extrabold tabular-nums text-slate-900 flex-shrink-0">
                    {formatCompact(row.value, locale)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {[
          { label: t('metricLikes', locale), value: data.likes, icon: Heart },
          { label: t('metricComments', locale), value: data.comments, icon: MessageCircle },
          { label: t('metricShares', locale), value: data.shares, icon: Share2 },
        ].map((m) => {
          const Icon = m.icon;
          return (
            <div key={m.label} className={`${adminCardClass} p-4 sm:p-5 flex items-center gap-3`}>
              <span className="w-10 h-10 min-h-[40px] min-w-[40px] rounded-xl bg-slate-100 text-slate-600 inline-flex items-center justify-center flex-shrink-0">
                <Icon size={18} />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                  {m.label}
                </p>
                <p className="text-xl font-extrabold tabular-nums text-slate-900">
                  {formatCompact(m.value, locale)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PostPerfRowItem({
  post,
  locale,
  tone,
  rank,
  reachLabelKey,
}: {
  post: PostPerfRow;
  locale: Locale;
  tone: 'best' | 'worst';
  rank: number;
  reachLabelKey: 'metricImpressions' | 'metricPlays';
}) {
  const maxEr = 8;
  const barPct = Math.min(100, (post.er / maxEr) * 100);
  const barColor = tone === 'best' ? '#10B981' : '#F472B6';

  return (
    <article className="flex items-center gap-3 px-3 py-2.5 min-h-[64px] hover:bg-slate-50/80 transition-colors">
      <span
        className={`w-6 h-6 min-h-[24px] min-w-[24px] rounded-md text-[11px] font-extrabold tabular-nums inline-flex items-center justify-center flex-shrink-0 ${
          tone === 'best'
            ? 'bg-emerald-500 text-white'
            : 'bg-slate-200 text-slate-600'
        }`}
      >
        {rank}
      </span>
      <div className="w-12 h-12 min-h-[48px] min-w-[48px] rounded-xl overflow-hidden bg-slate-100 flex-shrink-0">
        <img src={post.image} alt="" className="w-full h-full object-cover" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 min-w-0">
          <p className="text-sm font-semibold text-slate-900 truncate">{post.title}</p>
          <span className="hidden sm:inline text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 flex-shrink-0">
            {post.platform}
          </span>
        </div>
        <div className="mt-1.5 flex items-center gap-2">
          <div className="h-1.5 flex-1 max-w-[140px] rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{ width: `${barPct}%`, background: barColor }}
            />
          </div>
          <span className="text-xs font-extrabold tabular-nums text-slate-900 flex-shrink-0">
            {post.er.toFixed(1)}%
          </span>
        </div>
      </div>
      <div className="hidden md:flex items-center gap-4 flex-shrink-0 text-right">
        <div>
          <p className="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-400">
            {t(reachLabelKey, locale)}
          </p>
          <p className="text-xs font-extrabold tabular-nums text-slate-800">
            {formatCompact(post.impressions, locale)}
          </p>
        </div>
        <div>
          <p className="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-400">
            {t('metricLikes', locale)}
          </p>
          <p className="text-xs font-extrabold tabular-nums text-slate-800">
            {formatCompact(post.likes, locale)}
          </p>
        </div>
        <div>
          <p className="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-400">
            {t('metricComments', locale)}
          </p>
          <p className="text-xs font-extrabold tabular-nums text-slate-800">
            {formatCompact(post.comments, locale)}
          </p>
        </div>
      </div>
    </article>
  );
}

function ContentPerformanceTab({
  locale,
  rangeLabel,
  compareKey,
  reachLabelKey,
  best,
  worst,
}: {
  locale: Locale;
  rangeLabel: string;
  compareKey:
    | 'postsPerformanceCompare'
    | 'reelsPerformanceCompare'
    | 'storiesPerformanceCompare';
  reachLabelKey: 'metricImpressions' | 'metricPlays';
  best: PostPerfRow[];
  worst: PostPerfRow[];
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm font-medium text-slate-500 -mt-1">
        {tf(compareKey, locale, { range: rangeLabel })}
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        <section className={`${adminCardClass} overflow-hidden`}>
          <div className="px-3.5 py-3 border-b border-slate-100">
            <h3 className="text-sm font-extrabold text-slate-900 inline-flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" aria-hidden />
              {t('bestPerformingPosts', locale)}
            </h3>
            <p className="text-[11px] font-medium text-slate-400 mt-0.5">
              {t('bestPerformingSub', locale)}
            </p>
          </div>
          <div className="divide-y divide-slate-100">
            {best.length === 0 ? (
              <p className="px-3.5 py-8 text-sm text-slate-400 text-center">—</p>
            ) : (
              best.map((post, i) => (
                <PostPerfRowItem
                  key={post.id}
                  post={post}
                  locale={locale}
                  tone="best"
                  rank={i + 1}
                  reachLabelKey={reachLabelKey}
                />
              ))
            )}
          </div>
        </section>

        <section className={`${adminCardClass} overflow-hidden`}>
          <div className="px-3.5 py-3 border-b border-slate-100">
            <h3 className="text-sm font-extrabold text-slate-900 inline-flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#F472B6]" aria-hidden />
              {t('worstPerformingPosts', locale)}
            </h3>
            <p className="text-[11px] font-medium text-slate-400 mt-0.5">
              {t('worstPerformingSub', locale)}
            </p>
          </div>
          <div className="divide-y divide-slate-100">
            {worst.length === 0 ? (
              <p className="px-3.5 py-8 text-sm text-slate-400 text-center">—</p>
            ) : (
              worst.map((post, i) => (
                <PostPerfRowItem
                  key={post.id}
                  post={post}
                  locale={locale}
                  tone="worst"
                  rank={i + 1}
                  reachLabelKey={reachLabelKey}
                />
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

type UsedHashtag = AnalyticsHashtag;

const AI_HASHTAG_SETS: { topic: string; tags: string[] }[] = [];

function HashtagsAnalyticsTab({
  locale,
  rangeLabel,
  hashtags,
}: {
  locale: Locale;
  rangeLabel: string;
  hashtags: UsedHashtag[];
}) {
  const [generating, setGenerating] = useState(false);
  const [ideas, setIdeas] = useState(AI_HASHTAG_SETS);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const used = hashtags;
  const maxReach = Math.max(...used.map((h) => h.reach), 1);

  const regenerate = () => {
    setGenerating(true);
    window.setTimeout(() => {
      // Rotate / shuffle AI sets when available (empty until AI endpoint ships).
      setIdeas((prev) =>
        [...prev]
          .map((set) => ({
            ...set,
            tags: [...set.tags].sort(() => Math.random() - 0.5),
          }))
          .reverse()
      );
      setGenerating(false);
    }, 900);
  };

  const copySet = async (id: string, tags: string[]) => {
    try {
      await navigator.clipboard.writeText(tags.join(' '));
      setCopiedId(id);
      window.setTimeout(() => setCopiedId(null), 1600);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: t('hashtagsUnique', locale), value: String(used.length) },
          {
            label: t('hashtagsAvgLift', locale),
            value:
              used.length > 0
                ? `${(
                    used.reduce((s, h) => s + h.er, 0) / used.length
                  ).toFixed(1)}%`
                : '—',
          },
          {
            label: t('hashtagsTaggedPosts', locale),
            value: String(used.reduce((s, h) => s + h.posts, 0)),
          },
        ].map((m) => (
          <div key={m.label} className={adminKpiClass}>
            <p className="text-[10px] font-mono font-bold uppercase tracking-[0.12em] text-slate-400">
              {m.label}
            </p>
            <p className="mt-2 font-clikd-wordmark font-extrabold text-xl sm:text-2xl text-slate-900 tabular-nums tracking-tight">
              {m.value}
            </p>
          </div>
        ))}
      </div>

      <div className={`${adminCardClass} overflow-hidden`}>
        <div className="px-4 sm:px-5 py-3.5 border-b border-slate-100">
          <h3 className="text-sm font-extrabold text-slate-900 inline-flex items-center gap-2">
            <Hash size={14} className="text-[#F472B6]" aria-hidden />
            {t('hashtagsUsedTitle', locale)}
          </h3>
          <p className="text-[11px] font-medium text-slate-400 mt-0.5">
            {tf('hashtagsUsedSub', locale, { range: rangeLabel })}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left">
            <thead>
              <tr className="border-b border-slate-100">
                {[
                  t('hashtagColTag', locale),
                  t('hashtagColPosts', locale),
                  t('hashtagReach', locale),
                  t('metricEngagementRate', locale),
                  t('hashtagTrend', locale),
                ].map((h) => (
                  <th
                    key={h}
                    className="px-4 sm:px-5 py-2.5 text-[10px] font-mono font-bold uppercase tracking-[0.12em] text-slate-400"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {used.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 sm:px-5 py-10 text-sm text-slate-400 text-center"
                  >
                    —
                  </td>
                </tr>
              ) : (
                used.map((h) => (
                  <tr
                    key={h.tag}
                    className="border-b border-slate-50 last:border-0 hover:bg-slate-50/70"
                  >
                    <td className="px-4 sm:px-5 py-3">
                      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#1a1848]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#F472B6]" aria-hidden />
                        {h.tag}
                      </span>
                      <div className="mt-1.5 h-1 max-w-[120px] rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#1a1848]"
                          style={{ width: `${(h.reach / maxReach) * 100}%` }}
                        />
                      </div>
                    </td>
                    <td className="px-4 sm:px-5 py-3 text-sm font-semibold tabular-nums text-slate-800">
                      {h.posts}
                    </td>
                    <td className="px-4 sm:px-5 py-3 text-sm font-semibold tabular-nums text-slate-800">
                      {formatCompact(h.reach, locale)}
                    </td>
                    <td className="px-4 sm:px-5 py-3 text-sm font-extrabold tabular-nums text-slate-900">
                      {h.er.toFixed(1)}%
                    </td>
                    <td className="px-4 sm:px-5 py-3">
                      <span
                        className={`text-xs font-bold tabular-nums ${
                          h.trend >= 0 ? 'text-emerald-600' : 'text-rose-500'
                        }`}
                      >
                        {h.trend >= 0 ? '+' : ''}
                        {h.trend}%
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className={`${adminCardClass} overflow-hidden`}>
        <div className="px-4 sm:px-5 py-3.5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 inline-flex items-center gap-2">
              <Sparkles size={14} className="text-[#F472B6]" aria-hidden />
              {t('aiHashtagIdeasTitle', locale)}
            </h3>
            <p className="text-[11px] font-medium text-slate-400 mt-0.5">
              {t('aiHashtagIdeasSub', locale)}
            </p>
          </div>
          <button
            type="button"
            onClick={regenerate}
            disabled={generating}
            className="h-10 min-h-[40px] px-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors disabled:opacity-50 self-start"
          >
            <Sparkles size={13} />
            {generating ? t('aiHashtagGenerating', locale) : t('aiHashtagGenerate', locale)}
          </button>
        </div>

        <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-3 gap-3">
          {ideas.length === 0 ? (
            <p className="text-sm text-slate-400 md:col-span-3 text-center py-6">—</p>
          ) : (
            ideas.map((set) => {
              const id = set.topic;
              const copied = copiedId === id;
              return (
                <div
                  key={id}
                  className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3.5 flex flex-col gap-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-bold text-slate-800">
                      {tf('aiHashtagSetFor', locale, { topic: set.topic })}
                    </p>
                    <button
                      type="button"
                      onClick={() => void copySet(id, set.tags)}
                      className="h-8 min-h-[32px] px-2 rounded-lg text-[11px] font-semibold text-slate-500 hover:bg-white hover:text-slate-800 inline-flex items-center gap-1 transition-colors"
                    >
                      {copied ? (
                        <Check size={12} className="text-emerald-600" />
                      ) : (
                        <Copy size={12} />
                      )}
                      {copied ? t('aiHashtagCopied', locale) : t('aiHashtagCopySet', locale)}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {set.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center h-7 min-h-[28px] px-2 rounded-lg bg-white border border-slate-200 text-[11px] font-semibold text-[#1a1848]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

function AudienceInsights({
  locale,
  workspaceName,
  followers,
  accountCount,
  reach,
  platforms,
}: {
  locale: Locale;
  workspaceName: string;
  followers: number;
  accountCount: number;
  reach: number;
  platforms: Record<string, AnalyticsPlatformSlice>;
}) {
  const connectedPlatforms = useMemo(() => {
    return Object.entries(platforms)
      .filter(([, slice]) => slice?.connected)
      .map(([key, slice]) => ({
        key,
        label: PLATFORM_LABEL[key] || key,
        followers: slice.followers || 0,
        handle: slice.handle,
        Icon: PLATFORM_ICON[key] || InstagramIcon,
      }))
      .sort((a, b) => b.followers - a.followers);
  }, [platforms]);

  const followerTotal = Math.max(
    followers,
    connectedPlatforms.reduce((s, p) => s + p.followers, 0),
    1
  );

  const PLATFORM_COLORS: Record<string, string> = {
    instagram: '#E1306C',
    facebook: '#1877F2',
    youtube: '#FF0000',
    linkedin: '#0A66C2',
    tiktok: '#0F172A',
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className={`${adminCardClass} p-5 sm:p-6`}>
        <h3 className="font-clikd-wordmark font-extrabold text-base text-slate-900 mb-4">
          {t('analyticsAudience', locale)} · {workspaceName}
        </h3>
        <div className="grid grid-cols-3 gap-3">
          {[
            {
              label: t('kpiFollowers', locale),
              value: formatCompact(followers, locale),
            },
            {
              label: t('accounts', locale),
              value: String(accountCount),
            },
            {
              label: t('reach7d', locale),
              value: formatCompact(reach, locale),
            },
          ].map((m) => (
            <div key={m.label} className="rounded-xl bg-slate-50 border border-slate-100 p-4">
              <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                {m.label}
              </p>
              <p className="text-xl font-extrabold text-slate-900 mt-1 tabular-nums">{m.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className={`${adminCardClass} p-5 sm:p-6`}>
        <h4 className="font-clikd-wordmark font-extrabold text-base text-slate-900">
          {t('audienceDemographics', locale)}
        </h4>
        <p className="text-sm text-slate-500 mt-1 mb-5">
          {t('audienceActiveTimesHint', locale)}
        </p>

        {connectedPlatforms.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-8">—</p>
        ) : (
          <div className="space-y-4">
            <div className="flex h-3 rounded-full overflow-hidden bg-slate-100">
              {connectedPlatforms.map((p) => {
                const pct = Math.round((p.followers / followerTotal) * 100);
                if (pct <= 0 && p.followers <= 0) return null;
                return (
                  <div
                    key={p.key}
                    className="h-full first:rounded-l-full last:rounded-r-full"
                    style={{
                      width: `${Math.max(pct, p.followers > 0 ? 4 : 0)}%`,
                      background: PLATFORM_COLORS[p.key] || '#1a1848',
                    }}
                    title={`${p.label} ${pct}%`}
                  />
                );
              })}
            </div>

            <ul className="space-y-4">
              {connectedPlatforms.map((p) => {
                const pct = Math.round((p.followers / followerTotal) * 1000) / 10;
                return (
                  <li key={p.key} className="flex items-center gap-3">
                    <span className="w-9 h-9 min-h-[36px] min-w-[36px] rounded-full bg-slate-50 border border-slate-100 inline-flex items-center justify-center flex-shrink-0">
                      <p.Icon size={16} />
                    </span>
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-slate-800 truncate">
                          {p.label}
                          {p.handle ? (
                            <span className="ml-1.5 text-xs font-medium text-slate-400 font-mono">
                              {p.handle}
                            </span>
                          ) : null}
                        </span>
                        <span className="text-sm font-extrabold tabular-nums text-slate-900 flex-shrink-0">
                          {formatCompact(p.followers, locale)} · {pct}%
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-[width] duration-500"
                          style={{
                            width: `${Math.min(100, Math.max(0, pct))}%`,
                            background: PLATFORM_COLORS[p.key] || '#1a1848',
                          }}
                        />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

