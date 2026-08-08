'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Bot,
  CalendarDays,
  MessageSquare,
  Receipt,
  ShoppingBag,
} from 'lucide-react';

const FEATURES = [
  {
    id: 'store',
    icon: ShoppingBag,
    title: 'Link-in-Bio Storefront',
    summary: 'Swish-checkout, order bumps och 1-click upsells i en mobilbutik.',
    details: [
      'Swish-checkout under 10 sekunder',
      'Order bumps i kassan',
      '1-click upsells efter köp',
      'Mobiloptimerad butiksyta',
    ],
  },
  {
    id: 'community',
    icon: MessageSquare,
    title: 'Community & gamification',
    summary: 'Feed, XP, nivåer och topplistor som håller medlemmar kvar.',
    details: [
      'Inlägg och diskussioner',
      'XP, nivåer och badges',
      'Topplistor',
      'Medlemsroller',
    ],
  },
  {
    id: 'events',
    icon: CalendarDays,
    title: 'Live & events',
    summary: 'Schemalägg, OSA, nedräkning och realtidschatt i samma app.',
    details: [
      'OSA och liveschema',
      'Nedräkning till start',
      'Kalendersynk',
      'Chatt under live',
    ],
  },
  {
    id: 'ai',
    icon: Bot,
    title: 'AI Copilot Suite',
    summary: 'Creator AI, Member AI och Business Manager — inbyggda.',
    details: [
      'Kursinnehåll med Creator AI',
      'Elevstöd med Member AI',
      'Tillväxttips från Business Manager',
      'Alltid i appen',
    ],
  },
  {
    id: 'finance',
    icon: Receipt,
    title: 'Nordisk ekonomi',
    summary: 'Rätt moms, Fortnox-kvitton och BankID från start.',
    details: [
      'Moms 6% / 25%',
      'Fortnox-kvitton',
      'BankID-inloggning',
      'Byggt för Norden',
    ],
  },
];

export function FeaturesSection() {
  const [activeId, setActiveId] = useState(FEATURES[0].id);
  const active = FEATURES.find((f) => f.id === activeId) ?? FEATURES[0];
  const ActiveIcon = active.icon;

  return (
    <section className="relative py-20 sm:py-28 overflow-hidden">
      <div
        className="nc-blob w-[28rem] h-[28rem] -left-20 top-20 opacity-70"
        style={{ background: 'var(--nc-sky)' }}
      />
      <div
        className="nc-blob w-80 h-80 right-0 bottom-10 opacity-60"
        style={{ background: 'var(--nc-blush)' }}
      />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6">
        <div className="max-w-2xl mb-12">
          <p
            className="text-xs font-extrabold uppercase tracking-[0.16em] mb-3"
            style={{ color: 'var(--nc-coral)' }}
          >
            Plattformen
          </p>
          <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-[#2c3340] tracking-tight">
            Vad appen erbjuder
          </h2>
          <p className="mt-4 text-[#5b6472] font-medium text-base sm:text-lg leading-relaxed">
            En yta för att sälja, engagera och undervisa — inte fem flikar med olika logotyper.
          </p>
        </div>

        <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-6 lg:gap-8 items-start">
          <div className="nc-glass rounded-[1.75rem] p-2 space-y-1">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              const isActive = feature.id === activeId;
              return (
                <button
                  key={feature.id}
                  type="button"
                  onClick={() => setActiveId(feature.id)}
                  className={`w-full text-left flex items-start gap-3.5 px-3.5 py-3.5 rounded-[1.25rem] transition-all min-h-14 ${
                    isActive
                      ? 'bg-white/90 text-[#2c3340] shadow-sm'
                      : 'text-[#5b6472] hover:bg-white/40'
                  }`}
                >
                  <div
                    className="w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 mt-0.5"
                    style={{
                      background: isActive ? 'var(--nc-coral-soft)' : 'rgba(255,255,255,0.5)',
                    }}
                  >
                    <Icon
                      size={16}
                      style={{ color: isActive ? 'var(--nc-coral)' : '#94a0b0' }}
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="font-display font-bold text-sm sm:text-base text-[#2c3340]">
                      {feature.title}
                    </p>
                    <p className="text-sm font-medium mt-0.5 leading-snug text-[#5b6472]">
                      {feature.summary}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={active.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
              className="nc-glass rounded-[1.75rem] p-7 sm:p-9 relative overflow-hidden"
            >
              <div
                className="nc-blob w-48 h-48 -top-10 -right-10 opacity-80"
                style={{ background: 'var(--nc-coral-soft)' }}
              />
              <div className="relative">
                <div className="flex items-center gap-3 mb-5">
                  <div
                    className="w-12 h-12 rounded-[1.1rem] flex items-center justify-center"
                    style={{ background: 'var(--nc-coral-soft)' }}
                  >
                    <ActiveIcon size={22} style={{ color: 'var(--nc-coral)' }} />
                  </div>
                  <h3 className="font-display font-extrabold text-xl text-[#2c3340]">
                    {active.title}
                  </h3>
                </div>
                <p className="text-[#5b6472] font-medium mb-6 leading-relaxed">{active.summary}</p>
                <ul className="space-y-3">
                  {active.details.map((detail) => (
                    <li
                      key={detail}
                      className="flex items-center gap-3 text-sm font-semibold text-[#2c3340] rounded-2xl bg-white/60 px-3.5 py-2.5"
                    >
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ background: 'var(--nc-coral)' }}
                      />
                      {detail}
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
