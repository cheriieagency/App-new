'use client';

/**
 * Frame size picker for Post Studio — Square / Portrait / Vertical.
 */

import {
  MEDIA_ASPECT_OPTIONS,
  type MediaAspectRatio,
} from '@/lib/planner/media-aspect';
import InfoTooltip from '@/components/ui/InfoTooltip';

export default function MediaAspectPicker({
  value,
  options,
  onChange,
}: {
  value: MediaAspectRatio;
  options: MediaAspectRatio[];
  onChange: (next: MediaAspectRatio) => void;
}) {
  if (options.length < 2) return null;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-0.5">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
          Image size
        </p>
        <InfoTooltip
          side="top"
          iconSize={14}
          ariaLabel="About image size"
          content={
            <>
              This setting applies to <strong>static images</strong> and photo
              carousels only. Single videos keep their platform default (e.g.
              Reels / TikTok vertical).
            </>
          }
        />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {MEDIA_ASPECT_OPTIONS.filter((o) => options.includes(o.id)).map(
          (opt) => {
            const active = value === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onChange(opt.id)}
                className={`inline-flex min-h-[44px] items-center gap-2 rounded-xl border px-3 text-left transition-colors ${
                  active
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
                aria-pressed={active}
              >
                <span
                  className={`block w-4 rounded-[2px] border ${
                    active
                      ? 'border-white/70 bg-white/20'
                      : 'border-slate-300 bg-slate-100'
                  } ${
                    opt.id === '1:1'
                      ? 'h-4'
                      : opt.id === '4:5'
                        ? 'h-5'
                        : 'h-6'
                  }`}
                  aria-hidden
                />
                <span className="text-xs font-semibold tabular-nums">
                  {opt.label}
                </span>
                <span
                  className={`text-[10px] ${
                    active ? 'text-white/70' : 'text-slate-400'
                  }`}
                >
                  {opt.hint}
                </span>
              </button>
            );
          }
        )}
      </div>
    </div>
  );
}
