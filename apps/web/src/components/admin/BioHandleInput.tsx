'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, Loader2, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { t, type Locale } from '@/lib/i18n';
import {
  normalizeBioHandle,
  validateBioHandleFormat,
  type BioHandleReason,
} from '@/lib/bio-handle';

export type HandleAvailabilityStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'own'
  | 'taken'
  | 'invalid'
  | 'too_short'
  | 'too_long'
  | 'reserved'
  | 'empty'
  | 'error';

type Props = {
  value: string;
  onChange: (next: string) => void;
  workspaceId: string;
  locale: Locale;
  className?: string;
  /** Fires whenever the debounced availability result changes. */
  onStatusChange?: (status: HandleAvailabilityStatus, available: boolean) => void;
};

function reasonToStatus(reason: BioHandleReason): HandleAvailabilityStatus {
  switch (reason) {
    case 'available':
      return 'available';
    case 'own':
      return 'own';
    case 'taken':
      return 'taken';
    case 'reserved':
      return 'reserved';
    case 'too_short':
      return 'too_short';
    case 'too_long':
      return 'too_long';
    case 'invalid':
      return 'invalid';
    case 'empty':
      return 'empty';
    default:
      return 'idle';
  }
}

function statusMessage(status: HandleAvailabilityStatus, locale: Locale): string {
  switch (status) {
    case 'checking':
      return t('handleChecking', locale);
    case 'available':
      return t('handleAvailable', locale);
    case 'own':
      return t('handleYours', locale);
    case 'taken':
      return t('handleTaken', locale);
    case 'reserved':
      return t('handleReserved', locale);
    case 'too_short':
      return t('handleTooShort', locale);
    case 'too_long':
      return t('handleTooLong', locale);
    case 'invalid':
      return t('handleInvalid', locale);
    case 'error':
      return t('handleCheckFailed', locale);
    default:
      return '';
  }
}

function isPositive(status: HandleAvailabilityStatus): boolean {
  return status === 'available' || status === 'own';
}

function isNegative(status: HandleAvailabilityStatus): boolean {
  return (
    status === 'taken' ||
    status === 'reserved' ||
    status === 'invalid' ||
    status === 'too_short' ||
    status === 'too_long' ||
    status === 'error'
  );
}

/**
 * Bio Builder handle field with live availability feedback.
 */
export default function BioHandleInput({
  value,
  onChange,
  workspaceId,
  locale,
  className,
  onStatusChange,
}: Props) {
  const [status, setStatus] = useState<HandleAvailabilityStatus>('idle');
  const onStatusRef = useRef(onStatusChange);
  onStatusRef.current = onStatusChange;

  useEffect(() => {
    const format = validateBioHandleFormat(value);
    if (!format.ok) {
      const next = reasonToStatus(format.reason);
      setStatus(next);
      onStatusRef.current?.(next, false);
      return;
    }

    setStatus('checking');
    onStatusRef.current?.('checking', false);

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const qs = new URLSearchParams({
          handle: format.handle,
          ...(workspaceId ? { workspaceId } : {}),
        });
        const r = await fetch(`/api/admin/bio/handle-availability?${qs}`, {
          credentials: 'include',
          signal: controller.signal,
          cache: 'no-store',
        });
        const data = (await r.json().catch(() => ({}))) as {
          available?: boolean;
          reason?: BioHandleReason;
        };
        if (!r.ok) {
          setStatus('error');
          onStatusRef.current?.('error', false);
          return;
        }
        const next = reasonToStatus(
          data.reason || (data.available ? 'available' : 'taken')
        );
        setStatus(next);
        onStatusRef.current?.(next, Boolean(data.available));
      } catch (err) {
        if ((err as { name?: string })?.name === 'AbortError') return;
        setStatus('error');
        onStatusRef.current?.('error', false);
      }
    }, 400);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [value, workspaceId]);

  const message = statusMessage(status, locale);
  const borderClass = isNegative(status)
    ? 'border-rose-300 focus-visible:border-rose-400'
    : isPositive(status)
      ? 'border-emerald-300 focus-visible:border-emerald-400'
      : 'border-zinc-200';

  return (
    <div className={className}>
      <label className="text-[10px] font-mono font-extrabold uppercase tracking-widest text-zinc-400 block mb-1">
        Handle
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-400 font-mono">
          @
        </span>
        <Input
          value={value}
          onChange={(e) => onChange(normalizeBioHandle(e.target.value))}
          className={`rounded-xl text-sm pl-7 pr-9 ${borderClass}`}
          autoComplete="off"
          spellCheck={false}
          aria-invalid={isNegative(status)}
          aria-describedby="bio-handle-status"
        />
        <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2">
          {status === 'checking' && (
            <Loader2 size={14} className="animate-spin text-zinc-400" aria-hidden />
          )}
          {isPositive(status) && (
            <Check size={14} className="text-emerald-600" strokeWidth={3} aria-hidden />
          )}
          {isNegative(status) && status !== 'error' && (
            <X size={14} className="text-rose-500" strokeWidth={3} aria-hidden />
          )}
        </span>
      </div>
      {message ? (
        <p
          id="bio-handle-status"
          className={`mt-1.5 text-[11px] font-semibold ${
            isPositive(status)
              ? 'text-emerald-600'
              : isNegative(status)
                ? 'text-rose-600'
                : 'text-zinc-400'
          }`}
          role="status"
          aria-live="polite"
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
