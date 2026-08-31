'use client';

/**
 * Compact upload progress bar for R2 / large media uploads.
 */

export default function UploadProgressBar({
  progress,
  label = 'Uploading…',
  className = '',
}: {
  progress: number;
  label?: string;
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, Math.round(progress)));

  return (
    <div
      className={`w-full space-y-1.5 ${className}`}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className="flex items-center justify-between gap-2 text-[11px] font-semibold text-slate-500">
        <span>{label}</span>
        <span className="font-mono tabular-nums text-slate-700">{pct}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-[#F472B6] transition-[width] duration-150 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
