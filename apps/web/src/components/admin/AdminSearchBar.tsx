'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { ADMIN_NAV_ITEMS } from '@/components/admin/adminNavItems';
import { useAdminNav, type AdminSection } from '@/components/admin/AdminNavContext';
import { t, tNested, useLanguage, type Locale } from '@/lib/i18n';

/** Extra English/Nordic tokens so short queries still hit the right page. */
const SEARCH_ALIASES: Partial<Record<AdminSection, string[]>> = {
  home: ['home', 'command', 'dashboard', 'hem'],
  calendar: ['planner', 'calendar', 'content', 'schedule', 'kalender'],
  media: ['media', 'library', 'assets', 'files', 'bilder'],
  projects: ['projects', 'campaigns', 'projekt'],
  inbox: ['inbox', 'dm', 'messages', 'social', 'meddelanden'],
  analytics: ['analytics', 'revenue', 'stats', 'reports', 'analys'],
  ads: ['ads', 'meta', 'facebook ads', 'annonser'],
  biobuilder: ['bio', 'link', 'store', 'links', 'länk'],
  community: ['community', 'classroom', 'members', 'gemenskap'],
  email: ['email', 'crm', 'newsletter', 'subscribers', 'mejl'],
  settings: ['settings', 'socials', 'integrations', 'inställningar'],
};

type AdminSearchBarProps = {
  locale: Locale;
  className?: string;
};

export default function AdminSearchBar({ locale, className }: AdminSearchBarProps) {
  const router = useRouter();
  const { setSection } = useAdminNav();
  const { t: tNav } = useLanguage();
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ADMIN_NAV_ITEMS.filter((item) => {
      if (!q) return true;
      const label = tNav(item.labelKey).toLowerCase();
      const aliases = (SEARCH_ALIASES[item.key] || []).join(' ');
      return (
        label.includes(q) ||
        item.key.includes(q) ||
        aliases.includes(q) ||
        aliases.split(/\s+/).some((a) => a.startsWith(q))
      );
    });
  }, [query, tNav]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, open]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointer);
    return () => document.removeEventListener('mousedown', onPointer);
  }, [open]);

  const go = (key: AdminSection) => {
    setOpen(false);
    setQuery('');
    if (key === 'calendar') {
      router.push('/planner');
      return;
    }
    if (key === 'ads') {
      router.push('/ads');
      return;
    }
    setSection(key);
    router.push(`/admin?tab=${key}`);
  };

  return (
    <div ref={rootRef} className={className ?? 'relative w-full max-w-md hidden sm:block flex-1'}>
      <Search
        size={15}
        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
      />
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            setOpen(false);
            inputRef.current?.blur();
            return;
          }
          if (!open || results.length === 0) return;
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIndex((i) => (i + 1) % results.length);
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIndex((i) => (i - 1 + results.length) % results.length);
          } else if (e.key === 'Enter') {
            e.preventDefault();
            const hit = results[activeIndex] ?? results[0];
            if (hit) go(hit.key);
          }
        }}
        placeholder={t('adminSearchPlaceholder', locale)}
        role="combobox"
        aria-expanded={open}
        aria-controls="admin-search-results"
        aria-autocomplete="list"
        className="w-full max-w-md bg-white text-sm rounded-xl border border-slate-200/90 pl-10 pr-16 py-2 min-h-[40px] font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-300"
      />
      <span className="absolute right-3 top-1/2 -translate-y-1/2 hidden md:inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 capitalize pointer-events-none">
        {t('adminSearchHint', locale)}
      </span>

      {open ? (
        <div
          id="admin-search-results"
          role="listbox"
          className="absolute left-0 right-0 top-full mt-2 z-40 max-h-72 overflow-y-auto rounded-2xl border border-slate-200/90 bg-white shadow-xl"
        >
          {results.length === 0 ? (
            <p className="px-4 py-3 text-xs font-medium text-slate-500">
              {t('adminSearchEmpty', locale)}
            </p>
          ) : (
            <ul className="py-1.5">
              {results.map((item, index) => {
                const Icon = item.icon;
                const active = index === activeIndex;
                return (
                  <li key={item.key} role="option" aria-selected={active}>
                    <button
                      type="button"
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => go(item.key)}
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 min-h-[44px] text-left transition-colors ${
                        active ? 'bg-slate-50' : 'hover:bg-slate-50'
                      }`}
                    >
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 flex-shrink-0">
                        <Icon size={15} strokeWidth={2.25} />
                      </span>
                      <span className="text-sm font-semibold text-slate-800">
                        {tNested(item.labelKey, locale)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
