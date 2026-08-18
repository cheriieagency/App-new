'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  BarChart3,
  CalendarDays,
  Columns3,
  LayoutGrid,
  Lock,
  Plus,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  InstagramIcon,
  LinkedInIcon,
  TikTokIcon,
  YouTubeIcon,
} from '@/components/icons/SocialBrandIcons';
import { useLanguage } from '@/lib/i18n';
import OptimizedImage from '@/components/ui/OptimizedImage';

type PlannerView = 'calendar' | 'kanban' | 'feed' | 'analytics';
type ChannelFilter = 'all' | 'instagram' | 'tiktok' | 'linkedin' | 'youtube';
type CalMode = 'month' | 'week' | 'day' | 'list';

const AVATAR =
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=96&h=96&fit=crop&q=80';

type PostChip = {
  day: number;
  label: string;
  platform: Exclude<ChannelFilter, 'all'>;
};

const AUGUST_POSTS: PostChip[] = [
  { day: 5, label: 'Morning routine r…', platform: 'tiktok' },
  { day: 7, label: 'Product flatlay car…', platform: 'instagram' },
  { day: 9, label: 'Studio desk photo', platform: 'instagram' },
  { day: 12, label: '3 misstag i e-handel', platform: 'tiktok' },
  { day: 13, label: 'Carousel: 5 CTA-fo…', platform: 'instagram' },
  { day: 14, label: 'dfghjkl', platform: 'linkedin' },
];

const PLATFORM_CHIP: Record<
  Exclude<ChannelFilter, 'all'>,
  { bg: string; Icon: typeof InstagramIcon }
> = {
  instagram: { bg: 'bg-[#FCE7F3] text-[#BE185D] border-[#F9A8D4]/60', Icon: InstagramIcon },
  tiktok: { bg: 'bg-[#EDE9FE] text-[#5B21B6] border-[#C4B5FD]/70', Icon: TikTokIcon },
  linkedin: { bg: 'bg-[#FEF3C7] text-[#92400E] border-[#FCD34D]/70', Icon: LinkedInIcon },
  youtube: { bg: 'bg-[#FEE2E2] text-[#991B1B] border-[#FECACA]', Icon: YouTubeIcon },
};

const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

