'use client';

import { useState, type ElementType } from 'react';
import Link from 'next/link';
import {
  BarChart3,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Eye,
  Flame,
  Globe,
  GraduationCap,
  Heart,
  Image as ImageIcon,
  Lock,
  Link2,
  Mail,
  MessageCircle,
  Save,
  Sparkles,
  Users,
  Zap,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  InstagramIcon,
  TikTokIcon,
} from '@/components/icons/SocialBrandIcons';
import { useLanguage } from '@/lib/i18n';

type FeatureTab = 'biostore' | 'planner' | 'analytics' | 'community' | 'crm';

const AVATAR =
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=96&h=96&fit=crop&q=80';

function StudioChrome({ url }: { url: string }) {
  const { t } = useLanguage();
  return (
    <div className="flex items-center gap-3 px-3 sm:px-4 py-2.5 border-b border-slate-200/80 bg-slate-50/90">
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#28C840]" />
      </div>
      <div className="flex-1 min-w-0 flex items-center justify-center">
        <div className="inline-flex items-center gap-1.5 max-w-full rounded-lg bg-white border border-slate-200/90 px-2.5 py-1 text-[10px] sm:text-[11px] font-mono text-slate-500 shadow-sm">
          <Lock size={10} className="text-[#10B981] flex-shrink-0" strokeWidth={2.5} />
          <span className="truncate">{url}</span>
        </div>
      </div>
      <span className="hidden sm:inline-flex flex-shrink-0 items-center rounded-full bg-white border border-[#F472B6]/55 px-2.5 py-0.5 text-[10px] font-bold text-[#F472B6]">
        {t('liveStudioPreview')}
      </span>
    </div>
  );
}

