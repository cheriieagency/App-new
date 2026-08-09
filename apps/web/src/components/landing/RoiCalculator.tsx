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
  'py-2 [&_[data-slot=slider-track]]:bg-slate-200 [&_[data-slot=slider-range]]:bg-indigo-600 [&_[data-slot=slider-thumb]]:border-indigo-600 [&_[data-slot=slider-thumb]]:bg-white';

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
    <section className="relative py-20 sm:py-28 overflow-hidden bg-gradient-to-b from-slate-50 via-indigo-50/30 to-slate-100">
      <div
        className="absolute -top-16 left-1/4 w-96 h-96 rounded-full bg-indigo-400/10 blur-3xl pointer-events-none"
        aria-hidden
      />
      <div
        className="absolute bottom-0 right-0 w-80 h-80 rounded-full bg-pink-400/10 blur-3xl pointer-events-none"
        aria-hidden
      />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6">
        <div className="bg-white/90 backdrop-blur-xl border border-slate-200/90 rounded-3xl shadow-xl p-7 sm:p-10 lg:p-12">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-indigo-600 mb-3">
                {t('roiEyebrow', locale)}
              </p>
              <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-slate-900 tracking-tight mb-3">
                {t('roiHeadline', locale)}
              </h2>
              <p className="text-slate-600 font-medium mb-10 leading-relaxed max-w-md">
                {t('roiSub', locale)}
              </p>

              <div className="space-y-9">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-bold text-slate-900">
                      {t('roiFollowers', locale)}
                    </label>
                    <span className="text-sm font-extrabold text-indigo-700 rounded-full bg-indigo-50 border border-indigo-100 px-3 py-1">
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
                  <div className="flex justify-between text-[11px] font-bold text-slate-400 mt-2">
                    <span>{formatNum(FOLLOWER_MIN, locale)}</span>
                    <span>{formatNum(FOLLOWER_MAX, locale)}</span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-bold text-slate-900">
                      {t('roiMonthlyPrice', locale)}
                    </label>
                    <span className="text-sm font-extrabold text-indigo-700 rounded-full bg-indigo-50 border border-indigo-100 px-3 py-1">
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
                  <div className="flex justify-between text-[11px] font-bold text-slate-400 mt-2">
                    <span>{PRICE_MIN} SEK</span>
                    <span>{PRICE_MAX} SEK</span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-bold text-slate-900">
                      {t('roiConversion', locale)}
                    </label>
                    <span className="text-sm font-extrabold text-indigo-700 rounded-full bg-indigo-50 border border-indigo-100 px-3 py-1">
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
                  <div className="flex justify-between text-[11px] font-bold text-slate-400 mt-2">
                    <span>{formatPct(CONVERSION_MIN, locale)}</span>
                    <span>{formatPct(CONVERSION_MAX, locale)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative rounded-3xl p-8 sm:p-10 overflow-hidden bg-gradient-to-br from-violet-100 via-purple-50 to-fuchsia-100 border border-purple-200/80 text-slate-900 shadow-lg shadow-purple-200/40">
              <div
                className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-gradient-to-br from-violet-300/50 via-purple-300/40 to-pink-300/40 blur-3xl pointer-events-none"
                aria-hidden
              />
              <div className="relative">
                <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-purple-600 mb-4">
                  {t('roiEstimatedRevenue', locale)}
                </p>
                <p className="font-display font-extrabold text-4xl sm:text-5xl tracking-tight text-slate-900 mb-4">
                  {formatNum(monthlyIncome, locale)}
                  <span className="text-lg font-bold text-purple-500/80 ml-1">SEK/mo</span>
                </p>
                <p className="text-slate-900 font-extrabold leading-relaxed mb-3 max-w-sm">
                  {earnLine}
                </p>
                <p className="text-slate-600 font-medium leading-relaxed mb-8 max-w-sm">
                  {membersLine}
                </p>
                <Link
                  href="/account/signup"
                  className="inline-flex items-center justify-center gap-2 min-h-12 px-7 rounded-2xl font-bold text-sm text-white bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500 hover:opacity-95 shadow-lg shadow-purple-400/30 transition-all transform hover:-translate-y-0.5"
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
