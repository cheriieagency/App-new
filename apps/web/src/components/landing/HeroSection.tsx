'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  CalendarDays,
  Columns3,
  LayoutGrid,
  NotebookPen,
  Plus,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FacebookIcon,
  InstagramIcon,
  LinkedInIcon,
  TikTokIcon,
} from '@/components/icons/SocialBrandIcons';
import { useLanguage } from '@/lib/i18n';
import OptimizedImage from '@/components/ui/OptimizedImage';
import {
  ltAccent,
  ltCta,
  ltEyebrow,
  ltHero,
  ltHeroSub,
} from '@/components/landing/landingType';

/** Mirrors live Content Planner: Progress / Calendar / Feed / Notes. */
type PlannerView = 'progress' | 'calendar' | 'feed' | 'notes';
type ChannelFilter = 'all' | 'instagram' | 'facebook' | 'tiktok' | 'linkedin';
type CalMode = 'month' | 'week' | 'day' | 'list';

const AVATAR =
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=96&h=96&fit=crop&q=80';

type PostChip = {
  day: number;
  label: string;
  platform: Exclude<ChannelFilter, 'all'>;
};

const DEMO_POSTS: PostChip[] = [
  { day: 1, label: 'Month kickoff reel', platform: 'tiktok' },
  { day: 2, label: 'Brand mood board', platform: 'instagram' },
  { day: 3, label: 'Launch teaser reel', platform: 'tiktok' },
  { day: 3, label: 'Founder note', platform: 'linkedin' },
  { day: 4, label: 'Product tip carousel', platform: 'instagram' },
  { day: 5, label: 'Studio flatlay car…', platform: 'instagram' },
  { day: 5, label: 'Save-the-date', platform: 'facebook' },
  { day: 6, label: 'POV: desk setup', platform: 'tiktok' },
  { day: 7, label: 'Sunday reset', platform: 'instagram' },
  { day: 8, label: 'Community Q&A', platform: 'facebook' },
  { day: 9, label: 'Thread: pricing', platform: 'linkedin' },
  { day: 10, label: 'UGC stitch', platform: 'tiktok' },
  { day: 11, label: '3 hooks that convert', platform: 'tiktok' },
  { day: 11, label: 'Story poll', platform: 'instagram' },
  { day: 12, label: 'Carousel: 5 CTAs', platform: 'instagram' },
  { day: 13, label: 'Live reminder', platform: 'facebook' },
  { day: 14, label: 'Client win case', platform: 'linkedin' },
  { day: 15, label: 'Mid-month reel', platform: 'tiktok' },
  { day: 15, label: 'Flatlay drop', platform: 'instagram' },
  { day: 16, label: 'Thought leadership', platform: 'linkedin' },
  { day: 17, label: 'BTS clip', platform: 'tiktok' },
  { day: 18, label: 'How-to carousel', platform: 'instagram' },
  { day: 19, label: 'Behind the scenes', platform: 'instagram' },
  { day: 19, label: 'Event invite', platform: 'facebook' },
  { day: 20, label: 'Newsletter tease', platform: 'linkedin' },
  { day: 21, label: 'Weekend vibe', platform: 'tiktok' },
  { day: 22, label: 'Packaging ASMR', platform: 'instagram' },
  { day: 23, label: 'Weekly roundup', platform: 'facebook' },
  { day: 24, label: 'FAQ reel', platform: 'tiktok' },
  { day: 25, label: 'Testimonial car…', platform: 'instagram' },
  { day: 26, label: 'Collab announce', platform: 'linkedin' },
  { day: 27, label: 'Live recap', platform: 'facebook' },
  { day: 28, label: 'Soft CTA story', platform: 'instagram' },
  { day: 29, label: 'Trend stitch', platform: 'tiktok' },
  { day: 30, label: 'Month wrap', platform: 'instagram' },
];

/** Editorial chips — sand paper, no pink leftovers. */
const PLATFORM_CHIP: Record<
  Exclude<ChannelFilter, 'all'>,
  { bg: string; Icon: typeof InstagramIcon }