/** Exact Bio Builder studio replica for the landing features canvas. */
function BioStoreCanvas() {
  const { t } = useLanguage();

  const themes = [
    {
      name: t('themeMidnight'),
      blurb: t('themeMidnightBlurb'),
      swatch: 'from-[#0B0A1F] via-[#1a1848] to-[#2B2568]',
      dots: ['#F472B6', '#FB7185'],
      selected: false,
    },
    {
      name: t('themeChampagne'),
      blurb: t('themeChampagneBlurb'),
      swatch: 'from-[#FDFBF7] via-[#F5E6D3] to-[#E8D4B8]',
      dots: ['#EAB308', '#FFFFFF'],
      selected: false,
    },
    {
      name: t('themeAurora'),
      blurb: t('themeAuroraBlurb'),
      swatch: 'from-[#4C1D95] via-[#7C3AED] to-[#F472B6]',
      dots: ['#C4B5FD', '#E0E7FF'],
      selected: true,
    },
    {
      name: t('themeNordic'),
      blurb: t('themeNordicBlurb'),
      swatch: 'from-[#FAFAFA] via-[#F1F5F9] to-[#E2E8F0]',
      dots: ['#2B2568', '#0F172A'],
      selected: false,
    },
  ];

  const bioLinks = [
    {
      title: t('features.joinCommunity'),
      sub: t('mockLinkWelcomeSub'),
      badge: t('bio.free'),
      badgeClass: 'bg-[#10B981] text-white',
      Icon: GraduationCap,
    },
    {
      title: t('mockLinkStudioTitle'),
      sub: t('mockLinkStudioSub'),
      badge: '199 SEK',
      badgeClass: 'bg-[#7C3AED] text-white',
      Icon: Zap,
    },
    {
      title: t('mockLinkCoaching'),
      sub: t('mockLinkCoachingSub'),
      badge: '599 SEK',
      badgeClass: 'bg-[#EAB308] text-[#0F172A]',
      Icon: MessageCircle,
    },
  ];

  const bioTabs = [
    t('bioTabDesign'),
    t('bioTabBlocks'),
    t('bioTabAnalytics'),
    t('bioTabSettings'),
  ];

  return (
    <div className="space-y-3.5">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-mono font-bold uppercase tracking-[0.16em] text-slate-400">
            Bio Builder · @ebbabrobeck
          </p>
          <h3 className="mt-1 text-xl sm:text-2xl font-extrabold text-[#2B2568] font-outfit tracking-tight">
            {t('linkInBio')}
          </h3>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            tabIndex={-1}
            className="inline-flex items-center gap-1.5 h-9 min-h-[36px] px-3 rounded-xl border border-slate-200 bg-white text-[11px] font-bold text-slate-700 pointer-events-none"
          >
            <Eye size={13} strokeWidth={2.25} />
            {t('bio.preview')}
          </button>
          <button
            type="button"
            tabIndex={-1}
            className="inline-flex items-center gap-1.5 h-9 min-h-[36px] px-3.5 rounded-xl bg-[#2B2568] text-white text-[11px] font-extrabold pointer-events-none"
          >
            <Save size={13} strokeWidth={2.25} />
            {t('bio.publishChanges')}
          </button>
        </div>
      </div>

      <div className="flex gap-0.5 overflow-x-auto scrollbar-none border-b border-slate-200/80">
        {bioTabs.map((tab, i) => (
          <span
            key={tab}
            className={`px-3 py-2.5 text-[11px] font-bold whitespace-nowrap ${
              i === 0
                ? 'text-[#0F172A] border-b-2 border-[#F472B6] -mb-px'
                : 'text-slate-400'
            }`}
          >
            {tab}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_minmax(168px,196px)] gap-4 items-start">
        <div className="space-y-3 min-w-0">
          {/* Exclusive Themes */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="min-w-0 flex items-start gap-2">
                <span className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-lg bg-[#FCE7F3] text-[#F472B6] flex-shrink-0">
                  <Sparkles size={14} strokeWidth={2.4} />
                </span>
                <div className="min-w-0">
                  <p className="text-[12px] font-extrabold text-slate-900 leading-tight">
                    {t('exclusiveThemes')}
                  </p>
                  <p className="text-[10px] text-slate-400 font-medium mt-0.5 leading-snug">
                    {t('exclusiveThemesSub')}
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center rounded-full bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 text-[10px] font-extrabold text-[#10B981] flex-shrink-0">
                {t('presetsCount')}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {themes.map((theme) => (
                <div
                  key={theme.name}
                  className={`relative overflow-hidden rounded-2xl border p-2 transition-all ${
                    theme.selected
                      ? 'border-[#F472B6] ring-1 ring-[#F472B6]/35 shadow-sm'
                      : 'border-slate-200/80'
                  }`}
                >
                  {theme.selected ? (
                    <span className="absolute top-2 right-2 z-10 h-5 w-5 rounded-full bg-[#F472B6] text-white flex items-center justify-center shadow-sm">
                      <Check size={11} strokeWidth={3} />
                    </span>
                  ) : null}
                  <div
                    className={`relative h-[52px] rounded-xl bg-gradient-to-br ${theme.swatch} mb-2 overflow-hidden`}
                    aria-hidden
                  >
                    <span
                      className="absolute top-1.5 left-1.5 h-2 w-2 rounded-full border border-white/40"
                      style={{ background: theme.dots[0] }}
                    />
                    <span
                      className="absolute top-1.5 left-4 h-2 w-2 rounded-full border border-black/5"
                      style={{ background: theme.dots[1] }}
                    />
                  </div>
                  <p className="text-[11px] font-extrabold text-slate-900 leading-tight">
                    {theme.name}
                  </p>
                  <p className="text-[9px] text-slate-400 font-medium mt-0.5 leading-snug">
                    {theme.blurb}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Header & Cover Banner */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <div className="flex items-start justify-between gap-2 mb-2.5">
              <div className="min-w-0">
                <p className="text-[12px] font-extrabold text-slate-900 leading-tight">
                  {t('headerCoverBanner')}
                </p>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5 leading-snug">
                  {t('optionalBannerAbove')}
                </p>
              </div>
              <span
                className="relative inline-flex h-5 w-9 rounded-full bg-[#2B2568] flex-shrink-0"
                aria-hidden
              >
                <span className="absolute right-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow" />
              </span>
            </div>
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 overflow-hidden">
              <div
                className="h-14 w-full bg-gradient-to-r from-[#4C1D95] via-[#7C3AED] to-[#F472B6]"
                aria-hidden
              />
              <div className="px-2.5 py-2">
                <p className="text-[11px] font-bold text-slate-800 truncate font-mono">
                  Aurora_banner_mesh.png
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Phone preview — Aurora Glow */}
        <div className="mx-auto w-full max-w-[196px]">
          <div className="rounded-[1.85rem] bg-[#0F172A] p-[7px] shadow-[0_20px_40px_-18px_rgba(15,23,42,0.55)]">
            <div
              className="relative rounded-[1.45rem] overflow-hidden text-white min-h-[380px] flex flex-col"
              style={{
                background:
                  'radial-gradient(ellipse at 30% 0%, #A78BFA 0%, transparent 55%), radial-gradient(ellipse at 90% 20%, #F472B6 0%, transparent 45%), linear-gradient(165deg, #2B2568 0%, #4C1D95 40%, #1a1848 100%)',
              }}
            >
              {/* Status / notch */}
              <div className="flex justify-center pt-2 pb-1">
                <span className="h-1 w-10 rounded-full bg-white/25" />
              </div>

              <div className="px-2.5 pb-2.5 flex-1 flex flex-col">
                <div className="relative mx-auto mb-1.5 mt-1">
                  <img
                    src={AVATAR}
                    alt=""
                    className="w-12 h-12 rounded-full object-cover ring-[2.5px] ring-[#93C5FD]"
                  />
                  <span className="absolute -bottom-0.5 -right-0.5 h-[15px] w-[15px] rounded-full bg-[#1a1848] border border-white/30 flex items-center justify-center">
                    <span className="font-mono text-[6px] font-black leading-none tracking-tighter">
                      <span className="text-[#93C5FD]">c</span>
                      <span className="text-white">:</span>
                    </span>
                  </span>
                </div>

                <p className="text-center text-[11px] font-extrabold leading-tight flex items-center justify-center gap-1">
                  Ebba Brobeck
                  <span className="inline-flex h-3 w-3 items-center justify-center rounded-full bg-white text-[#2B2568]">
                    <Check size={8} strokeWidth={3.5} />
                  </span>
                </p>
                <p className="text-center text-[8px] text-white/65 font-medium mt-0.5">
                  @ebbabrobeck
                </p>
                <p className="text-center text-[8px] text-white/85 font-medium mt-1 mb-2.5 px-1 leading-snug">
                  Founder of Clikd and Cheriie Studio 🚀
                </p>

                <div className="flex gap-1 mb-2.5 p-0.5 rounded-full bg-black/20 backdrop-blur-sm">
                  <span className="flex-1 text-center text-[8px] font-extrabold py-1.5 rounded-full bg-[#7C3AED] text-white shadow-sm">
                    {t('bio.links')}
                  </span>
                  <span className="flex-1 text-center text-[8px] font-extrabold py-1.5 rounded-full text-white/75">
                    {t('bio.store')} 🛍️
                  </span>
                </div>

                <div className="space-y-1.5 flex-1">
                  {bioLinks.map((link) => {
                    const Icon = link.Icon;
                    return (
                      <div
                        key={link.title}
                        className="rounded-xl bg-black/25 backdrop-blur-md border border-white/10 px-2 py-1.5 flex items-center gap-1.5"
                      >
                        <span className="h-6 w-6 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                          <Icon size={11} strokeWidth={2.25} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[8px] font-extrabold truncate leading-tight">
                            {link.title}
                          </p>
                          <p className="text-[7px] text-white/55 font-medium truncate">
                            {link.sub}
                          </p>
                        </div>
                        <span
                          className={`text-[7px] font-extrabold px-1.5 py-0.5 rounded-md flex-shrink-0 ${link.badgeClass}`}
                        >
                          {link.badge}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <p className="mt-2.5 text-center text-[6.5px] font-mono font-bold uppercase tracking-[0.16em] text-white/40">
                  {t('bio.poweredBy')} Studio
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PlannerCanvas() {
  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const posts = [
    { day: 2, label: 'Reel hook', platform: 'ig' as const },
    { day: 4, label: 'Carousel', platform: 'ig' as const },
    { day: 5, label: 'TikTok tip', platform: 'tt' as const },
  ];
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-extrabold text-slate-900 font-outfit">August 2026</p>
        <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
          Social Set · 4 channels
        </span>
      </div>
      <div className="grid grid-cols-7 gap-1.5 mb-2">
        {days.map((d, i) => (
          <div
            key={`${d}-${i}`}
            className="text-center text-[9px] font-mono font-bold text-slate-400 uppercase"
          >
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {Array.from({ length: 28 }).map((_, i) => {
          const day = i + 1;
          const post = posts.find((p) => p.day === day);
          return (
            <div
              key={day}
              className="min-h-[52px] rounded-xl border border-slate-200/80 bg-white p-1"
            >
              <p className="text-[9px] font-bold text-slate-500 tabular-nums px-0.5">{day}</p>
              {post ? (
                <div
                  className={`mt-0.5 flex items-center gap-0.5 rounded-md px-1 py-0.5 text-[8px] font-bold truncate ${
                    post.platform === 'tt'
                      ? 'bg-[#EDE9FE] text-[#5B21B6]'
                      : 'bg-[#FCE7F3] text-[#BE185D]'
                  }`}
                >
                  {post.platform === 'tt' ? (
                    <TikTokIcon size={8} />
                  ) : (
                    <InstagramIcon size={8} />
                  )}
                  <span className="truncate">{post.label}</span>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AnalyticsCanvas() {
  const kpis = [
    { label: 'Reach', value: '94.2K', delta: '+12%' },
    { label: 'Views', value: '186.4K', delta: '+9%' },
    { label: 'Followers', value: '+842', delta: '30 days' },
  ];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4"
          >
            <p className="text-[10px] font-mono font-bold uppercase tracking-[0.12em] text-slate-400">
              {kpi.label}
            </p>
            <p className="mt-2 text-2xl font-extrabold text-slate-900 font-outfit tabular-nums">
              {kpi.value}
            </p>
            <p className="mt-1 text-xs font-bold text-[#F472B6]">{kpi.delta}</p>
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4">
        <p className="text-[10px] font-mono font-bold uppercase tracking-[0.12em] text-slate-400 mb-3">
          Link-in-bio performance
        </p>
        <div className="space-y-2">
          {[
            { label: 'Masterclass CTA', clicks: 428, w: '82%' },
            { label: 'Community join', clicks: 291, w: '58%' },
            { label: 'Starter Pack', clicks: 164, w: '34%' },
          ].map((row) => (
            <div key={row.label}>
              <div className="flex justify-between text-[11px] font-bold text-slate-700 mb-1">
                <span>{row.label}</span>
                <span className="font-mono text-slate-500">{row.clicks}</span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#2B2568] to-[#F472B6]"
                  style={{ width: row.w }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const COMMUNITY_POSTS = [
  {
    name: 'Ebba Brobeck',
    initial: 'E',
    avatar: 'bg-[#F472B6]',
    time: '11 Aug · 08:09',
    tags: [
      { label: 'PINNED', className: 'bg-[#E9D5FF] text-[#6B21A8]' },
      { label: 'Welcome', className: 'bg-[#E9D5FF]/70 text-[#7C3AED]' },
    ],
    body: 'Välkommen till Ebba Creator Lab 💜 Dela dina wins, ställ frågor och stötta varandra — vi växer snabbare tillsammans.',
    likes: 24,
    comments: '8 kommentarer',
    popular: true,
  },
  {
    name: 'Emma Lindqvist',
    initial: 'E',
    avatar: 'bg-[#FB923C]',
    time: '10 Aug · 19:42',
    tags: [
      { label: 'Announcement', className: 'bg-[#E9D5FF] text-[#6B21A8]' },
      { label: 'Wins', className: 'bg-[#E9D5FF]/70 text-[#7C3AED]' },
    ],
    body: 'Landade min första betalkollaboration den här veckan! Tips: skicka mediakit + 3 content ideas i första mailet 🔥',
    likes: 18,
    comments: '5 kommentarer',
    popular: true,
  },
];

/** Community member hub replica for the landing features canvas. */
function CommunityCanvas() {
  return (
    <div className="rounded-none border-0 bg-[#FAFAFA] overflow-hidden -mx-4 -my-4 sm:-mx-6 sm:-my-6">
      {/* Community top chrome */}
      <div className="bg-white border-b border-slate-200/80 px-3 sm:px-4 pt-2.5 pb-0">
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="inline-flex items-center gap-1.5 min-h-[28px] rounded-full border border-slate-200 bg-white pl-1 pr-2.5 py-0.5">
            <span className="h-5 w-5 rounded-full bg-[#2B2568] text-white text-[9px] font-extrabold flex items-center justify-center">
              E
            </span>
            <span className="text-[10px] font-bold text-slate-800 truncate max-w-[110px]">
              Ebba Creator Lab
            </span>
            <ChevronDown size={12} className="text-slate-400 flex-shrink-0" strokeWidth={2.5} />
          </div>
          <div className="hidden sm:flex flex-1 max-w-[200px] items-center gap-1.5 rounded-full bg-slate-100/90 border border-slate-200/60 px-2.5 py-1.5">
            <span className="text-[10px] text-slate-400 font-medium truncate">
              Search by name, category...
            </span>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className="relative h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center">
              <span className="absolute top-0.5 right-0.5 h-1.5 w-1.5 rounded-full bg-[#F472B6]" />
              <span className="sr-only">Notifications</span>
            </span>
            <span className="h-6 w-6 rounded-full bg-[#F472B6] text-white text-[10px] font-extrabold flex items-center justify-center">
              e
            </span>
          </div>
        </div>
        <div className="flex gap-0.5 overflow-x-auto scrollbar-none">
          {['Community', 'Events', 'Classroom', 'Store'].map((tab, i) => (
            <span
              key={tab}
              className={`px-3 py-2 text-[11px] font-bold whitespace-nowrap ${
                i === 0
                  ? 'text-[#2B2568] border-b-2 border-[#2B2568] -mb-px'
                  : 'text-slate-400'
              }`}
            >
              {tab}
            </span>
          ))}
        </div>
      </div>

      <div className="p-3 sm:p-3.5">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_148px] gap-3 items-start">
          {/* Feed column */}
          <div className="min-w-0 space-y-2.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center min-h-[28px] px-3 rounded-full bg-[#F472B6] text-white text-[10px] font-extrabold shadow-sm shadow-pink-500/20">
                Feed
              </span>
              <span className="inline-flex items-center min-h-[28px] px-3 rounded-full border border-slate-200 bg-white text-[10px] font-bold text-slate-500">
                Leaderboard
              </span>
            </div>

            {/* Composer */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
              <div className="flex items-start gap-2.5">
                <span className="h-8 w-8 rounded-full bg-[#FB923C] text-white text-[11px] font-extrabold flex items-center justify-center flex-shrink-0">
                  E
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] text-slate-400 font-medium leading-snug mb-2">
                    Share something with the community...
                  </p>
                  <div className="flex flex-wrap gap-1 mb-2.5">
                    {['#Questions', '#Inspiration', '#Results', '#Tips', '#Milestone'].map(
                      (tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center rounded-full bg-slate-100 border border-slate-200/70 px-2 py-0.5 text-[9px] font-bold text-slate-500"
                        >
                          {tag}
                        </span>
                      ),
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400">
                      <ImageIcon size={12} strokeWidth={2.25} />
                      Image
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <span className="text-[9px] font-mono text-slate-300">0/500</span>
                      <span className="inline-flex items-center min-h-[26px] px-2.5 rounded-lg bg-[#F472B6] text-white text-[10px] font-extrabold">
                        Publish
                      </span>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Posts */}
            {COMMUNITY_POSTS.map((post) => (
              <div
                key={post.name + post.time}
                className="rounded-2xl border border-slate-200/80 bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.03)]"
              >
                <div className="flex items-start gap-2 mb-1.5">
                  <span
                    className={`h-7 w-7 rounded-full ${post.avatar} text-white text-[10px] font-extrabold flex items-center justify-center flex-shrink-0`}
                  >
                    {post.initial}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
                      <p className="text-[11px] font-extrabold text-[#2B2568]">{post.name}</p>
                      {post.tags.map((tag) => (
                        <span
                          key={tag.label}
                          className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[8px] font-extrabold uppercase tracking-wide ${tag.className}`}
                        >
                          {tag.label}
                        </span>
                      ))}
                      <span className="text-[9px] text-slate-400 font-medium ml-auto">
                        {post.time}
                      </span>
                    </div>
                    <p className="mt-1.5 text-[11px] text-slate-600 font-medium leading-snug">
                      {post.body}
                    </p>
                    <div className="mt-2 flex items-center gap-3">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400">
                        <Heart size={11} strokeWidth={2.25} className="text-[#F472B6]" />
                        {post.likes}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400">
                        <MessageCircle size={11} strokeWidth={2.25} />
                        {post.comments}
                      </span>
                      {post.popular ? (
                        <span className="ml-auto inline-flex items-center gap-0.5 rounded-full bg-orange-50 border border-orange-200/70 px-1.5 py-0.5 text-[8px] font-extrabold text-orange-600">
                          <Flame size={9} strokeWidth={2.5} />
                          Populär
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Right widgets */}
          <div className="hidden md:flex flex-col gap-2.5">
            <div className="rounded-2xl border border-slate-200/80 bg-white p-2.5 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
              <p className="text-[8px] font-mono font-bold uppercase tracking-[0.14em] text-slate-400 mb-2">
                Your profile
              </p>
              <div className="flex items-center gap-2 mb-2.5">
                <span className="h-8 w-8 rounded-full bg-[#F472B6] text-white text-[11px] font-extrabold flex items-center justify-center flex-shrink-0">
                  e
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-extrabold text-slate-900 truncate">
                    ebbabrobeck
                  </p>
                  <span className="inline-flex items-center rounded-full bg-orange-50 border border-orange-200/80 px-1.5 py-0.5 text-[8px] font-extrabold text-orange-600 mt-0.5">
                    Bronze
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-1 text-center">
                {[
                  { n: '0', l: 'Posts' },
                  { n: '0', l: 'Likes' },
                  { n: '0', l: 'Points' },
                ].map((stat) => (
                  <div key={stat.l} className="rounded-lg bg-slate-50 py-1.5">
                    <p className="text-[11px] font-extrabold text-slate-900 tabular-nums">
                      {stat.n}
                    </p>
                    <p className="text-[7px] font-bold uppercase tracking-wide text-slate-400">
                      {stat.l}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white p-2.5 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
              <p className="text-[8px] font-mono font-bold uppercase tracking-[0.14em] text-slate-400 mb-2">
                Rules
              </p>
              <ul className="space-y-1.5">
                {[
                  'Be respectful 🤝',
                  'No spam',
                  'Swedish / English',
                  'Help each other',
                ].map((rule) => (
                  <li
                    key={rule}
                    className="flex items-start gap-1.5 text-[10px] font-medium text-slate-600 leading-snug"
                  >
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[#F472B6] flex-shrink-0" />
                    {rule}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white p-2.5 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
              <div className="flex items-center gap-1.5 mb-2">
                <Globe size={12} className="text-[#10B981]" strokeWidth={2.4} />
                <p className="text-[8px] font-mono font-bold uppercase tracking-[0.14em] text-slate-400">
                  Ref &amp; Earn
                </p>
              </div>
              <div className="flex items-center gap-1">
                <span className="flex-1 min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-[9px] font-medium text-slate-400 truncate">
                  Generating...
                </span>
                <span className="h-7 w-7 rounded-lg bg-[#F472B6] text-white flex items-center justify-center flex-shrink-0">
                  <Copy size={11} strokeWidth={2.5} />
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CrmCanvas() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4">
          <p className="text-[10px] font-mono font-bold uppercase tracking-[0.12em] text-slate-400">
            Subscribers
          </p>
          <p className="mt-2 text-3xl font-extrabold text-slate-900 font-outfit tabular-nums">
            1,340
          </p>
          <p className="mt-1 text-xs font-bold text-[#10B981]">+86 this week</p>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4">
          <p className="text-[10px] font-mono font-bold uppercase tracking-[0.12em] text-slate-400">
            Open rate
          </p>
          <p className="mt-2 text-3xl font-extrabold text-slate-900 font-outfit tabular-nums">
            48.2%
          </p>
          <p className="mt-1 text-xs font-bold text-[#F472B6]">Broadcast avg</p>
        </div>
      </div>
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4">
        <p className="text-[10px] font-mono font-bold uppercase tracking-[0.12em] text-slate-400 mb-3">
          Automation sequences
        </p>
        <div className="space-y-2">
          {[
            { name: 'Welcome series', status: 'Active', steps: '3 emails' },
            { name: 'Post-purchase access', status: 'Active', steps: '2 emails' },
            { name: 'Win-back 14d', status: 'Paused', steps: '1 email' },
          ].map((seq) => (
            <div
              key={seq.name}
              className="flex items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 min-h-[44px]"
            >
              <div className="min-w-0">
                <p className="text-[12px] font-bold text-slate-900 truncate">{seq.name}</p>
                <p className="text-[10px] text-slate-500 font-medium">{seq.steps}</p>
              </div>
              <span
                className={`text-[10px] font-extrabold px-2 py-1 rounded-full ${
                  seq.status === 'Active'
                    ? 'bg-emerald-50 text-[#10B981] border border-emerald-200/80'
                    : 'bg-slate-100 text-slate-500 border border-slate-200'
                }`}
              >
                {seq.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PreviewCanvas({ tab }: { tab: FeatureTab }) {
  switch (tab) {
    case 'planner':
      return <PlannerCanvas />;
    case 'analytics':
      return <AnalyticsCanvas />;
    case 'community':
      return <CommunityCanvas />;
    case 'crm':
      return <CrmCanvas />;
    default:
      return <BioStoreCanvas />;
  }
}

/** Interactive all-in-one feature showcase with live studio preview. */
export function FeaturesSection() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<FeatureTab>('biostore');

  const tabs: {
    key: FeatureTab;
    title: string;
    summary: string;
    icon: ElementType;
    iconWrap: string;
    hrefPreview: string;
  }[] = [
    {
      key: 'biostore',
      title: t('features.bioTitle'),
      summary: t('features.bioSummary'),
      icon: Link2,
      iconWrap: 'bg-[#FCE7F3] text-[#F472B6]',
      hrefPreview: 'https://admin.clikd.app/bio-store/ebbabrobeck',
    },
    {
      key: 'planner',
      title: t('features.plannerTitle'),
      summary: t('features.plannerSummary'),
      icon: CalendarDays,
      iconWrap: 'bg-[#E9D5FF]/70 text-[#2B2568]',
      hrefPreview: 'https://admin.clikd.app/planner/ebba-creator-lab',
    },
    {
      key: 'analytics',
      title: t('features.analyticsTitle'),
      summary: t('features.analyticsSummary'),
      icon: BarChart3,
      iconWrap: 'bg-sky-50 text-sky-700',
      hrefPreview: 'https://admin.clikd.app/analytics/ebbabrobeck',
    },
    {
      key: 'community',
      title: t('features.communityTitle'),
      summary: t('features.communitySummary'),
      icon: Users,
      iconWrap: 'bg-emerald-50 text-[#10B981]',
      hrefPreview: 'https://admin.clikd.app/community/hub',
    },
    {
      key: 'crm',
      title: t('features.crmTitle'),
      summary: t('features.crmSummary'),
      icon: Mail,
      iconWrap: 'bg-orange-50 text-orange-600',
      hrefPreview: 'https://admin.clikd.app/email-crm',
    },
  ];

  const active = tabs.find((tab) => tab.key === activeTab) ?? tabs[0];

  return (
    <section
      id="features"
      className="relative py-16 sm:py-24 overflow-hidden bg-[#FAFAFA]"
      aria-labelledby="features-heading"
    >
      <div
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[40rem] h-[40rem] rounded-full opacity-60"
        style={{
          background:
            'radial-gradient(circle, rgba(244,114,182,0.1) 0%, rgba(233,213,255,0.12) 40%, transparent 70%)',
        }}
        aria-hidden
      />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6">
        <div className="max-w-2xl mx-auto text-center mb-10 sm:mb-12">
          <span className="inline-flex items-center rounded-full bg-purple-50/80 border border-purple-200/80 px-4 py-1.5">
            <span className="font-mono text-xs font-bold text-purple-900 tracking-wide">
              {t('features.eyebrow')}
            </span>
          </span>
          <h2
            id="features-heading"
            className="mt-5 text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight font-outfit leading-tight"
          >
            {t('features.headline')}
          </h2>
          <p className="mt-4 text-slate-500 font-medium text-base sm:text-lg leading-relaxed font-sans">
            {t('features.sub')}
          </p>
        </div>

        <div className="grid lg:grid-cols-12 gap-5 lg:gap-6 items-start">
          {/* Tab cards — 4/12 */}
          <div className="lg:col-span-4 space-y-2.5">
            {tabs.map((tab) => {
              const isActive = tab.key === activeTab;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`w-full text-left flex items-start gap-3.5 min-h-[44px] rounded-2xl p-4 border transition-all duration-300 ${
                    isActive
                      ? 'bg-white border-[#F472B6] shadow-lg shadow-pink-500/10 ring-1 ring-[#F472B6]'
                      : 'bg-white border-slate-200/80 hover:border-slate-300/90 shadow-[0_1px_2px_rgba(15,23,42,0.03)]'
                  }`}
                >
                  <span
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${tab.iconWrap}`}
                    aria-hidden
                  >
                    <Icon size={18} strokeWidth={2.25} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-outfit font-extrabold text-sm sm:text-[15px] text-slate-900 tracking-tight">
                      {tab.title}
                    </span>
                    <span className="block text-sm font-medium text-slate-500 mt-0.5 leading-snug">
                      {tab.summary}
                    </span>
                  </span>
                  {isActive ? (
                    <ChevronRight
                      size={18}
                      className="text-[#F472B6] flex-shrink-0 mt-1"
                      strokeWidth={2.5}
                    />
                  ) : null}
                </button>
              );
            })}
          </div>

          {/* Studio preview — 8/12 */}
          <div className="lg:col-span-8">
            <div className="bg-white border border-slate-200/80 rounded-2xl sm:rounded-3xl shadow-[0_16px_48px_-24px_rgba(15,23,42,0.22)] overflow-hidden min-h-[580px] flex flex-col">
              <StudioChrome url={active.hrefPreview} />

              <div className="relative flex-1 p-4 sm:p-6">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={active.key}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.22 }}
                  >
                    <PreviewCanvas tab={active.key} />
                  </motion.div>
                </AnimatePresence>
              </div>

              <div className="px-4 sm:px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-[#FAFAFA]/60">
                <p className="text-sm font-medium text-slate-500">{active.summary}</p>
                <Link
                  href="/onboarding"
                  className="inline-flex items-center min-h-[44px] text-[#F472B6] font-bold hover:text-[#2B2568] text-sm transition-colors"
                >
                  {t('features.learnMore')} →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
