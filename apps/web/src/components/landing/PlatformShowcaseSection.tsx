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
  planner: 'fa-solid fa-paper-plane text-[#2C3B2E]',
  biostore: 'fa-solid fa-store text-[#2C3B2E]',
  analytics: 'fa-solid fa-chart-line text-[#2C3B2E]',
  crm: 'fa-regular fa-envelope text-[#2C2621]',
  inbox: 'fa-regular fa-comments text-[#2C3B2E]',
  community: 'fa-solid fa-users text-[#2C2621]',
};

/** Circle-style tabbed product showcase — live studio chrome per category. */
export function PlatformShowcaseSection() {
  const { locale } = useLanguage();
  const copy = getShowcaseCopy(locale);
  const [active, setActive] = useState<ShowcaseTabId>('analytics');
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
      className="relative py-16 sm:py-24 overflow-hidden bg-[#F9F8F6]"
      aria-label={copy.headline}
    >
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 space-y-10">
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
                    ? 'bg-[#2C2621] text-white border-[#2C2621] shadow-[0_4px_14px_rgba(44,59,46,0.18)]'
                    : 'border-zinc-200 text-zinc-600 hover:bg-white hover:text-[#2C2621] hover:border-[#E6E3DB]'
                }`}
              >
                <i className={TAB_ICON[id]} aria-hidden />
                <span>{copy.tabs[id].label}</span>
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
