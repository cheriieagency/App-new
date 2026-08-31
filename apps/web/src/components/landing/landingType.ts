/**
 * Shared landing typography — keep headers / subs / body coherent site-wide.
 * Product mockups (PlatformShowcaseStudio) may keep denser internal UI type.
 */

/** Solid brand pink for headline accents (matches hero “built for social media.”) */
export const ltAccent = 'text-[#F472B6]';

/** Pink mono eyebrow above section titles */
export const ltEyebrow =
  'text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-[#F472B6]';

/** Soft pill badge (hero / comparison) */
export const ltBadge =
  'inline-flex items-center rounded-full bg-[#FCE7F3] border border-[#F472B6]/20 px-3.5 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#2B2568]';

/** Primary page hero (waitlist + product hero) */
export const ltHero =
  'font-outfit font-extrabold text-4xl sm:text-5xl lg:text-6xl tracking-tight leading-[1.08] text-slate-900';

/** Supporting line under hero */
export const ltHeroSub =
  'mt-4 mx-auto max-w-2xl text-slate-600 font-display text-base sm:text-lg leading-relaxed font-medium';

/** Standard section H2 */
export const ltSection =
  'font-outfit font-bold text-3xl sm:text-4xl lg:text-5xl text-slate-900 tracking-tight leading-tight';

/** Section supporting paragraph */
export const ltSectionSub =
  'mt-3 text-slate-600 font-medium text-base sm:text-lg leading-relaxed font-display';

/** Card / feature title */
export const ltCardTitle =
  'font-outfit font-bold text-xl text-slate-900 tracking-tight';

/** Larger feature title (featured bento) */
export const ltCardTitleLg =
  'font-outfit font-extrabold text-xl sm:text-2xl text-slate-900 tracking-tight';

/** Card body copy */
export const ltCardBody =
  'mt-2 text-sm text-slate-600 font-display leading-relaxed';

/** Muted helper / fine print */
export const ltMuted = 'text-sm text-slate-500 font-display leading-relaxed';

/** Primary / secondary CTA label */
export const ltCta = 'text-sm font-extrabold';

/** Soft pink → white → lilac panel (matches comparison winner card) */
export const ltGradientPanel =
  'border border-[#E9D5FF] bg-gradient-to-br from-[#FCE7F3] via-white to-[#E9D5FF]/70 text-slate-900 shadow-[0_16px_40px_-12px_rgba(43,37,104,0.12)]';

/** Centered section header stack */
export const ltHeaderWrap = 'max-w-2xl mx-auto text-center mb-8 sm:mb-10';
