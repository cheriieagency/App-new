'use client';

import { useId, useState, type KeyboardEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PlatformShowcaseStudio } from '@/components/landing/PlatformShowcaseStudio';
import { useLanguage } from '@/lib/locale-context';
import { t } from '@/lib/i18n';
import {
  SHOWCASE_TABS,
  getShowcaseCopy,
  type ShowcaseTabId,
} from '@/lib/i18n/showcase-copy';

const TAB_ICON: Record<ShowcaseTabId, string> = {
  planner: 'fa-solid fa-paper-plane text-purple-500',
  biostore: 'fa-solid fa-store text-pink-500',
  metaads: 'fa-solid fa-rectangle-ad text-blue-500',
  crm: 'fa-regular fa-envelope text-emerald-500',
  inbox: 'fa-regular fa-comments text-indigo-500',
  community: 'fa-solid fa-users text-purple-500',
  analytics: 'fa-solid fa-house text-amber-500',
};

/** Circle-style tabbed product showcase — live studio chrome per category. */
export function PlatformShowcaseSection() {
  const { locale } = useLanguage();
  const copy = getShowcaseCopy(locale);
  const [active, setActive] = useState<ShowcaseTabId>('planner');
  const tab = copy.tabs[active];
  const baseId = useId();

  const onTabKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    index: number
  ) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    event.preventDefault();
    const next =
      event.key === 'ArrowRight'
        ? (index + 1) % SHOWCASE_TABS.length
        : (index - 1 + SHOWCASE_TABS.length) % SHOWCASE_TABS.length;
    const nextId = SHOWCASE_TABS[next];
    setActive(nextId);
    document.getElementById(`${baseId}-tab-${nextId}`)?.focus();
  };

  return (
    <section
      id="the-platform"
      className="relative py-16 sm:py-24 overflow-hidden bg-[#FAFAFA]"
      aria-labelledby="platform-showcase-heading"
    >
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 space-y-10">
        <header className="text-center max-w-2xl mx-auto">
          <h2
            id="platform-showcase-heading"
            className="font-outfit font-bold text-4xl sm:text-5xl text-slate-900 tracking-tight leading-tight"
          >
            {copy.headline}
          </h2>
          <p className="mt-3 text-slate-600 font-medium text-base sm:text-lg leading-relaxed font-display">
            {copy.sub}
          </p>
        </header>

        <div
          role="tablist"
          aria-label={copy.headline}
          className="flex items-center justify-center flex-wrap gap-2 text-xs font-semibold"
        >
          {SHOWCASE_TABS.map((id, index) => {
            const selected = id === active;
            return (
              <button
                key={id}
                id={`${baseId}-tab-${id}`}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls={`${baseId}-panel`}
                tabIndex={selected ? 0 : -1}
                onClick={() => setActive(id)}
                onKeyDown={(event) => onTabKeyDown(event, index)}
                className={`px-4 min-h-[44px] py-2.5 rounded-full border flex items-center gap-2 transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                  selected
                    ? 'bg-[#0F172A] text-white border-[#0F172A] shadow-[0_4px_14px_rgba(15,23,42,0.15)]'
                    : 'border-zinc-200 text-zinc-600 hover:bg-white hover:text-[#0F172A] hover:border-slate-300'
                }`}
              >
                <i className={TAB_ICON[id]} aria-hidden />
                <span>{copy.tabs[id].label}</span>
                {id === 'metaads' ? (
                  <span className="text-[9px] font-mono font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded-md border border-blue-200">
                    {t('suiteAdsNew', locale)}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        <div
          id={`${baseId}-panel`}
          role="tabpanel"
          aria-labelledby={`${baseId}-tab-${active}`}
          className="rounded-3xl border border-zinc-200/90 shadow-xl overflow-hidden bg-white"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <PlatformShowcaseStudio tab={active} />
              <span className="sr-only">{tab.title}</span>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
