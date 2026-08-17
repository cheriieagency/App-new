'use client';

import { useEffect } from 'react';
import { ExternalLink, X } from 'lucide-react';
import {
  FacebookIcon,
  InstagramIcon,
  TikTokIcon,
} from '@/components/icons/SocialBrandIcons';
import { adminCardClass } from '@/components/admin/AdminUi';
import { t, localeTag, type Locale } from '@/lib/i18n';

export type PostAnalyticsDetail = {
  id: string;
  title: string;
  platform: string;
  platformKey: string;
  image: string;
  er: number;
  impressions: number;
  likes: number;
  comments: number;
  shares: number;
  publishedAt?: string;
  caption?: string;
  permalink?: string;
  mediaType?: string;
};

const PLATFORM_ICON: Record<string, typeof InstagramIcon> = {
  instagram: InstagramIcon,
  facebook: FacebookIcon,
  tiktok: TikTokIcon,
};

const PLATFORM_ACCENT: Record<string, string> = {
  instagram: '#E1306C',
  facebook: '#1877F2',
  tiktok: '#0F172A',
  youtube: '#FF0000',
  pinterest: '#E60023',
  linkedin: '#0A66C2',
};

function formatCompact(n: number, locale: Locale) {
  try {
    return new Intl.NumberFormat(localeTag(locale), {
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(n);
  } catch {
    return String(n);
  }
}

type PostAnalyticsDetailModalProps = {
  post: PostAnalyticsDetail | null;
  locale: Locale;
  reachLabelKey: 'metricImpressions' | 'metricPlays';
  onClose: () => void;
};

export default function PostAnalyticsDetailModal({
  post,
  locale,
  reachLabelKey,
  onClose,
}: PostAnalyticsDetailModalProps) {
  useEffect(() => {
    if (!post) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [post, onClose]);

  if (!post) return null;

  const Icon = PLATFORM_ICON[post.platformKey] || InstagramIcon;
  const accent = PLATFORM_ACCENT[post.platformKey] || '#0F172A';
  const engagement = post.likes + post.comments + post.shares;
  const mix = [
    { key: 'metricLikes' as const, value: post.likes, color: '#F472B6' },
    { key: 'metricComments' as const, value: post.comments, color: '#6366F1' },
    { key: 'metricShares' as const, value: post.shares, color: '#10B981' },
  ];
  const publishedLabel = post.publishedAt
    ? new Date(
        post.publishedAt.length <= 10
          ? `${post.publishedAt}T12:00:00`
          : post.publishedAt
      ).toLocaleDateString(localeTag(locale), {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="post-analytics-detail-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"
        aria-label={t('postDetailClose', locale)}
        onClick={onClose}
      />
      <div
        className={`${adminCardClass} relative z-10 w-full sm:max-w-xl max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl shadow-xl`}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-4 sm:px-5 py-3.5 border-b border-slate-100 bg-white/95 backdrop-blur-md">
          <div className="min-w-0 flex items-center gap-2.5">
            <span
              className="h-9 w-9 min-h-[36px] min-w-[36px] rounded-xl inline-flex items-center justify-center text-white flex-shrink-0"
              style={{ backgroundColor: accent }}
            >
              <Icon size={16} className="text-white" />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-slate-400">
                {t('postDetailTitle', locale)}
              </p>
              <p className="text-sm font-extrabold text-slate-900 truncate">
                {post.platform}
                {publishedLabel ? ` · ${publishedLabel}` : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-11 w-11 min-h-[44px] min-w-[44px] rounded-xl hover:bg-slate-50 inline-flex items-center justify-center text-slate-400"
            aria-label={t('postDetailClose', locale)}
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-4 sm:p-5 space-y-5">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="w-full sm:w-36 h-44 sm:h-36 rounded-2xl overflow-hidden bg-slate-100 flex-shrink-0">
              {post.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={post.image}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs font-semibold text-slate-400 px-3 text-center">
                  {t('postDetailNoImage', locale)}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <h2
                id="post-analytics-detail-title"
                className="text-base font-extrabold text-slate-900 leading-snug"
              >
                {post.title}
              </h2>
              {post.caption && post.caption !== post.title ? (
                <p className="text-sm text-slate-500 font-medium line-clamp-4 whitespace-pre-wrap">
                  {post.caption}
                </p>
              ) : null}
              {post.permalink ? (
                <a
                  href={post.permalink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 h-10 min-h-[40px] px-3 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  <ExternalLink size={13} />
                  {t('postDetailOpenOriginal', locale)}
                </a>
              ) : null}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                {t('metricEngagementRate', locale)}
              </p>
              <p className="mt-1 text-3xl font-extrabold tabular-nums text-slate-900 tracking-tight">
                {post.er.toFixed(1)}%
              </p>
            </div>
            <div className="h-14 w-14 rounded-full border-4 border-[#F472B6]/30 flex items-center justify-center">
              <span className="text-sm font-extrabold text-[#DB2777] tabular-nums">
                ER
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {(
              [
                { label: t(reachLabelKey, locale), value: post.impressions },
                { label: t('metricLikes', locale), value: post.likes },
                { label: t('metricComments', locale), value: post.comments },
                { label: t('metricShares', locale), value: post.shares },
              ] as const
            ).map((m) => (
              <div
                key={m.label}
                className="rounded-2xl border border-slate-200 bg-white px-3 py-3 min-h-[72px]"
              >
                <p className="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-400">
                  {m.label}
                </p>
                <p className="mt-1 text-lg font-extrabold tabular-nums text-slate-900">
                  {formatCompact(m.value, locale)}
                </p>
              </div>
            ))}
          </div>

          <div>
            <p className="text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-slate-400 mb-2">
              {t('postDetailEngagementMix', locale)}
            </p>
            <div className="h-3 rounded-full bg-slate-100 overflow-hidden flex">
              {mix.map((part) => {
                const pct =
                  engagement > 0
                    ? Math.max(2, Math.round((part.value / engagement) * 100))
                    : 0;
                if (!part.value) return null;
                return (
                  <div
                    key={part.key}
                    className="h-full"
                    style={{ width: `${pct}%`, background: part.color }}
                    title={`${t(part.key, locale)}: ${part.value}`}
                  />
                );
              })}
            </div>
            <div className="mt-2.5 flex flex-wrap gap-3">
              {mix.map((part) => (
                <span
                  key={part.key}
                  className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-600"
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: part.color }}
                  />
                  {t(part.key, locale)} · {formatCompact(part.value, locale)}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
