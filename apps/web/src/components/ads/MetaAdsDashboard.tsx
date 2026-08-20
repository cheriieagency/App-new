'use client';

/**
 * Meta Ads Manager — 3-tier board (Campaigns → Ad Sets → Ads) with KPI trends.
 */

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ChevronRight,
  Loader2,
  Megaphone,
  Plus,
  RefreshCw,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { AdminPageHeader, adminCardClass } from '@/components/admin/AdminUi';
import AdsEntityDetailSheet, {
  type AdsDetailEntity,
} from '@/components/ads/AdsEntityDetailSheet';
import AdsKpiTrends, {
  type AdsInsightDay,
  type AdsKpis,
} from '@/components/ads/AdsKpiTrends';
import CreateCampaignWizard, {
  type CreateCampaignPayload,
} from '@/components/ads/CreateCampaignWizard';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { useWorkspace } from '@/context/WorkspaceContext';
import { formatAdsInt, formatAdsMoney } from '@/lib/ads/format-money';
import { useLanguage } from '@/lib/i18n';

type AdsCampaign = {
  id: string;
  name: string;
  status: string;
  objective: string | null;
  daily_budget: number;
  spend: number;
  impressions: number;
  clicks: number;
  cpc: number;
  conversions?: number;
  currency: string;
  ad_account_id: string;
};

type AdsAdSet = {
  id: string;
  campaign_id: string;
  name: string;
  status: string;
  daily_budget: number;
  targeting_summary: string | null;
  spend: number;
  impressions: number;
  clicks: number;
  cpc: number;
  currency: string;
};

type AdsAd = {
  id: string;
  campaign_id: string;
  adset_id: string;
  name: string;
  status: string;
  creative_thumbnail: string | null;
  headline: string | null;
  spend: number;
  impressions: number;
  clicks: number;
  cpc: number;
  currency: string;
};

type AdsPayload = {
  ok?: boolean;
  connected?: boolean;
  demo?: boolean;
  accounts?: Array<{ id: string; name: string; currency: string }>;
  campaigns?: AdsCampaign[];
  adsets?: AdsAdSet[];
  ads?: AdsAd[];
  audiences?: Array<{
    id: string;
    name: string;
    subtype?: string | null;
    description?: string | null;
  }>;
  series?: AdsInsightDay[];
  dateRange?: { since: string; until: string; preset?: string };
  kpis?: AdsKpis;
  message?: string | null;
  cta?: { label: string; href: string } | null;
};

type LevelTab = 'campaigns' | 'adsets' | 'ads';

