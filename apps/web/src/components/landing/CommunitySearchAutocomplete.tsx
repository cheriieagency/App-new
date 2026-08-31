'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { useLanguage } from '@/lib/locale-context';
import { t } from '@/lib/i18n';
import { formatCommunityPriceLabel } from '@/lib/communities/pricing';

export type SearchableCommunity = {
  id: number;
  name: string;
  description: string;
  category: string;
  creator_name: string;
  creator_image?: string | null;
  cover_color?: string | null;
  member_count: number;
  is_featured?: boolean;
  is_joined?: boolean;
  slug?: string | null;
  /** Monthly membership price in SEK (0 = free). From admin `monthly_price_sek`. */
  monthly_price?: number | null;
  price?: number | null;
  is_free?: boolean;
  workspace_id?: string | null;
  creator_id?: string | null;
};

type CommunitySearchAutocompleteProps = {
  value: string;
  onChange: (value: string) => void;
  communities: SearchableCommunity[];
  onSelectCommunity: (community: SearchableCommunity) => void;
  placeholder?: string;
  isLoading?: boolean;
};

function matchesQuery(c: SearchableCommunity, q: string): boolean {
  const haystack = [c.name, c.category, c.creator_name, c.slug, c.description]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  // Map filter aliases so Marketing matches Marknadsföring, etc.
  const aliases: Record<string, string[]> = {
    marketing: ['marketing', 'marknads'],
    health: ['health', 'hälsa', 'fitness'],
    finance: ['finance', 'ekonomi', 'e-com', 'ecom', 'e-handel', 'ehandel'],
    coaching: ['coaching', 'coach'],
    tech: ['tech', 'design'],
  };
  if (aliases[q]) {
    return aliases[q].some((a) => haystack.includes(a));
  }
  return haystack.includes(q);
}

export function CommunitySearchAutocomplete({
  value,
  onChange,
  communities,
  onSelectCommunity,
  placeholder,
  isLoading = false,
}: CommunitySearchAutocompleteProps) {
  const { locale } = useLanguage();
  const resolvedPlaceholder = placeholder || t('searchPlaceholder', locale);
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);

  const suggestions = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return [];
    return communities.filter((c) => matchesQuery(c, q)).slice(0, 8);
  }, [communities, value]);

  const showDropdown = open && value.trim().length >= 1;

  useEffect(() => {
    setHighlight(0);
  }, [value]);

  useEffect(() => {
    const onPointerDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  const selectAt = (index: number) => {
    const community = suggestions[index];
    if (!community) return;
    onSelectCommunity(community);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative w-full max-w-2xl">
      <label className="sr-only" htmlFor={listId}>
        Search communities
      </label>
      <div className="relative">
        <Search
          size={16}
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
          aria-hidden
        />
        <input
          ref={inputRef}
          id={listId}
          type="search"
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls={`${listId}-listbox`}
          aria-autocomplete="list"
          aria-label="Search communities"
          autoComplete="off"
          placeholder={resolvedPlaceholder}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (!showDropdown || suggestions.length === 0) return;
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setHighlight((h) => (h + 1) % suggestions.length);
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setHighlight((h) => (h - 1 + suggestions.length) % suggestions.length);
            } else if (e.key === 'Enter') {
              e.preventDefault();
              selectAt(highlight);
            }
          }}
          className="w-full min-h-12 pl-11 pr-20 rounded-2xl bg-white/90 backdrop-blur-md border border-slate-200/90 text-sm font-medium text-slate-900 placeholder:text-slate-400 shadow-sm outline-none focus:border-[#F472B6]/50 focus:ring-2 focus:ring-[#FCE7F3] transition-all"
        />
        {value.length > 0 ? (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => {
              onChange('');
              setOpen(false);
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 min-h-11 min-w-11 inline-flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <X size={16} />
          </button>
        ) : (
          <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center gap-0.5 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-bold text-slate-400">
            ⌘K
          </kbd>
        )}
      </div>

      {showDropdown && (
        <div
          id={`${listId}-listbox`}
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 overflow-hidden rounded-2xl border border-slate-200/90 bg-white/95 backdrop-blur-xl shadow-xl shadow-slate-200/80"
        >
          {isLoading && suggestions.length === 0 && (
            <p className="px-4 py-3 text-sm font-medium text-slate-500">Loading…</p>
          )}

          {!isLoading && suggestions.length === 0 && (
            <p className="px-4 py-3 text-sm font-medium text-slate-500">
              No results for “{value.trim()}”
            </p>
          )}

          <ul className="max-h-80 overflow-y-auto py-1">
            {suggestions.map((community, index) => {
              const active = index === highlight;
              const price =
                community.monthly_price ?? community.price ?? null;
              const priceLabel = formatCommunityPriceLabel(
                price,
                community.is_free
              );
              return (
                <li key={community.id} role="option" aria-selected={active}>
                  <button
                    type="button"
                    onMouseEnter={() => setHighlight(index)}
                    onClick={() => selectAt(index)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 min-h-14 text-left transition-colors ${
                      active ? 'bg-[#FCE7F3]/70' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div
                      className="w-10 h-10 rounded-xl overflow-hidden shrink-0 border border-slate-100 bg-gradient-to-br from-[#2B2568] to-[#F472B6]"
                    >
                      {community.creator_image ? (
                        <img
                          src={community.creator_image}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-sm font-black text-white">
                          {(community.name?.[0] ?? 'C').toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-extrabold text-slate-900 truncate">
                        {community.name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="inline-flex items-center text-[10px] font-extrabold uppercase tracking-wider text-[#2B2568] bg-[#E9D5FF]/70 px-2 py-0.5 rounded-full">
                          #{community.category || 'Community'}
                        </span>
                        <span className="text-[11px] font-bold text-slate-400">
                          {priceLabel}
                        </span>
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
