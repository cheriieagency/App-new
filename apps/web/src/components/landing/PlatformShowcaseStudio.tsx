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
  Image as ImageIcon,
  Inbox,
  Link2,
  Mail,
  Megaphone,
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
import { ClikdMark } from '@/components/brand/ClikdLogo';
import { adminCardClass } from '@/components/admin/AdminUi';
import {
  FacebookIcon,
  InstagramIcon,
  LinkedInIcon,
  TikTokIcon,
  YouTubeIcon,
} from '@/components/icons/SocialBrandIcons';
import { PlatformIcon } from '@/components/planner/PlatformBadge';
import type { SocialPlatform } from '@/lib/mock-content-planner';
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
  { id: 'charts', label: 'Analytics', icon: BarChart3 },
  { id: 'metaads', label: 'Ads', icon: Megaphone },
  { id: 'biostore', label: 'Bio Builder', icon: Link2 },
  { id: 'community', label: 'Community', icon: Users },
  { id: 'crm', label: 'Email CRM', icon: Mail },
  { id: 'settings', label: 'Settings', icon: Settings },
];

/** Map showcase tabs → which sidebar row is selected. */
function sidebarActive(tab: ShowcaseTabId, navId: string) {
  if (tab === 'analytics') return navId === 'home';
  return tab === navId;
}

