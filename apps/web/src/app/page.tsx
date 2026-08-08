'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { authClient } from '@/lib/auth-client';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { HeroSection } from '@/components/landing/HeroSection';
import { ComparisonSection } from '@/components/landing/ComparisonSection';
import { FeaturesSection } from '@/components/landing/FeaturesSection';
import { RoiCalculator } from '@/components/landing/RoiCalculator';
import { ShowcaseSection } from '@/components/landing/ShowcaseSection';
import { FaqSection } from '@/components/landing/FaqSection';

export default function PlatformHome() {
  const { data: session } = authClient.useSession();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const queryClient = useQueryClient();

  const { data: communities = [] } = useQuery({
    queryKey: ['communities-public'],
    queryFn: async () => {
      const res = await fetch('/api/communities');
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
  });

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

  const list = communities as Array<{
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
  }>;

  const featured = list.find((c) => c.is_featured) ?? null;
  const filtered = searchQuery
    ? list.filter(
        (c) =>
          c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.category.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : list;

  return (
    <div className="nc-landing min-h-screen">
      <LandingHeader isLoggedIn={!!session} />
      <HeroSection />
      <ComparisonSection />
      <FeaturesSection />
      <RoiCalculator />
      <ShowcaseSection
        featured={featured}
        communities={filtered}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
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

      <section className="relative py-24 text-center overflow-hidden">
        <div
          className="nc-blob w-[30rem] h-[30rem] left-1/2 top-0 -translate-x-1/2 opacity-80"
          style={{ background: 'var(--nc-blush)' }}
        />
        <div
          className="nc-blob w-80 h-80 left-1/4 bottom-0 opacity-60"
          style={{ background: 'var(--nc-sky)' }}
        />
        <div className="relative max-w-2xl mx-auto px-4 sm:px-6 nc-glass rounded-[2rem] py-12 px-6 sm:px-10">
          <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-[#2c3340] mb-4 leading-tight tracking-tight">
            Redo att samla allt på ett ställe?
          </h2>
          <p className="text-[#5b6472] mb-9 text-lg font-medium">
            Swish, AI och nordisk bokföring — inbyggt från start.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Link
              href="/account/signup"
              className="flex items-center gap-2 min-h-12 px-8 rounded-full font-extrabold text-sm text-white transition-all active:scale-[0.98]"
              style={{
                background: 'var(--nc-coral)',
                boxShadow: '0 14px 32px -12px rgba(255,122,92,0.5)',
              }}
            >
              Skapa gratis community <ArrowRight size={14} />
            </Link>
            <button
              type="button"
              onClick={() =>
                document.getElementById('communities')?.scrollIntoView({ behavior: 'smooth' })
              }
              className="flex items-center gap-2 min-h-12 px-8 rounded-full bg-white/70 border border-white text-[#2c3340] font-bold text-sm hover:bg-white transition-all"
            >
              Utforska communities
            </button>
          </div>
        </div>
      </section>

      <footer className="text-[#94a0b0] py-8 text-center text-xs font-medium">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center"
              style={{ background: 'var(--nc-coral)' }}
            >
              <span className="text-white font-display font-extrabold text-[9px]">N</span>
            </div>
            <span className="font-display font-bold text-[#5b6472]">Nordic Creator</span>
          </div>
          <div className="flex items-center gap-6">
            <Link
              href="/account/signin"
              className="hover:text-[#2c3340] transition-colors min-h-11 inline-flex items-center"
            >
              Logga in
            </Link>
            <Link
              href="/account/signup"
              className="hover:text-[#2c3340] transition-colors min-h-11 inline-flex items-center"
            >
              Skapa konto
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