> = {
  instagram: {
    bg: 'bg-[#F0EFEA] text-[#2C2621] border-[#E6E3DB]',
    Icon: InstagramIcon,
  },
  facebook: {
    bg: 'bg-[#F0EFEA] text-[#2C2621] border-[#E6E3DB]',
    Icon: FacebookIcon,
  },
  tiktok: {
    bg: 'bg-[#E6E3DB]/70 text-[#2C2621] border-[#E6E3DB]',
    Icon: TikTokIcon,
  },
  linkedin: {
    bg: 'bg-[#E6E3DB]/50 text-[#2C2621] border-[#E6E3DB]',
    Icon: LinkedInIcon,
  },
};

const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

/** Brand lifestyle stills for Progress cards + Feed Grid reels. */
const BRAND_THUMBS = [
  '/landing/planner-demo/pearl-back.png',
  '/landing/planner-demo/cafe-ring.png',
  '/landing/planner-demo/beach-editorial.png',
  '/landing/planner-demo/car-rings.png',
  '/landing/planner-demo/floral-still.png',
  '/landing/planner-demo/essentials-tray.png',
  '/landing/planner-demo/brass-vases.png',
  '/landing/planner-demo/coffee-cup.png',
  '/landing/planner-demo/tank-selfie.png',
] as const;

const FEED_THUMBS = [
  BRAND_THUMBS[0],
  BRAND_THUMBS[1],
  BRAND_THUMBS[2],
  '/landing/planner-demo/desk-laptop.png',
  BRAND_THUMBS[4],
  BRAND_THUMBS[5],
  BRAND_THUMBS[6],
  BRAND_THUMBS[7],
  BRAND_THUMBS[8],
  BRAND_THUMBS[3],
  '/landing/planner-demo/oysters-dinner.png',
  '/landing/planner-demo/vanity-flatlay.png',
];