function Avatar({
  letter,
  tone = 'bg-[#1a1848] text-white',
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
        <div className="flex items-center gap-2.5 px-0.5 min-h-[44px]">
          <ClikdMark size={34} className="rounded-[11px] shadow-sm" />
          <p className="font-clikd-wordmark font-extrabold text-[17px] text-slate-900 tracking-tight leading-none">
            clikd<span className="text-[#F472B6]">:</span>
          </p>
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
                  ? 'rounded-2xl bg-[#1a1848] text-white font-semibold shadow-sm'
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
    <div className="h-16 shrink-0 px-4 sm:px-8 flex items-center justify-between gap-4 border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
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
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#F472B6]" />
        </span>
        <Avatar letter="E" tone="bg-[#1a1848] text-white" />
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
  return (
    <div className="w-full rounded-md bg-[#E9D5FF]/45 border border-[#E9D5FF]/80 px-1.5 py-1">
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
      <p className="text-[11px] font-semibold text-slate-800 truncate leading-tight">{title}</p>
    </div>
  );
}

function PlannerBody() {
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const posts: Record<
    number,
    Array<{ title: string; platforms: SocialPlatform[]; status: string }>
  > = {
    3: [{ title: 'Summer drop teaser', platforms: ['instagram'], status: 'bg-emerald-500' }],
    5: [{ title: '3 caption mistakes', platforms: ['tiktok'], status: 'bg-sky-500' }],
    7: [{ title: 'Product flatlay', platforms: ['instagram', 'facebook'], status: 'bg-emerald-500' }],
    10: [{ title: 'Masterclass reminder', platforms: ['facebook'], status: 'bg-sky-500' }],
    12: [{ title: 'Studio B-roll', platforms: ['tiktok', 'youtube'], status: 'bg-violet-500' }],
    14: [{ title: 'Agency tips carousel', platforms: ['linkedin'], status: 'bg-sky-500' }],
    18: [
      { title: 'Hook formula', platforms: ['tiktok'], status: 'bg-sky-500' },
      { title: 'Swish checkout demo', platforms: ['tiktok'], status: 'bg-indigo-500' },
      { title: 'Q&A live', platforms: ['instagram'], status: 'bg-amber-400' },
    ],
    21: [{ title: 'Carousel CTA', platforms: ['instagram'], status: 'bg-sky-500' }],
    25: [{ title: 'Member win story', platforms: ['tiktok', 'instagram'], status: 'bg-sky-500' }],
    28: [{ title: 'Waitlist close', platforms: ['facebook'], status: 'bg-amber-400' }],
  };
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
          <div className="flex gap-1.5 overflow-hidden">
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
        <div className="flex items-center gap-3 px-3 sm:px-4 py-3 border-b border-slate-200/80">
          <span className="inline-flex h-9 px-3 rounded-lg border border-slate-200 bg-white text-[13px] font-medium text-slate-700">
            Today
          </span>
          <div className="inline-flex items-center rounded-lg border border-slate-200 bg-white p-0.5">
            {['Month', 'Week', 'Day', 'List'].map((m, i) => (
              <span
                key={m}
                className={`h-8 px-3 rounded-md text-[12px] font-medium ${
                  i === 0 ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600'
                }`}
              >
                {m}
              </span>
            ))}
          </div>
          <div className="flex-1 flex items-center justify-center gap-2">
            <ChevronLeft size={18} className="text-slate-400" />
            <p className="text-[15px] font-semibold text-slate-900 tracking-tight">August 2026</p>
            <ChevronRight size={18} className="text-slate-400" />
            <span className="hidden sm:inline-flex items-center h-7 px-2.5 rounded-full border border-slate-200 bg-slate-50 text-[11px] font-medium text-slate-500 tabular-nums">
              14 events
            </span>
          </div>
          <span className="hidden lg:inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-slate-200 bg-white text-[13px] font-medium text-slate-700">
            <Filter size={14} strokeWidth={1.75} /> Filter
          </span>
        </div>
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
              className="min-h-[104px] border-t border-r border-slate-100 p-1.5 last:border-r-0"
            >
              {day ? (
                <>
                  <span
                    className={`inline-flex w-7 h-7 items-center justify-center rounded-full text-[12px] font-semibold ${
                      day === 18 ? 'text-white' : 'text-slate-700'
                    }`}
                    style={day === 18 ? { background: '#9089F0' } : undefined}
                  >
                    {day}
                  </span>
                  <div className="mt-1 space-y-1">
                    {(posts[day] ?? []).slice(0, 2).map((p) => (
                      <PlannerChip key={p.title} {...p} />
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
  );
}

function BioBody() {
  const themes = [
    { name: 'Midnight Glass', a: '#1a1848', b: '#312e81' },
    { name: 'Champagne Luxe', a: '#F5E6C8', b: '#C9A227' },
    { name: 'Aurora Glow', a: '#4F46E5', b: '#A855F7', on: true },
    { name: 'Nordic Minimal', a: '#E2E8F0', b: '#94A3B8' },
  ];
  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-slate-400">
            Bio builder · @clikd.app
          </p>
          <h3 className="font-clikd-wordmark font-extrabold text-[26px] sm:text-[32px] text-slate-900 tracking-tight mt-1">
            Link in Bio
          </h3>
        </div>
        <span className="h-11 px-4 rounded-xl bg-[#1a1848] text-white text-sm font-semibold inline-flex items-center">
          Publish Changes
        </span>
      </div>
      <div className="flex gap-1 p-1 rounded-xl bg-slate-100/80 border border-slate-200/80 w-fit">
        {['Design', 'Blocks', 'Analytics', 'Settings'].map((t, i) => (
          <span
            key={t}
            className={`h-9 px-3 rounded-lg text-xs ${
              i === 0 ? 'bg-white text-slate-900 shadow-sm font-semibold' : 'text-slate-500 font-medium'
            }`}
          >
            {t}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-12 gap-4">
        <div className={`col-span-7 ${adminCardClass} p-4 space-y-3`}>
          <p className="text-xs font-bold text-slate-900">Exclusive themes</p>
          <div className="grid grid-cols-2 gap-2">
            {themes.map((th) => (
              <div
                key={th.name}
                className={`rounded-xl border p-2.5 ${
                  th.on ? 'border-[#1a1848] ring-2 ring-[#1a1848]/15' : 'border-slate-200'
                }`}
              >
                <div
                  className="h-8 rounded-lg mb-1.5"
                  style={{ background: `linear-gradient(90deg, ${th.a}, ${th.b})` }}
                />
                <p className="text-[11px] font-semibold text-slate-800">{th.name}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2 pt-1">
            {[
              { l: 'Clicks', v: '4,812' },
              { l: 'Checkouts', v: '38' },
              { l: 'Conv.', v: '3.1%' },
            ].map((k) => (
              <div key={k.l} className="rounded-xl bg-slate-50 px-3 py-2">
                <p className="text-[9px] font-mono font-bold uppercase text-slate-400">{k.l}</p>
                <p className="font-clikd-wordmark font-extrabold text-lg text-slate-900 tabular-nums">
                  {k.v}
                </p>
              </div>
            ))}
          </div>
        </div>
        <div className="col-span-5 flex justify-center">
          <div className="w-[210px] rounded-[32px] border-[5px] border-slate-900 overflow-hidden bg-gradient-to-b from-indigo-600 to-purple-500 text-white p-4 space-y-3 shadow-xl">
            <div className="w-14 h-14 rounded-full bg-white/20 mx-auto border-2 border-white/70 flex items-center justify-center font-extrabold">
              E
            </div>
            <div className="text-center">
              <p className="font-bold text-sm">Ebba Brobeck</p>
              <p className="text-[10px] text-white/80">Social media · Nordic</p>
            </div>
            <div className="space-y-1.5 text-[11px] font-semibold">
              <div className="bg-white/15 rounded-xl px-3 py-2.5">Masterclass — 1,499 SEK</div>
              <div className="bg-white/15 rounded-xl px-3 py-2.5">Gratis e-bok</div>
              <div className="bg-white/15 rounded-xl px-3 py-2.5">Join Clikd insiders</div>
              <div className="bg-white text-[#4F46E5] rounded-xl px-3 py-2.5 text-center">
                Book a call
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AdsBody() {
  const rows = [
    ['Course Launch – Retargeting', 'Sales', '75', '56.3K', '234', 'on'],
    ['Brand Awareness – Nordic', 'Awareness', '45', '42.1K', '128', 'on'],
    ['Bio Store Traffic', 'Traffic', '30', '18.5K', '89', 'on'],
    ['Email Capture – Waitlist', 'Leads', '20', '12.4K', '41', 'off'],
  ];
  const spark = 'M0 42 C 28 38, 40 22, 70 26 S 110 48, 140 32 S 190 8, 240 14 S 280 36, 320 20';
  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-slate-400">
            Meta · Ads
          </p>
          <h3 className="font-clikd-wordmark font-extrabold text-[26px] sm:text-[32px] text-slate-900 tracking-tight mt-1">
            Ads Manager
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-11 px-4 rounded-xl bg-[#F472B6] text-white text-sm font-semibold inline-flex items-center gap-1.5">
            <Plus size={14} /> Create campaign
          </span>
          <span className="h-11 px-4 rounded-xl bg-[#2B2568] text-white text-sm font-medium inline-flex items-center">
            Last 30 days
          </span>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-3">
        {[
          { l: 'Spend', v: 'US$483', bar: '#F472B6' },
          { l: 'Conversions', v: '197', bar: '#1a1848' },
          { l: 'ROAS', v: '2.44x', bar: '#10B981' },
          { l: 'CPC', v: 'US$0.07', bar: '#6366F1' },
        ].map((k, i) => (
          <div
            key={k.l}
            className={`${adminCardClass} min-h-[88px] p-4 ${i === 0 ? 'ring-2 ring-[#F472B6]' : ''}`}
          >
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{k.l}</p>
            <p className="mt-1 font-[family-name:var(--font-fira-code)] text-xl font-semibold text-[#0F172A] tabular-nums">
              {k.v}
            </p>
            <span className="mt-2 inline-block h-1 w-8 rounded-full" style={{ background: k.bar }} />
          </div>
        ))}
      </div>
      <div className={`${adminCardClass} p-4 sm:p-5`}>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-medium text-[#0F172A]">Spend trend</p>
          <p className="text-xs text-slate-400">19 Jul → 18 Aug</p>
        </div>
        <svg viewBox="0 0 320 56" className="w-full h-28" aria-hidden>
          <defs>
            <linearGradient id="ads-spark" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F472B6" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#F472B6" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          <path d={`${spark} L 320 56 L 0 56 Z`} fill="url(#ads-spark)" />
          <path d={spark} fill="none" stroke="#F472B6" strokeWidth="2.2" />
        </svg>
      </div>
      <div className={`${adminCardClass} overflow-hidden`}>
        <div className="grid grid-cols-12 px-3 py-2 text-[9px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
          <span className="col-span-1">On</span>
          <span className="col-span-4">Campaign</span>
          <span className="col-span-2">Budget</span>
          <span className="col-span-2">Impr.</span>
          <span className="col-span-3">Spend</span>
        </div>
        {rows.map((r) => (
          <div
            key={r[0]}
            className="grid grid-cols-12 px-3 py-2.5 text-[11px] items-center border-b border-slate-50 last:border-0"
          >
            <span className="col-span-1">
              <span
                className={`inline-block w-8 h-4 rounded-full ${
                  r[5] === 'on' ? 'bg-[#F472B6]' : 'bg-slate-200'
                }`}
              />
            </span>
            <span className="col-span-4 font-semibold text-slate-800 truncate">{r[0]}</span>
            <span className="col-span-2 tabular-nums text-slate-600">US${r[2]}</span>
            <span className="col-span-2 tabular-nums text-slate-600">{r[3]}</span>
            <span className="col-span-3 tabular-nums font-semibold text-slate-900">US${r[4]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CrmBody() {
  const members = [
    ['Ebba Brobeck', 'ebba@clikd.app', 'Owner', '12 Aug'],
    ['Anna Ståhl', 'anna@cherii.se', 'Member', '14 Aug'],
    ['Marcus Lindqvist', 'marcus@growthnordic.se', 'Purchase', '15 Aug'],
    ['Sara Berg', 'sara@nordicmind.se', 'Community', '16 Aug'],
    ['Johan Holm', 'johan@techspark.se', 'Imported', '17 Aug'],
    ['Nova Creates', 'hello@novacreates.com', 'Waitlist', '18 Aug'],
  ];
  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-slate-400">
          Email CRM
        </p>
        <h3 className="font-clikd-wordmark font-extrabold text-[26px] text-slate-900 tracking-tight">
          Email & CRM
        </h3>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[
          { l: 'Total subscribers', v: '1,340' },
          { l: 'Average open rate', v: '48.2%' },
          { l: 'Broadcasts sent', v: '24' },
        ].map((k) => (
          <div key={k.l} className={`${adminCardClass} p-3`}>
            <p className="text-[9px] font-mono font-bold uppercase text-slate-400">{k.l}</p>
            <p className="font-clikd-wordmark font-extrabold text-2xl text-slate-900 tabular-nums">
              {k.v}
            </p>
          </div>
        ))}
      </div>
      <div className={`${adminCardClass} overflow-hidden`}>
        <div className="px-3 py-2 flex items-center justify-between border-b border-slate-100">
          <p className="text-xs font-bold text-slate-900">Subscriber directory · 1,340 members</p>
          <span className="text-[10px] font-bold text-[#F472B6]">Export CSV</span>
        </div>
        {members.map((m) => (
          <div
            key={m[1]}
            className="px-3 py-2 flex items-center gap-3 border-b border-slate-50 last:border-0 text-[11px]"
          >
            <Avatar letter={m[0][0]} size="w-7 h-7 text-[10px]" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-900 truncate">{m[0]}</p>
              <p className="text-slate-500 truncate">{m[1]}</p>
            </div>
            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
              {m[2]}
            </span>
            <span className="text-slate-400 tabular-nums w-14 text-right">{m[3]}</span>
          </div>
        ))}
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
    <div className="space-y-3 h-full flex flex-col">
      <div className="flex items-end justify-between">
        <h3 className="font-clikd-wordmark font-extrabold text-[26px] sm:text-[32px] text-slate-900 tracking-tight">
          Inbox <span className="text-slate-400 font-bold text-lg">@clikd.app</span>
        </h3>
        <span className="text-[11px] font-bold bg-[#1a1848] text-white px-3 h-8 rounded-lg inline-flex items-center">
          All messages
        </span>
      </div>
      <div className={`${adminCardClass} overflow-hidden grid grid-cols-12 min-h-[420px]`}>
        <div className="col-span-4 border-r border-slate-100">
          {threads.map((th) => (
            <div
              key={th.n}
              className={`relative flex items-start gap-3 px-3.5 py-3 border-l-2 ${
                th.on ? 'bg-[#E9D5FF]/40 border-l-[#F472B6]' : 'border-l-transparent'
              }`}
            >
              <span className="relative shrink-0">
                <Avatar letter={th.n[0].toUpperCase()} size="w-10 h-10 text-[12px]" />
                <span
                  className={`absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full flex items-center justify-center ring-2 ring-white ${
                    th.ig
                      ? 'bg-gradient-to-br from-[#F58529] to-[#DD2A7B] text-white'
                      : 'bg-slate-900 text-white'
                  }`}
                >
                  {th.ig ? <InstagramIcon size={9} /> : <TikTokIcon size={9} />}
                </span>
              </span>
              <div className="flex-1 min-w-0 pt-0.5">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-[12px] font-bold text-slate-900 truncate">{th.n}</p>
                  <span className="text-[10px] text-slate-400">{th.t}</span>
                </div>
                <p className="text-[11px] text-slate-500 truncate">{th.m}</p>
              </div>
              {th.unread ? (
                <span className="mt-1 h-5 min-w-[20px] px-1.5 rounded-full bg-[#F472B6] text-white text-[10px] font-bold inline-flex items-center justify-center">
                  {th.unread}
                </span>
              ) : null}
            </div>
          ))}
        </div>
        <div className="col-span-8 p-4 flex flex-col">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Avatar letter="A" tone="bg-[#F472B6] text-white" />
            <div>
              <p className="text-xs font-bold text-slate-900">anker_nordics</p>
              <p className="text-[10px] text-slate-400">Instagram · DM</p>
            </div>
          </div>
          <div className="flex-1 py-3 space-y-2 text-[12px]">
            <div className="bg-slate-100 rounded-2xl rounded-tl-md px-3 py-2 w-[78%] text-slate-700">
              Hej! Jag kommenterade #MASTERCLASS — är det fortfarande öppet?
            </div>
            <div className="bg-[#1a1848] text-white rounded-2xl rounded-tr-md px-3 py-2 w-[78%] ml-auto">
              Hej! Tack för din kommentar. Här är direktlänken till min nya Masterclass:
              clikd.app/bio/masterclass
            </div>
            <div className="bg-slate-100 rounded-2xl rounded-tl-md px-3 py-2 w-[70%] text-slate-700">
              Tack! Just booked the masterclass.
            </div>
          </div>
          <div className="h-9 rounded-full border border-slate-200 bg-slate-50 px-3 flex items-center text-[11px] text-slate-400">
            Write a reply…
          </div>
        </div>
      </div>
    </div>
  );
}

function LevelRing({
  letter,
  ring = '#F59E0B',
  fill = '#D97706',
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
        style={{ background: `conic-gradient(${ring} ${progress}%, #E5E7EB 0)` }}
      />
      <div className="absolute inset-[2px] rounded-full bg-white overflow-hidden flex items-center justify-center">
        <div
          className="w-full h-full rounded-full flex items-center justify-center font-extrabold text-white text-sm"
          style={{ background: `linear-gradient(135deg, ${ring}, ${fill})` }}
        >
          {letter}
        </div>
      </div>
      <div
        className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center border-[1.5px] border-white text-white font-extrabold"
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
      tagClass: 'bg-amber-100 text-amber-700',
      tagDot: '#F59E0B',
      pinned: true,
      body: 'This week’s hook formula is live in Classroom. Drop your first line below — best one gets featured on the leaderboard.',
      likes: 48,
      comments: 12,
      hot: true,
      ring: '#F472B6',
      fill: '#2B2568',
      level: 4,
    },
    {
      name: 'Anna Ståhl',
      letter: 'A',
      time: '34m',
      tag: 'Results',
      tagClass: 'bg-emerald-50 text-emerald-700',
      tagDot: '#10B981',
      pinned: false,
      body: 'Closed 4 Swish checkouts from the bio store after the carousel. Masterclass at 1,499 SEK is converting.',
      likes: 31,
      comments: 8,
      hot: true,
      ring: '#F59E0B',
      fill: '#D97706',
      level: 3,
    },
    {
      name: 'Marcus Lindqvist',
      letter: 'M',
      time: '2h',
      tag: 'Questions',
      tagClass: 'bg-violet-100 text-violet-700',
      tagDot: '#7C3AED',
      pinned: false,
      body: 'Anyone running Meta retargeting on waitlist emails? Sharing my ROAS in the thread.',
      likes: 14,
      comments: 6,
      hot: false,
      ring: '#9CA3AF',
      fill: '#6B7280',
      level: 2,
    },
  ];
  const board = [
    { n: 'Ebba Brobeck', pts: 842, lvl: 'Platinum', tone: 'bg-[#F472B6] text-white' },
    { n: 'Anna Ståhl', pts: 512, lvl: 'Gold', tone: 'bg-[#2B2568] text-white', me: true },
    { n: 'Marcus Lindqvist', pts: 388, lvl: 'Gold', tone: 'bg-[#E9D5FF] text-[#2B2568]' },
    { n: 'Sara Berg', pts: 210, lvl: 'Silver', tone: 'text-slate-400' },
  ];

  return (
    <div className="flex flex-col h-full min-h-[720px] sm:min-h-[860px] bg-[#FAFAFA]">
      <div className="bg-white/95 backdrop-blur-md border-b border-slate-200/80 shrink-0">
        <div className="px-4 sm:px-6">
          <div className="h-14 sm:h-16 flex items-center gap-3">
            <div className="flex items-center gap-2 shrink-0 min-w-0">
              <div className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center text-white font-extrabold bg-[#2B2568]">
                C
              </div>
              <span className="text-sm font-extrabold text-slate-900 truncate">Clikd insiders</span>
              <ChevronDown size={14} className="text-slate-400 shrink-0" />
            </div>
            <div className="flex-1 flex justify-center min-w-0">
              <div className="relative w-full max-w-md">
                <Search
                  size={15}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <div className="w-full h-11 rounded-full bg-slate-100 pl-10 pr-4 text-sm font-medium text-slate-400 flex items-center">
                  Search the community…
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="relative h-11 w-11 rounded-full bg-slate-100 inline-flex items-center justify-center text-slate-600">
                <Bell size={16} />
                <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-[#F472B6]" />
              </span>
              <LevelRing letter="A" size={36} />
            </div>
          </div>
          <nav className="flex items-center gap-1 -mb-px">
            {(
              [
                { label: 'Community', Icon: MessageSquare, on: true },
                { label: 'Events', Icon: CalendarDays, on: false },
                { label: 'Classroom', Icon: GraduationCap, on: false },
                { label: 'Store', Icon: ShoppingBag, on: false },
              ] as const
            ).map((tab) => (
              <span
                key={tab.label}
                className={`relative flex items-center gap-1.5 h-11 px-3.5 text-xs font-extrabold ${
                  tab.on ? 'text-slate-900' : 'text-slate-400'
                }`}
              >
                <tab.Icon size={13} />
                {tab.label}
                {tab.on ? (
                  <span className="absolute left-2 right-2 bottom-0 h-0.5 rounded-full bg-[#2c3340]" />
                ) : null}
              </span>
            ))}
          </nav>
        </div>
      </div>

      <div className="flex-1 px-4 sm:px-6 py-5 grid grid-cols-12 gap-5 overflow-hidden">
        <div className="col-span-8 space-y-3 min-w-0">
          <div className="flex items-center gap-1 bg-white border border-slate-100 shadow-sm p-1 rounded-2xl w-fit">
            <span className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#F472B6] text-white shadow-sm">
              <MessageSquare size={13} /> Feed
            </span>
            <span className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-slate-400">
              <Trophy size={13} /> Leaderboard
            </span>
          </div>

          <div className={`${adminCardClass} overflow-hidden`}>
            <div className="p-4 flex gap-3">
              <LevelRing letter="A" size={38} />
              <div className="flex-1 rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5 text-sm text-slate-400 min-h-[72px]">
                Share a win, ask a question, or drop a tip…
              </div>
            </div>
            <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-t border-slate-100">
              <span className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
                <ImageIcon size={13} /> Upload image
              </span>
              <span className="inline-flex items-center gap-1.5 h-9 px-5 rounded-xl bg-[#F472B6] text-white text-xs font-bold">
                <Send size={12} /> Publish
              </span>
            </div>
          </div>

          {posts.map((p) => (
            <div
              key={p.name + p.time}
              className={`${adminCardClass} overflow-hidden ${p.pinned ? 'ring-1 ring-violet-200' : ''}`}
            >
              <div className="p-4">
                <div className="flex items-center gap-3 mb-2.5">
                  <LevelRing letter={p.letter} ring={p.ring} fill={p.fill} level={p.level} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-extrabold text-slate-900">{p.name}</p>
                      {p.pinned ? (
                        <span className="inline-flex items-center gap-0.5 text-[9px] font-extrabold uppercase tracking-wide text-violet-700 bg-violet-100 px-1.5 py-0.5 rounded-full">
                          <Pin size={9} /> Pinned
                        </span>
                      ) : null}
                      <span
                        className={`flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full ${p.tagClass}`}
                      >
                        <span className="w-1 h-1 rounded-full" style={{ background: p.tagDot }} />
                        {p.tag}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-semibold">{p.time}</p>
                  </div>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed mb-3">{p.body}</p>
                <div className="flex items-center gap-1 pt-2.5 border-t border-slate-50">
                  <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-red-500 bg-red-50">
                    <Heart size={14} fill="currentColor" /> {p.likes}
                  </span>
                  <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-400">
                    <MessageSquare size={14} /> {p.comments}
                  </span>
                  {p.hot ? (
                    <span className="ml-auto flex items-center gap-1 text-[10px] font-extrabold text-orange-400 bg-orange-50 px-2 py-1 rounded-lg">
                      <Flame size={11} /> Popular
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="col-span-4 space-y-4 min-w-0">
          <div className={`${adminCardClass} p-5`}>
            <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-4">
              Your profile
            </h3>
            <div className="flex items-center gap-3 mb-4">
              <LevelRing letter="A" size={48} progress={74} />
              <div>
                <p className="text-sm font-extrabold text-slate-900">Anna Ståhl</p>
                <p className="text-xs font-extrabold text-amber-600">Gold · Lvl 3</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                ['12', 'Posts'],
                ['86', 'Likes'],
                ['512', 'XP'],
              ].map(([v, l]) => (
                <div key={l} className="bg-slate-50 rounded-xl p-2">
                  <p className="text-base font-extrabold text-slate-900 tabular-nums">{v}</p>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{l}</p>
                </div>
              ))}
            </div>
          </div>

          <div className={`${adminCardClass} overflow-hidden`}>
            <div
              className="px-5 py-4 text-white"
              style={{
                background: 'linear-gradient(135deg, #2B2568 0%, #1a1848 55%, #F472B6 160%)',
              }}
            >
              <p className="text-sm font-extrabold">Leaderboard</p>
              <p className="text-[11px] text-white/70">Top members this week</p>
            </div>
            <div className="divide-y divide-slate-50">
              {board.map((m, i) => (
                <div
                  key={m.n}
                  className={`flex items-center gap-3 px-4 py-2.5 ${m.me ? 'bg-[#FCE7F3]/60' : ''}`}
                >
                  <span
                    className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-extrabold ${m.tone}`}
                  >
                    {i + 1}
                  </span>
                  <p className="flex-1 text-[12px] font-extrabold text-slate-900 truncate">{m.n}</p>
                  <p className="text-sm font-extrabold text-slate-900 tabular-nums">{m.pts}</p>
                </div>
              ))}
            </div>
          </div>

          <div className={`${adminCardClass} overflow-hidden`}>
            <div className="h-24 bg-gradient-to-br from-[#2B2568] to-[#0F172A] relative flex items-center justify-center">
              <CalendarDays size={32} className="text-white/20" strokeWidth={1} />
              <span className="absolute top-3 left-3 flex items-center gap-1.5 bg-red-500 text-white text-[10px] font-extrabold px-2.5 py-1 rounded-full">
                <span className="w-1.5 h-1.5 bg-white rounded-full" /> Live soon
              </span>
            </div>
            <div className="p-4">
              <p className="text-[10px] font-extrabold text-[#F472B6] uppercase tracking-widest">
                Wed 19 Aug · 19:00
              </p>
              <p className="text-sm font-extrabold text-slate-900 mt-1">Live Q&A · Hook formula</p>
              <span className="mt-3 inline-flex items-center justify-center w-full h-9 rounded-xl bg-[#F472B6] text-white text-xs font-extrabold">
                RSVP confirmed
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function HomeBody() {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-slate-400">
          Command center
        </p>
        <h3 className="font-clikd-wordmark font-extrabold text-[26px] sm:text-[32px] text-slate-900 tracking-tight mt-1">
          Admin Home
        </h3>
        <p className="text-sm text-slate-500 font-medium mt-1">
          Today’s focus, shortcuts, Kanban and latest activity — all in one place.
        </p>
      </div>
      <div className="grid grid-cols-12 gap-3.5">
        <div className="col-span-5 rounded-2xl bg-[#EDE9FE]/80 border border-[#DDD6FE] p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-clikd-wordmark font-extrabold text-lg text-slate-900 tracking-tight">
              Today’s Focus & To-Do&apos;s
            </h4>
            <span className="inline-flex items-center rounded-full bg-white/80 border border-[#EDE4FF] px-2.5 py-1 text-[10px] font-bold text-[#2B2568]">
              Tuesday 18 Aug
            </span>
          </div>
          {[
            { t: 'Publish IG carousel', done: true },
            { t: 'Post on TikTok · Hook formula', done: false },
            { t: 'Send waitlist broadcast', done: false },
            { t: 'Reply to anker_nordics DM', done: false },
          ].map((s) => (
            <div key={s.t} className="flex items-start gap-2.5 min-h-[44px] px-2 py-1.5">
              <span
                className={`mt-0.5 h-5 w-5 rounded-md border-2 inline-flex items-center justify-center shrink-0 ${
                  s.done
                    ? 'bg-[#10B981] border-[#10B981] text-white'
                    : 'bg-white/80 border-[#D4C4F7]'
                }`}
              >
                {s.done ? <Check size={12} strokeWidth={3} /> : null}
              </span>
              <span
                className={`text-sm font-semibold leading-snug ${
                  s.done ? 'text-slate-500 line-through decoration-slate-400' : 'text-slate-800'
                }`}
              >
                {s.t}
              </span>
            </div>
          ))}
        </div>
        <div className="col-span-7 grid grid-cols-3 gap-3.5">
          {[
            { t: 'Content Planner', s: '14 posts this week', accent: 'bg-[#E9D5FF]/70 text-[#2B2568]', Icon: CalendarDays },
            { t: 'Analytics & Revenue', s: '94.2K reach', accent: 'bg-emerald-50 text-[#10B981]', Icon: BarChart3 },
            { t: 'Bio Store & Links', s: '38 Swish checkouts', accent: 'bg-pink-50 text-[#F472B6]', Icon: Link2 },
          ].map((c) => (
            <div key={c.t} className={`${adminCardClass} p-4 sm:p-5`}>
              <span className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${c.accent}`}>
                <c.Icon size={18} strokeWidth={2.25} />
              </span>
              <p className="mt-3 font-clikd-wordmark font-extrabold text-base text-slate-900 tracking-tight leading-tight">
                {c.t}
              </p>
              <p className="mt-1 text-xs font-medium text-slate-500 leading-snug">{c.s}</p>
            </div>
          ))}
        </div>
        <div className={`col-span-7 ${adminCardClass} p-4 sm:p-5`}>
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-clikd-wordmark font-extrabold text-lg text-slate-900 tracking-tight">
              Kanban To-Do Board
            </h4>
            <span className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-[#2B2568] text-white text-xs font-bold">
              <Plus size={14} strokeWidth={2.5} /> New task
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3.5">
            {[
              { h: 'To Do / Ideas', dot: 'bg-amber-400', n: '2', items: [{ t: 'Script 5 hooks', a: 'EB' }, { t: 'Film B-roll', a: 'AS' }] },
              { h: 'In progress', dot: 'bg-indigo-500', n: '2', items: [{ t: 'August calendar', a: 'EB' }, { t: 'Meta retargeting', a: 'ML' }] },
              { h: 'Done / Review', dot: 'bg-emerald-500', n: '2', items: [{ t: 'Masterclass landing', a: 'EB' }, { t: 'Welcome sequence', a: 'SB' }] },
            ].map((col) => (
              <div key={col.h} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3 min-h-[180px]">
                <div className="flex items-center gap-2 mb-3">
                  <span className={`h-2 w-2 rounded-full ${col.dot}`} />
                  <p className="text-[11px] font-extrabold text-slate-700">{col.h}</p>
                  <span className="ml-auto text-[10px] font-mono font-bold text-slate-400">{col.n}</span>
                </div>
                <div className="space-y-2">
                  {col.items.map((it) => (
                    <div
                      key={it.t}
                      className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.03)]"
                    >
                      <p className="text-[12px] font-bold text-slate-900 leading-snug">{it.t}</p>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-slate-500">
                          General
                        </span>
                        <span className="h-6 w-6 rounded-full bg-[#2B2568] text-white text-[10px] font-extrabold flex items-center justify-center">
                          {it.a}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className={`col-span-5 ${adminCardClass} p-4 sm:p-5`}>
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-clikd-wordmark font-extrabold text-lg text-slate-900 tracking-tight">
              Latest activity & alerts
            </h4>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 text-[10px] font-extrabold text-[#10B981]">
              <Radio size={11} strokeWidth={2.5} /> Live
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5 mb-4">
            {['All', '💬 Feedback', '💰 Purchases', '👥 Community'].map((f, i) => (
              <span
                key={f}
                className={`inline-flex items-center min-h-[40px] px-3 rounded-full text-[11px] font-extrabold ${
                  i === 0 ? 'bg-[#2B2568] text-white' : 'bg-white border border-slate-200 text-slate-500'
                }`}
              >
                {f}
              </span>
            ))}
          </div>
          <div className="space-y-3">
            {[
              { t: 'Anna purchased Masterclass', b: '1,499 SEK · Swish', time: '12m' },
              { t: 'Nova commented #MASTERCLASS', b: 'Reel · Instagram', time: '34m' },
              { t: 'Marcus joined Clikd insiders', b: 'Community · VIP waitlist', time: '2h' },
              { t: 'DM from anker_nordics', b: 'Booked · Instagram', time: '2h' },
            ].map((a) => (
              <div key={a.t} className="flex items-start gap-2.5">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[#F472B6] shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-bold text-slate-900">{a.t}</p>
                  <p className="text-[11px] text-slate-500">{a.b}</p>
                </div>
                <span className="text-[10px] text-slate-400 tabular-nums">{a.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const SEARCH: Record<ShowcaseTabId, string> = {
  planner: 'Search posts…',
  biostore: 'Search admin…',
  metaads: 'Search admin…',
  crm: 'Search admin…',
  inbox: 'Search conversations…',
  community: 'Search admin…',
  analytics: 'Search admin…',
};

/** Vector-sharp replica of the real clikd: admin chrome, with populated demo data. */
export function PlatformShowcaseStudio({ tab }: { tab: ShowcaseTabId }) {
  if (tab === 'community') {
    return (
      <div
        className="bg-[#FAFAFA] min-h-[720px] sm:min-h-[860px] text-left pointer-events-none select-none overflow-hidden"
        aria-hidden
      >
        <MemberCommunityPreview />
      </div>
    );
  }

  return (
    <div
      className="bg-[#FAFAFA] min-h-[720px] sm:min-h-[860px] flex text-left pointer-events-none select-none overflow-hidden"
      aria-hidden
    >
      <StudioSidebar tab={tab} />
      <div className="flex-1 min-w-0 flex flex-col">
        <StudioTopbar search={SEARCH[tab]} />
        <div className="flex-1 p-4 sm:p-6 overflow-hidden">
          {tab === 'planner' && <PlannerBody />}
          {tab === 'biostore' && <BioBody />}
          {tab === 'metaads' && <AdsBody />}
          {tab === 'crm' && <CrmBody />}
          {tab === 'inbox' && <InboxBody />}
          {tab === 'analytics' && <HomeBody />}
        </div>
      </div>
    </div>
  );
}
