'use client';

import { useState } from 'react';
import Link from 'next/link';
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

const sliderAccent =
  'py-2 [&_[data-slot=slider-track]]:bg-slate-200 [&_[data-slot=slider-range]]:bg-[#F472B6] [&_[data-slot=slider-thumb]]:border-[#F472B6] [&_[data-slot=slider-thumb]]:bg-white [&_[data-slot=slider-thumb]]:shadow-sm';

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
    <section
      id="roi"
      className="relative py-16 sm:py-24 overflow-hidden bg-[#FAFAFA]"
      aria-labelledby="roi-heading"
    >
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6">
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-[0_1px_2px_rgba(15,23,42,0.03)] p-7 sm:p-10 lg:p-12">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
            <div>
              <p className="text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-[#F472B6] mb-3">
                {t('roiEyebrow', locale)}
              </p>
              <h2
                id="roi-heading"
                className="font-outfit font-extrabold text-3xl sm:text-4xl text-slate-900 tracking-tight mb-3 leading-tight"
              >
                {t('roiHeadline', locale)}
              </h2>
              <p className="text-slate-600 font-medium mb-10 leading-relaxed max-w-md font-display">
                {t('roiSub', locale)}
              </p>

              <div className="space-y-9">
                <div>
                  <div className="flex items-center justify-between mb-3 gap-3">
                    <label className="text-sm font-bold text-slate-900 font-display">
                      {t('roiFollowers', locale)}
                    </label>
                    <span className="text-sm font-extrabold text-[#2B2568] rounded-full bg-[#E9D5FF]/50 border border-[#E9D5FF] px-3 py-1 font-mono tabular-nums">
                      {formatNum(followers, locale)}
                    </span>
                  </div>
                  <Slider
                    min={FOLLOWER_MIN}
                    max={FOLLOWER_MAX}
                    step={FOLLOWER_STEP}
                    value={[followers]}
                    onValueChange={(v) => setFollowers(v[0] ?? FOLLOWER_MIN)}
                    className={sliderAccent}
                  />
                  <div className="flex justify-between text-[11px] font-bold text-slate-400 mt-2 font-mono">
                    <span>{formatNum(FOLLOWER_MIN, locale)}</span>
                    <span>{formatNum(FOLLOWER_MAX, locale)}</span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3 gap-3">
                    <label className="text-sm font-bold text-slate-900 font-display">
                      {t('roiMonthlyPrice', locale)}
                    </label>
                    <span className="text-sm font-extrabold text-[#2B2568] rounded-full bg-[#E9D5FF]/50 border border-[#E9D5FF] px-3 py-1 font-mono tabular-nums">
                      {formatNum(price, locale)} SEK
                    </span>
                  </div>
                  <Slider
                    min={PRICE_MIN}
                    max={PRICE_MAX}
                    step={PRICE_STEP}
                    value={[price]}
                    onValueChange={(v) => setPrice(v[0] ?? PRICE_MIN)}
                    className={sliderAccent}
                  />
                  <div className="flex justify-between text-[11px] font-bold text-slate-400 mt-2 font-mono">
                    <span>{PRICE_MIN} SEK</span>
                    <span>{PRICE_MAX} SEK</span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3 gap-3">
                    <label className="text-sm font-bold text-slate-900 font-display">
                      {t('roiConversion', locale)}
                    </label>
                    <span className="text-sm font-extrabold text-[#2B2568] rounded-full bg-[#E9D5FF]/50 border border-[#E9D5FF] px-3 py-1 font-mono tabular-nums">
                      {formatPct(conversionPct, locale)}
                    </span>
                  </div>
                  <Slider
                    min={CONVERSION_MIN}
                    max={CONVERSION_MAX}
                    step={CONVERSION_STEP}
                    value={[conversionPct]}
                    onValueChange={(v) => setConversionPct(v[0] ?? CONVERSION_MIN)}
                    className={sliderAccent}
                  />
                  <div className="flex justify-between text-[11px] font-bold text-slate-400 mt-2 font-mono">
                    <span>{formatPct(CONVERSION_MIN, locale)}</span>
                    <span>{formatPct(CONVERSION_MAX, locale)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative rounded-2xl p-8 sm:p-10 overflow-hidden bg-[#0F172A] text-white border border-[#0F172A] shadow-[0_8px_40px_-12px_rgba(15,23,42,0.35)]">
              <div
                className="absolute -top-20 -right-16 w-56 h-56 rounded-full pointer-events-none"
                style={{
                  background:
                    'radial-gradient(circle, rgba(244,114,182,0.28) 0%, transparent 68%)',
                }}
                aria-hidden
              />
              <div className="relative">
                <p className="text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-[#F472B6] mb-4">
                  {t('roiEstimatedRevenue', locale)}
                </p>
                <p className="font-outfit font-extrabold text-4xl sm:text-5xl tracking-tight text-white mb-4 tabular-nums">
                  {formatNum(monthlyIncome, locale)}
                  <span className="text-lg font-bold text-slate-400 ml-1.5">SEK/mo</span>
                </p>
                <p className="text-white font-extrabold leading-relaxed mb-3 max-w-sm font-display">
                  {earnLine}
                </p>
                <p className="text-slate-400 font-medium leading-relaxed mb-8 max-w-sm font-display">
                  {membersLine}
                </p>
                <Link
                  href="/account/signup"
                  className="inline-flex items-center justify-center gap-2 min-h-12 px-7 rounded-xl font-bold text-sm text-white bg-[#F472B6] hover:bg-[#F472B6]/90 shadow-lg shadow-[#F472B6]/25 transition-all active:scale-[0.98]"
                >
                  {t('landingCtaStartFree', locale)}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
