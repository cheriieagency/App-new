'use client';

import type { ComponentType } from 'react';
import {
  BarChart3,
  Bell,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  Flame,
  FolderKanban,
  GraduationCap,
  Heart,
  Home,
  BookOpen,
  Image as ImageIcon,
  Inbox,
  Link2,
  Lock,
  Mail,
  MessageSquare,
  Pin,
  Plus,
  Radio,
  Search,
  Send,
  Settings,
  ShoppingBag,
  Sparkles,
  Trophy,
  Users,
} from 'lucide-react';
import { adminCardClass } from '@/components/admin/AdminUi';
import {
  FacebookIcon,
  InstagramIcon,
  LinkedInIcon,
  TikTokIcon,
  YouTubeIcon,
} from '@/components/icons/SocialBrandIcons';
import { PlatformIcon } from '@/components/planner/PlatformBadge';
import { PLATFORM_META, type SocialPlatform } from '@/lib/mock-content-planner';
import { HeroPlannerMockup } from '@/components/landing/HeroSection';
import type { ShowcaseTabId } from '@/lib/i18n/showcase-copy';

const NAV_ROWS: Array<{
  id: string;
  label: string;
  icon: ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
}> = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'planner', label: 'Planner', icon: CalendarDays },
  { id: 'media', label: 'Media Library', icon: ImageIcon },
  { id: 'projects', label: 'Projects', icon: FolderKanban },
  { id: 'inbox', label: 'Social Inbox', icon: Inbox },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'biostore', label: 'Bio Builder', icon: Link2 },
  { id: 'community', label: 'Community', icon: Users },
  { id: 'crm', label: 'Email CRM', icon: Mail },
  { id: 'settings', label: 'Settings', icon: Settings },
];

/** Map showcase tabs → which sidebar row is selected. */
function sidebarActive(tab: ShowcaseTabId, navId: string) {
  return tab === navId;
}

function Avatar({
  letter,
  tone = 'bg-[#243228] text-white',
  size = 'w-7 h-7 text-[11px]',
}: {
  letter: string;
  tone?: string;
  size?: string;
}) {
  return (
    <span
      className={`${size} rounded-full ${tone} font-bold inline-flex items-center justify-center shrink-0`}
    >
      {letter}
    </span>
  );
}

function StudioSidebar({ tab }: { tab: ShowcaseTabId }) {
  return (
    <aside className="hidden sm:flex w-64 shrink-0 bg-white border-r border-slate-200/80 flex-col rounded-bl-[28px]">
      <div className="px-4 pt-5 pb-4 space-y-4">
        <div className="flex items-center px-0.5 min-h-[44px]">
          <span className="font-serif text-3xl font-medium text-[#2C2621] tracking-tight leading-none">
            C.
          </span>
        </div>
        <div className="flex items-center gap-2.5 w-full h-11 rounded-2xl border border-slate-200/90 bg-white pl-1.5 pr-3">
          <Avatar letter="C" size="w-7 h-7 text-[11px]" />
          <span className="text-[13px] font-semibold text-slate-800 truncate flex-1 leading-tight">
            Clikd&apos;s Workspace
          </span>
          <ChevronDown size={14} className="text-slate-400 shrink-0" />
        </div>
      </div>
      <nav className="flex-1 px-3 pt-2 pb-4 space-y-0.5">
        {NAV_ROWS.map((row) => {
          const Icon = row.icon;
          const active = sidebarActive(tab, row.id);
          return (
            <div
              key={`${row.id}-${row.label}`}
              className={`w-full flex items-center gap-3 h-11 px-3.5 ${
                active
                  ? 'rounded-2xl bg-[#243228] text-white font-semibold shadow-sm'
                  : 'rounded-2xl text-slate-500 font-medium'
              }`}
            >
              <Icon size={18} strokeWidth={1.75} className="shrink-0 opacity-90" />
              <span className="text-[13px] truncate tracking-tight">{row.label}</span>
            </div>
          );
        })}
      </nav>
      <div className="px-5 pb-5 pt-2">
        <span className="font-mono text-[11px] font-medium text-slate-500">Pro</span>
      </div>
    </aside>
  );
}

function StudioTopbar({ search }: { search: string }) {
  return (
    <div className="h-14 sm:h-16 shrink-0 px-4 sm:px-8 flex items-center justify-between gap-3 border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
      <div className="flex items-center gap-2.5 sm:hidden shrink-0">
        <span className="font-serif text-2xl font-medium text-[#2C2621] tracking-tight leading-none">
          C.
        </span>
      </div>
      <div className="relative w-full max-w-md flex-1 hidden sm:block">
        <Search
          size={15}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <div className="w-full bg-white text-sm rounded-xl border border-slate-200/90 pl-10 pr-14 py-2 min-h-[40px] font-medium text-slate-400">
          {search}
        </div>
        <span className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-semibold text-slate-400">
          ⌘K
        </span>
      </div>
      <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-auto">
        <span className="hidden lg:inline-flex items-center h-9 px-2 text-xs font-semibold text-slate-500">
          EN
        </span>
        <span className="hidden xl:inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500">
          <Sparkles size={14} />
        </span>
        <span className="relative h-9 w-9 inline-flex items-center justify-center rounded-full text-slate-500">
          <Bell size={16} />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#2C3B2E]" />
        </span>
        <Avatar letter="E" tone="bg-[#243228] text-white" />
      </div>
    </div>
  );
}

