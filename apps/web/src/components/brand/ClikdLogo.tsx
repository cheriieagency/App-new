'use client';

/** Clikd. signature mark — pink `c` + white `:` on midnight periwinkle. */
export function ClikdMark({
  size = 32,
  className = '',
}: {
  size?: number;
  className?: string;
}) {
  const radius = Math.max(8, Math.round(size * 0.28));
  const fontSize = Math.max(12, Math.round(size * 0.52));
  return (
    <div
      className={`flex items-center justify-center font-mono font-black tracking-tighter shadow-md shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        backgroundColor: 'var(--clikd-midnight)',
        boxShadow: '0 8px 24px -6px rgba(244, 114, 182, 0.35)',
        fontSize,
        lineHeight: 1,
      }}
      aria-hidden
    >
      <span style={{ color: 'var(--clikd-pink)' }}>c</span>
      <span className="text-white">:</span>
    </div>
  );
}

/** Clikd. wordmark — Space Grotesk + signature pink colon. */
export function ClikdWordmark({
  className = '',
  markSize = 32,
  showMark = true,
  textClassName = 'text-sm',
}: {
  className?: string;
  markSize?: number;
  showMark?: boolean;
  textClassName?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2 min-h-11 ${className}`}>
      {showMark && <ClikdMark size={markSize} />}
      <span
        className={`font-clikd-wordmark font-extrabold text-slate-900 tracking-tight ${textClassName}`}
      >
        clikd<span style={{ color: 'var(--clikd-pink)' }}>:</span>
      </span>
    </span>
  );
}
