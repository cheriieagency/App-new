'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { authClient } from '@/lib/auth-client';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { HeroSection } from '@/components/landing/HeroSection';
import { ValuePillarsSection } from '@/components/landing/ValuePillarsSection';
import { ComparisonSection } from '@/components/landing/ComparisonSection';
import { FeaturesSection } from '@/components/landing/FeaturesSection';
import { PlatformSuiteSection } from '@/components/landing/PlatformSuiteSection';
import { RoiCalculator } from '@/components/landing/RoiCalculator';
import { ShowcaseSection } from '@/components/landing/ShowcaseSection';
import { FaqSection } from '@/components/landing/FaqSection';
import { PricingSection } from '@/components/landing/PricingSection';
import { LandingFooter } from '@/components/landing/LandingFooter';
import type { SearchableCommunity } from '@/components/landing/CommunitySearchAutocomplete';
import { getMockCommunitiesForUser, normalizeCommunities } from '@/lib/mock-communities';
import { useLanguage } from '@/lib/locale-context';
import { t } from '@/lib/i18n';

function filterCommunities(list: SearchableCommunity[], query: string): SearchableCommunity[] {
  const q = query.trim().toLowerCase();
  if (!q) return list;
  const aliases: Record<string, string[]> = {
    marketing: ['marketing', 'marknads'],
    health: ['health', 'hälsa', 'fitness'],
    finance: ['finance', 'ekonomi', 'e-com', 'ecom', 'e-handel', 'ehandel'],
    coaching: ['coaching', 'coach'],
    tech: ['tech', 'design'],
  };
  return list.filter((c) => {
    const haystack = [c.name, c.category, c.creator_name, c.slug, c.description]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    if (aliases[q]) return aliases[q].some((a) => haystack.includes(a));
    return haystack.includes(q);
  });
}

export function LandingPageClient() {
  const { data: session } = authClient.useSession();
  const router = useRouter();
  const { locale } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const queryClient = useQueryClient();

  const {
    data: apiCommunities,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['communities-public'],
    queryFn: async () => {
      const res = await fetch('/api/communities');
      const data = await res.json();
      if (!res.ok || !Array.isArray(data)) {
        throw new Error(
          typeof data?.error === 'string' ? data.error : 'Failed to fetch communities'
        );
      }
      return normalizeCommunities(data);
    },
    retry: 1,
  });

  // Prefer API data; fall back to local mocks while loading or on error.
  const list = useMemo(() => {
    if (Array.isArray(apiCommunities) && apiCommunities.length > 0) return apiCommunities;
    if (isLoading || isError || !apiCommunities) {
      return getMockCommunitiesForUser({
        email: session?.user?.email,
        name: session?.user?.name,
      });
    }
    return apiCommunities;
  }, [apiCommunities, isLoading, isError, session?.user?.email, session?.user?.name]);

  const joinMutation = useMutation({
    mutationFn: async ({ id, action }: { id: number; action: 'join' | 'leave' }) => {
      const res = await fetch('/api/communities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ community_id: id, action }),
      });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['communities-public'] }),
  });

  const featured = list.find((c) => c.is_featured) ?? list[0] ?? null;
  const filtered = filterCommunities(list, searchQuery);

  const handleSelectCommunity = (community: SearchableCommunity) => {
    router.push(`/communities/${community.id}`);
  };

  return (
    <div className="nc-landing min-h-screen bg-[#FAFAFA]">
      <LandingHeader isLoggedIn={!!session} />
      <HeroSection />
      <ValuePillarsSection />
      <PlatformSuiteSection />
      <FeaturesSection />
      <ComparisonSection />
      <RoiCalculator />
      <PricingSection />
      <ShowcaseSection
        featured={featured}
        allCommunities={list}
        communities={filtered}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSelectCommunity={handleSelectCommunity}
        isSearchLoading={isLoading && !apiCommunities}
        isLoggedIn={!!session}
        onJoin={(id) =>
          joinMutation.mutate(
            { id, action: 'join' },
            { onSuccess: () => router.push('/dashboard') }
          )
        }
        onGoToCommunity={() => router.push('/dashboard')}
        joinPending={joinMutation.isPending}
      />
      <FaqSection />

      <section className="relative py-16 sm:py-24 text-center overflow-hidden bg-[#FAFAFA]">
        <div className="relative max-w-2xl mx-auto px-4 sm:px-6">
          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-[0_1px_2px_rgba(15,23,42,0.03)] py-12 px-6 sm:px-10">
            <p className="text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-[#F472B6] mb-3">
              {t('getStartedEyebrow', locale)}
            </p>
            <h2 className="font-outfit font-extrabold text-3xl sm:text-4xl text-slate-900 mb-4 leading-tight tracking-tight">
              {t('landingReadyHeadline', locale)}
            </h2>
            <p className="text-slate-600 mb-9 text-base sm:text-lg font-medium font-display leading-relaxed">
              {t('landingReadySub', locale)}
            </p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <Link
                href="/account/signup"
                className="flex items-center gap-2 min-h-12 px-8 rounded-xl font-extrabold text-sm text-white bg-[#F472B6] hover:bg-[#F472B6]/90 shadow-lg shadow-[#F472B6]/25 transition-all active:scale-[0.98]"
              >
                {t('landingCtaStartFree', locale)} <ArrowRight size={14} />
              </Link>
              <button
                type="button"
                onClick={() =>
                  document.getElementById('communities')?.scrollIntoView({ behavior: 'smooth' })
                }
                className="flex items-center gap-2 min-h-12 px-8 rounded-xl bg-white border border-slate-200/80 text-slate-800 font-bold text-sm hover:bg-slate-50 hover:border-slate-300 transition-all"
              >
                {t('landingCtaExplore', locale)}
              </button>
            </div>
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}