function PlannerChip({
  title,
  platforms,
  status,
}: {
  title: string;
  platforms: SocialPlatform[];
  status: string;
}) {
  const primary = platforms[0];
  const meta = PLATFORM_META[primary];
  const labelColor = primary === 'tiktok' ? '#2C3B2E' : meta.color;

  return (
    <div
      className="w-full rounded-md border px-1.5 py-1"
      style={{
        background: `color-mix(in srgb, ${meta.color} 14%, white)`,
        borderColor: `color-mix(in srgb, ${meta.color} 30%, white)`,
      }}
    >
      <div className="flex items-center gap-1 mb-0.5">
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${status}`} />
        <div className="flex -space-x-1">
          {platforms.slice(0, 2).map((p) => (
            <span key={p} className="scale-75 origin-left">
              <PlatformIcon platform={p} size={10} />
            </span>
          ))}
        </div>
      </div>
      <p
        className="text-[10px] font-semibold truncate leading-tight"
        style={{ color: labelColor }}
      >
        {title}
      </p>
    </div>
  );
}

const PLANNER_PLATFORMS: SocialPlatform[] = [
  'instagram',
  'tiktok',
  'facebook',
  'linkedin',
  'youtube',
];

const PLANNER_STATUSES = [
  'bg-[#2C3B2E]',
  'bg-[#2C2621]',
  'bg-[#E6E3DB]',
  'bg-[#2C2621]',
  'bg-[#2C3B2E]',
] as const;

const PLANNER_TITLES: Record<SocialPlatform, string[]> = {
  instagram: [
    'Summer drop carousel',
    'Product flatlay',
    'Q&A Stories',
    'Member spotlight',
    'Reel · hook test',
    'Before / after',
    'Bio link CTA',
  ],
  tiktok: [
    '3 caption mistakes',
    'Studio B-roll',
    'Hook formula',
    'Swish checkout demo',
    'Trend remix',
    'Day-in-the-life',
    'Comment reply Reel',
  ],
  facebook: [
    'Masterclass reminder',
    'Waitlist close',
    'Live event promo',
    'Community poll',
    'Testimonial post',
    'Group cross-post',
    'Event recap',
  ],
  linkedin: [
    'Agency tips carousel',
    'Case study thread',
    'Hiring post',
    'Creator economy take',
    'Tool stack share',
    'Client win',
    'Nordic market note',
  ],
  youtube: [
    'Studio tour Short',
    'Tutorial upload',
    'Podcast clip',
    'Weekly vlog',
    'How-to premiere',
    'Community shoutout',
    'B-roll drop',
  ],
  pinterest: ['Mood board pin', 'Template pack'],
};

/** One or more posts per day — every August day filled, platform-tinted chips. */
function buildAugustPlannerPosts(): Record<
  number,
  Array<{ title: string; platforms: SocialPlatform[]; status: string }>
> {
  const posts: Record<
    number,
    Array<{ title: string; platforms: SocialPlatform[]; status: string }>
  > = {};

  for (let day = 1; day <= 31; day++) {
    const primary = PLANNER_PLATFORMS[(day - 1) % PLANNER_PLATFORMS.length];
    const secondary = PLANNER_PLATFORMS[(day + 2) % PLANNER_PLATFORMS.length];
    const titles = PLANNER_TITLES[primary];
    const dayPosts: Array<{ title: string; platforms: SocialPlatform[]; status: string }> = [
      {
        title: titles[(day - 1) % titles.length],
        platforms: [primary],
        status: PLANNER_STATUSES[day % PLANNER_STATUSES.length],
      },
    ];

    if (day % 4 === 0) {
      const extra = PLANNER_TITLES[secondary];
      dayPosts.push({
        title: extra[day % extra.length],
        platforms: [secondary],
        status: PLANNER_STATUSES[(day + 1) % PLANNER_STATUSES.length],
      });
    }
    if (day % 9 === 0) {
      dayPosts.push({
        title: 'Cross-post bundle',
        platforms: ['instagram', 'tiktok'],
        status: 'bg-[#2C2621]',
      });
    }
    if (day === 18) {
      dayPosts.push(
        {
          title: 'Live Q&A promo',
          platforms: ['instagram'],
          status: 'bg-[#2C3B2E]',
        },
        {
          title: 'Waitlist broadcast',
          platforms: ['facebook', 'linkedin'],
          status: 'bg-[#2C2621]',
        }
      );
    }

    posts[day] = dayPosts;
  }

  return posts;
}

function PlannerBody() {
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const posts = buildAugustPlannerPosts();
  const eventCount = Object.values(posts).reduce((sum, day) => sum + day.length, 0);
  const pad = 6;
  const cells: Array<number | null> = [
    ...Array.from({ length: pad }, () => null),
    ...Array.from({ length: 31 }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <p className="text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-slate-400">
            Content planner
          </p>
          <h3 className="font-clikd-wordmark font-extrabold text-[26px] sm:text-[32px] text-slate-900 tracking-tight mt-1">
            Planner
          </h3>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Clikd&apos;s Workspace · @clikd.app
          </p>
        </div>
        <div className="flex flex-col items-stretch sm:items-end gap-2">
          <div className="flex gap-1.5 overflow-x-auto scrollbar-none -mx-1 px-1 pb-0.5">
            {(
              [
                { id: 'all', label: 'All platforms' },
                { id: 'instagram', label: 'Instagram', Icon: InstagramIcon },
                { id: 'facebook', label: 'Facebook', Icon: FacebookIcon },
                { id: 'tiktok', label: 'TikTok', Icon: TikTokIcon },
                { id: 'linkedin', label: 'LinkedIn', Icon: LinkedInIcon },
                { id: 'youtube', label: 'YouTube', Icon: YouTubeIcon },
              ] as const
            ).map((p, i) => (
              <span
                key={p.id}
                className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 min-h-[36px] rounded-xl whitespace-nowrap font-semibold ${
                  i === 0
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-600 border border-slate-200/80'
                }`}
              >
                {'Icon' in p ? <p.Icon size={13} /> : null}
                {p.label}
              </span>
            ))}
          </div>
          <span className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-slate-900 text-white text-xs font-semibold self-end">
            <Plus size={14} strokeWidth={2.5} /> Create post
          </span>
        </div>
      </div>
      <div className={`${adminCardClass} overflow-hidden`}>
        <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-3 border-b border-slate-200/80 overflow-x-auto scrollbar-none">
          <span className="inline-flex h-9 px-3 rounded-lg border border-slate-200 bg-white text-[13px] font-medium text-slate-700">
            Today
          </span>
          <div className="inline-flex items-center rounded-lg border border-slate-200 bg-white p-0.5 shrink-0">
            {['Month', 'Week', 'Day', 'List'].map((m, i) => (
              <span
                key={m}
                className={`h-8 px-2 sm:px-3 rounded-md text-[11px] sm:text-[12px] font-medium whitespace-nowrap ${
                  i === 0 ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600'
                }`}
              >
                {m}
              </span>
            ))}
          </div>
          <div className="flex-1 flex items-center justify-center gap-1.5 sm:gap-2 min-w-[140px] shrink-0">
            <ChevronLeft size={18} className="text-slate-400 shrink-0" />
            <p className="text-[13px] sm:text-[15px] font-semibold text-slate-900 tracking-tight whitespace-nowrap">
              August 2026
            </p>
            <ChevronRight size={18} className="text-slate-400 shrink-0" />
            <span className="hidden sm:inline-flex items-center h-7 px-2.5 rounded-full border border-slate-200 bg-slate-50 text-[11px] font-medium text-slate-500 tabular-nums">
              {eventCount} events
            </span>
          </div>
          <span className="hidden lg:inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-slate-200 bg-white text-[13px] font-medium text-slate-700">
            <Filter size={14} strokeWidth={1.75} /> Filter
          </span>
        </div>
        <div className="overflow-x-auto scrollbar-none -mx-px">
          <div className="min-w-[640px]">
        <div className="grid grid-cols-7 border-b border-slate-100">
          {weekdays.map((d) => (
            <div
              key={d}
              className="py-2 text-center text-[10px] font-medium uppercase tracking-wider text-slate-400"
            >
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((day, i) => (
            <div
              key={i}
              className="min-h-[118px] border-t border-r border-slate-100 p-1.5 last:border-r-0"
            >
              {day ? (
                <>
                  <span
                    className={`inline-flex w-7 h-7 items-center justify-center rounded-full text-[12px] font-semibold ${
                      day === 18 ? 'text-white' : 'text-slate-700'
                    }`}
                    style={day === 18 ? { background: '#2C3B2E' } : undefined}
                  >
                    {day}
                  </span>
                  <div className="mt-1 space-y-0.5">
                    {(posts[day] ?? []).slice(0, 2).map((p, idx) => (
                      <PlannerChip key={`${day}-${p.title}-${idx}`} {...p} />
                    ))}
                    {(posts[day]?.length ?? 0) > 2 ? (
                      <p className="text-[10px] font-medium text-slate-400 px-0.5">
                        +{(posts[day]?.length ?? 0) - 2} more
                      </p>
                    ) : null}
                  </div>
                </>
              ) : null}
            </div>
          ))}
        </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BioSeg({
  options,
  active = 0,
}: {
  options: string[];
  active?: number;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt, i) => (
        <span
          key={opt}
          className={`inline-flex h-9 min-h-[36px] items-center px-3 rounded-xl text-[11px] font-inter font-medium border ${
            i === active
              ? 'border-[#2C3B2E] bg-[rgba(44,59,46,0.06)] text-[#2C2621]'
              : 'border-[#E6E3DB] bg-white text-[#8A857D]'
          }`}
        >
          {opt}
        </span>
      ))}
    </div>
  );
}