/** Build day cells for August 2026 (Sat start of month → pad from Sunday). */
function august2026Cells() {
  // Aug 1 2026 = Saturday → 6 empty cells before day 1 when week starts Sunday
  const startPad = 6;
  const daysInMonth = 31;
  const cells: (number | null)[] = [
    ...Array.from({ length: startPad }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

/** Interactive macOS browser frame with Content Planner preview. */
function HeroPlannerMockup() {
  const { t } = useLanguage();
  const [activeView, setActiveView] = useState<PlannerView>('calendar');
  const [channel, setChannel] = useState<ChannelFilter>('all');
  const [calMode, setCalMode] = useState<CalMode>('month');
  const cells = useMemo(() => august2026Cells(), []);

  const viewTabs: {
    key: PlannerView;
    label: string;
    icon: typeof CalendarDays;
  }[] = [
    { key: 'calendar', label: t('hero.calendarPlanner'), icon: CalendarDays },
    { key: 'kanban', label: t('hero.kanbanProgress'), icon: Columns3 },
    { key: 'feed', label: t('hero.visualFeedGrid'), icon: LayoutGrid },
    { key: 'analytics', label: t('hero.analytics'), icon: BarChart3 },
  ];

  const channels: {
    key: ChannelFilter;
    label: string;
    Icon?: typeof InstagramIcon;
    tint?: string;
  }[] = [
    { key: 'all', label: t('hero.allChannels') },
    { key: 'instagram', label: 'Instagram', Icon: InstagramIcon, tint: 'text-[#E1306C]' },
    { key: 'tiktok', label: 'TikTok', Icon: TikTokIcon, tint: 'text-slate-900' },
    { key: 'linkedin', label: 'LinkedIn', Icon: LinkedInIcon, tint: 'text-[#0A66C2]' },
    { key: 'youtube', label: 'YouTube', Icon: YouTubeIcon, tint: 'text-[#FF0000]' },
  ];

  const posts = useMemo(
    () =>
      AUGUST_POSTS.filter((p) => channel === 'all' || p.platform === channel),
    [channel]
  );

  return (
    <div
      id="planner-demo"
      className="relative rounded-2xl sm:rounded-3xl border border-slate-200/90 bg-white shadow-[0_24px_80px_-24px_rgba(15,23,42,0.28)] overflow-hidden"
    >
      {/* Soft pink/periwinkle glow under the frame */}
      <div
        className="pointer-events-none absolute -inset-8 -z-10 rounded-[40px] blur-3xl opacity-70"
        style={{
          background:
            'radial-gradient(ellipse at 30% 0%, rgba(244,114,182,0.22), transparent 55%), radial-gradient(ellipse at 80% 100%, rgba(43,37,104,0.12), transparent 50%)',
        }}
        aria-hidden
      />

      {/* Title bar */}
      <div className="flex items-center gap-3 px-3 sm:px-4 py-2.5 border-b border-slate-200/80 bg-slate-50/90">
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28C840]" />
        </div>
        <div className="flex-1 min-w-0 flex items-center justify-center">
          <div className="inline-flex items-center gap-1.5 max-w-full rounded-lg bg-white border border-slate-200/90 px-2.5 py-1 text-[10px] sm:text-[11px] font-mono text-slate-500 shadow-sm">
            <Lock size={10} className="text-[#10B981] flex-shrink-0" strokeWidth={2.5} />
            <span className="truncate">https://admin.clikd.app/planner</span>
          </div>
        </div>
        <span className="hidden sm:inline-flex flex-shrink-0 items-center rounded-full bg-[#E9D5FF]/70 border border-[#E9D5FF] px-2 py-0.5 text-[10px] font-bold text-[#2B2568] font-mono">
          @ebbacreator
        </span>
      </div>

      {/* View switcher */}
      <div className="flex flex-wrap items-center gap-1.5 px-3 sm:px-4 py-2.5 border-b border-slate-100 bg-white">
        <div className="flex flex-1 min-w-0 gap-1 overflow-x-auto scrollbar-none">
          {viewTabs.map(({ key, label, icon: Icon }) => {
            const active = activeView === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setActiveView(key)}
                className={`inline-flex items-center gap-1.5 h-9 min-h-[36px] px-3 rounded-xl text-[11px] font-bold whitespace-nowrap transition-colors flex-shrink-0 ${
                  active
                    ? 'bg-[#0F172A] text-white shadow-sm'
                    : 'bg-slate-50 text-slate-600 border border-slate-200/80 hover:bg-slate-100'
                }`}
              >
                <Icon size={13} strokeWidth={2.25} />
                <span className="hidden sm:inline">{label}</span>
                <span className="sm:hidden">{label.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-auto">
          <span className="hidden md:inline text-[11px] font-semibold text-slate-400">
            August 2026
          </span>
          <button
            type="button"
            className="inline-flex items-center gap-1 h-9 min-h-[36px] px-3 rounded-xl bg-[#2B2568] text-white text-[11px] font-extrabold hover:bg-[#1a1848] transition-colors"
          >
            <Plus size={13} strokeWidth={2.5} />
            Create Post
          </button>
        </div>
      </div>

      {/* Social set + channels */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-3 px-3 sm:px-4 py-3 border-b border-slate-100 bg-[#FAFAFA]/80">
        <div className="flex items-center gap-2.5 min-w-0">
          <OptimizedImage
            src={AVATAR}
            alt=""
            width={36}
            height={36}
            sizes="36px"
            priority
            className="h-9 w-9 rounded-full object-cover ring-2 ring-white shadow-sm flex-shrink-0"
          />
          <div className="min-w-0">
            <p className="text-sm font-extrabold text-slate-900 truncate">Ebba Creator Lab</p>
            <p className="text-[11px] text-slate-500 font-medium truncate">
              <span className="font-mono">@ebbacreator</span>
              <span className="text-slate-300"> · </span>
              4 Social Channels
            </p>
          </div>
        </div>
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none lg:ml-auto">
          {channels.map(({ key, label, Icon, tint }) => {
            const active = channel === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setChannel(key)}
                className={`inline-flex items-center gap-1.5 h-8 min-h-[32px] px-3 rounded-full text-[11px] font-bold whitespace-nowrap transition-colors flex-shrink-0 ${
                  active
                    ? 'bg-[#0F172A] text-white'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {Icon ? <Icon size={12} className={active ? 'text-white' : tint} /> : null}
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* View body */}
      <div className="p-3 sm:p-4 bg-white min-h-[320px] sm:min-h-[380px]">
        <AnimatePresence mode="wait">
          {activeView === 'calendar' ? (
            <motion.div
              key="calendar"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
            >
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="inline-flex p-0.5 rounded-xl bg-slate-100/90 border border-slate-200/70">
                  {(['month', 'week', 'day', 'list'] as CalMode[]).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setCalMode(mode)}
                      className={`h-8 min-h-[32px] px-3 rounded-lg text-[10px] font-bold capitalize transition-colors ${
                        calMode === mode
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] font-semibold text-slate-400 hidden sm:block">
                  August 2026
                </p>
              </div>

              <div className="grid grid-cols-7 gap-px rounded-xl overflow-hidden border border-slate-200/80 bg-slate-200/60">
                {WEEKDAYS.map((d) => (
                  <div
                    key={d}
                    className="bg-slate-50 px-1 py-1.5 text-center text-[9px] font-mono font-bold uppercase tracking-wider text-slate-400"
                  >
                    {d}
                  </div>
                ))}
                {cells.map((day, idx) => {
                  const dayPosts = day
                    ? posts.filter((p) => p.day === day)
                    : [];
                  const isToday = day === 11;
                  return (
                    <div
                      key={idx}
                      className={`min-h-[64px] sm:min-h-[78px] bg-white p-1 sm:p-1.5 ${
                        !day ? 'bg-slate-50/80' : ''
                      }`}
                    >
                      {day ? (
                        <>
                          <div className="flex items-center justify-between mb-1">
                            {isToday ? (
                              <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full bg-[#0F172A] text-[9px] font-extrabold text-white">
                                {day}
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-slate-500 tabular-nums">
                                {day}
                              </span>
                            )}
                            {isToday ? (
                              <span className="hidden sm:inline text-[8px] font-mono font-extrabold uppercase tracking-wider text-[#0F172A]">
                                Today
                              </span>
                            ) : null}
                          </div>
                          <div className="space-y-0.5">
                            {dayPosts.slice(0, 2).map((post) => {
                              const meta = PLATFORM_CHIP[post.platform];
                              const Icon = meta.Icon;
                              return (
                                <div
                                  key={`${post.day}-${post.label}`}
                                  className={`flex items-center gap-0.5 rounded-md border px-1 py-0.5 ${meta.bg}`}
                                >
                                  <Icon size={9} className="flex-shrink-0" />
                                  <span className="text-[8px] sm:text-[9px] font-bold truncate leading-tight">
                                    {post.label}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          ) : null}

          {activeView === 'kanban' ? (
            <motion.div
              key="kanban"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
              className="grid grid-cols-2 lg:grid-cols-4 gap-2.5"
            >
              {['Ideas', 'In production', 'Review', 'Scheduled'].map((col, i) => (
                <div
                  key={col}
                  className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-2.5 min-h-[200px]"
                >
                  <p className="text-[10px] font-mono font-bold uppercase tracking-[0.12em] text-slate-400 mb-2 px-1">
                    {col}
                  </p>
                  <div className="space-y-2">
                    {(i === 0
                      ? ['Reel hook ideas', 'Carousel outline']
                      : i === 1
                        ? ['Studio desk shoot']
                        : i === 2
                          ? ['Product flatlay']
                          : ['Morning routine', 'CTA carousel']
                    ).map((card) => (
                      <div
                        key={card}
                        className="rounded-xl bg-white border border-slate-200/80 px-2.5 py-2 shadow-sm"
                      >
                        <p className="text-[11px] font-bold text-slate-800 leading-snug">{card}</p>
                        <p className="text-[9px] text-slate-400 mt-1 font-medium">@ebbacreator</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </motion.div>
          ) : null}

          {activeView === 'feed' ? (
            <motion.div
              key="feed"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
              className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-w-md mx-auto"
            >
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={i}
                  className={`aspect-square rounded-xl border border-slate-200/80 ${
                    i % 3 === 0
                      ? 'bg-gradient-to-br from-[#F472B6]/30 to-[#E9D5FF]'
                      : i % 3 === 1
                        ? 'bg-gradient-to-br from-[#2B2568]/20 to-slate-100'
                        : 'bg-slate-100'
                  }`}
                />
              ))}
            </motion.div>
          ) : null}

          {activeView === 'analytics' ? (
            <motion.div
              key="analytics"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
              className="grid grid-cols-1 sm:grid-cols-3 gap-3"
            >
              {[
                { label: 'Reach', value: '128.4K', delta: '+18%' },
                { label: 'Engagement', value: '6.2%', delta: '+1.4%' },
                { label: 'Scheduled', value: '24', delta: 'This month' },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4"
                >
                  <p className="text-[10px] font-mono font-bold uppercase tracking-[0.12em] text-slate-400">
                    {stat.label}
                  </p>
                  <p className="mt-2 text-2xl font-extrabold text-slate-900 font-outfit tabular-nums">
                    {stat.value}
                  </p>
                  <p className="mt-1 text-xs font-bold text-[#F472B6]">{stat.delta}</p>
                </div>
              ))}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}

/** Centered Content Planning hero + interactive planner showcase. */
export function HeroSection() {
  const { t } = useLanguage();

  return (
    <section className="relative overflow-hidden bg-[#FAFAFA]">
      <div
        className="absolute -top-40 left-1/2 -translate-x-1/2 w-[48rem] h-[48rem] rounded-full pointer-events-none"
        style={{
          background:
            'radial-gradient(circle, rgba(244,114,182,0.12) 0%, rgba(233,213,255,0.18) 35%, transparent 68%)',
        }}
        aria-hidden
      />
      <div
        className="absolute top-1/3 -right-32 w-[28rem] h-[28rem] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(43,37,104,0.08) 0%, transparent 70%)',
        }}
        aria-hidden
      />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-16 sm:pt-20 lg:pt-24 pb-16 sm:pb-20">
        {/* Centered copy */}
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="inline-flex items-center rounded-full bg-purple-50/80 border border-purple-200/80 px-4 py-1.5"
          >
            <span className="font-mono text-xs font-bold text-purple-900 tracking-wide">
              {t('hero.badge')}
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.06 }}
            className="mt-6 text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-extrabold tracking-tight leading-[1.08] font-outfit text-center"
          >
            <span className="block text-slate-900">{t('hero.headline1')}</span>
            <span className="block text-[#F472B6]">{t('hero.headline2')}</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.12 }}
            className="mt-5 text-base sm:text-lg text-slate-500 font-medium leading-relaxed max-w-2xl mx-auto font-sans"
          >
            {t('hero.sub')}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.18 }}
            className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3"
          >
            <Link
              href="/onboarding"
              className="inline-flex items-center justify-center min-h-[48px] bg-[#F472B6] hover:bg-[#e0529c] text-slate-950 font-black text-xs px-7 py-4 rounded-2xl shadow-sm transition-all transform hover:-translate-y-0.5"
            >
              {t('hero.ctaPrimary')}
            </Link>
            <button
              type="button"
              onClick={() =>
                document
                  .getElementById('creator-admin')
                  ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }
              className="inline-flex items-center justify-center min-h-[48px] bg-white hover:bg-slate-50 border border-slate-200 text-slate-900 font-bold text-xs px-7 py-4 rounded-2xl transition-all"
            >
              {t('hero.ctaSecondary')}
            </button>
          </motion.div>
        </div>

        {/* Browser mockup */}
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.22 }}
          className="mt-12 sm:mt-16"
        >
          <HeroPlannerMockup />
        </motion.div>
      </div>
    </section>
  );
}