/** Day cells for September 2026 (Tue start → pad from Sunday). */
function september2026Cells() {
  const startPad = 2;
  const daysInMonth = 30;
  const cells: (number | null)[] = [
    ...Array.from({ length: startPad }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

/** Interactive planner mockup — mirrors current editorial Content Planner. */
export function HeroPlannerMockup() {
  const [activeView, setActiveView] = useState<PlannerView>('progress');
  const [channel, setChannel] = useState<ChannelFilter>('all');
  const [calMode, setCalMode] = useState<CalMode>('month');
  const cells = useMemo(() => september2026Cells(), []);

  const viewTabs: {
    key: PlannerView;
    label: string;
    icon: typeof CalendarDays;
  }[] = [
    { key: 'progress', label: 'Progress', icon: Columns3 },
    { key: 'calendar', label: 'Calendar', icon: CalendarDays },
    { key: 'feed', label: 'Feed Grid', icon: LayoutGrid },
    { key: 'notes', label: 'Notes', icon: NotebookPen },
  ];

  const channels: {
    key: ChannelFilter;
    label: string;
    Icon?: typeof InstagramIcon;
  }[] = [
    { key: 'all', label: 'All' },
    { key: 'instagram', label: 'Instagram', Icon: InstagramIcon },
    { key: 'facebook', label: 'Facebook', Icon: FacebookIcon },
    { key: 'tiktok', label: 'TikTok', Icon: TikTokIcon },
    { key: 'linkedin', label: 'LinkedIn', Icon: LinkedInIcon },
  ];

  const posts = useMemo(
    () => DEMO_POSTS.filter((p) => channel === 'all' || p.platform === channel),
    [channel]
  );

  const progressColumns: {
    title: string;
    cards: { title: string; image?: string }[];
  }[] = [
    {
      title: 'Ideas',
      cards: [
        { title: 'Reel hook bank' },
        { title: 'Carousel outline' },
        { title: 'Community prompt' },
      ],
    },
    {
      title: 'In production',
      cards: [
        {
          title: 'Pearl back drape',
          image: BRAND_THUMBS[0],
        },
        {
          title: 'Cafe ring flatlay',
          image: BRAND_THUMBS[1],
        },
        {
          title: 'Floral still life',
          image: BRAND_THUMBS[4],
        },
        {
          title: 'Essentials tray',
          image: BRAND_THUMBS[5],
        },
      ],
    },
    {
      title: 'Review',
      cards: [
        {
          title: 'Coastal lookbook',
          image: BRAND_THUMBS[2],
        },
        {
          title: 'Silver stack shoot',
          image: BRAND_THUMBS[3],
        },
      ],
    },
    {
      title: 'Scheduled',
      cards: [
        {
          title: 'Morning routine',
          image: '/landing/planner-demo/vanity-flatlay.png',
        },
        {
          title: 'CTA carousel',
          image: '/landing/planner-demo/oysters-dinner.png',
        },
        {
          title: 'Weekly roundup',
          image: '/landing/planner-demo/brass-vases.png',
        },
      ],
    },
  ];

  return (
    <div
      id="planner-demo"
      className="relative rounded-xl sm:rounded-3xl border border-[#E6E3DB] bg-white shadow-[0_24px_80px_-24px_rgba(44,38,33,0.12)] overflow-hidden"
    >
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 px-3 sm:px-5 pt-4 pb-3 border-b border-[#E6E3DB] bg-[#F9F8F6]">
        <div className="min-w-0">
          <p className="font-inter text-[10px] font-medium uppercase tracking-[0.16em] text-[#8A857D]">
            Content Planner
          </p>
          <h3 className="font-playfair font-medium text-[22px] sm:text-[26px] text-[#2C2621] tracking-tight leading-none mt-1">
            Planner
          </h3>
          <p className="mt-1.5 font-inter text-xs text-[#8A857D] truncate">
            Clikd Studio · @clikd
          </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center justify-center gap-1.5 h-10 min-h-[40px] px-4 rounded-xl bg-[#2C3B2E] hover:bg-[#243228] text-[#F9F8F6] text-[12px] font-inter font-medium transition-colors self-start sm:self-auto"
        >
          <Plus size={14} strokeWidth={2.5} />
          Create post
        </button>
      </div>

      {/* Platform filters + view tabs */}
      <div className="flex flex-col gap-2.5 px-3 sm:px-5 py-3 border-b border-[#E6E3DB] bg-[#F9F8F6]/80">
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none justify-start sm:justify-end">
          {channels.map(({ key, label, Icon }) => {
            const active = channel === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setChannel(key)}
                className={`inline-flex items-center gap-1.5 h-9 min-h-[36px] px-3.5 rounded-xl text-xs whitespace-nowrap flex-shrink-0 transition-colors font-inter font-medium ${
                  active
                    ? 'bg-[#2C3B2E] text-[#F9F8F6]'
                    : 'bg-white text-[#8A857D] border border-[#E6E3DB] hover:bg-[#F0EFEA]'
                }`}
              >
                {Icon ? (
                  <Icon size={12} className={active ? 'text-[#F9F8F6]' : undefined} />
                ) : null}
                {label}
              </button>
            );
          })}
        </div>

        <div className="inline-flex w-full sm:w-auto sm:ml-auto p-0.5 rounded-xl border border-[#E6E3DB] bg-white overflow-x-auto scrollbar-none">
          {viewTabs.map(({ key, label, icon: Icon }) => {
            const active = activeView === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setActiveView(key)}
                className={`inline-flex items-center gap-1.5 h-9 min-h-[36px] px-3 rounded-[10px] text-[11px] font-inter font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
                  active
                    ? 'bg-[#F9F8F6] text-[#2C2621] border border-[#E6E3DB]'
                    : 'text-[#8A857D] hover:text-[#2C2621]'
                }`}
              >
                <Icon size={13} strokeWidth={2} />
                <span className="hidden sm:inline">{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* View body — fixed height so Progress / Calendar / Feed / Notes match */}
      <div className="p-3 sm:p-4 bg-white min-h-[560px] sm:min-h-[640px]">
        <AnimatePresence mode="wait">
          {activeView === 'progress' ? (
            <motion.div
              key="progress"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
              className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 h-full min-h-[520px] sm:min-h-[600px]"
            >
              {progressColumns.map((col) => (
                <div
                  key={col.title}
                  className="rounded-xl border border-[#E6E3DB] bg-[#F9F8F6] p-2.5 h-full min-h-[520px] sm:min-h-[600px]"
                >
                  <p className="font-playfair text-[13px] font-medium text-[#2C2621] mb-2 px-1">
                    {col.title}
                    <span className="ml-1.5 font-inter text-[10px] text-[#8A857D]">
                      {col.cards.length}
                    </span>
                  </p>
                  <div className="space-y-2">
                    {col.cards.map((card) => (
                      <div
                        key={card.title}
                        className="rounded-xl bg-white border border-[#E6E3DB] overflow-hidden"
                      >
                        {card.image ? (
                          <div className="relative h-16 w-full bg-[#F0EFEA]">
                            <OptimizedImage
                              src={card.image}
                              alt=""
                              fill
                              sizes="160px"
                              className="object-cover"
                            />
                          </div>
                        ) : null}
                        <div className="px-2.5 py-2">
                          <p className="text-[11px] font-inter font-medium text-[#2C2621] leading-snug">
                            {card.title}
                          </p>
                          <p className="text-[9px] text-[#8A857D] mt-1 font-inter">@clikd</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </motion.div>
          ) : null}

          {activeView === 'calendar' ? (
            <motion.div
              key="calendar"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
            >
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="inline-flex p-0.5 rounded-xl bg-white border border-[#E6E3DB]">
                  {(['month', 'week', 'day', 'list'] as CalMode[]).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setCalMode(mode)}
                      className={`h-8 min-h-[32px] px-3 rounded-lg text-[10px] font-inter font-medium capitalize transition-colors ${
                        calMode === mode
                          ? 'bg-[#F9F8F6] text-[#2C2621] border border-[#E6E3DB]'
                          : 'text-[#8A857D] hover:text-[#2C2621]'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] font-inter font-medium text-[#8A857D] hidden sm:block">
                  September 2026
                </p>
              </div>

              <div className="grid grid-cols-7 gap-px rounded-xl overflow-hidden border border-[#E6E3DB] bg-[#E6E3DB]">
                {WEEKDAYS.map((d) => (
                  <div
                    key={d}
                    className="bg-[#F9F8F6] px-1 py-1.5 text-center text-[9px] font-mono font-medium uppercase tracking-wider text-[#8A857D]"
                  >
                    {d}
                  </div>
                ))}
                {cells.map((day, idx) => {
                  const dayPosts = day ? posts.filter((p) => p.day === day) : [];
                  const isToday = day === 15;
                  return (
                    <div
                      key={idx}
                      className={`min-h-[88px] sm:min-h-[100px] bg-white p-1 sm:p-1.5 ${
                        !day ? 'bg-[#F9F8F6]/80' : ''
                      }`}
                    >
                      {day ? (
                        <>
                          <div className="flex items-center justify-between mb-1">
                            {isToday ? (
                              <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-md bg-[#2C3B2E] text-[9px] font-inter font-medium text-[#F9F8F6]">
                                {day}
                              </span>
                            ) : (
                              <span className="text-[10px] font-inter font-medium text-[#8A857D] tabular-nums">
                                {day}
                              </span>
                            )}
                          </div>
                          <div className="space-y-0.5">
                            {dayPosts.slice(0, 3).map((post) => {
                              const meta = PLATFORM_CHIP[post.platform];
                              const Icon = meta.Icon;
                              return (
                                <div
                                  key={`${post.day}-${post.label}`}
                                  className={`flex items-center gap-0.5 rounded-md border px-1 py-0.5 ${meta.bg}`}
                                >
                                  <Icon size={9} className="flex-shrink-0" />
                                  <span className="text-[8px] sm:text-[9px] font-inter font-medium truncate leading-tight">
                                    {post.label}
                                  </span>
                                </div>
                              );
                            })}
                            {dayPosts.length > 3 ? (
                              <p className="text-[8px] font-inter font-medium text-[#8A857D] px-0.5">
                                +{dayPosts.length - 3} more
                              </p>
                            ) : null}
                          </div>
                        </>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          ) : null}

          {activeView === 'feed' ? (
            <motion.div
              key="feed"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
              className="grid grid-cols-3 gap-2 max-w-md sm:max-w-lg mx-auto"
            >
              {FEED_THUMBS.slice(0, 12).map((src, i) => (
                <div
                  key={`${src}-${i}`}
                  className="aspect-square rounded-xl border border-[#E6E3DB] overflow-hidden bg-[#F0EFEA] relative"
                >
                  <OptimizedImage
                    src={src}
                    alt=""
                    fill
                    sizes="160px"
                    className="object-cover"
                  />
                  {i % 4 === 0 ? (
                    <span className="absolute top-1.5 left-1.5 inline-flex h-5 items-center rounded-md bg-[#2C3B2E]/90 px-1.5 text-[8px] font-inter font-medium text-[#F9F8F6]">
                      Reel
                    </span>
                  ) : null}
                </div>
              ))}
            </motion.div>
          ) : null}

          {activeView === 'notes' ? (
            <motion.div
              key="notes"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
              className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl h-full min-h-[520px] sm:min-h-[600px]"
            >
              {[
                {
                  title: 'September campaign',
                  body: 'Hook bank + 3 carousel scripts for the launch week. Keep CTAs soft.',
                },
                {
                  title: 'Brand voice',
                  body: 'Calm, precise, Nordic. Prefer short lines. No hype words.',
                },
                {
                  title: 'Shoot list',
                  body: 'Desk flatlay, product detail, community stills, B-roll walk.',
                },
                {
                  title: 'Collab ideas',
                  body: 'Two guest creators for Q&A live — schedule mid-month.',
                },
              ].map((note) => (
                <div
                  key={note.title}
                  className="rounded-xl border border-[#E6E3DB] bg-[#F9F8F6] p-4 h-full min-h-[240px]"
                >
                  <p className="font-playfair text-[15px] font-medium text-[#2C2621]">
                    {note.title}
                  </p>
                  <p className="mt-2 text-[12px] font-inter text-[#8A857D] leading-relaxed">
                    {note.body}
                  </p>
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
export function HeroSection({
  /** On the waitlist home, CTAs scroll to signup / product instead of onboarding. */
  waitlistCtas = false,
}: {
  waitlistCtas?: boolean;
} = {}) {
  const { t } = useLanguage();

  return (
    <section className="relative overflow-hidden bg-[#F9F8F6]">
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-16 sm:pt-20 lg:pt-24 pb-16 sm:pb-20">
        <div className="max-w-3xl mx-auto text-center">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className={`${ltEyebrow} mb-3`}
          >
            {t('hero.badge')}
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.06 }}
            className={`mt-6 ${ltHero} text-center`}
          >
            <span className="block text-[#2C2621]">{t('hero.headline1')}</span>
            <span className={`block ${ltAccent}`}>{t('hero.headline2')}</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.12 }}
            className={`${ltHeroSub} font-inter`}
          >
            {t('hero.sub')}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.18 }}
            className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3"
          >
            {waitlistCtas ? (
              <>
                <a
                  href="#waitlist"
                  className={`inline-flex items-center justify-center min-h-[48px] bg-[#2C3B2E] hover:bg-[#243228] text-[#F9F8F6] ${ltCta} px-7 py-4 rounded-xl shadow-none transition-all`}
                >
                  Join the waitlist
                </a>
                <a
                  href="#the-platform"
                  className={`inline-flex items-center justify-center min-h-[48px] bg-white hover:bg-[#F0EFEA] border border-[#E6E3DB] text-[#2C2621] ${ltCta} px-7 py-4 rounded-xl transition-all`}
                >
                  See the platform
                </a>
              </>
            ) : (
              <>
                <Link
                  href="/onboarding"
                  className={`inline-flex items-center justify-center min-h-[48px] bg-[#2C3B2E] hover:bg-[#243228] text-[#F9F8F6] ${ltCta} px-7 py-4 rounded-xl shadow-none transition-all`}
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
                  className={`inline-flex items-center justify-center min-h-[48px] bg-white hover:bg-[#F0EFEA] border border-[#E6E3DB] text-[#2C2621] ${ltCta} px-7 py-4 rounded-xl transition-all`}
                >
                  {t('hero.ctaSecondary')}
                </button>
              </>
            )}
          </motion.div>
        </div>

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