function objectiveLabel(raw: string | null) {
  if (!raw) return '—';
  return raw
    .replace(/^OUTCOME_/, '')
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function isoDaysAgo(days: number) {
  return new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
}

export default function MetaAdsDashboard() {
  const { activeWorkspaceId } = useWorkspace();
  const { locale, t } = useLanguage();
  const queryClient = useQueryClient();

  const [preset, setPreset] = useState<'last_7d' | 'last_30d' | 'custom'>(
    'last_30d'
  );
  const [since, setSince] = useState(() => isoDaysAgo(29));
  const [until, setUntil] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [level, setLevel] = useState<LevelTab>('campaigns');
  const [campaignFilter, setCampaignFilter] = useState<string | null>(null);
  const [adsetFilter, setAdsetFilter] = useState<string | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [budgetDraft, setBudgetDraft] = useState('');
  const [detail, setDetail] = useState<AdsDetailEntity | null>(null);

  const queryKey = [
    'meta-ads',
    activeWorkspaceId,
    preset,
    since,
    until,
  ] as const;

  const { data, isLoading, isFetching, isError, error } = useQuery({
    queryKey,
    enabled: Boolean(activeWorkspaceId),
    queryFn: async (): Promise<AdsPayload> => {
      const qs = new URLSearchParams({
        workspaceId: activeWorkspaceId,
        since,
        until,
        preset: preset === 'custom' ? 'custom' : preset,
      });
      const res = await fetch(`/api/ads?${qs.toString()}`, {
        headers: { 'x-workspace-id': activeWorkspaceId },
      });
      const json = (await res.json()) as AdsPayload & { message?: string };
      if (!res.ok) {
        throw new Error(json.message || 'Failed to load Meta Ads');
      }
      return json;
    },
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/ads/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-workspace-id': activeWorkspaceId,
        },
        body: JSON.stringify({
          workspaceId: activeWorkspaceId,
          since,
          until,
          preset,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Sync failed');
      return json;
    },
    onSuccess: (json) => {
      toast.success(json.message || 'Synced Meta Ads');
      void queryClient.invalidateQueries({ queryKey: ['meta-ads'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const patchMutation = useMutation({
    mutationFn: async (input: {
      kind: 'campaign' | 'adset' | 'ad';
      id: string;
      status?: 'ACTIVE' | 'PAUSED';
      daily_budget?: number;
    }) => {
      const path =
        input.kind === 'campaign'
          ? `/api/ads/campaigns/${encodeURIComponent(input.id)}`
          : input.kind === 'adset'
            ? `/api/ads/adsets/${encodeURIComponent(input.id)}`
            : `/api/ads/items/${encodeURIComponent(input.id)}`;
      const res = await fetch(path, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-workspace-id': activeWorkspaceId,
        },
        body: JSON.stringify({
          workspaceId: activeWorkspaceId,
          status: input.status,
          daily_budget: input.daily_budget,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Update failed');
      return json;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['meta-ads'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const createMutation = useMutation({
    mutationFn: async (payload: CreateCampaignPayload) => {
      const res = await fetch('/api/ads/campaigns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-workspace-id': activeWorkspaceId,
        },
        body: JSON.stringify({ workspaceId: activeWorkspaceId, ...payload }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Create failed');
      return json;
    },
    onSuccess: (json) => {
      toast.success(json.message || 'Campaign created');
      setWizardOpen(false);
      void queryClient.invalidateQueries({ queryKey: ['meta-ads'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const campaigns = data?.campaigns || [];
  const adsets = data?.adsets || [];
  const ads = data?.ads || [];
  const currency = data?.accounts?.[0]?.currency || campaigns[0]?.currency || 'SEK';
  const kpis: AdsKpis = data?.kpis || {
    totalSpend: 0,
    impressions: 0,
    clicks: 0,
    conversions: 0,
    avgCpc: 0,
    avgRoas: 0,
  };

  const filteredAdSets = useMemo(() => {
    if (!campaignFilter) return adsets;
    return adsets.filter((a) => a.campaign_id === campaignFilter);
  }, [adsets, campaignFilter]);

  const filteredAds = useMemo(() => {
    let list = ads;
    if (adsetFilter) list = list.filter((a) => a.adset_id === adsetFilter);
    else if (campaignFilter) {
      list = list.filter((a) => a.campaign_id === campaignFilter);
    }
    return list;
  }, [ads, adsetFilter, campaignFilter]);

  const campaignNameById = useMemo(() => {
    const map = new Map(campaigns.map((c) => [c.id, c.name] as const));
    return map;
  }, [campaigns]);

  const adsetNameById = useMemo(() => {
    const map = new Map(adsets.map((a) => [a.id, a.name] as const));
    return map;
  }, [adsets]);

  function openCampaign(id: string) {
    setCampaignFilter(id);
    setAdsetFilter(null);
    setLevel('adsets');
    setDetail(null);
  }

  function openAdSet(id: string, campaignId: string) {
    setCampaignFilter(campaignId);
    setAdsetFilter(id);
    setLevel('ads');
    setDetail(null);
  }

  function clearFilters() {
    setCampaignFilter(null);
    setAdsetFilter(null);
    setLevel('campaigns');
  }

  function showCampaignDetail(c: AdsCampaign) {
    setDetail({
      kind: 'campaign',
      id: c.id,
      name: c.name,
      status: c.status,
      currency: c.currency,
      spend: c.spend,
      impressions: c.impressions,
      clicks: c.clicks,
      cpc: c.cpc,
      conversions: c.conversions,
      daily_budget: c.daily_budget,
      objective: c.objective,
      ad_account_id: c.ad_account_id,
      childCount: adsets.filter((a) => a.campaign_id === c.id).length,
    });
  }

  function showAdSetDetail(a: AdsAdSet) {
    setDetail({
      kind: 'adset',
      id: a.id,
      name: a.name,
      status: a.status,
      currency: a.currency,
      spend: a.spend,
      impressions: a.impressions,
      clicks: a.clicks,
      cpc: a.cpc,
      daily_budget: a.daily_budget,
      targeting_summary: a.targeting_summary,
      campaign_id: a.campaign_id,
      parentCampaignName: campaignNameById.get(a.campaign_id) || null,
      childCount: ads.filter((ad) => ad.adset_id === a.id).length,
    });
  }

  function showAdDetail(ad: AdsAd) {
    setDetail({
      kind: 'ad',
      id: ad.id,
      name: ad.name,
      status: ad.status,
      currency: ad.currency,
      spend: ad.spend,
      impressions: ad.impressions,
      clicks: ad.clicks,
      cpc: ad.cpc,
      headline: ad.headline,
      creative_thumbnail: ad.creative_thumbnail,
      campaign_id: ad.campaign_id,
      adset_id: ad.adset_id,
      parentCampaignName: campaignNameById.get(ad.campaign_id) || null,
      parentAdSetName: adsetNameById.get(ad.adset_id) || null,
    });
  }

  function saveBudget(kind: 'campaign' | 'adset', id: string) {
    const value = Number(budgetDraft);
    if (!Number.isFinite(value) || value < 0) {
      toast.error('Enter a valid daily budget');
      return;
    }
    patchMutation.mutate(
      { kind, id, daily_budget: value },
      {
        onSuccess: () => {
          toast.success(t('adsToastBudget'));
          setEditingId(null);
          setDetail((prev) =>
            prev && prev.id === id ? { ...prev, daily_budget: value } : prev
          );
        },
      }
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
      <AdminPageHeader
        eyebrow={t('adsEyebrow')}
        title={t('adsManagerTitle')}
        description={t('adsManagerSub')}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setWizardOpen(true)}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#F472B6] px-4 text-sm font-semibold text-white"
            >
              <Plus className="h-4 w-4" />
              {t('adsCreateCampaign')}
            </button>
            <button
              type="button"
              disabled={syncMutation.isPending || isFetching}
              onClick={() => syncMutation.mutate()}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#2B2568] px-4 text-sm font-medium text-white disabled:opacity-60"
            >
              {syncMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              {t('adsSyncMeta')}
            </button>
          </div>
        }
      />

      {isError && (
        <div className={`${adminCardClass} p-4 text-sm text-red-600`}>
          {error instanceof Error ? error.message : 'Failed to load ads'}
        </div>
      )}

      {!isLoading && !isError && (data?.message || data?.cta) ? (
        <div
          className={`${adminCardClass} flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between`}
        >
          <p className="text-sm font-medium text-slate-700">
            {data?.message ||
              'Connect Facebook with ads permissions to sync live Meta Ads.'}
          </p>
          {data?.cta?.href ? (
            <a
              href={data.cta.href}
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#2B2568] px-4 text-sm font-semibold text-white"
            >
              {data.cta.label || 'Connect Facebook'}
            </a>
          ) : null}
        </div>
      ) : null}

      {isLoading ? (
        <div className="flex h-40 items-center justify-center text-slate-400">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> {t('adsLoading')}
        </div>
      ) : isError ? null : (
        <>
          <AdsKpiTrends
            series={data?.series || []}
            kpis={kpis}
            currency={currency}
            preset={preset === 'custom' ? 'custom' : preset}
            since={since}
            until={until}
            loading={isFetching}
            onPresetChange={(next) => {
              setPreset(next);
              setUntil(new Date().toISOString().slice(0, 10));
              setSince(next === 'last_7d' ? isoDaysAgo(6) : isoDaysAgo(29));
            }}
            onCustomRange={(s, u) => {
              setPreset('custom');
              setSince(s);
              setUntil(u);
            }}
          />

          <section className="space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="inline-flex rounded-2xl bg-white p-1 ring-1 ring-slate-200">
                {(
                  [
                    ['campaigns', t('adsCampaigns')],
                    ['adsets', t('adsAdSets')],
                    ['ads', t('adsAds')],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setLevel(id)}
                    className={`min-h-11 rounded-xl px-4 text-sm font-medium transition ${
                      level === id
                        ? 'bg-[#2B2568] text-white'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {(campaignFilter || adsetFilter) && (
                <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="inline-flex min-h-11 items-center gap-1 rounded-xl bg-white px-3 ring-1 ring-slate-200"
                  >
                    <X className="h-3.5 w-3.5" /> {t('adsClearFilter')}
                  </button>
                  {campaignFilter && (
                    <span className="inline-flex items-center gap-1">
                      <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
                      {campaignNameById.get(campaignFilter) || t('adsCampaign')}
                    </span>
                  )}
                  {adsetFilter && (
                    <span className="inline-flex items-center gap-1">
                      <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
                      {adsetNameById.get(adsetFilter) || t('adsAdSet')}
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className={`${adminCardClass} overflow-x-auto`}>
              {level === 'campaigns' && (
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                    <tr>
                      <th className="px-4 py-3 font-medium">{t('adsStatus')}</th>
                      <th className="px-4 py-3 font-medium">{t('adsCampaign')}</th>
                      <th className="px-4 py-3 font-medium">{t('adsDailyBudget')}</th>
                      <th className="px-4 py-3 font-medium">{t('adsImpressions')}</th>
                      <th className="px-4 py-3 font-medium">{t('adsSpend')}</th>
                      <th className="px-4 py-3 font-medium">{t('adsCpc')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {campaigns.map((c) => {
                      const active = c.status === 'ACTIVE';
                      return (
                        <tr
                          key={c.id}
                          className="cursor-pointer border-b border-slate-50 last:border-0 hover:bg-slate-50/80"
                          onClick={() => showCampaignDetail(c)}
                        >
                          <td
                            className="px-4 py-3"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex min-h-11 items-center gap-2">
                              <Switch
                                checked={active}
                                disabled={patchMutation.isPending}
                                onCheckedChange={(on) =>
                                  patchMutation.mutate({
                                    kind: 'campaign',
                                    id: c.id,
                                    status: on ? 'ACTIVE' : 'PAUSED',
                                  })
                                }
                              />
                              <span className="text-xs text-slate-500">
                                {active ? t('adsActive') : t('adsPaused')}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                showCampaignDetail(c);
                              }}
                              className="text-left font-medium text-[#2B2568] hover:underline"
                            >
                              {c.name}
                            </button>
                            <p className="text-xs text-slate-400">
                              {objectiveLabel(c.objective)}
                            </p>
                          </td>
                          <td
                            className="px-4 py-3"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {editingId === c.id ? (
                              <div className="flex items-center gap-1">
                                <Input
                                  value={budgetDraft}
                                  onChange={(e) => setBudgetDraft(e.target.value)}
                                  className="h-9 w-24 rounded-lg font-[family-name:var(--font-fira-code)]"
                                  type="number"
                                  min={0}
                                />
                                <button
                                  type="button"
                                  className="text-xs font-semibold text-[#F472B6]"
                                  onClick={() => saveBudget('campaign', c.id)}
                                >
                                  {t('adsSave')}
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                className="font-[family-name:var(--font-fira-code)] text-slate-700 hover:text-[#2B2568]"
                                onClick={() => {
                                  setEditingId(c.id);
                                  setBudgetDraft(String(c.daily_budget));
                                }}
                              >
                                {formatAdsMoney(c.daily_budget, c.currency, locale)}
                              </button>
                            )}
                          </td>
                          <td className="px-4 py-3 font-[family-name:var(--font-fira-code)]">
                            {formatAdsInt(c.impressions, locale)}
                          </td>
                          <td className="px-4 py-3 font-[family-name:var(--font-fira-code)]">
                            {formatAdsMoney(c.spend, c.currency, locale)}
                          </td>
                          <td className="px-4 py-3 font-[family-name:var(--font-fira-code)]">
                            {formatAdsMoney(c.cpc, c.currency, locale)}
                          </td>
                        </tr>
                      );
                    })}
                    {campaigns.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                          {t('adsNoCampaigns')}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}

              {level === 'adsets' && (
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                    <tr>
                      <th className="px-4 py-3 font-medium">{t('adsStatus')}</th>
                      <th className="px-4 py-3 font-medium">{t('adsAdSet')}</th>
                      <th className="px-4 py-3 font-medium">{t('adsDailyBudget')}</th>
                      <th className="px-4 py-3 font-medium">{t('adsImpressions')}</th>
                      <th className="px-4 py-3 font-medium">{t('adsSpend')}</th>
                      <th className="px-4 py-3 font-medium">{t('adsCpc')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAdSets.map((a) => {
                      const active = a.status === 'ACTIVE';
                      return (
                        <tr
                          key={a.id}
                          className="cursor-pointer border-b border-slate-50 last:border-0 hover:bg-slate-50/80"
                          onClick={() => showAdSetDetail(a)}
                        >
                          <td
                            className="px-4 py-3"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex min-h-11 items-center gap-2">
                              <Switch
                                checked={active}
                                disabled={patchMutation.isPending}
                                onCheckedChange={(on) =>
                                  patchMutation.mutate({
                                    kind: 'adset',
                                    id: a.id,
                                    status: on ? 'ACTIVE' : 'PAUSED',
                                  })
                                }
                              />
                              <span className="text-xs text-slate-500">
                                {active ? t('adsActive') : t('adsPaused')}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                showAdSetDetail(a);
                              }}
                              className="text-left font-medium text-[#2B2568] hover:underline"
                            >
                              {a.name}
                            </button>
                            <p className="text-xs text-slate-400">
                              {a.targeting_summary ||
                                campaignNameById.get(a.campaign_id) ||
                                '—'}
                            </p>
                          </td>
                          <td
                            className="px-4 py-3"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {editingId === a.id ? (
                              <div className="flex items-center gap-1">
                                <Input
                                  value={budgetDraft}
                                  onChange={(e) => setBudgetDraft(e.target.value)}
                                  className="h-9 w-24 rounded-lg font-[family-name:var(--font-fira-code)]"
                                  type="number"
                                  min={0}
                                />
                                <button
                                  type="button"
                                  className="text-xs font-semibold text-[#F472B6]"
                                  onClick={() => saveBudget('adset', a.id)}
                                >
                                  {t('adsSave')}
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                className="font-[family-name:var(--font-fira-code)] text-slate-700"
                                onClick={() => {
                                  setEditingId(a.id);
                                  setBudgetDraft(String(a.daily_budget));
                                }}
                              >
                                {formatAdsMoney(a.daily_budget, a.currency, locale)}
                              </button>
                            )}
                          </td>
                          <td className="px-4 py-3 font-[family-name:var(--font-fira-code)]">
                            {formatAdsInt(a.impressions, locale)}
                          </td>
                          <td className="px-4 py-3 font-[family-name:var(--font-fira-code)]">
                            {formatAdsMoney(a.spend, a.currency, locale)}
                          </td>
                          <td className="px-4 py-3 font-[family-name:var(--font-fira-code)]">
                            {formatAdsMoney(a.cpc, a.currency, locale)}
                          </td>
                        </tr>
                      );
                    })}
                    {filteredAdSets.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                          {t('adsNoAdSets')}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}

              {level === 'ads' && (
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                    <tr>
                      <th className="px-4 py-3 font-medium">{t('adsStatus')}</th>
                      <th className="px-4 py-3 font-medium">{t('adsAd')}</th>
                      <th className="px-4 py-3 font-medium">{t('adsImpressions')}</th>
                      <th className="px-4 py-3 font-medium">{t('adsSpend')}</th>
                      <th className="px-4 py-3 font-medium">{t('adsCpc')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAds.map((ad) => {
                      const active = ad.status === 'ACTIVE';
                      return (
                        <tr
                          key={ad.id}
                          className="cursor-pointer border-b border-slate-50 last:border-0 hover:bg-slate-50/80"
                          onClick={() => showAdDetail(ad)}
                        >
                          <td
                            className="px-4 py-3"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex min-h-11 items-center gap-2">
                              <Switch
                                checked={active}
                                disabled={patchMutation.isPending}
                                onCheckedChange={(on) =>
                                  patchMutation.mutate({
                                    kind: 'ad',
                                    id: ad.id,
                                    status: on ? 'ACTIVE' : 'PAUSED',
                                  })
                                }
                              />
                              <span className="text-xs text-slate-500">
                                {active ? t('adsActive') : t('adsPaused')}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              {ad.creative_thumbnail ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={ad.creative_thumbnail}
                                  alt=""
                                  className="h-10 w-10 rounded-lg object-cover"
                                />
                              ) : (
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#2B2568]/10 text-[#F472B6]">
                                  <Megaphone className="h-4 w-4" />
                                </div>
                              )}
                              <div>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    showAdDetail(ad);
                                  }}
                                  className="text-left font-medium text-[#2B2568] hover:underline"
                                >
                                  {ad.name}
                                </button>
                                <p className="text-xs text-slate-400">
                                  {ad.headline ||
                                    adsetNameById.get(ad.adset_id) ||
                                    '—'}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 font-[family-name:var(--font-fira-code)]">
                            {formatAdsInt(ad.impressions, locale)}
                          </td>
                          <td className="px-4 py-3 font-[family-name:var(--font-fira-code)]">
                            {formatAdsMoney(ad.spend, ad.currency, locale)}
                          </td>
                          <td className="px-4 py-3 font-[family-name:var(--font-fira-code)]">
                            {formatAdsMoney(ad.cpc, ad.currency, locale)}
                          </td>
                        </tr>
                      );
                    })}
                    {filteredAds.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                          {t('adsNoAds')}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        </>
      )}

      <AdsEntityDetailSheet
        entity={detail}
        open={Boolean(detail)}
        onOpenChange={(next) => {
          if (!next) setDetail(null);
        }}
        saving={patchMutation.isPending}
        onToggleStatus={(status) => {
          if (!detail) return;
          patchMutation.mutate(
            { kind: detail.kind, id: detail.id, status },
            {
              onSuccess: () => {
                toast.success(
                  status === 'ACTIVE' ? t('adsToastActive') : t('adsToastPaused')
                );
                setDetail((prev) =>
                  prev ? { ...prev, status } : prev
                );
              },
            }
          );
        }}
        onSaveBudget={
          detail?.kind === 'campaign' || detail?.kind === 'adset'
            ? (dailyBudget) => {
                if (!detail) return;
                patchMutation.mutate(
                  {
                    kind: detail.kind,
                    id: detail.id,
                    daily_budget: dailyBudget,
                  },
                  {
                    onSuccess: () => {
                      toast.success(t('adsToastBudget'));
                      setDetail((prev) =>
                        prev
                          ? { ...prev, daily_budget: dailyBudget }
                          : prev
                      );
                    },
                  }
                );
              }
            : undefined
        }
        onDrillDown={
          detail?.kind === 'campaign'
            ? () => openCampaign(detail.id)
            : detail?.kind === 'adset' && detail.campaign_id
              ? () => openAdSet(detail.id, detail.campaign_id!)
              : undefined
        }
      />

      <CreateCampaignWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        submitting={createMutation.isPending}
        audiences={data?.audiences || []}
        onSubmit={(payload) => createMutation.mutateAsync(payload)}
      />
    </div>
  );
}
