'use client';

/**
 * Side sheet — full metrics + settings for a Campaign / Ad Set / Ad.
 * Copy + currency follow the active LanguageSwitcher locale.
 */

import { useEffect, useState } from 'react';
import {
  ChevronRight,
  ExternalLink,
  Loader2,
  Megaphone,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import {
  adsCurrencyCode,
  formatAdsInt,
  formatAdsMoney,
} from '@/lib/ads/format-money';
import { useLanguage } from '@/lib/i18n';

export type DetailKind = 'campaign' | 'adset' | 'ad';

export type AdsDetailEntity = {
  kind: DetailKind;
  id: string;
  name: string;
  status: string;
  currency: string;
  spend: number;
  impressions: number;
  clicks: number;
  cpc: number;
  conversions?: number;
  daily_budget?: number;
  objective?: string | null;
  targeting_summary?: string | null;
  headline?: string | null;
  creative_thumbnail?: string | null;
  campaign_id?: string;
  adset_id?: string;
  ad_account_id?: string;
  parentCampaignName?: string | null;
  parentAdSetName?: string | null;
  childCount?: number;
};

function objectiveLabel(raw: string | null | undefined) {
  if (!raw) return '—';
  return raw
    .replace(/^OUTCOME_/, '')
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function AdsEntityDetailSheet({
  entity,
  open,
  onOpenChange,
  saving,
  onToggleStatus,
  onSaveBudget,
  onDrillDown,
}: {
  entity: AdsDetailEntity | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saving?: boolean;
  onToggleStatus: (status: 'ACTIVE' | 'PAUSED') => void;
  onSaveBudget?: (dailyBudget: number) => void;
  onDrillDown?: () => void;
}) {
  const { locale, t } = useLanguage();
  const [budgetDraft, setBudgetDraft] = useState('');

  useEffect(() => {
    if (entity?.daily_budget != null) {
      setBudgetDraft(String(entity.daily_budget));
    } else {
      setBudgetDraft('');
    }
  }, [entity?.id, entity?.daily_budget]);

  if (!entity) return null;

  const active = entity.status === 'ACTIVE';
  const canBudget =
    (entity.kind === 'campaign' || entity.kind === 'adset') &&
    typeof onSaveBudget === 'function';
  const kindWord =
    entity.kind === 'campaign'
      ? t('adsCampaign')
      : entity.kind === 'adset'
        ? t('adsAdSet')
        : t('adsAd');
  const detailsEyebrow =
    entity.kind === 'campaign'
      ? t('adsDetailsCampaign')
      : entity.kind === 'adset'
        ? t('adsDetailsAdSet')
        : t('adsDetailsAd');
  const drillLabel =
    entity.kind === 'campaign'
      ? `${t('adsViewAdSets')}${entity.childCount != null ? ` (${entity.childCount})` : ''}`
      : entity.kind === 'adset'
        ? `${t('adsViewAds')}${entity.childCount != null ? ` (${entity.childCount})` : ''}`
        : null;

  const metrics = [
    {
      label: t('adsSpend'),
      value: formatAdsMoney(entity.spend, entity.currency, locale),
    },
    {
      label: t('adsImpressions'),
      value: formatAdsInt(entity.impressions, locale),
    },
    {
      label: t('adsClicks'),
      value: formatAdsInt(entity.clicks, locale),
    },
    {
      label: t('adsCpc'),
      value: formatAdsMoney(entity.cpc, entity.currency, locale),
    },
    {
      label: t('adsConversions'),
      value: formatAdsInt(entity.conversions || 0, locale),
    },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full gap-0 overflow-y-auto border-slate-200 bg-[#FAFAFA] p-0 sm:max-w-md"
      >
        <SheetHeader className="space-y-1 border-b border-slate-100 bg-white px-5 py-5 text-left">
          <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-slate-400">
            {detailsEyebrow}
          </p>
          <SheetTitle className="font-[family-name:var(--font-space-grotesk)] text-xl text-[#0F172A]">
            {entity.name}
          </SheetTitle>
          <SheetDescription className="text-sm text-slate-500">
            {entity.kind === 'campaign' &&
              `${t('adsObjective')} · ${objectiveLabel(entity.objective)}`}
            {entity.kind === 'adset' &&
              (entity.targeting_summary ||
                entity.parentCampaignName ||
                t('adsTargeting'))}
            {entity.kind === 'ad' &&
              (entity.headline || entity.parentAdSetName || t('adsCreative'))}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-5 px-5 py-5">
          <section className="rounded-2xl border border-slate-200/80 bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[#0F172A]">
                  {t('adsDelivery')}
                </p>
                <p className="text-xs text-slate-500">
                  {active
                    ? t('adsDeliveryActiveHint')
                    : t('adsDeliveryPausedHint')}
                </p>
              </div>
              <div className="flex min-h-11 items-center gap-2">
                <span className="text-xs font-medium text-slate-500">
                  {active ? t('adsActive') : t('adsPaused')}
                </span>
                <Switch
                  checked={active}
                  disabled={saving}
                  onCheckedChange={(on) =>
                    onToggleStatus(on ? 'ACTIVE' : 'PAUSED')
                  }
                />
              </div>
            </div>
          </section>

          <section>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              {t('adsPerformanceSection')}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {metrics.map((m) => (
                <div
                  key={m.label}
                  className="rounded-2xl border border-slate-200/80 bg-white p-3"
                >
                  <p className="text-[11px] font-medium text-slate-400">
                    {m.label}
                  </p>
                  <p className="mt-1 font-[family-name:var(--font-fira-code)] text-sm font-semibold text-[#0F172A]">
                    {m.value}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {canBudget && (
            <section className="space-y-3 rounded-2xl border border-slate-200/80 bg-white p-4">
              <div>
                <p className="text-sm font-semibold text-[#0F172A]">
                  {t('adsDailyBudget')}
                </p>
                <p className="text-xs text-slate-500">
                  {t('adsBudgetHint', { kind: kindWord.toLowerCase() })}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  step="1"
                  value={budgetDraft}
                  onChange={(e) => setBudgetDraft(e.target.value)}
                  className="min-h-11 rounded-xl font-[family-name:var(--font-fira-code)]"
                />
                <span className="text-sm text-slate-500">
                  {adsCurrencyCode(entity.currency, locale)}
                </span>
              </div>
              <button
                type="button"
                disabled={saving}
                onClick={() => {
                  const value = Number(budgetDraft);
                  if (!Number.isFinite(value) || value < 0) return;
                  onSaveBudget?.(value);
                }}
                className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-[#2B2568] px-4 text-sm font-semibold text-white disabled:opacity-60"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  t('adsSaveBudget')
                )}
              </button>
            </section>
          )}

          <section className="space-y-3 rounded-2xl border border-slate-200/80 bg-white p-4">
            <p className="text-sm font-semibold text-[#0F172A]">
              {t('adsSettings')}
            </p>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-xs text-slate-400">ID</dt>
                <dd className="mt-0.5 break-all font-[family-name:var(--font-fira-code)] text-xs text-slate-700">
                  {entity.id}
                </dd>
              </div>
              {entity.ad_account_id && (
                <div>
                  <dt className="text-xs text-slate-400">{t('adsAdAccount')}</dt>
                  <dd className="mt-0.5 break-all font-[family-name:var(--font-fira-code)] text-xs text-slate-700">
                    {entity.ad_account_id}
                  </dd>
                </div>
              )}
              {entity.kind === 'campaign' && (
                <div>
                  <dt className="text-xs text-slate-400">{t('adsObjective')}</dt>
                  <dd className="mt-0.5 font-medium text-slate-800">
                    {objectiveLabel(entity.objective)}
                  </dd>
                </div>
              )}
              {entity.kind === 'adset' && (
                <>
                  <div>
                    <dt className="text-xs text-slate-400">
                      {t('adsParentCampaign')}
                    </dt>
                    <dd className="mt-0.5 font-medium text-slate-800">
                      {entity.parentCampaignName || '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-400">{t('adsTargeting')}</dt>
                    <dd className="mt-0.5 font-medium text-slate-800">
                      {entity.targeting_summary || '—'}
                    </dd>
                  </div>
                </>
              )}
              {entity.kind === 'ad' && (
                <>
                  <div>
                    <dt className="text-xs text-slate-400">
                      {t('adsParentCampaign')}
                    </dt>
                    <dd className="mt-0.5 font-medium text-slate-800">
                      {entity.parentCampaignName || '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-400">
                      {t('adsParentAdSet')}
                    </dt>
                    <dd className="mt-0.5 font-medium text-slate-800">
                      {entity.parentAdSetName || '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-400">{t('adsHeadline')}</dt>
                    <dd className="mt-0.5 font-medium text-slate-800">
                      {entity.headline || '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="mb-2 text-xs text-slate-400">
                      {t('adsCreative')}
                    </dt>
                    <dd>
                      {entity.creative_thumbnail ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={entity.creative_thumbnail}
                          alt=""
                          className="h-36 w-full rounded-xl object-cover"
                        />
                      ) : (
                        <div className="flex h-28 items-center justify-center gap-2 rounded-xl bg-[#2B2568]/5 text-sm text-[#2B2568]">
                          <Megaphone className="h-4 w-4 text-[#F472B6]" />
                          {t('adsNoCreative')}
                        </div>
                      )}
                    </dd>
                  </div>
                </>
              )}
            </dl>
          </section>

          {drillLabel && onDrillDown && (
            <button
              type="button"
              onClick={onDrillDown}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#F472B6] px-4 text-sm font-semibold text-white"
            >
              {drillLabel}
              <ChevronRight className="h-4 w-4" />
            </button>
          )}

          <p className="flex items-start gap-2 text-xs text-slate-400">
            <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {t('adsMetaSyncNote')}
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
