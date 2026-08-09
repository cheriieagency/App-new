'use client';

import {
  CalendarDays,
  Image as ImageIcon,
  LineChart,
  Link2,
  Mail,
  MessageSquare,
  Tag,
  Users,
  type LucideIcon,
} from 'lucide-react';

const SUITE: {
  icon: LucideIcon;
  title: string;
  summary: string;
  badge: string;
}[] = [
  {
    icon: CalendarDays,
    title: 'Calendar & Planner',
    summary:
      'Schedule and auto-post content across your multi-brand Social Set profiles with Kanban & Calendar views.',
    badge: 'bg-indigo-50 text-indigo-600',
  },
  {
    icon: Link2,
    title: 'Bio Link Builder',
    summary:
      'Custom themes, UTM tracking, digital products, and 1-tap Swish & Vipps checkout flow.',
    badge: 'bg-purple-50 text-purple-600',
  },
  {
    icon: LineChart,
    title: 'In-depth Analytics',
    summary:
      'Growth charts, post/reel/story stats, audience demographics, and bio link sales metrics.',
    badge: 'bg-pink-50 text-pink-600',
  },
  {
    icon: Tag,
    title: 'Post Link-Tagging',
    summary:
      'Overlay product links directly on social previews and track every sale generated from content.',
    badge: 'bg-emerald-50 text-emerald-600',
  },
  {
    icon: ImageIcon,
    title: 'Central Media Hub',
    summary:
      'Store, organize, and manage all your creative assets and tagged content previews in one place.',
    badge: 'bg-cyan-50 text-cyan-600',
  },
  {
    icon: MessageSquare,
    title: 'Unified Social Inbox',
    summary:
      'Manage DMs and comments across Instagram and TikTok profiles seamlessly from a single workspace.',
    badge: 'bg-amber-50 text-amber-600',
  },
  {
    icon: Users,
    title: 'Community & Members',
    summary:
      'Member feeds, moderation tools, classroom courses, storefront, live events, and XP leaderboards.',
    badge: 'bg-rose-50 text-rose-600',
  },
  {
    icon: Mail,
    title: 'Email CRM & Broadcasts',
    summary:
      'Subscriber directory, automated email broadcasts, tags, and engagement analytics for every brand workspace.',
    badge: 'bg-sky-50 text-sky-600',
  },
];

/** Showcases the logged-in Creator Admin toolkit on the public landing page. */
export function PlatformSuiteSection() {
  return (
    <section className="relative py-20 sm:py-28 overflow-hidden bg-gradient-to-b from-slate-50 via-indigo-50/30 to-slate-100">
      <div
        className="absolute -top-20 -left-16 w-96 h-96 rounded-full bg-indigo-400/10 blur-3xl pointer-events-none"
        aria-hidden
      />
      <div
        className="absolute bottom-0 right-0 w-80 h-80 rounded-full bg-pink-400/10 blur-3xl pointer-events-none"
        aria-hidden
      />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6">
        <div className="max-w-2xl mb-12">
          <p className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-[0.16em] text-indigo-600 mb-3">
            ⚡ Creator Admin
          </p>
          <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-slate-900 tracking-tight leading-tight">
            Your Complete{' '}
            <span className="bg-gradient-to-r from-purple-600 via-fuchsia-500 to-pink-500 bg-clip-text text-transparent">
              Creator Command Center
            </span>
          </h2>
          <p className="mt-4 text-slate-600 font-medium text-base sm:text-lg leading-relaxed">
            Everything you need after login: social planning, bio link storefront, inbox, advanced
            analytics, community, and email CRM — in one unified dashboard.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {SUITE.map(({ icon: Icon, title, summary, badge }) => (
            <article
              key={title}
              className="bg-white/90 backdrop-blur-md border border-slate-200/90 rounded-3xl p-6 hover:-translate-y-1 hover:shadow-xl hover:border-indigo-400 transition-all duration-300 min-h-[11.5rem] flex flex-col"
            >
              <div
                className={`w-11 h-11 rounded-2xl flex items-center justify-center mb-4 ${badge}`}
              >
                <Icon size={20} strokeWidth={2.25} aria-hidden />
              </div>
              <h3 className="font-display font-extrabold text-base text-slate-900 mb-1.5 tracking-tight">
                {title}
              </h3>
              <p className="text-sm font-medium text-slate-600 leading-relaxed flex-1">{summary}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
