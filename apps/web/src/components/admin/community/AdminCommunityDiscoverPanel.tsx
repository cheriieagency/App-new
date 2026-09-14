'use client';

/**
 * Admin Community → Discover & Join
 * Same catalog + join flow members use, so creators can join other communities too.
 */

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, ChevronRight, ExternalLink, Search, Users } from 'lucide-react';
import { toast } from 'sonner';
import {
  CommunitySearchAutocomplete,
  type SearchableCommunity,
} from '@/components/landing/CommunitySearchAutocomplete';
import { InstantCheckoutDrawer } from '@/components/community/InstantCheckoutDrawer';
import { adminCardClass } from '@/components/admin/AdminUi';
import { useLocale } from '@/lib/locale-context';
import { t } from '@/lib/i18n';
import {
  normalizeCommunities,
  recommendCommunitiesFromMemberships,
} from '@/lib/mock-communities';

type CheckoutTarget = {
  id: number;
  name: string;
  priceSek: number;
  workspaceId?: string | null;
  sellerUserId?: string | null;
};

function filterCommunities(list: SearchableCommunity[], query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return list;
  return list.filter((c) => {
    const hay = [c.name, c.category, c.creator_name, c.description, c.slug]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return hay.includes(q);
  });
}

export default function AdminCommunityDiscoverPanel({
  excludeCommunityId,
}: {
  /** Hide the workspace-owned community from “join” suggestions (still show if joined). */
  excludeCommunityId?: number | null;
}) {
  const { locale } = useLocale();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [checkout, setCheckout] = useState<CheckoutTarget | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['communities-public'],
    queryFn: async () => {
      const r = await fetch('/api/communities', { credentials: 'include' });
      if (!r.ok) throw new Error('Failed');
      return r.json();
    },
  });

  const communities = useMemo(
    () => normalizeCommunities(Array.isArray(data) ? data : data?.communities),
    [data]
  );

  const joined = useMemo(
    () => communities.filter((c) => c.is_joined),
    [communities]
  );

  const catalog = useMemo(() => {
    const base = search.trim()
      ? filterCommunities(communities, search)
      : recommendCommunitiesFromMemberships(communities, { limit: 24 });
    // Prefer not burying your own community in “discover” unless searching.
    if (search.trim() || !excludeCommunityId) return base;
    return base.filter((c) => c.id !== excludeCommunityId);
  }, [communities, search, excludeCommunityId]);

  const joinMutation = useMutation({
    mutationFn: async (communityId: number) => {
      const r = await fetch('/api/communities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ community_id: communityId, action: 'join' }),
      });
      if (!r.ok) {
        const body = (await r.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error || 'Join failed');
      }
      return r.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['communities-public'] });
      void queryClient.invalidateQueries({ queryKey: ['communities'] });
      toast.success(t('toastJoinedCommunity', locale));
    },
    onError: (err: Error) => {
      toast.error(err.message || t('toastJoinFailed', locale));
    },
  });

  const openOrJoin = (c: SearchableCommunity) => {
    if (c.is_joined) {
      router.push(`/communities/${c.id}?from=admin`);
      return;
    }
    const price = Number(c.monthly_price ?? c.price ?? 0);
    const isFree = c.is_free !== false && !(price > 0);
    if (isFree) {
      joinMutation.mutate(c.id);
      return;
    }
    setCheckout({
      id: c.id,
      name: c.name,
      priceSek: price,
      workspaceId: c.workspace_id ?? null,
      sellerUserId: c.creator_id ?? null,
    });
  };

  return (
    <div className="space-y-5">
      <div className={`${adminCardClass} p-5 sm:p-6`}>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-5">
          <div className="min-w-0">
            <p className="text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-[#2C3B2E] mb-1.5">
              {t('adminCommunityDiscoverEyebrow', locale)}
            </p>
            <h3 className="font-playfair font-bold text-xl text-[#2C2621] tracking-tight">
              {t('adminCommunityDiscoverTitle', locale)}
            </h3>
            <p className="mt-1.5 text-sm text-[#8A857D] font-inter leading-relaxed max-w-xl">
              {t('adminCommunityDiscoverSub', locale)}
            </p>
          </div>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 h-11 min-h-[44px] px-4 rounded-xl bg-[#2C3B2E] hover:bg-[#243228] text-[#F9F8F6] text-sm font-medium transition-colors flex-shrink-0"
          >
            {t('adminViewAsMember', locale)}
            <ExternalLink size={14} aria-hidden />
          </Link>
        </div>

        <div className="relative z-20 max-w-xl">
          <CommunitySearchAutocomplete
            value={search}
            onChange={setSearch}
            communities={communities}
            onSelectCommunity={(c) => {
              setSearch(c.name);
              openOrJoin(c);
            }}
            isLoading={isLoading}
            placeholder={t('searchPlaceholder', locale)}
          />
        </div>
      </div>

      {joined.length > 0 ? (
        <div className={`${adminCardClass} p-5`}>
          <div className="flex items-center justify-between gap-3 mb-4">
            <h4 className="text-sm font-medium text-[#2C2621] tracking-tight">
              {t('adminMyMemberships', locale)}
            </h4>
            <span className="text-xs font-bold text-[#8A857D] bg-[#F0EFEA] px-2.5 py-1 rounded-full">
              {joined.length}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {joined.map((c) => (
              <Link
                key={c.id}
                href={`/communities/${c.id}?from=admin`}
                className="inline-flex items-center gap-2 h-10 min-h-[40px] px-3 rounded-xl border border-[rgba(44,59,46,0.18)] bg-[rgba(44,59,46,0.06)] text-sm font-semibold text-[#2C3B2E] hover:bg-[rgba(44,59,46,0.08)] transition-colors"
              >
                <Check size={14} className="text-[#2C3B2E]" aria-hidden />
                {c.name}
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-medium uppercase tracking-widest text-[#8A857D]">
            {search.trim()
              ? t('searchCommunitiesHeading', locale)
              : t('recommendedCommunities', locale)}
          </span>
          <span className="text-xs font-bold text-[#8A857D] bg-[#F0EFEA] px-2.5 py-1 rounded-full">
            {catalog.length}
          </span>
        </div>
        {search.trim() ? (
          <button
            type="button"
            onClick={() => setSearch('')}
            className="text-xs font-bold text-[#2C3B2E] hover:text-[#2C3B2E] min-h-11 px-2 transition-colors"
          >
            {t('clearFilterShort', locale)}
          </button>
        ) : null}
      </div>

      {isLoading ? (
        <div className={`${adminCardClass} p-10 text-center text-sm font-medium text-[#8A857D]`}>
          {t('loading', locale)}
        </div>
      ) : catalog.length === 0 ? (
        <div className={`${adminCardClass} p-10 text-center`}>
          <Search size={22} className="mx-auto mb-2 text-[#E6E3DB]" aria-hidden />
          <p className="text-[#8A857D] font-bold font-inter">
            {search.trim()
              ? `${t('noResults', locale)} “${search}”`
              : t('noRecommendationsYet', locale)}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {catalog.map((c) => {
            const price = Number(c.monthly_price ?? c.price ?? 0);
            const isFree = c.is_free !== false && !(price > 0);
            const joining =
              joinMutation.isPending && joinMutation.variables === c.id;
            return (
              <article
                key={c.id}
                className={`${adminCardClass} overflow-hidden flex flex-col`}
              >
                <div
                  className="h-20 relative"
                  style={{
                    background: `linear-gradient(135deg, ${c.cover_color ?? '#2C3B2E'}, #2C2621)`,
                  }}
                >
                  <span className="absolute top-3 left-3 text-[10px] font-medium text-white/80 bg-white/10 backdrop-blur px-2.5 py-1 rounded-full uppercase tracking-wider">
                    {c.category || 'Community'}
                  </span>
                  {c.is_joined ? (
                    <span className="absolute top-3 right-3 inline-flex items-center gap-1 text-[10px] font-medium text-[#2C3B2E] bg-[rgba(44,59,46,0.08)] border border-[#2C3B2E]/25 px-2 py-1 rounded-full">
                      <Check size={10} aria-hidden />
                      {t('adminJoinedBadge', locale)}
                    </span>
                  ) : null}
                </div>
                <div className="p-4 flex flex-col flex-1">
                  <p className="text-[10px] font-bold text-[#8A857D] mb-0.5">
                    {c.creator_name}
                  </p>
                  <h3 className="text-sm font-medium text-[#2C2621] mb-1 tracking-tight">
                    {c.name}
                  </h3>
                  <p className="text-xs text-[#8A857D] leading-relaxed line-clamp-2 mb-4 flex-1 font-inter">
                    {c.description}
                  </p>
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1 text-[#8A857D] text-xs font-bold">
                      <Users size={12} aria-hidden />
                      {c.member_count.toLocaleString(
                        locale === 'en' ? 'en-US' : 'sv-SE'
                      )}
                    </span>
                    <button
                      type="button"
                      disabled={joining}
                      onClick={() => openOrJoin(c)}
                      className={`inline-flex items-center gap-1 h-9 min-h-[36px] px-3 rounded-full text-xs font-medium transition-colors disabled:opacity-60 ${
                        c.is_joined
                          ? 'bg-[#2C3B2E] text-[#F9F8F6] hover:bg-[#243228]'
                          : 'bg-[#2C3B2E] text-[#F9F8F6] hover:bg-[#243228]'
                      }`}
                    >
                      {c.is_joined
                        ? t('openArrow', locale)
                        : isFree
                          ? t('adminJoinFree', locale)
                          : t('peekIn', locale)}
                      <ChevronRight size={12} aria-hidden />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <InstantCheckoutDrawer
        open={Boolean(checkout)}
        onOpenChange={(open) => {
          if (!open) setCheckout(null);
        }}
        communityName={checkout?.name ?? ''}
        communityId={checkout?.id ?? 0}
        priceSek={checkout?.priceSek ?? 0}
        workspaceId={checkout?.workspaceId}
        sellerUserId={checkout?.sellerUserId}
        onSuccess={() => {
          void queryClient.invalidateQueries({ queryKey: ['communities-public'] });
          void queryClient.invalidateQueries({ queryKey: ['communities'] });
          setCheckout(null);
        }}
      />
    </div>
  );
}
