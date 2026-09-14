'use client';

/**
 * Editorial Clikd mark — Playfair Display italic “C.”
 * Quiet gallery mark. No pink/midnight badge.
 */
export function ClikdMark({
  size = 32,
  className = '',
}: {
  size?: number;
  className?: string;
}) {
  const fontSize = Math.max(18, Math.round(size * 0.9));
  return (
    <div
      className={`flex items-center justify-center shrink-0 font-playfair italic font-medium tracking-tight text-[#2C2621] leading-none ${className}`}
      style={{
        width: size,
        height: size,
        fontSize,
      }}
      aria-hidden
    >
      C.
    </div>
  );
}

/** Editorial wordmark — Playfair “Clikd.” with forest colon optional. */
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
        className={`font-playfair font-medium text-[#2C2621] tracking-tight ${textClassName}`}
      >
        Clikd<span className="text-[#2C3B2E]">.</span>
      </span>
    </span>
  );
}
