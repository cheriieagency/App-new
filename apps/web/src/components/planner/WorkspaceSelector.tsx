'use client';

import { useEffect, useMemo, useState } from 'react';
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
  const radius = round ? 'rounded-full' : 'rounded-lg';
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
      className={`${radius} flex items-center justify-center text-[#F9F8F6] font-medium flex-shrink-0`}
      style={{
        width: size,
        height: size,
        background: workspace.color || '#2C3B2E',
        fontSize: size * 0.38,
      }}
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
          ? 'flex items-center gap-2.5 w-full h-11 min-h-[44px] rounded-xl border border-[#E6E3DB] bg-[#FFFFFF] pl-1.5 pr-3'
          : 'flex items-center gap-2 h-10 min-h-[40px] max-w-[220px] sm:max-w-[300px] rounded-xl border border-[#E6E3DB] bg-[#FFFFFF] pl-1.5 pr-2.5'
      }
      aria-hidden
    >
      <div
        className={`bg-[#F0EFEA] flex-shrink-0 ${compact ? 'h-7 w-7 rounded-full' : 'h-[30px] w-[30px] rounded-lg'}`}
      />
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="h-3 w-24 max-w-full rounded bg-[#F0EFEA]" />
        {!compact ? <div className="h-2.5 w-16 rounded bg-[#F0EFEA]" /> : null}
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

  const labelClass =
    'font-inter text-[10px] font-medium uppercase tracking-[0.16em] text-[#8A857D] px-0.5';

  if (!mounted) {
    const skeleton = <TriggerSkeleton compact={compact} />;
    if (!compact) return skeleton;
    return (
      <div className="space-y-1.5">
        <p className={labelClass}>{t('socialSpaces', locale)}</p>
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
            ? 'flex items-center justify-center gap-2 w-full h-11 min-h-[44px] rounded-xl border border-dashed border-[#E6E3DB] bg-[#FFFFFF] px-3 text-[13px] font-medium text-[#2C3B2E] hover:border-[#2C3B2E]/40 hover:bg-[#F0EFEA] transition-colors'
            : 'flex items-center justify-center gap-2 h-10 min-h-[40px] rounded-xl border border-dashed border-[#E6E3DB] bg-[#FFFFFF] px-3 text-xs font-medium text-[#2C3B2E] hover:border-[#2C3B2E]/40 hover:bg-[#F0EFEA] transition-colors'
        }
      >
        <Plus size={15} className="text-[#2C3B2E]" strokeWidth={1.75} />
        {t('createTeamWorkspace', locale)}
      </button>
    );
    if (!compact) return emptyCreate;
    return (
      <div className="space-y-1.5">
        <p className={labelClass}>{t('socialSpaces', locale)}</p>
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
              ? 'flex items-center gap-2.5 w-full h-11 min-h-[44px] rounded-xl border border-[#E6E3DB] bg-[#FFFFFF] pl-1.5 pr-3 hover:border-[#D5D0C6] hover:bg-[#F0EFEA]/60 transition-colors text-left'
              : 'flex items-center gap-2 h-10 min-h-[40px] max-w-[220px] sm:max-w-[300px] rounded-xl border border-[#E6E3DB] bg-[#FFFFFF] pl-1.5 pr-2.5 hover:border-[#D5D0C6] hover:bg-[#F0EFEA]/60 transition-colors text-left'
          }
        >
          <span>
            <BrandAvatar workspace={active} size={compact ? 28 : 30} round={compact} />
          </span>
          <div className="min-w-0 flex-1">
            <p
              className={
                compact
                  ? 'text-[13px] font-medium text-[#2C2621] truncate leading-tight'
                  : 'text-xs font-medium text-[#2C2621] truncate leading-tight'
              }
            >
              {active.name}
            </p>
            {!compact && (
              <p className="text-[10px] text-[#8A857D] font-normal truncate">
                {workspaceChannelLabel(active, accountWord(active.channels.length))}
              </p>
            )}
          </div>
          <ChevronDown size={14} strokeWidth={1.75} className="text-[#8A857D] flex-shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={8}
        className="w-[min(360px,92vw)] p-0 rounded-xl overflow-hidden border border-[#E6E3DB] bg-[#FFFFFF] shadow-[0_12px_30px_-12px_rgba(44,38,33,0.08)]"
      >
        <div className="p-4 border-b border-[#E6E3DB] bg-[#F9F8F6]">
          <p className={`${labelClass} mb-2.5`}>
            {t(compact ? 'socialSpaces' : 'teamWorkspacesBrands', locale)}
          </p>
          <div className="relative">
            <Search
              size={14}
              strokeWidth={1.75}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8A857D] pointer-events-none"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('searchBrand', locale)}
              className="w-full h-11 min-h-[44px] rounded-xl border border-[#E6E3DB] bg-[#FFFFFF] pl-9 pr-3 text-sm font-normal text-[#2C2621] placeholder:text-[#8A857D] focus:outline-none focus:ring-0 focus:border-[#8A857D]"
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
                className={`w-full text-left rounded-xl p-2.5 min-h-[44px] transition-colors ${
                  selected
                    ? 'bg-[rgba(44,59,46,0.08)] text-[#2C2621]'
                    : 'hover:bg-[#F0EFEA] text-[#2C2621]'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <BrandAvatar workspace={ws} size={36} round />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="text-[13px] font-medium truncate tracking-tight text-[#2C2621]">
                        {ws.name}
                      </p>
                      {selected && (
                        <Check
                          size={14}
                          className="text-[#2C3B2E] flex-shrink-0"
                          strokeWidth={2}
                        />
                      )}
                    </div>
                    <p className="text-[11px] font-normal truncate mt-0.5 text-[#8A857D]">
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
            <p className="font-playfair italic text-sm text-[#8A857D] text-center py-8">
              {t('noBrandsMatch', locale)}
            </p>
          )}
        </div>

        <div className="p-2 border-t border-[#E6E3DB] bg-[#F9F8F6]">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onCreateNew();
            }}
            className="w-full h-11 min-h-[44px] rounded-xl text-[13px] font-medium text-[#2C3B2E] hover:bg-[rgba(44,59,46,0.08)] inline-flex items-center justify-center gap-1.5 transition-colors"
          >
            <Plus size={15} strokeWidth={1.75} className="text-[#2C3B2E]" />{' '}
            {t('createTeamWorkspace', locale)}
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );

  if (!compact) return selector;

  return (
    <div className="space-y-1.5">
      <p className={labelClass}>{t('socialSpaces', locale)}</p>
      {selector}
    </div>
  );
}

export { BrandAvatar };
