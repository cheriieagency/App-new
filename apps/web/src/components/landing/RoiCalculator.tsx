'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Slider } from '@/components/ui/slider';

const CONVERSION_RATE = 0.02;
const FOLLOWER_MIN = 1000;
const FOLLOWER_MAX = 50000;
const FOLLOWER_STEP = 500;
const PRICE_MIN = 149;
const PRICE_MAX = 499;
const PRICE_STEP = 10;

function formatSek(value: number) {
  return value.toLocaleString('sv-SE');
}

export function RoiCalculator() {
  const [followers, setFollowers] = useState(10000);
  const [price, setPrice] = useState(299);

  const payingMembers = Math.round(followers * CONVERSION_RATE);
  const monthlyIncome = payingMembers * price;

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
                Potential
              </p>
              <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-[#2c3340] tracking-tight mb-3">
                Räkna på din potential
              </h2>
              <p className="text-[#5b6472] font-medium mb-10 leading-relaxed max-w-md">
                Dra i reglagen. Vi räknar på 2% konvertering — realistiskt för en engagerad
                creator-publik.
              </p>

              <div className="space-y-9">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-bold text-[#2c3340]">Följare</label>
                    <span className="text-sm font-extrabold text-[#2c3340] rounded-full bg-white/70 px-3 py-1">
                      {formatSek(followers)}
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
                    <span>{formatSek(FOLLOWER_MIN)}</span>
                    <span>{formatSek(FOLLOWER_MAX)}</span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-bold text-[#2c3340]">Månadspris</label>
                    <span className="text-sm font-extrabold text-[#2c3340] rounded-full bg-white/70 px-3 py-1">
                      {formatSek(price)} SEK
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
              </div>
            </div>

            <div
              className="relative rounded-[1.75rem] p-8 sm:p-10 overflow-hidden"
              style={{
                background:
                  'linear-gradient(160deg, rgba(255,232,225,0.95) 0%, rgba(215,236,255,0.9) 100%)',
              }}
            >
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#5b6472] mb-4">
                Uppskattad månadsintäkt
              </p>
              <p className="font-display font-extrabold text-4xl sm:text-5xl tracking-tight text-[#2c3340] mb-4">
                {formatSek(monthlyIncome)}
                <span className="text-lg font-bold text-[#5b6472] ml-1">kr/mån</span>
              </p>
              <p className="text-[#5b6472] font-medium leading-relaxed mb-8 max-w-sm">
                Ca {formatSek(payingMembers)} betalande medlemmar à {formatSek(price)} SEK vid 2%
                konvertering.
              </p>
              <Link
                href="/account/signup"
                className="inline-flex items-center justify-center gap-2 min-h-12 px-7 rounded-full font-extrabold text-sm text-white transition-all active:scale-[0.98]"
                style={{
                  background: 'var(--nc-coral)',
                  boxShadow: '0 12px 28px -10px rgba(255,122,92,0.5)',
                }}
              >
                Skapa gratis community <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
