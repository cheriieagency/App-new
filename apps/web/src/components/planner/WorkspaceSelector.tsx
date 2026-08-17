'use client';

import { useMemo, useState, useEffect } from 'react';
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
import { useLocale } from '@/lib/locale-context';
import { t } from '@/lib/i18n';
import OptimizedImage from '@/components/ui/OptimizedImage';

function BrandAvatar({
  workspace,
  size = 36,
  round = false,
}: {
  workspace: BrandWorkspace;
  size?: number;
  round?: boolean;
}) {
  const radius = round ? 'rounded-full' : 'rounded-xl';
  if (workspace.avatar_url) {
    return (
      <OptimizedImage
        src={workspace.avatar_url}
        alt=""
        width={size}
        height={size}
        sizes={`${size}px`}
        className={`${radius} object-cover flex-shrink-0`}
        style={{ background: workspace.color }}
      />
    );
  }
  return (
    <div
      className={`${radius} flex items-center justify-center text-white font-black flex-shrink-0`}
      style={{ width: size, height: size, background: workspace.color, fontSize: size * 0.38 }}
    >
      {workspace.name?.[0] ?? 'B'}
    </div>
  );
}

function TriggerSkeleton({ compact }: { compact: boolean }) {
  return (
    <div
      className={
        compact
          ? 'flex items-center gap-2.5 w-full h-11 min-h-[44px] rounded-2xl border border-slate-200/90 bg-white pl-1.5 pr-3'
          : 'flex items-center gap-2 h-10 min-h-[40px] max-w-[220px] sm:max-w-[300px] rounded-xl border border-slate-200/90 bg-white pl-1.5 pr-2.5'
      }
      aria-hidden
    >
      <div
        className={`bg-slate-100 flex-shrink-0 ${compact ? 'h-7 w-7 rounded-full' : 'h-[30px] w-[30px] rounded-xl'}`}
      />
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="h-3 w-24 max-w-full rounded bg-slate-100" />
        {!compact ? <div className="h-2.5 w-16 rounded bg-slate-50" /> : null}
      </div>
    </div>
  );
}