function BioColorSwatch({ hex, label }: { hex: string; label: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-[#E6E3DB] bg-white px-2.5 py-2">
      <span
        className="h-8 w-8 shrink-0 rounded-lg border border-[#E6E3DB]"
        style={{ background: hex }}
      />
      <div className="min-w-0">
        <p className="font-inter text-[10px] font-medium uppercase tracking-[0.12em] text-[#8A857D]">
          {label}
        </p>
        <p className="font-inter text-[11px] font-medium text-[#2C2621] tabular-nums">{hex}</p>
      </div>
    </div>
  );
}

function BioBody() {
  const themes = [
    { name: 'Nordic', a: '#2C3B2E', b: '#1E2A20', on: true, light: false },
    { name: 'Champagne', a: '#F5E6C8', b: '#C9A227', on: false, light: true },
    { name: 'Midnight', a: '#1A1F2E', b: '#0F1320', on: false, light: false },
    { name: 'Arctic', a: '#E8EEF2', b: '#B8C5D0', on: false, light: true },
    { name: 'Emerald', a: '#0F766E', b: '#134E4A', on: false, light: false },
    { name: 'Noir', a: '#171717', b: '#404040', on: false, light: false },
  ];
  const fonts = [
    { name: 'Playfair Display', sample: 'Aa', on: true },
    { name: 'Plus Jakarta', sample: 'Aa', on: false },
    { name: 'Space Grotesk', sample: 'Aa', on: false },
    { name: 'Inter', sample: 'Aa', on: false },
  ];
  const blocks = [
    { name: 'Frosted', hint: 'Soft glass', on: true },
    { name: 'Solid', hint: 'Filled blocks', on: false },
    { name: 'Luxe', hint: 'Rich contrast', on: false },
    { name: 'Minimal', hint: 'Outline only', on: false },
  ];
  const links = [
    { title: 'Shop the edit', sub: 'New arrivals' },
    { title: 'Join the community', sub: 'Free to join' },
    { title: 'Book a consult', sub: '15 min · Zoom' },
  ];

  return (
    <div className="rounded-xl sm:rounded-3xl border border-[#E6E3DB] bg-white shadow-[0_24px_80px_-24px_rgba(44,38,33,0.12)] overflow-hidden">
      {/* Header — mirrors real Bio Builder */}
      <div className="px-3 sm:px-5 pt-4 pb-3 border-b border-[#E6E3DB] bg-[#F9F8F6]">
        <div className="min-w-0">
          <p className="font-inter text-[10px] font-medium uppercase tracking-[0.16em] text-[#8A857D]">
            Bio Builder · @clikd.app
          </p>
          <h3 className="font-playfair font-medium text-[22px] sm:text-[26px] text-[#2C2621] tracking-tight leading-none mt-1">
            Link in Bio
          </h3>
          <p className="mt-1.5 font-inter text-xs text-[#8A857D] truncate">
            Clikd Studio · Publish to clikd.app/clikd
          </p>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex items-center gap-1 px-3 sm:px-5 py-2 border-b border-[#E6E3DB] bg-[#F9F8F6]/80 overflow-x-auto scrollbar-none">
        {['Design', 'Blocks', 'Analytics', 'Settings'].map((t, i) => (
          <span
            key={t}
            className={`shrink-0 h-9 min-h-[36px] px-3.5 rounded-xl text-[11px] font-inter font-medium inline-flex items-center ${
              i === 0
                ? 'bg-white text-[#2C2621] border border-[#E6E3DB]'
                : 'text-[#8A857D]'
            }`}
          >
            {t}
          </span>
        ))}
      </div>

      {/* Editor + phone preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 p-3 sm:p-5 bg-white">
        <div className="lg:col-span-7 space-y-3 max-h-[640px] lg:max-h-[720px] overflow-y-auto pr-1 scrollbar-none">
          {/* Themes */}
          <div className="rounded-xl border border-[#E6E3DB] bg-[#F9F8F6] p-3.5 sm:p-4">
            <p className="font-playfair text-[15px] font-medium text-[#2C2621]">Themes</p>
            <p className="mt-1 font-inter text-[11px] text-[#8A857D]">
              Exclusive looks — preview updates live.
            </p>
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {themes.map((th) => (
                <div
                  key={th.name}
                  className={`relative rounded-xl overflow-hidden border ${
                    th.on ? 'border-[#2C3B2E] ring-2 ring-[#2C3B2E]/15' : 'border-[#E6E3DB]'
                  }`}
                >
                  <div
                    className="h-14 sm:h-16"
                    style={{ background: `linear-gradient(135deg, ${th.a}, ${th.b})` }}
                  />
                  <div className="absolute inset-x-0 bottom-0 p-2 flex items-end justify-between">
                    <p
                      className={`text-[11px] font-inter font-medium drop-shadow-sm ${
                        th.light ? 'text-[#2C2621]' : 'text-white'
                      }`}
                    >
                      {th.name}
                    </p>
                    {th.on ? (
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/90 text-[#2C3B2E]">
                        <Check size={12} strokeWidth={2.5} />
                      </span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Profile photo */}
          <div className="rounded-xl border border-[#E6E3DB] bg-[#F9F8F6] p-3.5 sm:p-4">
            <p className="font-playfair text-[15px] font-medium text-[#2C2621]">Profile photo</p>
            <p className="mt-1 font-inter text-[11px] text-[#8A857D]">
              Avatar shown above your name on the page.
            </p>
            <div className="mt-3 flex items-center gap-3">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-[#E6E3DB] bg-[#2C3B2E] text-[15px] font-playfair font-medium text-[#F9F8F6]">
                C.
              </div>
              <div className="flex flex-wrap gap-1.5">
                <span className="inline-flex h-9 min-h-[36px] items-center rounded-xl border border-[#E6E3DB] bg-white px-3 text-[11px] font-inter font-medium text-[#2C2621]">
                  Upload
                </span>
                <span className="inline-flex h-9 min-h-[36px] items-center rounded-xl px-3 text-[11px] font-inter font-medium text-[#8A857D]">
                  Remove
                </span>
              </div>
            </div>
            <div className="mt-3">
              <p className="mb-2 font-inter text-[10px] font-medium uppercase tracking-[0.12em] text-[#8A857D]">
                Avatar shape
              </p>
              <BioSeg options={['Circle', 'Rounded', 'Square']} active={0} />
            </div>
            <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-[#E6E3DB] bg-white px-3 py-2.5">
              <div>
                <p className="font-inter text-[12px] font-medium text-[#2C2621]">Verified badge</p>
                <p className="font-inter text-[10px] text-[#8A857D]">Show checkmark next to name</p>
              </div>
              <span className="relative inline-flex h-6 w-11 shrink-0 rounded-full bg-[#2C3B2E]">
                <span className="absolute top-0.5 right-0.5 h-5 w-5 rounded-full bg-white shadow" />
              </span>
            </div>
          </div>

          {/* Cover */}
          <div className="rounded-xl border border-[#E6E3DB] bg-[#F9F8F6] p-3.5 sm:p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-playfair text-[15px] font-medium text-[#2C2621]">Cover</p>
                <p className="mt-1 font-inter text-[11px] text-[#8A857D]">
                  Optional header image above your profile.
                </p>
              </div>
              <span className="relative inline-flex h-6 w-11 shrink-0 rounded-full bg-[#2C3B2E]">
                <span className="absolute top-0.5 right-0.5 h-5 w-5 rounded-full bg-white shadow" />
              </span>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <div className="h-14 w-24 rounded-xl bg-gradient-to-br from-[#2C3B2E] to-[#1E2A20] border border-[#E6E3DB]" />
              <div className="flex flex-col gap-1.5">
                <span className="inline-flex h-8 min-h-[32px] items-center rounded-lg border border-[#E6E3DB] bg-white px-3 text-[11px] font-inter font-medium text-[#2C2621]">
                  Replace
                </span>
                <span className="inline-flex h-8 min-h-[32px] items-center rounded-lg px-3 text-[11px] font-inter font-medium text-[#8A857D]">
                  Remove
                </span>
              </div>
            </div>
            <div className="mt-3">
              <p className="mb-2 font-inter text-[10px] font-medium uppercase tracking-[0.12em] text-[#8A857D]">
                Social icons
              </p>
              <BioSeg options={['Header', 'Dock']} active={0} />
            </div>
          </div>

          {/* Typography */}
          <div className="rounded-xl border border-[#E6E3DB] bg-[#F9F8F6] p-3.5 sm:p-4">
            <p className="font-playfair text-[15px] font-medium text-[#2C2621]">Typography</p>
            <p className="mt-1 font-inter text-[11px] text-[#8A857D]">
              Font for your name and link titles.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {fonts.map((f) => (
                <div
                  key={f.name}
                  className={`rounded-xl border p-3 ${
                    f.on
                      ? 'border-[#2C3B2E] bg-[rgba(44,59,46,0.06)]'
                      : 'border-[#E6E3DB] bg-white'
                  }`}
                >
                  <p
                    className={`text-[20px] leading-none text-[#2C2621] ${
                      f.name.includes('Playfair')
                        ? 'font-playfair'
                        : f.name.includes('Space')
                          ? 'font-clikd-wordmark'
                          : 'font-inter'
                    }`}
                  >
                    {f.sample}
                  </p>
                  <p className="mt-2 font-inter text-[11px] font-medium text-[#2C2621]">{f.name}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Canvas & colors */}
          <div className="rounded-xl border border-[#E6E3DB] bg-[#F9F8F6] p-3.5 sm:p-4 space-y-3">
            <div>
              <p className="font-playfair text-[15px] font-medium text-[#2C2621]">Canvas</p>
              <p className="mt-1 font-inter text-[11px] text-[#8A857D]">
                Background, tint, and text colors.
              </p>
            </div>
            <div>
              <p className="mb-2 font-inter text-[10px] font-medium uppercase tracking-[0.12em] text-[#8A857D]">
                Background
              </p>
              <BioSeg options={['Solid', 'Image', 'Liquid']} active={0} />
            </div>
            <div className="flex items-center justify-between gap-3 rounded-xl border border-[#E6E3DB] bg-white px-3 py-2.5">
              <div>
                <p className="font-inter text-[12px] font-medium text-[#2C2621]">Mesh gradient</p>
                <p className="font-inter text-[10px] text-[#8A857D]">Soft layered wash</p>
              </div>
              <span className="relative inline-flex h-6 w-11 shrink-0 rounded-full bg-[#E6E3DB]">
                <span className="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow" />
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <BioColorSwatch hex="#F9F8F6" label="Canvas" />
              <BioColorSwatch hex="#2C3B2E" label="Accent" />
              <BioColorSwatch hex="#2C2621" label="Text" />
              <BioColorSwatch hex="#8A857D" label="Muted" />
            </div>
          </div>

          {/* Block designs */}
          <div className="rounded-xl border border-[#E6E3DB] bg-[#F9F8F6] p-3.5 sm:p-4 space-y-3">
            <div>
              <p className="font-playfair text-[15px] font-medium text-[#2C2621]">Block designs</p>
              <p className="mt-1 font-inter text-[11px] text-[#8A857D]">
                How your links and buttons look.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {blocks.map((b) => (
                <div
                  key={b.name}
                  className={`rounded-xl border p-3 text-left ${
                    b.on
                      ? 'border-[#2C3B2E] bg-[rgba(44,59,46,0.06)]'
                      : 'border-[#E6E3DB] bg-white'
                  }`}
                >
                  <p className="font-inter text-[12px] font-medium text-[#2C2621]">{b.name}</p>
                  <p className="mt-0.5 font-inter text-[10px] text-[#8A857D]">{b.hint}</p>
                </div>
              ))}
            </div>
            <div>
              <p className="mb-2 font-inter text-[10px] font-medium uppercase tracking-[0.12em] text-[#8A857D]">
                Corner curvature
              </p>
              <BioSeg options={['Curved', 'Sharp', 'Pill']} active={0} />
            </div>
            <div>
              <p className="mb-2 font-inter text-[10px] font-medium uppercase tracking-[0.12em] text-[#8A857D]">
                Hover effect
              </p>
              <BioSeg options={['Lift', 'Shimmer', 'Scale']} active={0} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <BioColorSwatch hex="#FFFFFF" label="Block fill" />
              <BioColorSwatch hex="#2C2621" label="Block text" />
            </div>
          </div>
        </div>

        {/* Phone preview — sticky on desktop while options scroll */}
        <div className="lg:col-span-5 flex flex-col items-center justify-start pt-1 lg:sticky lg:top-3 lg:self-start">
          <div className="w-[200px] sm:w-[220px] rounded-[2rem] border-[6px] border-[#1A1816] bg-[#F9F8F6] overflow-hidden shadow-[0_24px_48px_-20px_rgba(44,38,33,0.35)]">
            <div className="relative h-16 bg-gradient-to-br from-[#2C3B2E] to-[#1E2A20]">
              <div className="absolute left-1/2 top-1.5 h-1.5 w-16 -translate-x-1/2 rounded-full bg-black/30" />
            </div>
            <div className="relative -mt-8 flex flex-col items-center px-4 pb-5">
              <div className="relative flex h-16 w-16 items-center justify-center rounded-full border-[3px] border-white bg-[#2C3B2E] text-[15px] font-playfair font-medium text-[#F9F8F6] shadow-sm">
                C.
                <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#2C3B2E] border-2 border-white text-white">
                  <Check size={10} strokeWidth={3} />
                </span>
              </div>
              <p className="mt-2.5 font-playfair text-[16px] font-medium text-[#2C2621] leading-none">
                Clikd Studio
              </p>
              <p className="mt-1.5 font-inter text-[10px] text-[#8A857D]">@clikd.app</p>
              <p className="mt-2 text-center font-inter text-[11px] leading-snug text-[#8A857D]">
                Nordic creator tools — plan, sell, and grow.
              </p>

              <div className="mt-3 flex w-full rounded-xl border border-[#E6E3DB] bg-white p-0.5">
                <span className="flex-1 rounded-[10px] bg-[#2C3B2E] py-1.5 text-center text-[10px] font-inter font-medium text-[#F9F8F6]">
                  Links
                </span>
                <span className="flex-1 py-1.5 text-center text-[10px] font-inter font-medium text-[#8A857D]">
                  Store
                </span>
              </div>

              <div className="mt-3 w-full space-y-2">
                {links.map((link) => (
                  <div
                    key={link.title}
                    className="flex items-center gap-2.5 rounded-xl border border-[#E6E3DB] bg-white/90 px-2.5 py-2 backdrop-blur-sm"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F9F8F6] text-[#2C3B2E]">
                      <Link2 size={13} strokeWidth={2} />
                    </span>
                    <div className="min-w-0 flex-1 text-left">
                      <p className="truncate font-inter text-[11px] font-medium text-[#2C2621]">
                        {link.title}
                      </p>
                      <p className="truncate font-inter text-[9px] text-[#8A857D]">{link.sub}</p>
                    </div>
                  </div>
                ))}
              </div>

              <p className="mt-4 font-inter text-[8px] font-medium uppercase tracking-[0.14em] text-[#8A857D]/80">
                Powered by clikd
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


function AnalyticsBody() {
  const kpis = [
    { l: 'Reach', v: '128.4K', delta: '+18%' },
    { l: 'Engagement', v: '4.8%', delta: '+0.6 pts' },
    { l: 'Followers', v: '24.1K', delta: '+312' },
    { l: 'Impressions', v: '412K', delta: '+22%' },
  ];
  const breakdown = [
    { l: 'Likes', v: '8.2K', pct: 52 },
    { l: 'Comments', v: '1.4K', pct: 18 },
    { l: 'Shares', v: '980', pct: 16 },
    { l: 'Saves', v: '1.1K', pct: 14 },
  ];
  const posts = [
    { title: 'Carousel · Nordic desk edit', type: 'Carousel', reach: '42.1K', eng: '6.2%' },
    { title: 'Reel · Morning coffee hook', type: 'Reel', reach: '88.4K', eng: '7.1%' },
    { title: 'Story set · Behind the shoot', type: 'Stories', reach: '19.6K', eng: '4.4%' },
    { title: 'Post · Waitlist open', type: 'Post', reach: '31.2K', eng: '5.3%' },
  ];
  const spark = 'M0 42 C 28 38, 40 22, 70 26 S 110 48, 140 32 S 190 8, 240 14 S 280 36, 320 20';

  return (
    <div className="rounded-xl sm:rounded-3xl border border-[#E6E3DB] bg-white shadow-[0_24px_80px_-24px_rgba(44,38,33,0.12)] overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 px-3 sm:px-5 pt-4 pb-3 border-b border-[#E6E3DB] bg-[#F9F8F6]">
        <div className="min-w-0">
          <p className="font-inter text-[10px] font-medium uppercase tracking-[0.16em] text-[#8A857D]">
            Analytics · Instagram, TikTok & Facebook
          </p>
          <h3 className="font-playfair font-medium text-[22px] sm:text-[26px] text-[#2C2621] tracking-tight leading-none mt-1">
            Performance
          </h3>
          <p className="mt-1.5 font-inter text-xs text-[#8A857D]">
            Reach, engagement, and growth across every connected channel.
          </p>
        </div>
        <span className="inline-flex items-center h-9 min-h-[36px] px-3 rounded-xl border border-[#E6E3DB] bg-white text-[11px] font-inter font-medium text-[#8A857D] self-start sm:self-auto">
          Last 30 days
        </span>
      </div>

      <div className="flex items-center gap-1.5 px-3 sm:px-5 py-2 border-b border-[#E6E3DB] bg-[#F9F8F6]/80 overflow-x-auto scrollbar-none">
        {['Overview', 'Posts', 'Reels', 'Audience', 'Hashtags'].map((tab, i) => (
          <span
            key={tab}
            className={`shrink-0 h-9 min-h-[36px] px-3.5 rounded-xl text-[11px] font-inter font-medium inline-flex items-center ${
              i === 0
                ? 'bg-white text-[#2C2621] border border-[#E6E3DB]'
                : 'text-[#8A857D]'
            }`}
          >
            {tab}
          </span>
        ))}
      </div>

      <div className="p-3 sm:p-5 space-y-3 bg-white">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
          {kpis.map((k, i) => (
            <div
              key={k.l}
              className={`rounded-xl border bg-[#F9F8F6] p-3.5 ${
                i === 1 ? 'border-[#2C3B2E] ring-2 ring-[#2C3B2E]/10' : 'border-[#E6E3DB]'
              }`}
            >
              <p className="font-inter text-[10px] font-medium uppercase tracking-[0.12em] text-[#8A857D]">
                {k.l}
              </p>
              <p className="mt-1 font-playfair text-[22px] font-medium text-[#2C2621] tabular-nums leading-none">
                {k.v}
              </p>
              <p className="mt-2 font-inter text-[11px] font-medium text-[#2C3B2E]">{k.delta}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
          <div className="lg:col-span-7 rounded-xl border border-[#E6E3DB] bg-[#F9F8F6] p-3.5 sm:p-4">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div>
                <p className="font-playfair text-[15px] font-medium text-[#2C2621]">Reach trend</p>
                <p className="mt-0.5 font-inter text-[11px] text-[#8A857D]">All platforms combined</p>
              </div>
              <p className="font-inter text-[11px] text-[#8A857D] tabular-nums">19 Jul → 18 Aug</p>
            </div>
            <svg viewBox="0 0 320 56" className="w-full h-24 sm:h-28" aria-hidden>
              <defs>
                <linearGradient id="analytics-spark" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2C3B2E" stopOpacity="0.28" />
                  <stop offset="100%" stopColor="#2C3B2E" stopOpacity="0.02" />
                </linearGradient>
              </defs>
              <path d={`${spark} L 320 56 L 0 56 Z`} fill="url(#analytics-spark)" />
              <path d={spark} fill="none" stroke="#2C3B2E" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
          </div>

          <div className="lg:col-span-5 rounded-xl border border-[#E6E3DB] bg-[#F9F8F6] p-3.5 sm:p-4">
            <p className="font-playfair text-[15px] font-medium text-[#2C2621]">Engagement mix</p>
            <p className="mt-0.5 font-inter text-[11px] text-[#8A857D] mb-3">11.7K total interactions</p>
            <div className="space-y-2.5">
              {breakdown.map((b) => (
                <div key={b.l}>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-inter text-[11px] font-medium text-[#2C2621]">{b.l}</span>
                    <span className="font-inter text-[11px] tabular-nums text-[#8A857D]">
                      {b.v} · {b.pct}%
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[#E6E3DB] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#2C3B2E]"
                      style={{ width: `${b.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-[#E6E3DB] bg-[#F9F8F6] overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-3.5 sm:px-4 pt-3.5 pb-2">
            <p className="font-playfair text-[15px] font-medium text-[#2C2621]">Top content</p>
            <span className="font-inter text-[11px] text-[#8A857D]">By reach</span>
          </div>
          <div className="overflow-x-auto scrollbar-none">
            <div className="min-w-[520px]">
              <div className="grid grid-cols-12 gap-2 px-3.5 sm:px-4 py-2 text-[10px] font-inter font-medium uppercase tracking-[0.12em] text-[#8A857D] border-y border-[#E6E3DB]">
                <span className="col-span-6">Content</span>
                <span className="col-span-2">Type</span>
                <span className="col-span-2">Reach</span>
                <span className="col-span-2 text-right">Eng.</span>
              </div>
              {posts.map((p) => (
                <div
                  key={p.title}
                  className="grid grid-cols-12 gap-2 px-3.5 sm:px-4 py-3 items-center border-b border-[#E6E3DB]/70 last:border-0 bg-white/60"
                >
                  <span className="col-span-6 font-inter text-[12px] font-medium text-[#2C2621] truncate">
                    {p.title}
                  </span>
                  <span className="col-span-2">
                    <span className="inline-flex rounded-md border border-[#E6E3DB] bg-white px-1.5 py-0.5 font-inter text-[10px] font-medium text-[#8A857D]">
                      {p.type}
                    </span>
                  </span>
                  <span className="col-span-2 font-inter text-[11px] tabular-nums text-[#8A857D]">
                    {p.reach}
                  </span>
                  <span className="col-span-2 text-right font-inter text-[12px] font-medium tabular-nums text-[#2C3B2E]">
                    {p.eng}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


function CrmBody() {
  const members = [
    { name: 'Ebba Brobeck', email: 'ebba@clikd.app', tag: 'Owner', date: '12 Aug', letter: 'E' },
    { name: 'Anna Ståhl', email: 'anna@cherii.se', tag: 'Member', date: '14 Aug', letter: 'A' },
    { name: 'Marcus Lindqvist', email: 'marcus@growthnordic.se', tag: 'Purchase', date: '15 Aug', letter: 'M' },
    { name: 'Sara Berg', email: 'sara@nordicmind.se', tag: 'Community', date: '16 Aug', letter: 'S' },
    { name: 'Johan Holm', email: 'johan@techspark.se', tag: 'Imported', date: '17 Aug', letter: 'J' },
    { name: 'Nova Creates', email: 'hello@novacreates.com', tag: 'Waitlist', date: '18 Aug', letter: 'N' },
  ];
  const broadcasts = [
    { title: 'Welcome sequence', status: 'Active', opens: '62%', sent: '1,120' },
    { title: 'Course launch — week 1', status: 'Sent', opens: '48%', sent: '890' },
    { title: 'Member digest', status: 'Draft', opens: '—', sent: '—' },
  ];

  return (
    <div className="rounded-xl sm:rounded-3xl border border-[#E6E3DB] bg-white shadow-[0_24px_80px_-24px_rgba(44,38,33,0.12)] overflow-hidden">
      {/* Header */}
      <div className="px-3 sm:px-5 pt-4 pb-3 border-b border-[#E6E3DB] bg-[#F9F8F6]">
        <p className="font-inter text-[10px] font-medium uppercase tracking-[0.16em] text-[#8A857D]">
          Email CRM · Resend
        </p>
        <h3 className="font-playfair font-medium text-[22px] sm:text-[26px] text-[#2C2621] tracking-tight leading-none mt-1">
          Email & CRM
        </h3>
        <p className="mt-1.5 font-inter text-xs text-[#8A857D]">
          Subscriber directory, segments, and broadcasts — 99.8% inbox delivery.
        </p>
      </div>

      {/* Sub-tabs */}
      <div className="flex items-center gap-1.5 px-3 sm:px-5 py-2 border-b border-[#E6E3DB] bg-[#F9F8F6]/80 overflow-x-auto scrollbar-none">
        {['Directory', 'Broadcasts', 'Sequences', 'Segments'].map((t, i) => (
          <span
            key={t}
            className={`shrink-0 h-9 min-h-[36px] px-3.5 rounded-xl text-[11px] font-inter font-medium inline-flex items-center ${
              i === 0
                ? 'bg-white text-[#2C2621] border border-[#E6E3DB]'
                : 'text-[#8A857D]'
            }`}
          >
            {t}
          </span>
        ))}
      </div>

      <div className="p-3 sm:p-5 space-y-3 bg-white">
        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {[
            { l: 'Total subscribers', v: '1,340', delta: '+86 this week' },
            { l: 'Average open rate', v: '48.2%', delta: '+3.1 pts' },
            { l: 'Broadcasts sent', v: '24', delta: 'Last 90 days' },
          ].map((k) => (
            <div
              key={k.l}
              className="rounded-xl border border-[#E6E3DB] bg-[#F9F8F6] p-3.5"
            >
              <p className="font-inter text-[10px] font-medium uppercase tracking-[0.12em] text-[#8A857D]">
                {k.l}
              </p>
              <p className="mt-1 font-playfair text-[22px] font-medium text-[#2C2621] tabular-nums leading-none">
                {k.v}
              </p>
              <p className="mt-2 font-inter text-[11px] text-[#8A857D]">{k.delta}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
          {/* Subscriber directory */}
          <div className="lg:col-span-7 rounded-xl border border-[#E6E3DB] bg-[#F9F8F6] overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-3.5 sm:px-4 pt-3.5 pb-2">
              <div>
                <p className="font-playfair text-[15px] font-medium text-[#2C2621]">
                  Subscriber directory
                </p>
                <p className="mt-0.5 font-inter text-[11px] text-[#8A857D]">1,340 members synced</p>
              </div>
              <span className="inline-flex h-8 min-h-[32px] items-center rounded-lg border border-[#E6E3DB] bg-white px-2.5 text-[11px] font-inter font-medium text-[#8A857D]">
                Export CSV
              </span>
            </div>
            <div className="divide-y divide-[#E6E3DB]/70">
              {members.map((m) => (
                <div
                  key={m.email}
                  className="flex items-center gap-3 px-3.5 sm:px-4 py-2.5 bg-white/60"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#2C3B2E] text-[12px] font-playfair font-medium text-[#F9F8F6]">
                    {m.letter}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-inter text-[12px] font-medium text-[#2C2621] truncate">
                      {m.name}
                    </p>
                    <p className="font-inter text-[11px] text-[#8A857D] truncate">{m.email}</p>
                  </div>
                  <span className="shrink-0 rounded-lg border border-[#E6E3DB] bg-white px-2 py-0.5 text-[10px] font-inter font-medium text-[#8A857D]">
                    {m.tag}
                  </span>
                  <span className="hidden sm:inline shrink-0 w-14 text-right font-inter text-[11px] tabular-nums text-[#8A857D]">
                    {m.date}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Broadcasts */}
          <div className="lg:col-span-5 rounded-xl border border-[#E6E3DB] bg-[#F9F8F6] overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-3.5 sm:px-4 pt-3.5 pb-2">
              <div>
                <p className="font-playfair text-[15px] font-medium text-[#2C2621]">Broadcasts</p>
                <p className="mt-0.5 font-inter text-[11px] text-[#8A857D]">Recent campaigns</p>
              </div>
              <span className="inline-flex h-8 min-h-[32px] items-center gap-1 rounded-lg border border-[#E6E3DB] bg-white px-2.5 text-[11px] font-inter font-medium text-[#8A857D]">
                <Plus size={12} strokeWidth={2.5} /> New
              </span>
            </div>
            <div className="space-y-2 px-3.5 sm:px-4 pb-3.5">
              {broadcasts.map((b) => (
                <div
                  key={b.title}
                  className="rounded-xl border border-[#E6E3DB] bg-white p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-inter text-[12px] font-medium text-[#2C2621]">{b.title}</p>
                    <span
                      className={`shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-inter font-medium ${
                        b.status === 'Active'
                          ? 'bg-[rgba(44,59,46,0.1)] text-[#2C3B2E]'
                          : b.status === 'Sent'
                            ? 'bg-[#F9F8F6] text-[#8A857D] border border-[#E6E3DB]'
                            : 'bg-[#F9F8F6] text-[#8A857D]'
                      }`}
                    >
                      {b.status}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-3 font-inter text-[11px] text-[#8A857D]">
                    <span>
                      Opens <span className="font-medium text-[#2C2621] tabular-nums">{b.opens}</span>
                    </span>
                    <span>
                      Sent <span className="font-medium text-[#2C2621] tabular-nums">{b.sent}</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InboxBody() {
  const threads = [
    { n: 'anker_nordics', m: 'Tack! Just booked the masterclass.', t: '12m', on: true, ig: true, unread: 2 },
    { n: 'nova_creates', m: 'Is the Swish checkout live yet?', t: '34m', on: false, ig: true, unread: 1 },
    { n: 'sara.berg', m: 'Loved the Reel — sending my team.', t: '2h', on: false, ig: false, unread: 0 },
    { n: 'marcus.k', m: 'Can we co-host a live next week?', t: '5h', on: false, ig: true, unread: 0 },
    { n: 'johan.holm', m: 'Imported 240 emails from ConvertKit.', t: '1d', on: false, ig: false, unread: 0 },
  ];

  return (
    <div className="rounded-xl sm:rounded-3xl border border-[#E6E3DB] bg-white shadow-[0_24px_80px_-24px_rgba(44,38,33,0.12)] overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 px-3 sm:px-5 pt-4 pb-3 border-b border-[#E6E3DB] bg-[#F9F8F6]">
        <div className="min-w-0">
          <p className="font-inter text-[10px] font-medium uppercase tracking-[0.16em] text-[#8A857D]">
            Social Inbox · Instagram & TikTok
          </p>
          <h3 className="font-playfair font-medium text-[22px] sm:text-[26px] text-[#2C2621] tracking-tight leading-none mt-1">
            Inbox
          </h3>
          <p className="mt-1.5 font-inter text-xs text-[#8A857D]">
            @clikd.app · Comment-to-DM and unified conversations
          </p>
        </div>
        <span className="inline-flex h-9 min-h-[36px] items-center rounded-xl border border-[#E6E3DB] bg-white px-3 text-[11px] font-inter font-medium text-[#8A857D] self-start sm:self-auto">
          All messages
        </span>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-1.5 px-3 sm:px-5 py-2 border-b border-[#E6E3DB] bg-[#F9F8F6]/80 overflow-x-auto scrollbar-none">
        {['All', 'Unread', 'Instagram', 'TikTok', 'Automations'].map((t, i) => (
          <span
            key={t}
            className={`shrink-0 h-9 min-h-[36px] px-3.5 rounded-xl text-[11px] font-inter font-medium inline-flex items-center ${
              i === 0
                ? 'bg-white text-[#2C2621] border border-[#E6E3DB]'
                : 'text-[#8A857D]'
            }`}
          >
            {t}
          </span>
        ))}
      </div>

      {/* Thread list + conversation */}
      <div className="grid grid-cols-1 md:grid-cols-12 bg-white min-h-[420px] md:min-h-[520px]">
        <div className="md:col-span-4 border-b md:border-b-0 md:border-r border-[#E6E3DB] max-h-[280px] md:max-h-none overflow-y-auto bg-[#F9F8F6]/50">
          {threads.map((th) => (
            <div
              key={th.n}
              className={`relative flex items-start gap-3 px-3.5 py-3 border-l-2 ${
                th.on
                  ? 'bg-white border-l-[#2C3B2E]'
                  : 'border-l-transparent'
              }`}
            >
              <span className="relative shrink-0">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#2C3B2E] text-[12px] font-playfair font-medium text-[#F9F8F6]">
                  {th.n[0].toUpperCase()}
                </span>
                <span
                  className={`absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full flex items-center justify-center ring-2 ring-white ${
                    th.ig ? 'bg-[#2C3B2E] text-white' : 'bg-[#2C2621] text-white'
                  }`}
                >
                  {th.ig ? <InstagramIcon size={9} /> : <TikTokIcon size={9} />}
                </span>
              </span>
              <div className="flex-1 min-w-0 pt-0.5">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="font-inter text-[12px] font-medium text-[#2C2621] truncate">{th.n}</p>
                  <span className="font-inter text-[10px] text-[#8A857D] tabular-nums">{th.t}</span>
                </div>
                <p className="font-inter text-[11px] text-[#8A857D] truncate">{th.m}</p>
              </div>
              {th.unread ? (
                <span className="mt-1 h-5 min-w-[20px] px-1.5 rounded-full bg-[#2C3B2E] text-[#F9F8F6] text-[10px] font-inter font-medium inline-flex items-center justify-center">
                  {th.unread}
                </span>
              ) : null}
            </div>
          ))}
        </div>

        <div className="md:col-span-8 p-4 sm:p-5 flex flex-col min-h-[280px]">
          <div className="flex items-center gap-2.5 pb-3 border-b border-[#E6E3DB]">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#2C3B2E] text-[12px] font-playfair font-medium text-[#F9F8F6]">
              A
            </span>
            <div className="min-w-0">
              <p className="font-inter text-[12px] font-medium text-[#2C2621]">anker_nordics</p>
              <p className="font-inter text-[10px] text-[#8A857D]">Instagram · DM</p>
            </div>
            <span className="ml-auto inline-flex h-8 min-h-[32px] items-center rounded-lg border border-[#E6E3DB] bg-[#F9F8F6] px-2.5 text-[10px] font-inter font-medium text-[#8A857D]">
              Comment → DM
            </span>
          </div>

          <div className="flex-1 py-4 space-y-2.5 font-inter text-[12px]">
            <div className="bg-[#F9F8F6] border border-[#E6E3DB] rounded-2xl rounded-tl-md px-3.5 py-2.5 w-[82%] text-[#2C2621]">
              Hej! Jag kommenterade #MASTERCLASS — är det fortfarande öppet?
            </div>
            <div className="bg-[#2C3B2E] text-[#F9F8F6] rounded-2xl rounded-tr-md px-3.5 py-2.5 w-[82%] ml-auto">
              Hej! Tack för din kommentar. Här är direktlänken till min nya Masterclass:
              clikd.app/bio/masterclass
            </div>
            <div className="bg-[#F9F8F6] border border-[#E6E3DB] rounded-2xl rounded-tl-md px-3.5 py-2.5 w-[72%] text-[#2C2621]">
              Tack! Just booked the masterclass.
            </div>
          </div>

          <div className="h-10 min-h-[40px] rounded-full border border-[#E6E3DB] bg-[#F9F8F6] px-4 flex items-center font-inter text-[11px] text-[#8A857D]">
            Write a reply…
          </div>
        </div>
      </div>
    </div>
  );
}


function LevelRing({
  letter,
  ring = '#2C3B2E',
  fill = '#1E2A20',
  progress = 62,
  size = 38,
  level = 3,
}: {
  letter: string;
  ring?: string;
  fill?: string;
  progress?: number;
  size?: number;
  level?: number;
}) {
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <div
        className="absolute inset-0 rounded-full"
        style={{ background: `conic-gradient(${ring} ${progress}%, #E6E3DB 0)` }}
      />
      <div className="absolute inset-[2px] rounded-full bg-white overflow-hidden flex items-center justify-center">
        <div
          className="w-full h-full rounded-full flex items-center justify-center font-playfair font-medium text-[#F9F8F6] text-sm"
          style={{ background: `linear-gradient(135deg, ${ring}, ${fill})` }}
        >
          {letter}
        </div>
      </div>
      <div
        className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center border-[1.5px] border-white text-white font-inter font-medium"
        style={{ background: fill, fontSize: 7 }}
      >
        {level}
      </div>
    </div>
  );
}

function MemberCommunityPreview() {
  const posts = [
    {
      name: 'Ebba Brobeck',
      letter: 'E',
      time: 'Pinned · 2h',
      tag: 'Tips',
      pinned: true,
      body: 'This week’s hook formula is live in Classroom. Drop your first line below — best one gets featured on the leaderboard.',
      likes: 48,
      comments: 12,
      hot: true,
      level: 4,
    },
    {
      name: 'Anna Ståhl',
      letter: 'A',
      time: '34m',
      tag: 'Wins',
      pinned: false,
      body: 'Closed 4 Swish checkouts from the bio store after the carousel. Masterclass at 1,499 SEK is converting.',
      likes: 31,
      comments: 8,
      hot: true,
      level: 3,
    },
    {
      name: 'Marcus Lindqvist',
      letter: 'M',
      time: '2h',
      tag: 'Questions',
      pinned: false,
      body: 'Anyone running Meta retargeting on waitlist emails? Sharing my ROAS in the thread.',
      likes: 14,
      comments: 6,
      hot: false,
      level: 2,
    },
  ];
  const board = [
    { n: 'Ebba Brobeck', pts: '842', me: false },
    { n: 'Anna Ståhl', pts: '512', me: true },
    { n: 'Marcus Lindqvist', pts: '388', me: false },
    { n: 'Sara Berg', pts: '210', me: false },
  ];

  return (
    <div className="rounded-xl sm:rounded-3xl border border-[#E6E3DB] bg-white shadow-[0_24px_80px_-24px_rgba(44,38,33,0.12)] overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 px-3 sm:px-5 pt-4 pb-3 border-b border-[#E6E3DB] bg-[#F9F8F6]">
        <div className="min-w-0">
          <p className="font-inter text-[10px] font-medium uppercase tracking-[0.16em] text-[#8A857D]">
            Community · Clikd Insiders
          </p>
          <h3 className="font-playfair font-medium text-[22px] sm:text-[26px] text-[#2C2621] tracking-tight leading-none mt-1">
            Member space
          </h3>
          <p className="mt-1.5 font-inter text-xs text-[#8A857D]">
            Feed, classroom, events & leaderboard — one home for members.
          </p>
        </div>
        <div className="relative hidden sm:block w-full max-w-[220px]">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8A857D]"
          />
          <div className="h-10 min-h-[40px] rounded-xl border border-[#E6E3DB] bg-white pl-9 pr-3 font-inter text-[11px] text-[#8A857D] flex items-center">
            Search community…
          </div>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex items-center gap-1.5 px-3 sm:px-5 py-2 border-b border-[#E6E3DB] bg-[#F9F8F6]/80 overflow-x-auto scrollbar-none">
        {[
          { label: 'Feed', Icon: MessageSquare },
          { label: 'Events', Icon: CalendarDays },
          { label: 'Classroom', Icon: GraduationCap },
          { label: 'Store', Icon: ShoppingBag },
          { label: 'Leaderboard', Icon: Trophy },
        ].map((t, i) => (
          <span
            key={t.label}
            className={`shrink-0 h-9 min-h-[36px] px-3.5 rounded-xl text-[11px] font-inter font-medium inline-flex items-center gap-1.5 ${
              i === 0
                ? 'bg-white text-[#2C2621] border border-[#E6E3DB]'
                : 'text-[#8A857D]'
            }`}
          >
            <t.Icon size={13} strokeWidth={2} />
            {t.label}
          </span>
        ))}
      </div>

      <div className="p-3 sm:p-5 bg-white">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
          {/* Feed */}
          <div className="lg:col-span-7 space-y-3 min-w-0">
            <div className="rounded-xl border border-[#E6E3DB] bg-[#F9F8F6] overflow-hidden">
              <div className="p-3.5 flex gap-3">
                <LevelRing letter="A" size={36} progress={74} />
                <div className="flex-1 rounded-xl border border-[#E6E3DB] bg-white px-3 py-2.5 font-inter text-[12px] text-[#8A857D] min-h-[64px]">
                  Share a win, ask a question, or drop a tip…
                </div>
              </div>
              <div className="flex items-center justify-between px-3.5 py-2.5 border-t border-[#E6E3DB] bg-white/70">
                <span className="inline-flex items-center gap-1.5 font-inter text-[11px] font-medium text-[#8A857D]">
                  <ImageIcon size={13} /> Upload image
                </span>
                <span className="inline-flex h-8 min-h-[32px] items-center gap-1.5 rounded-lg bg-[#2C3B2E] px-3 text-[11px] font-inter font-medium text-[#F9F8F6]">
                  <Send size={12} strokeWidth={2.5} /> Publish
                </span>
              </div>
            </div>

            {posts.map((p) => (
              <div
                key={p.name + p.time}
                className={`rounded-xl border bg-[#F9F8F6] overflow-hidden ${
                  p.pinned ? 'border-[#2C3B2E]/35' : 'border-[#E6E3DB]'
                }`}
              >
                <div className="p-3.5 sm:p-4">
                  <div className="flex items-center gap-2.5 mb-2.5">
                    <LevelRing letter={p.letter} level={p.level} size={36} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-inter text-[13px] font-medium text-[#2C2621]">{p.name}</p>
                        {p.pinned ? (
                          <span className="inline-flex items-center gap-0.5 rounded-md border border-[#E6E3DB] bg-white px-1.5 py-0.5 font-inter text-[9px] font-medium uppercase tracking-wide text-[#8A857D]">
                            <Pin size={9} strokeWidth={2.5} /> Pinned
                          </span>
                        ) : null}
                        <span className="inline-flex items-center rounded-md bg-white border border-[#E6E3DB] px-1.5 py-0.5 font-inter text-[10px] font-medium text-[#8A857D]">
                          {p.tag}
                        </span>
                      </div>
                      <p className="font-inter text-[10px] text-[#8A857D]">{p.time}</p>
                    </div>
                  </div>
                  <p className="font-inter text-[13px] leading-relaxed text-[#2C2621]/90 mb-3">
                    {p.body}
                  </p>
                  <div className="flex items-center gap-1.5 pt-2.5 border-t border-[#E6E3DB]/80">
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-[#E6E3DB] px-2.5 py-1.5 font-inter text-[11px] font-medium text-[#2C2621]">
                      <Heart size={13} className="text-[#B85C38]" /> {p.likes}
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-inter text-[11px] font-medium text-[#8A857D]">
                      <MessageSquare size={13} /> {p.comments}
                    </span>
                    {p.hot ? (
                      <span className="ml-auto inline-flex items-center gap-1 rounded-lg bg-[rgba(44,59,46,0.08)] px-2 py-1 font-inter text-[10px] font-medium text-[#2C3B2E]">
                        <Flame size={11} /> Popular
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-5 space-y-3 min-w-0">
            <div className="rounded-xl border border-[#E6E3DB] bg-[#F9F8F6] p-3.5 sm:p-4">
              <p className="font-inter text-[10px] font-medium uppercase tracking-[0.12em] text-[#8A857D]">
                Your profile
              </p>
              <div className="mt-3 flex items-center gap-3">
                <LevelRing letter="A" size={48} progress={74} level={3} />
                <div>
                  <p className="font-inter text-[13px] font-medium text-[#2C2621]">Anna Ståhl</p>
                  <p className="font-inter text-[11px] text-[#2C3B2E]">Gold · Level 3</p>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {[
                  ['12', 'Posts'],
                  ['86', 'Likes'],
                  ['512', 'XP'],
                ].map(([v, l]) => (
                  <div
                    key={l}
                    className="rounded-xl border border-[#E6E3DB] bg-white p-2 text-center"
                  >
                    <p className="font-playfair text-[16px] font-medium text-[#2C2621] tabular-nums leading-none">
                      {v}
                    </p>
                    <p className="mt-1 font-inter text-[9px] font-medium uppercase tracking-wider text-[#8A857D]">
                      {l}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-[#E6E3DB] bg-[#F9F8F6] overflow-hidden">
              <div className="px-3.5 sm:px-4 pt-3.5 pb-2">
                <p className="font-playfair text-[15px] font-medium text-[#2C2621]">Leaderboard</p>
                <p className="mt-0.5 font-inter text-[11px] text-[#8A857D]">Top members this week</p>
              </div>
              <div className="divide-y divide-[#E6E3DB]/70">
                {board.map((m, i) => (
                  <div
                    key={m.n}
                    className={`flex items-center gap-3 px-3.5 sm:px-4 py-2.5 ${
                      m.me ? 'bg-white' : 'bg-white/50'
                    }`}
                  >
                    <span
                      className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-inter font-medium ${
                        i === 0
                          ? 'bg-[#2C3B2E] text-[#F9F8F6]'
                          : 'bg-white border border-[#E6E3DB] text-[#8A857D]'
                      }`}
                    >
                      {i + 1}
                    </span>
                    <p className="flex-1 font-inter text-[12px] font-medium text-[#2C2621] truncate">
                      {m.n}
                      {m.me ? (
                        <span className="ml-1.5 font-inter text-[10px] text-[#8A857D]">you</span>
                      ) : null}
                    </p>
                    <p className="font-inter text-[12px] font-medium text-[#2C2621] tabular-nums">
                      {m.pts}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-[#E6E3DB] bg-[#F9F8F6] overflow-hidden">
              <div className="relative h-20 bg-gradient-to-br from-[#2C2621] to-[#2C3B2E] flex items-center justify-center">
                <CalendarDays size={28} className="text-white/25" strokeWidth={1.25} />
                <span className="absolute top-2.5 left-2.5 inline-flex items-center gap-1.5 rounded-full bg-[#B85C38] px-2 py-0.5 font-inter text-[9px] font-medium text-white">
                  <span className="h-1.5 w-1.5 rounded-full bg-white" /> Live soon
                </span>
              </div>
              <div className="p-3.5">
                <p className="font-inter text-[10px] font-medium uppercase tracking-[0.12em] text-[#2C3B2E]">
                  Wed 19 Aug · 19:00
                </p>
                <p className="mt-1 font-playfair text-[15px] font-medium text-[#2C2621]">
                  Live Q&A · Hook formula
                </p>
                <span className="mt-3 inline-flex h-9 min-h-[36px] w-full items-center justify-center rounded-xl bg-[#2C3B2E] font-inter text-[11px] font-medium text-[#F9F8F6]">
                  RSVP confirmed
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


const SEARCH: Record<ShowcaseTabId, string> = {
  planner: 'Search posts…',
  biostore: 'Search admin…',
  analytics: 'Search admin…',
  crm: 'Search admin…',
  inbox: 'Search conversations…',
  community: 'Search admin…',
};

/** Vector-sharp replica of the real clikd: admin chrome, with populated demo data. */
export function PlatformShowcaseStudio({ tab }: { tab: ShowcaseTabId }) {
  if (tab === 'planner') {
    return (
      <div className="bg-[#F9F8F6] min-h-[520px] sm:min-h-[720px] lg:min-h-[860px] text-left overflow-x-hidden p-3 sm:p-5">
        <HeroPlannerMockup />
      </div>
    );
  }

  if (tab === 'biostore') {
    return (
      <div className="bg-[#F9F8F6] min-h-[520px] sm:min-h-[720px] lg:min-h-[860px] text-left overflow-x-hidden p-3 sm:p-5">
        <BioBody />
      </div>
    );
  }

  if (tab === 'analytics') {
    return (
      <div className="bg-[#F9F8F6] min-h-[520px] sm:min-h-[720px] lg:min-h-[860px] text-left overflow-x-hidden p-3 sm:p-5">
        <AnalyticsBody />
      </div>
    );
  }

  if (tab === 'crm') {
    return (
      <div className="bg-[#F9F8F6] min-h-[520px] sm:min-h-[720px] lg:min-h-[860px] text-left overflow-x-hidden p-3 sm:p-5">
        <CrmBody />
      </div>
    );
  }

  if (tab === 'inbox') {
    return (
      <div className="bg-[#F9F8F6] min-h-[520px] sm:min-h-[720px] lg:min-h-[860px] text-left overflow-x-hidden p-3 sm:p-5">
        <InboxBody />
      </div>
    );
  }

  if (tab === 'community') {
    return (
      <div className="bg-[#F9F8F6] min-h-[520px] sm:min-h-[720px] lg:min-h-[860px] text-left overflow-x-hidden p-3 sm:p-5">
        <MemberCommunityPreview />
      </div>
    );
  }

  return (
    <div
      className="bg-[#F9F8F6] min-h-[520px] sm:min-h-[720px] lg:min-h-[860px] flex text-left pointer-events-none select-none overflow-x-hidden"
      aria-hidden
    >
      <StudioSidebar tab={tab} />
      <div className="flex-1 min-w-0 flex flex-col">
        <StudioTopbar search={SEARCH[tab]} />
        <div className="flex-1 p-3 sm:p-4 lg:p-6 overflow-x-hidden">
          {/* all showcase tabs early-return above */}
        </div>
      </div>
    </div>
  );
}
