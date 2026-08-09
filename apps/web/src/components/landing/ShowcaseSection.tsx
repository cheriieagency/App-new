'use client';

import Link from 'next/link';
import { BookOpen, Search, Zap } from 'lucide-react';
import {
  CommunitySearchAutocomplete,
  type SearchableCommunity,
} from '@/components/landing/CommunitySearchAutocomplete';

export type CommunityCard = SearchableCommunity;

type ShowcaseSectionProps = {
  featured?: CommunityCard | null;
  allCommunities: CommunityCard[];
  communities: CommunityCard[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSelectCommunity: (community: CommunityCard) => void;
  isLoggedIn: boolean;
  onJoin: (id: number) => void;
  onGoToCommunity: () => void;
  joinPending?: boolean;
  isSearchLoading?: boolean;
};

const CATEGORY_PILLS = [
  { label: '✨ All Categories', filter: '' },
  { label: '📈 Marketing', filter: 'Marketing' },
  { label: '💓 Health & Fitness', filter: 'Health' },
  { label: '💳 Finance & E-com', filter: 'Finance' },
  { label: '🧠 Coaching', filter: 'Coaching' },
] as const;

const COVER_GRADIENTS = [
  'from-indigo-500 via-violet-500 to-purple-600',
  'from-sky-500 via-blue-500 to-indigo-600',
  'from-emerald-500 via-teal-500 to-cyan-600',
];

function formatMembers(count: number) {
  return count.toLocaleString('en-US');
}

function priceLabel(community: CommunityCard) {
  const price = community.monthly_price ?? community.price ?? 199;
  return `${price.toLocaleString('sv-SE')} SEK / mo`;
}

function categoryTag(raw: string) {
  const c = raw.toLowerCase();
  if (c.includes('market') || c.includes('marknads')) return 'Marknadsföring';
  if (c.includes('health') || c.includes('hälsa') || c.includes('fitness')) return 'Health';
  if (c.includes('e-handel') || c.includes('ecom') || c.includes('e-com')) return 'E-handel';
  if (c.includes('financ') || c.includes('ekonomi')) return 'Finance';
  if (c.includes('coach')) return 'Coaching';
  return raw || 'Community';
}

function isCategoryActive(searchQuery: string, filter: string) {
  if (!filter) return !searchQuery.trim();
  return searchQuery.trim().toLowerCase() === filter.toLowerCase();
}

/** Prefer the curated Nordic Creator Hub for the hero card when present. */
function resolveFeatured(
  featured: CommunityCard | null | undefined,
  all: CommunityCard[]
): CommunityCard | null {
  const hub = all.find((c) => c.slug === 'nordic-creator' || c.name === 'Nordic Creator Hub');
  return hub ?? featured ?? all.find((c) => c.is_featured) ?? all[0] ?? null;
}

export function ShowcaseSection({
  featured,
  allCommunities,
  communities,
  searchQuery,
  onSearchChange,
  onSelectCommunity,
  isSearchLoading = false,
}: ShowcaseSectionProps) {
  const hero = resolveFeatured(featured, allCommunities);
  const trending = (searchQuery.trim() ? communities : allCommunities).slice(0, 3);

  return (
    <section
      id="communities"
      className="relative py-20 sm:py-28 scroll-mt-20 overflow-visible bg-gradient-to-b from-slate-50 via-indigo-50/30 to-slate-100"
    >
      <div
        className="absolute -top-16 -right-20 w-96 h-96 rounded-full bg-indigo-400/10 blur-3xl pointer-events-none"
        aria-hidden
      />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 overflow-visible">
        {/* Header + search */}
        <div className="relative z-20 mb-8 flex flex-col gap-5">
          <div className="max-w-2xl">
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-indigo-600 mb-3">
              ⚡ Discover & Explore
            </p>
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
              Find Your Next{' '}
              <span className="bg-gradient-to-r from-purple-600 via-fuchsia-500 to-pink-500 bg-clip-text text-transparent">
                Nordic Community
              </span>
            </h2>
            <p className="mt-3 text-slate-600 font-medium text-base sm:text-lg leading-relaxed">
              Explore high-value communities, masterclasses, and digital hubs created by leading
              creators across Scandinavia.
            </p>
          </div>
          <CommunitySearchAutocomplete
            value={searchQuery}
            onChange={onSearchChange}
            communities={allCommunities}
            onSelectCommunity={onSelectCommunity}
            isLoading={isSearchLoading}
            placeholder="Search topics, creators..."
          />
        </div>

        {/* Category pills */}
        <div className="flex flex-wrap gap-2 mb-10">
          {CATEGORY_PILLS.map((cat) => {
            const active = isCategoryActive(searchQuery, cat.filter);
            return (
              <button
                key={cat.label}
                type="button"
                onClick={() => onSearchChange(active && cat.filter ? '' : cat.filter)}
                className={
                  active
                    ? 'bg-indigo-600 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md min-h-[44px]'
                    : 'bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs px-4 py-2.5 rounded-xl border border-slate-200/90 shadow-sm min-h-[44px]'
                }
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Community of the Week — dark glass hero */}
        {hero && (
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-5">
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-indigo-600">
                Community of the Week
              </p>
              <div className="flex-1 h-px bg-slate-200/80" />
            </div>

            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 lg:p-10 shadow-2xl border border-slate-800">
              <div
                className="absolute -right-12 -top-12 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"
                aria-hidden
              />

              <div className="relative grid lg:grid-cols-[1.4fr_0.7fr] gap-8 items-center">
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    <span className="inline-flex items-center text-xs font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 px-2.5 py-1 rounded-full">
                      #{categoryTag(hero.category)}
                    </span>
                    <span className="inline-flex items-center text-xs font-bold text-slate-200 bg-white/5 border border-white/10 px-2.5 py-1 rounded-full">
                      Sofia Bergström ✔️
                    </span>
                    <span className="inline-flex items-center text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/20 px-2.5 py-1 rounded-full">
                      ⭐ 4.9 (128 Reviews)
                    </span>
                  </div>

                  <h3 className="font-display text-2xl sm:text-3xl font-extrabold text-white mb-3 leading-tight tracking-tight">
                    Nordic Creator Hub
                  </h3>
                  <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-xl mb-6">
                    The ultimate community for Nordic digital creators & educators. Weekly live
                    Q&As, course library, Swish funnel templates, and private member chat.
                  </p>

                  <div className="flex flex-wrap items-center gap-3 text-sm font-bold text-slate-200">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 border border-white/10 px-3 py-1.5">
                      👥 1,340 Active Members
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 border border-white/10 px-3 py-1.5">
                      <Zap size={14} className="text-amber-300" /> Instant Swish Access
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 border border-white/10 px-3 py-1.5">
                      <BookOpen size={14} className="text-sky-300" /> 12 Courses Included
                    </span>
                  </div>
                </div>

                <div className="bg-white/10 backdrop-blur-md p-5 rounded-2xl border border-white/10">
                  <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-300 mb-2">
                    Membership Fee
                  </p>
                  <p className="font-display font-extrabold text-3xl text-white mb-1 tracking-tight">
                    199 <span className="text-base font-bold text-slate-300">SEK / mo</span>
                  </p>
                  <p className="text-xs font-medium text-slate-400 mb-5">Cancel anytime · Swish ready</p>
                  <Link
                    href={`/communities/${hero.id}`}
                    className="bg-gradient-to-r from-pink-500 via-rose-500 to-pink-600 hover:opacity-95 text-white font-bold text-xs px-6 py-3.5 rounded-xl shadow-lg shadow-pink-500/25 flex items-center justify-center gap-2 min-h-[44px] transition-all"
                  >
                    View Community →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Trending grid */}
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display text-lg font-extrabold text-slate-900">
            {searchQuery ? `Results for “${searchQuery}”` : 'Trending Communities'}
          </h3>
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 min-h-11 px-2"
            >
              Clear filter
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {trending.map((community, index) => (
            <article
              key={community.id}
              className="bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-3xl overflow-hidden shadow-sm hover:-translate-y-1 hover:shadow-xl transition-all duration-300 flex flex-col"
            >
              <div
                className={`h-24 bg-gradient-to-br ${COVER_GRADIENTS[index % COVER_GRADIENTS.length]} relative`}
              >
                <span className="absolute top-3 left-3 text-[10px] font-extrabold text-white bg-white/20 backdrop-blur px-2.5 py-1 rounded-full">
                  #{categoryTag(community.category)}
                </span>
              </div>
              <div className="p-5 flex flex-col flex-1">
                <h3 className="font-display text-base font-extrabold text-slate-900 mb-1 tracking-tight">
                  {community.name}
                </h3>
                <p className="text-xs text-slate-500 font-medium line-clamp-2 mb-4 flex-1">
                  {community.description}
                </p>
                <div className="flex items-center justify-between gap-2 mb-4">
                  <span className="inline-flex items-center rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 px-2.5 py-1 text-[11px] font-extrabold">
                    {priceLabel(community)}
                  </span>
                  <span className="text-[11px] font-bold text-slate-500">
                    {formatMembers(community.member_count)} Active Members
                  </span>
                </div>
                <Link
                  href={`/communities/${community.id}`}
                  className="inline-flex items-center justify-center gap-1.5 min-h-[44px] bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-3 rounded-xl transition-colors"
                >
                  Join →
                </Link>
              </div>
            </article>
          ))}
        </div>

        {trending.length === 0 && (
          <div className="text-center py-14 bg-white/70 border border-slate-200/90 rounded-3xl">
            <Search size={22} className="mx-auto mb-2 text-slate-300" />
            <p className="text-slate-500 font-bold">No communities match “{searchQuery}”</p>
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="mt-3 text-sm text-indigo-600 font-bold hover:underline min-h-11"
            >
              Show all
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
