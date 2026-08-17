'use client';

/**
 * Shared avatar + account dropdown for Admin (creator) and Dashboard (community member).
 */

import { useEffect, useRef, useState } from 'react';
import { LogOut, Mail, Settings, User } from 'lucide-react';
import OptimizedImage from '@/components/ui/OptimizedImage';

export type AccountMenuRow = {
  label: string;
  value: string;
};

export type AccountMenuAction = {
  id: string;
  label: string;
  icon?: 'settings' | 'user' | 'logout';
  tone?: 'default' | 'danger';
  onClick: () => void;
};

type AccountMenuButtonProps = {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  /** Section eyebrow above detail rows (e.g. "Account" / "Konto"). */
  title: string;
  rows: AccountMenuRow[];
  actions: AccountMenuAction[];
  signOutLabel: string;
  onSignOut: () => void;
  /** Optional size tweak for community header (44px) vs admin (36px). */
  size?: 'sm' | 'md';
  className?: string;
};

function ActionIcon({ icon }: { icon?: AccountMenuAction['icon'] }) {
  if (icon === 'settings') return <Settings size={14} className="text-slate-400" />;
  if (icon === 'user') return <User size={14} className="text-slate-400" />;
  if (icon === 'logout') return <LogOut size={14} />;
  return null;
}

export default function AccountMenuButton({
  user,
  title,
  rows,
  actions,
  signOutLabel,
  onSignOut,
  size = 'sm',
  className = '',
}: AccountMenuButtonProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const displayName = user.name?.trim() || 'Account';
  const initial = (displayName[0] || 'U').toLowerCase();
  const btnSize =
    size === 'md'
      ? 'h-11 w-11 min-h-[44px] min-w-[44px]'
      : 'h-9 w-9 min-h-[36px] min-w-[36px]';

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`${btnSize} relative rounded-full overflow-hidden border border-slate-200 shadow-sm bg-slate-900 flex items-center justify-center text-white text-xs font-bold`}
        title={displayName}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        {user.image ? (
          <OptimizedImage
            src={user.image}
            alt=""
            fill
            sizes="44px"
            className="object-cover"
          />
        ) : (
          initial
        )}
      </button>

      {open ? (
        <>
          <button
            type="button"
            aria-label="Close"
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div
            role="menu"
            className="absolute right-0 top-full mt-2 w-80 bg-white border border-slate-200/90 rounded-2xl shadow-xl z-50 overflow-hidden"
          >
            <div className="px-4 py-4 border-b border-slate-100 flex items-center gap-3">
              <div className="relative h-11 w-11 min-h-[44px] min-w-[44px] rounded-full overflow-hidden border border-slate-200 bg-slate-900 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                {user.image ? (
                  <OptimizedImage
                    src={user.image}
                    alt=""
                    fill
                    sizes="44px"
                    className="object-cover"
                  />
                ) : (
                  initial
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-extrabold text-slate-900 truncate">
                  {displayName}
                </p>
                <p className="text-xs font-medium text-slate-500 truncate flex items-center gap-1 mt-0.5">
                  <Mail size={11} className="flex-shrink-0 text-slate-400" />
                  {user.email || '—'}
                </p>
              </div>
            </div>

            <div className="px-4 py-3 border-b border-slate-100 space-y-2">
              <p className="text-[10px] font-mono font-bold uppercase tracking-[0.12em] text-slate-400">
                {title}
              </p>
              <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5 space-y-1.5">
                {rows.map((row) => (
                  <div
                    key={row.label}
                    className="flex items-start justify-between gap-2"
                  >
                    <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                      {row.label}
                    </span>
                    <span className="text-xs font-semibold text-slate-700 text-right break-all">
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {actions.length > 0 ? (
              <div className="py-1.5">
                {actions.map((action) => (
                  <button
                    key={action.id}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setOpen(false);
                      action.onClick();
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-3 min-h-[44px] text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <ActionIcon icon={action.icon} />
                    {action.label}
                  </button>
                ))}
              </div>
            ) : null}

            <div className="border-t border-slate-100 p-2">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  onSignOut();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-3 min-h-[44px] rounded-xl text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
              >
                <LogOut size={14} />
                {signOutLabel}
              </button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
