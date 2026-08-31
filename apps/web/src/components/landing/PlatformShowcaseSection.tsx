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
import { ltAccent, ltHeaderWrap, ltSection, ltSectionSub } from '@/components/landing/landingType';

const TAB_ICON: Record<ShowcaseTabId, string> = {
  planner: 'fa-solid fa-paper-plane text-[#F472B6]',
  biostore: 'fa-solid fa-store text-[#F472B6]',
  metaads: 'fa-solid fa-rectangle-ad text-[#2B2568]',
  crm: 'fa-regular fa-envelope text-[#2B2568]',
  inbox: 'fa-regular fa-comments text-[#F472B6]',
  community: 'fa-solid fa-users text-[#2B2568]',
  analytics: 'fa-solid fa-chart-simple text-[#F472B6]',
};

/** Circle-style tabbed product showcase — live studio chrome per category. */
export function PlatformShowcaseSection() {
  const { locale } = useLanguage();
  const copy = getShowcaseCopy(locale);
  const [active, setActive] = useState<ShowcaseTabId>('planner');
  const tab = copy.tabs[active];
  const baseId = useId();
  // Split “Made by …, for …” / Swedish “…, för …” so the second line is solid brand pink
  const forSplit = copy.headline.includes(', for ')
    ? { sep: ', for ' as const, prefix: 'for ' as const }
    : copy.headline.includes(', för ')
      ? { sep: ', för ' as const, prefix: 'för ' as const }
      : null;
  const headlineParts = forSplit ? copy.headline.split(forSplit.sep) : [copy.headline];
  const shouldSplitHeadline = Boolean(forSplit && headlineParts.length === 2);

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
        <header className={`${ltHeaderWrap} max-w-3xl`}>
          <h2 id="platform-showcase-heading" className={ltSection}>
            {shouldSplitHeadline ? (
              <>
                {headlineParts[0]},
                <span className={`block ${ltAccent}`}>
                  {forSplit!.prefix}
                  {headlineParts[1]}
                </span>
              </>
            ) : (
              copy.headline
            )}
          </h2>
          <p className={`${ltSectionSub} max-w-2xl mx-auto`}>{copy.sub}</p>
        </header>

        <div
          role="tablist"
          aria-label={copy.headline}
          className="flex items-center justify-start sm:justify-center gap-2 text-xs font-semibold overflow-x-auto sm:overflow-visible flex-nowrap sm:flex-wrap pb-1 sm:pb-0 -mx-1 px-1 sm:mx-0 sm:px-0 scrollbar-none"
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
                className={`shrink-0 px-3 sm:px-4 min-h-[44px] py-2.5 rounded-full border flex items-center gap-2 transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                  selected
                    ? 'bg-[#2B2568] text-white border-[#2B2568] shadow-[0_4px_14px_rgba(43,37,104,0.18)]'
                    : 'border-zinc-200 text-zinc-600 hover:bg-white hover:text-[#2B2568] hover:border-[#E9D5FF]'
                }`}
              >
                <i className={TAB_ICON[id]} aria-hidden />
                <span>{copy.tabs[id].label}</span>
                {id === 'metaads' ? (
                  <span className="text-[9px] font-mono font-bold text-[#2B2568] bg-[#E9D5FF]/70 px-1.5 py-0.5 rounded-md border border-[#E9D5FF]">
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
          className="rounded-2xl sm:rounded-3xl border border-zinc-200/90 shadow-xl overflow-hidden bg-white"
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
