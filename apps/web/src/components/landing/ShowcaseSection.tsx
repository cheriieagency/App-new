'use client';

import Link from 'next/link';
import {
  ArrowRight,
  Globe,
  Heart,
  Sparkles,
  Star,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react';

export type CommunityCard = {
  id: number;
  name: string;
  description: string;
  category: string;
  creator_name: string;
  creator_image?: string | null;
  cover_color?: string | null;
  member_count: number;
  is_featured?: boolean;
  is_joined?: boolean;
};

const CATEGORY_PILLS = [
  { label: '#Marknadsföring', filter: 'Marketing', icon: TrendingUp, color: '#0f766e' },
  { label: '#Hälsa', filter: 'Hälsa', icon: Heart, color: '#be123c' },
  { label: '#Ekonomi', filter: 'Ekonomi', icon: Zap, color: '#b45309' },
  { label: '#Coaching', filter: 'Coaching', icon: Sparkles, color: '#0369a1' },
  { label: '#Tech', filter: 'Tech', icon: Globe, color: '#4338ca' },
];

type ShowcaseSectionProps = {
  featured?: CommunityCard | null;
  communities: CommunityCard[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  isLoggedIn: boolean;
  onJoin: (id: number) => void;
  onGoToCommunity: () => void;
  joinPending?: boolean;
};

export function ShowcaseSection({
  featured,
  communities,
  searchQuery,
  onSearchChange,
  isLoggedIn,
  onJoin,
  onGoToCommunity,
  joinPending,
}: ShowcaseSectionProps) {
  return (
    <section id="communities" className="relative bg-transparent py-20 sm:py-28 scroll-mt-20 overflow-hidden">
      <div
        className="nc-blob w-96 h-96 -right-20 top-20 opacity-50"
        style={{ background: 'var(--nc-sky)' }}
      />
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6">
      {featured && (
        <div className="mb-14">
          <div className="flex items-center gap-3 mb-8">
            <p
              className="text-xs font-extrabold uppercase tracking-[0.18em]"
              style={{ color: 'var(--nc-coral, #ff5c35)' }}
            >
              Veckans community
            </p>
            <div className="flex-1 h-px bg-zinc-100" />
          </div>

          <div
            className="relative rounded-[2rem] overflow-hidden nc-glass"
            style={{
              background: `linear-gradient(135deg, ${featured.cover_color ?? '#0f1f1c'}, #0a0a0f)`,
            }}
          >
            <div
              className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-20"
              style={{
                background: 'radial-gradient(circle, rgba(255,255,255,0.3), transparent 70%)',
                transform: 'translate(30%, -30%)',
              }}
            />
            <div className="relative p-8 sm:p-12 flex flex-col sm:flex-row items-start sm:items-center gap-8">
              <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-white/20 shadow-xl shrink-0">
                {featured.creator_image ? (
                  <img
                    src={featured.creator_image}
                    alt={featured.creator_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-white/20 flex items-center justify-center text-2xl font-black text-white">
                    {featured.name[0]}
                  </div>
                )}
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span className="text-xs font-black text-white/80 bg-white/10 px-2.5 py-1 rounded-full">
                    #{featured.category}
                  </span>
                  <span className="text-xs font-bold text-white/60">{featured.creator_name}</span>
                </div>
                <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-white mb-3 leading-tight tracking-tight">
                  {featured.name}
                </h2>
                <p className="text-white/60 text-sm sm:text-base leading-relaxed max-w-lg mb-6">
                  {featured.description}
                </p>
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Users size={14} className="text-white/50" />
                    <span className="text-sm font-bold text-white/70">
                      {featured.member_count.toLocaleString('sv-SE')} medlemmar
                    </span>
                  </div>
                  {isLoggedIn ? (
                    <button
                      type="button"
                      onClick={onGoToCommunity}
                      className="flex items-center gap-2 min-h-11 px-6 rounded-full text-sm font-extrabold text-[#0b0d10] transition-all active:scale-95"
                      style={{ background: 'var(--nc-coral, #ff5c35)' }}
                    >
                      Kika in i communityt <ArrowRight size={13} />
                    </button>
                  ) : (
                    <Link
                      href="/account/signup"
                      className="flex items-center gap-2 min-h-11 px-6 rounded-full text-sm font-extrabold text-[#0b0d10] transition-all active:scale-95"
                      style={{ background: 'var(--nc-coral, #ff5c35)' }}
                    >
                      Kika in i communityt <ArrowRight size={13} />
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Category pills */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-6">
          <h2 className="font-display text-lg font-extrabold text-[#0b0d10]">Populära kategorier</h2>
          <div className="flex-1 h-px bg-zinc-100" />
        </div>
        <div className="flex flex-wrap gap-2">
          {CATEGORY_PILLS.map((cat) => {
            const Icon = cat.icon;
            const active = searchQuery.toLowerCase() === cat.filter.toLowerCase();
            return (
              <button
                key={cat.label}
                type="button"
                onClick={() => onSearchChange(active ? '' : cat.filter)}
                className={`inline-flex items-center gap-2 min-h-11 px-4 rounded-2xl border text-sm font-black transition-all active:scale-95 ${
                  active
                    ? 'bg-zinc-900 text-white border-zinc-900'
                    : 'bg-white text-zinc-700 border-zinc-100 hover:border-zinc-200'
                }`}
              >
                <Icon size={14} style={active ? undefined : { color: cat.color }} />
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Community cards grid */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-black text-zinc-900">
            {searchQuery ? `Resultat för "${searchQuery}"` : 'Populära communities'}
          </h2>
          <span className="text-xs font-bold text-zinc-400 bg-zinc-100 px-2.5 py-1 rounded-full">
            {communities.length} st
          </span>
        </div>
        {searchQuery && (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            className="text-xs font-bold text-zinc-600 hover:text-zinc-900 transition-colors min-h-11 px-2"
          >
            Rensa filter
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {communities.map((community) => (
          <div
            key={community.id}
            className="bg-white rounded-2xl border border-zinc-100 shadow-sm hover:shadow-md transition-all overflow-hidden group"
          >
            <div
              className="h-24 relative"
              style={{
                background: `linear-gradient(135deg, ${community.cover_color ?? '#0f1f1c'}, #0a0a0f)`,
              }}
            >
              <div className="absolute top-3 left-3">
                <span className="text-[10px] font-black text-white/80 bg-white/10 backdrop-blur px-2 py-1 rounded-full">
                  #{community.category}
                </span>
              </div>
              {community.is_featured && (
                <div className="absolute top-3 right-3 flex items-center gap-1 bg-amber-400 rounded-full px-2 py-0.5">
                  <Star size={9} className="text-white" fill="currentColor" />
                  <span className="text-[9px] font-black text-white">VECKANS</span>
                </div>
              )}
              <div className="absolute -bottom-5 left-4">
                <div className="w-12 h-12 rounded-xl overflow-hidden border-2 border-white shadow-md">
                  {community.creator_image ? (
                    <img
                      src={community.creator_image}
                      alt={community.creator_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div
                      className="w-full h-full flex items-center justify-center font-black text-white text-lg"
                      style={{ backgroundColor: community.cover_color ?? '#0f1f1c' }}
                    >
                      {community.name[0]}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-8 p-4">
              <p className="text-[10px] font-bold text-zinc-400 mb-0.5">{community.creator_name}</p>
              <h3 className="font-display text-sm font-extrabold text-[#0b0d10] mb-2 group-hover:text-[var(--nc-coral,#ff5c35)] transition-colors leading-snug">
                {community.name}
              </h3>
              <p className="text-xs text-zinc-500 leading-relaxed line-clamp-2 mb-4">
                {community.description}
              </p>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1 text-zinc-400">
                  <Users size={11} />
                  <span className="text-xs font-bold">
                    {community.member_count.toLocaleString('sv-SE')}
                  </span>
                </div>
                {isLoggedIn ? (
                  community.is_joined ? (
                    <button
                      type="button"
                      onClick={onGoToCommunity}
                      className="flex items-center gap-1.5 min-h-11 px-3 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-black hover:bg-emerald-200 transition-all"
                    >
                      Kika in i communityt
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onJoin(community.id)}
                      disabled={joinPending}
                      className="flex items-center gap-1.5 min-h-11 px-3 rounded-xl bg-zinc-900 text-white text-xs font-black hover:bg-black transition-all active:scale-95 disabled:opacity-60"
                    >
                      Kika in i communityt <ArrowRight size={11} />
                    </button>
                  )
                ) : (
                  <Link
                    href="/account/signup"
                    className="flex items-center gap-1.5 min-h-11 px-3 rounded-xl bg-zinc-900 text-white text-xs font-black hover:bg-black transition-all"
                  >
                    Kika in i communityt <ArrowRight size={11} />
                  </Link>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {communities.length === 0 && (
        <div className="text-center py-16">
          <p className="text-zinc-500 font-bold">
            Inga communities hittades för &quot;{searchQuery}&quot;
          </p>
          <button
            type="button"
            onClick={() => onSearchChange('')}
            className="mt-3 text-sm text-zinc-900 font-bold hover:underline min-h-11"
          >
            Visa alla communities
          </button>
        </div>
      )}
      </div>
    </section>
  );
}
