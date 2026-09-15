'use client';

/**
 * Editorial Clikd mark — serif “C.” (Playfair / Georgia stack via font-serif).
 * Quiet gallery mark. No pink/midnight badge, no image assets.
 */
export function ClikdMark({
  size = 32,
  className = '',
}: {
  size?: number;
  className?: string;
}) {
  const fontSize = Math.max(18, Math.round(size * 0.95));
  return (
    <span
      className={`inline-flex items-center justify-center shrink-0 font-serif italic font-medium tracking-tight text-[#2C2621] leading-none ${className}`}
      style={{ fontSize, minHeight: size, minWidth: size }}
      aria-hidden
    >
      C.
    </span>
  );
}

/** Editorial wordmark — Playfair “Clikd.” with forest period. */
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
        className={`font-serif font-medium text-[#2C2621] tracking-tight ${textClassName}`}
      >
        Clikd<span className="text-[#2C3B2E]">.</span>
      </span>
    </span>
  );
}