export default function WorkspaceSelector({
  workspaces,
  activeId,
  onSelect,
  onCreateNew,
  compact = false,
}: {
  workspaces: BrandWorkspace[];
  activeId: string;
  onSelect: (workspace: BrandWorkspace) => void;
  onCreateNew: () => void;
  /** Name-only trigger (admin shell reference). */
  compact?: boolean;
}) {
  const { locale } = useLocale();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  // Avoid SSR/client mismatch when workspaces hydrate from local storage after mount.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const accountWord = (n: number) =>
    t(n === 1 ? 'accountSingular' : 'accountPlural', locale);

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

  if (!mounted) {
    const skeleton = <TriggerSkeleton compact={compact} />;
    if (!compact) return skeleton;
    return (
      <div className="space-y-1.5">
        <p className="text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-slate-400 px-0.5">
          {t('socialSpaces', locale)}
        </p>
        {skeleton}
      </div>
    );
  }

  if (!active) {
    const emptyCreate = (
      <button
        type="button"
        onClick={onCreateNew}
        className={
          compact
            ? 'flex items-center justify-center gap-2 w-full h-11 min-h-[44px] rounded-2xl border border-dashed border-slate-300 bg-white px-3 text-[13px] font-semibold text-[#2B2568] hover:border-[#F472B6] hover:bg-[#FCE7F3]/40 transition-colors'
            : 'flex items-center justify-center gap-2 h-10 min-h-[40px] rounded-xl border border-dashed border-slate-300 bg-white px-3 text-xs font-bold text-[#2B2568] hover:border-[#F472B6] hover:bg-[#FCE7F3]/40 transition-colors'
        }
      >
        <Plus size={15} className="text-[#F472B6]" strokeWidth={2} />
        {t('createTeamWorkspace', locale)}
      </button>
    );
    if (!compact) return emptyCreate;
    return (
      <div className="space-y-1.5">
        <p className="text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-slate-400 px-0.5">
          {t('socialSpaces', locale)}
        </p>
        {emptyCreate}
      </div>
    );
  }

  const selector = (
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
          className={
            compact
              ? 'flex items-center gap-2.5 w-full h-11 min-h-[44px] rounded-2xl border border-slate-200/90 bg-white pl-1.5 pr-3 hover:border-slate-300 hover:bg-slate-50/80 transition-colors text-left'
              : 'flex items-center gap-2 h-10 min-h-[40px] max-w-[220px] sm:max-w-[300px] rounded-xl border border-slate-200/90 bg-white pl-1.5 pr-2.5 hover:border-slate-300 hover:bg-slate-50/80 transition-colors text-left'
          }
        >
          <span>
            <BrandAvatar workspace={active} size={compact ? 28 : 30} round={compact} />
          </span>
          <div className="min-w-0 flex-1">
            <p
              className={
                compact
                  ? 'text-[13px] font-semibold text-slate-800 truncate leading-tight'
                  : 'text-xs font-bold text-slate-900 truncate leading-tight'
              }
            >
              {active.name}
            </p>
            {!compact && (
              <p className="text-[10px] text-slate-500 font-semibold truncate">
                {workspaceChannelLabel(active, accountWord(active.channels.length))}
              </p>
            )}
          </div>
          <ChevronDown size={14} className="text-slate-400 flex-shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={8}
        className="w-[min(360px,92vw)] p-0 rounded-2xl overflow-hidden border border-slate-200/80 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.08)]"
      >
        <div className="p-3.5 border-b border-slate-200/80 bg-[#FAFAFA]/80">
          <p className="text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-slate-400 mb-2.5 px-0.5">
            {t(compact ? 'socialSpaces' : 'teamWorkspacesBrands', locale)}
          </p>
          <div className="relative">
            <Search
              size={14}
              strokeWidth={1.75}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('searchBrand', locale)}
              className="w-full h-11 min-h-[44px] rounded-xl border border-slate-200/90 bg-white pl-9 pr-3 text-sm font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-300"
            />
          </div>
        </div>

        <div className="max-h-[320px] overflow-y-auto p-2 space-y-0.5">
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
                className={`w-full text-left rounded-2xl p-2.5 min-h-[44px] transition-colors ${
                  selected
                    ? 'bg-[#1a1848] text-white shadow-sm'
                    : 'hover:bg-slate-50 text-slate-900'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <BrandAvatar workspace={ws} size={36} round />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p
                        className={`text-[13px] font-semibold truncate tracking-tight ${
                          selected ? 'text-white' : 'text-slate-800'
                        }`}
                      >
                        {ws.name}
                      </p>
                      {selected && (
                        <Check size={14} className="text-[#F472B6] flex-shrink-0" strokeWidth={2.5} />
                      )}
                    </div>
                    <p
                      className={`text-[11px] font-medium truncate mt-0.5 ${
                        selected ? 'text-white/65' : 'text-slate-500'
                      }`}
                    >
                      {workspaceChannelLabel(ws, accountWord(ws.channels.length))}
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
            <p className="text-xs text-slate-400 font-medium text-center py-6">
              {t('noBrandsMatch', locale)}
            </p>
          )}
        </div>

        <div className="p-2 border-t border-slate-200/80 bg-[#FAFAFA]/60">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onCreateNew();
            }}
            className="w-full h-11 min-h-[44px] rounded-2xl text-[13px] font-semibold text-[#2B2568] hover:bg-[#E9D5FF]/50 hover:text-[#1a1848] inline-flex items-center justify-center gap-1.5 transition-colors"
          >
            <Plus size={15} strokeWidth={2} className="text-[#F472B6]" />{' '}
            {t('createTeamWorkspace', locale)}
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );

  if (!compact) return selector;

  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-slate-400 px-0.5">
        {t('socialSpaces', locale)}
      </p>
      {selector}
    </div>
  );
}

export { BrandAvatar };
