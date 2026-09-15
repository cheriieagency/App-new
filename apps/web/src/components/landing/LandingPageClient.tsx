'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { authClient } from '@/lib/auth-client';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { HeroSection } from '@/components/landing/HeroSection';
import { ComparisonSection } from '@/components/landing/ComparisonSection';
import { PlatformSuiteSection } from '@/components/landing/PlatformSuiteSection';
import { PlatformShowcaseSection } from '@/components/landing/PlatformShowcaseSection';
import { SocialPhonesFanSection } from '@/components/landing/SocialPhonesFanSection';
import { RoiCalculator } from '@/components/landing/RoiCalculator';
import { ShowcaseSection } from '@/components/landing/ShowcaseSection';
import { FaqSection } from '@/components/landing/FaqSection';
import { LandingFooter } from '@/components/landing/LandingFooter';
import { NewsletterSignupSection } from '@/components/landing/NewsletterSignupSection';
import type { SearchableCommunity } from '@/components/landing/CommunitySearchAutocomplete';
import { normalizeCommunities } from '@/lib/mock-communities';
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

  // Live API only — empty while loading / on error (no catalog mock injection).
  const list = useMemo(() => {
    if (Array.isArray(apiCommunities)) return apiCommunities;
    return [];
  }, [apiCommunities]);

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
    <div className="editorial-landing nc-landing min-h-screen bg-[#F9F8F6] text-[#2C2621]">
      <LandingHeader
        isLoggedIn={!!session}
        user={
          session?.user
            ? {
                name: session.user.name,
                email: session.user.email,
                image: session.user.image,
              }
            : null
        }
      />
      <HeroSection />
      <PlatformSuiteSection />
      <SocialPhonesFanSection />
      <PlatformShowcaseSection />
      <ComparisonSection />
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
      <RoiCalculator />
      <FaqSection />

      <NewsletterSignupSection />

      <LandingFooter />
    </div>
  );
}
