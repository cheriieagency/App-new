'use client';

import { useMemo, useState } from 'react';
import { Check, ChevronDown, Plus, Search } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { PlatformBadge } from '@/components/planner/PlatformBadge';
import {
  workspaceChannelLabel,
  type BrandWorkspace,
} from '@/lib/mock-content-planner';

function BrandAvatar({
  workspace,
  size = 36,
}: {
  workspace: BrandWorkspace;
  size?: number;
}) {
  const dim = `${size}px`;
  if (workspace.avatar_url) {
    return (
      <img
        src={workspace.avatar_url}
        alt=""
        className="rounded-xl object-cover flex-shrink-0"
        style={{ width: dim, height: dim, background: workspace.color }}
      />
    );
  }
  return (
    <div
      className="rounded-xl flex items-center justify-center text-white font-black flex-shrink-0"
      style={{ width: dim, height: dim, background: workspace.color, fontSize: size * 0.38 }}
    >
      {workspace.name?.[0] ?? 'B'}
    </div>
  );
}

export default function WorkspaceSelector({
  workspaces,
  activeId,
  onSelect,
  onCreateNew,
}: {
  workspaces: BrandWorkspace[];
  activeId: string;
  onSelect: (workspace: BrandWorkspace) => void;
  onCreateNew: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const active =
    workspaces.find((w) => w.id === activeId) || workspaces[0] || null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return workspaces;
    return workspaces.filter(
      (w) =>
        w.name.toLowerCase().includes(q) ||
        w.handle.toLowerCase().includes(q)
    );
  }, [workspaces, query]);

  if (!active) return null;

  return (
    <Popover
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) setQuery('');
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 h-11 min-h-[44px] max-w-[220px] sm:max-w-[280px] rounded-xl border border-zinc-200 bg-white pl-1.5 pr-2.5 hover:border-zinc-300 transition-colors text-left"
        >
          <BrandAvatar workspace={active} size={32} />
          <div className="min-w-0 flex-1">
            <p className="text-xs sm:text-sm font-black text-[#2c3340] truncate leading-tight">
              {active.name}
            </p>
            <p className="text-[10px] text-zinc-400 font-bold truncate">
              {workspaceChannelLabel(active)}
            </p>
          </div>
          <ChevronDown size={14} className="text-zinc-400 flex-shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[min(360px,92vw)] p-0 rounded-2xl overflow-hidden border-zinc-100 shadow-lg"
      >
        <div className="p-3 border-b border-zinc-100">
          <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2 px-0.5">
            Team-ytor / Varumärken
          </p>
          <div className="relative">
            <Search
              size={13}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Sök varumärke…"
              className="w-full h-10 min-h-[44px] rounded-xl border border-zinc-200 bg-zinc-50 pl-9 pr-3 text-sm font-medium focus:outline-none focus:border-[var(--nc-coral)] focus:bg-white"
            />
          </div>
        </div>

        <div className="max-h-[320px] overflow-y-auto p-2 space-y-1">
          {filtered.map((ws) => {
            const selected = ws.id === active.id;
            return (
              <button
                key={ws.id}
                type="button"
                onClick={() => {
                  onSelect(ws);
                  setOpen(false);
                  setQuery('');
                }}
                className={`w-full text-left rounded-xl p-2.5 transition-colors ${
                  selected
                    ? 'bg-[color-mix(in_srgb,var(--nc-coral)_10%,white)]'
                    : 'hover:bg-zinc-50'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <BrandAvatar workspace={ws} size={40} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-extrabold text-[#2c3340] truncate">
                        {ws.name}
                      </p>
                      {selected && (
                        <Check size={14} className="text-[var(--nc-coral)] flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-zinc-500 font-bold truncate">
                      {workspaceChannelLabel(ws)}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {ws.channels.map((c) => (
                        <PlatformBadge key={c} platform={c} />
                      ))}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <p className="text-xs text-zinc-400 font-medium text-center py-6">
              Inga varumärken matchar.
            </p>
          )}
        </div>

        <div className="p-2 border-t border-zinc-100">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onCreateNew();
            }}
            className="w-full h-11 min-h-[44px] rounded-xl text-xs font-extrabold text-[var(--nc-coral)] hover:bg-[color-mix(in_srgb,var(--nc-coral)_8%,white)] inline-flex items-center justify-center gap-1.5"
          >
            <Plus size={14} /> Skapa Ny Team-yta / Varumärke
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export { BrandAvatar };
