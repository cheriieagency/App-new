'use client';

import Link from 'next/link';
import {
  BookOpen,
  Heart,
  LineChart,
  Search,
  Sparkles,
  Users,
  Wallet,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import {
  CommunitySearchAutocomplete,
  type SearchableCommunity,
} from '@/components/landing/CommunitySearchAutocomplete';
import { useLanguage } from '@/lib/locale-context';
import { t, type TranslationKey } from '@/lib/i18n';
import {
  ltAccent,
  ltCardTitle,
  ltCardTitleLg,
  ltCta,
  ltEyebrow,
  ltGradientPanel,
  ltSection,
  ltSectionSub,
} from '@/components/landing/landingType';

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

const CATEGORY_PILLS: { labelKey: TranslationKey; filter: string; icon: LucideIcon }[] = [
  { labelKey: 'allCategoriesPill', filter: '', icon: Sparkles },
  { labelKey: 'catMarketing', filter: 'Marketing', icon: LineChart },
  { labelKey: 'catHealth', filter: 'Health', icon: Heart },
  { labelKey: 'catFinance', filter: 'Finance', icon: Wallet },
  { labelKey: 'catCoaching', filter: 'Coaching', icon: Users },
];

const COVER_TONES = ['bg-[#2B2568]', 'bg-[#0F172A]', 'bg-[#1a1848]'] as const;

function formatMembers(count: number, locale: string) {
  return count.toLocaleString(locale === 'en' ? 'en-US' : 'sv-SE');
}

function categoryTag(raw: string, locale: Parameters<typeof t>[1]) {
  const c = raw.toLowerCase();
  if (c.includes('market') || c.includes('marknads')) return t('catMarketing', locale);
  if (c.includes('health') || c.includes('hälsa') || c.includes('fitness')) return t('catHealth', locale);
  if (c.includes('e-handel') || c.includes('ecom') || c.includes('e-com') || c.includes('financ') || c.includes('ekonomi'))
    return t('catFinance', locale);
  if (c.includes('coach')) return t('catCoaching', locale);
  return raw || t('navCommunities', locale);
}

function isCategoryActive(searchQuery: string, filter: string) {
  if (!filter) return !searchQuery.trim();
  return searchQuery.trim().toLowerCase() === filter.toLowerCase();
}

/** Prefer an explicitly featured community, else the first available. */
function resolveFeatured(
  featured: CommunityCard | null | undefined,
  all: CommunityCard[]
): CommunityCard | null {
  return featured ?? all.find((c) => c.is_featured) ?? all[0] ?? null;
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
  const { locale } = useLanguage();
  const hero = resolveFeatured(featured, allCommunities);
  const trending = (searchQuery.trim() ? communities : allCommunities).slice(0, 3);

  return (
    <section
      id="communities"
      className="relative py-16 sm:py-24 scroll-mt-20 overflow-visible bg-[#FAFAFA]"
      aria-labelledby="communities-heading"
    >
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 overflow-visible">
        {/* Header + search */}
        <div className="relative z-20 mb-8 flex flex-col gap-5">
          <div className="max-w-2xl">
            <p className={`${ltEyebrow} mb-3`}>{t('discoverExplore', locale)}</p>
            <h2 id="communities-heading" className={ltSection}>
              {t('findNordicCommunity', locale)}{' '}
              <span className={ltAccent}>{t('findNordicCommunityAccent', locale)}</span>
            </h2>
            <p className={ltSectionSub}>{t('discoverSub', locale)}</p>
          </div>
          <CommunitySearchAutocomplete
            value={searchQuery}
            onChange={onSearchChange}
            communities={allCommunities}
            onSelectCommunity={onSelectCommunity}
            isLoading={isSearchLoading}
            placeholder={t('searchCommunities', locale)}
          />
        </div>

        {/* Category pills */}
        <div className="flex flex-wrap gap-2 mb-10">
          {CATEGORY_PILLS.map((cat) => {
            const active = isCategoryActive(searchQuery, cat.filter);
            const Icon = cat.icon;
            return (
              <button
                key={cat.labelKey}
                type="button"
                onClick={() => onSearchChange(active && cat.filter ? '' : cat.filter)}
                className={
                  active
                    ? 'inline-flex items-center gap-1.5 bg-[#1a1848] text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-sm min-h-[44px]'
                    : 'inline-flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs px-4 py-2.5 rounded-xl border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.03)] min-h-[44px]'
                }
              >
                <Icon size={14} className={active ? 'text-[#F472B6]' : 'text-slate-400'} aria-hidden />
                {t(cat.labelKey, locale)}
              </button>
            );
          })}
        </div>

        {/* Community of the Week */}
        {hero && (
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-5">
              <p className="text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-[#F472B6]">
                {t('communityOfWeek', locale)}
              </p>
              <div className="flex-1 h-px bg-slate-200/80" />
            </div>

            <div
              className={`relative overflow-hidden rounded-2xl ${ltGradientPanel} p-6 sm:p-8 lg:p-10`}
            >
              <div className="relative grid lg:grid-cols-[1.4fr_0.7fr] gap-8 items-center">
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    <span className="inline-flex items-center text-xs font-bold bg-[#F472B6]/15 text-[#F472B6] border border-[#F472B6]/25 px-2.5 py-1 rounded-full">
                      #{categoryTag(hero.category, locale)}
                    </span>
                    <span className="inline-flex items-center text-xs font-bold text-[#2B2568] bg-white/80 border border-[#E9D5FF] px-2.5 py-1 rounded-full">
                      Sofia Bergström
                    </span>
                    <span className="inline-flex items-center text-xs font-bold bg-white/80 text-[#2B2568] border border-[#E9D5FF] px-2.5 py-1 rounded-full">
                      {t('reviewsLabel', locale)}
                    </span>
                  </div>

                  {/* Community name/description are creator content — leave untranslated */}
                  <h3 className={`${ltCardTitleLg} mb-3`}>{hero.name}</h3>
                  <p className="text-slate-600 text-sm sm:text-base leading-relaxed max-w-xl mb-6 font-display">
                    {hero.description}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 text-sm font-bold text-slate-700">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 border border-[#E9D5FF] px-3 py-1.5">
                      <Users size={14} className="text-[#F472B6]" aria-hidden />
                      {formatMembers(hero.member_count, locale)} {t('activeMembersLabel', locale)}
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 border border-[#E9D5FF] px-3 py-1.5">
                      <Zap size={14} className="text-[#F472B6]" aria-hidden />{' '}
                      {t('instantAccessBadge', locale)}
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 border border-[#E9D5FF] px-3 py-1.5">
                      <BookOpen size={14} className="text-[#2B2568]" aria-hidden />{' '}
                      {t('coursesIncluded', locale)}
                    </span>
                  </div>
                </div>

                <div className="bg-white/80 backdrop-blur-md p-5 rounded-2xl border border-[#E9D5FF] flex items-center shadow-sm">
                  <Link
                    href={`/communities/${hero.id}`}
                    className={`w-full bg-[#F472B6] hover:bg-[#F472B6]/90 text-white ${ltCta} px-6 py-3.5 rounded-xl shadow-lg shadow-[#F472B6]/25 flex items-center justify-center gap-2 min-h-[44px] transition-all active:scale-[0.98]`}
                  >
                    {t('viewCommunity', locale)} →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Trending grid */}
        <div className="flex items-center justify-between mb-5 gap-3">
          <h3 className={ltCardTitle}>
            {searchQuery
              ? `${t('searchCommunitiesHeading', locale)} “${searchQuery}”`
              : t('trendingCommunities', locale)}
          </h3>
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="text-xs font-bold text-[#F472B6] hover:text-[#2B2568] min-h-11 px-2 transition-colors"
            >
              {t('clearFilterShort', locale)}
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {trending.map((community, index) => (
            <article
              key={community.id}
              className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-[0_1px_2px_rgba(15,23,42,0.03)] hover:border-slate-300/90 hover:shadow-md transition-all duration-300 flex flex-col"
            >
              <div className={`h-24 ${COVER_TONES[index % COVER_TONES.length]} relative`}>
                <span className="absolute top-3 left-3 text-[10px] font-extrabold text-white bg-white/15 backdrop-blur px-2.5 py-1 rounded-full">
                  #{categoryTag(community.category, locale)}
                </span>
              </div>
              <div className="p-5 flex flex-col flex-1">
                <h3 className="font-outfit text-lg font-bold text-slate-900 mb-1 tracking-tight">
                  {community.name}
                </h3>
                <p className="text-sm text-slate-500 font-medium line-clamp-2 mb-4 flex-1 font-display">
                  {community.description}
                </p>
                <p className="text-xs font-bold text-slate-500 mb-4 font-mono">
                  {formatMembers(community.member_count, locale)} {t('activeMembersLabel', locale)}
                </p>
                <Link
                  href={`/communities/${community.id}`}
                  className={`inline-flex items-center justify-center gap-1.5 min-h-[44px] bg-[#0F172A] hover:bg-[#1a1848] text-white ${ltCta} px-4 py-3 rounded-xl transition-colors`}
                >
                  {t('joinArrow', locale)}
                </Link>
              </div>
            </article>
          ))}
        </div>

        {trending.length === 0 && (
          <div className="text-center py-14 bg-white border border-slate-200/80 rounded-2xl shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
            <Search size={22} className="mx-auto mb-2 text-slate-300" />
            <p className="text-slate-500 font-bold font-display">
              {t('noCommunitiesMatch', locale)} “{searchQuery}”
            </p>
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="mt-3 text-sm text-[#F472B6] font-bold hover:text-[#2B2568] min-h-11 transition-colors"
            >
              {t('showAllShort', locale)}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
