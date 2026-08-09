'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { useLanguage } from '@/lib/locale-context';
import { t } from '@/lib/i18n';

const FOLLOWER_MIN = 1000;
const FOLLOWER_MAX = 50000;
const FOLLOWER_STEP = 500;
const PRICE_MIN = 149;
const PRICE_MAX = 499;
const PRICE_STEP = 10;
const CONVERSION_MIN = 0.5;
const CONVERSION_MAX = 10;
const CONVERSION_STEP = 0.5;

function formatNum(value: number, locale: string) {
  return value.toLocaleString(locale === 'en' ? 'en-US' : 'sv-SE');
}

function formatPct(value: number, locale: string) {
  return Number.isInteger(value)
    ? `${value}%`
    : `${value.toLocaleString(locale === 'en' ? 'en-US' : 'sv-SE')}%`;
}

export function RoiCalculator() {
  const { locale } = useLanguage();
  const [followers, setFollowers] = useState(10000);
  const [price, setPrice] = useState(299);
  const [conversionPct, setConversionPct] = useState(2);

  const payingMembers = Math.round(followers * (conversionPct / 100));
  const monthlyIncome = payingMembers * price;
  // Present USD-style estimate for the hero earn line (~10 SEK ≈ $1 demo rate).
  const usdEstimate = Math.round(monthlyIncome / 10);

  const earnLine = t('roiEarnLine', locale)
    .replace('{pct}', String(conversionPct))
    .replace('{amount}', formatNum(usdEstimate, locale));

  const membersLine = t('roiPayingMembers', locale)
    .replace('{count}', formatNum(payingMembers, locale))
    .replace('{price}', formatNum(price, locale));

  return (
    <section className="relative py-20 sm:py-28 overflow-hidden">
      <div
        className="nc-blob w-96 h-96 top-0 left-1/4 opacity-50"
        style={{ background: 'var(--nc-mint)' }}
      />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6">
        <div className="nc-glass rounded-[2rem] p-7 sm:p-10 lg:p-12">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
            <div>
              <p
                className="text-xs font-extrabold uppercase tracking-[0.16em] mb-3"
                style={{ color: 'var(--nc-coral)' }}
              >
                {t('roiEyebrow', locale)}
              </p>
              <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-[#2c3340] tracking-tight mb-3">
                {t('roiHeadline', locale)}
              </h2>
              <p className="text-[#5b6472] font-medium mb-10 leading-relaxed max-w-md">
                {t('roiSub', locale)}
              </p>

              <div className="space-y-9">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-bold text-[#2c3340]">
                      {t('roiFollowers', locale)}
                    </label>
                    <span className="text-sm font-extrabold text-[#2c3340] rounded-full bg-white/70 px-3 py-1">
                      {formatNum(followers, locale)}
                    </span>
                  </div>
                  <Slider
                    min={FOLLOWER_MIN}
                    max={FOLLOWER_MAX}
                    step={FOLLOWER_STEP}
                    value={[followers]}
                    onValueChange={(v) => setFollowers(v[0] ?? FOLLOWER_MIN)}
                    className="py-2 [&_[data-slot=slider-range]]:bg-[var(--nc-coral)] [&_[data-slot=slider-thumb]]:border-[var(--nc-coral)]"
                  />
                  <div className="flex justify-between text-[11px] font-bold text-[#94a0b0] mt-2">
                    <span>{formatNum(FOLLOWER_MIN, locale)}</span>
                    <span>{formatNum(FOLLOWER_MAX, locale)}</span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-bold text-[#2c3340]">
                      {t('roiMonthlyPrice', locale)}
                    </label>
                    <span className="text-sm font-extrabold text-[#2c3340] rounded-full bg-white/70 px-3 py-1">
                      {formatNum(price, locale)} SEK
                    </span>
                  </div>
                  <Slider
                    min={PRICE_MIN}
                    max={PRICE_MAX}
                    step={PRICE_STEP}
                    value={[price]}
                    onValueChange={(v) => setPrice(v[0] ?? PRICE_MIN)}
                    className="py-2 [&_[data-slot=slider-range]]:bg-[var(--nc-coral)] [&_[data-slot=slider-thumb]]:border-[var(--nc-coral)]"
                  />
                  <div className="flex justify-between text-[11px] font-bold text-[#94a0b0] mt-2">
                    <span>{PRICE_MIN} SEK</span>
                    <span>{PRICE_MAX} SEK</span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-bold text-[#2c3340]">
                      {t('roiConversion', locale)}
                    </label>
                    <span className="text-sm font-extrabold text-[#2c3340] rounded-full bg-white/70 px-3 py-1">
                      {formatPct(conversionPct, locale)}
                    </span>
                  </div>
                  <Slider
                    min={CONVERSION_MIN}
                    max={CONVERSION_MAX}
                    step={CONVERSION_STEP}
                    value={[conversionPct]}
                    onValueChange={(v) => setConversionPct(v[0] ?? CONVERSION_MIN)}
                    className="py-2 [&_[data-slot=slider-range]]:bg-[var(--nc-coral)] [&_[data-slot=slider-thumb]]:border-[var(--nc-coral)]"
                  />
                  <div className="flex justify-between text-[11px] font-bold text-[#94a0b0] mt-2">
                    <span>{formatPct(CONVERSION_MIN, locale)}</span>
                    <span>{formatPct(CONVERSION_MAX, locale)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div
              className="relative rounded-[1.75rem] p-8 sm:p-10 overflow-hidden"
              style={{
                background:
                  'linear-gradient(160deg, rgba(242,238,255,0.95) 0%, rgba(215,236,255,0.9) 100%)',
              }}
            >
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#5b6472] mb-4">
                {t('roiEstimatedRevenue', locale)}
              </p>
              <p className="font-display font-extrabold text-4xl sm:text-5xl tracking-tight text-[#2c3340] mb-4">
                {formatNum(monthlyIncome, locale)}
                <span className="text-lg font-bold text-[#5b6472] ml-1">SEK/mo</span>
              </p>
              <p className="text-[#2c3340] font-extrabold leading-relaxed mb-3 max-w-sm">
                {earnLine}
              </p>
              <p className="text-[#5b6472] font-medium leading-relaxed mb-8 max-w-sm">
                {membersLine}
              </p>
              <Link
                href="/account/signup"
                className="inline-flex items-center justify-center gap-2 min-h-12 px-7 rounded-full font-extrabold text-sm text-white transition-all active:scale-[0.98]"
                style={{
                  background: 'var(--nc-coral)',
                  boxShadow: '0 12px 28px -10px rgba(155,138,251,0.5)',
                }}
              >
                {t('landingCtaStartFree', locale)} <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
