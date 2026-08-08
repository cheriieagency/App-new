'use client';

import { motion } from 'motion/react';
import { Banknote, Layers, ShieldCheck, Smartphone } from 'lucide-react';

const STEPS = [
  {
    icon: Layers,
    title: 'Ett system istället för fem',
    copy: 'Butik, community, kurser och events — samma login, samma varumärke.',
  },
  {
    icon: Banknote,
    title: 'Swish & Vipps inbyggt',
    copy: 'Nordiska köpare betalar på sekunder. Du slipper Stripe-moms-krångel.',
  },
  {
    icon: ShieldCheck,
    title: 'BankID & svensk bokföring',
    copy: 'Rätt moms, Fortnox-kvitton och trygg inloggning från dag ett.',
  },
  {
    icon: Smartphone,
    title: 'Ser ut som din butik',
    copy: 'Link-in-bio-storefront som Stan — men byggd för nordiska kreatörer.',
  },
];

export function ComparisonSection() {
  return (
    <section className="relative py-20 sm:py-28 overflow-hidden">
      <div
        className="nc-blob w-80 h-80 top-10 right-0 opacity-60"
        style={{ background: 'var(--nc-mint)' }}
      />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6">
        <div className="max-w-2xl mb-12">
          <p
            className="text-xs font-extrabold uppercase tracking-[0.16em] mb-3"
            style={{ color: 'var(--nc-coral)' }}
          >
            Varför Nordic Creator
          </p>
          <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-[#2c3340] tracking-tight leading-tight">
            Sluta betala för en app-hög. Börja sälja på ett ställe.
          </h2>
          <p className="mt-4 text-[#5b6472] font-medium text-base sm:text-lg leading-relaxed">
            Det gamla sättet: Stan + Skool + Zoom + Stripe. Det nya: en plattform med Swish,
            community och kurser — utan splittrad ekonomi.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 sm:gap-5">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                className="nc-glass rounded-[1.75rem] p-6 flex gap-4"
              >
                <div
                  className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
                  style={{ background: 'var(--nc-coral-soft)' }}
                >
                  <Icon size={18} style={{ color: 'var(--nc-coral)' }} />
                </div>
                <div>
                  <h3 className="font-display font-bold text-lg text-[#2c3340] mb-1.5">
                    {step.title}
                  </h3>
                  <p className="text-[#5b6472] font-medium leading-relaxed">{step.copy}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
