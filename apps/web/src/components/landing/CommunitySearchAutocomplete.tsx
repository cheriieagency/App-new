'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';

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
  monthly_price?: number | null;
  price?: number | null;
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
  return haystack.includes(q);
}

export function CommunitySearchAutocomplete({
  value,
  onChange,
  communities,
  onSelectCommunity,
  placeholder = 'Sök communities, ämnen, kreatörer...',
  isLoading = false,
}: CommunitySearchAutocompleteProps) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
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
    <div ref={rootRef} className="relative w-full max-w-xl">
      <label className="sr-only" htmlFor={listId}>
        Sök communities
      </label>
      <div className="relative">
        <Search
          size={16}
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400"
          aria-hidden
        />
        <input
          id={listId}
          type="search"
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls={`${listId}-listbox`}
          aria-autocomplete="list"
          aria-label="Sök communities"
          autoComplete="off"
          placeholder={placeholder}
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
          className="w-full min-h-12 pl-11 pr-11 rounded-2xl bg-white border border-zinc-200 text-sm font-medium text-zinc-900 placeholder:text-zinc-400 shadow-sm outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100 transition-all"
        />
        {value.length > 0 && (
          <button
            type="button"
            aria-label="Rensa sökning"
            onClick={() => {
              onChange('');
              setOpen(false);
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 min-h-11 min-w-11 inline-flex items-center justify-center rounded-xl text-zinc-400 hover:text-zinc-700 hover:bg-zinc-50 transition-colors"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {showDropdown && (
        <div
          id={`${listId}-listbox`}
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl shadow-zinc-200/80"
        >
          {isLoading && suggestions.length === 0 && (
            <p className="px-4 py-3 text-sm font-medium text-zinc-500">Söker communities…</p>
          )}

          {!isLoading && suggestions.length === 0 && (
            <p className="px-4 py-3 text-sm font-medium text-zinc-500">
              Inga träffar för &quot;{value.trim()}&quot;
            </p>
          )}

          <ul className="max-h-80 overflow-y-auto py-1">
            {suggestions.map((community, index) => {
              const active = index === highlight;
              return (
                <li key={community.id} role="option" aria-selected={active}>
                  <button
                    type="button"
                    onMouseEnter={() => setHighlight(index)}
                    onClick={() => selectAt(index)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 min-h-14 text-left transition-colors ${
                      active ? 'bg-zinc-100' : 'hover:bg-zinc-50'
                    }`}
                  >
                    <div
                      className="w-10 h-10 rounded-xl overflow-hidden shrink-0 border border-zinc-100"
                      style={{ backgroundColor: community.cover_color ?? '#0f1f1c' }}
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
                      <p className="text-sm font-black text-zinc-900 truncate">{community.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="inline-flex items-center text-[10px] font-black uppercase tracking-wider text-zinc-600 bg-zinc-100 px-2 py-0.5 rounded-full">
                          #{community.category || 'Community'}
                        </span>
                        {community.creator_name && (
                          <span className="text-[11px] font-medium text-zinc-400 truncate">
                            {community.creator_name}
                          </span>
                        )}
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
