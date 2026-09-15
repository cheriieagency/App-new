/**
 * Shared landing typography — Editorial Minimalism (Playfair + Inter).
 * Matches waitlist / admin: alabaster paper, ink, forest accents & CTAs.
 * Product mockups (PlatformShowcaseStudio) may keep denser internal UI type.
 */

/** Italic Playfair emphasis — same ink as headlines, cursive accent words */
export const ltAccent = 'font-playfair italic font-normal text-[#2C2621]';

/** Quiet Inter eyebrow above section titles */
export const ltEyebrow =
  'text-[10px] font-inter font-medium uppercase tracking-[0.18em] text-[#8A857D]';

/** Soft pill badge (hero / comparison) */
export const ltBadge =
  'inline-flex items-center rounded-full border border-[#E6E3DB] bg-[rgba(44,59,46,0.06)] px-3.5 py-1.5 text-[10px] font-inter font-medium uppercase tracking-[0.18em] text-[#2C3B2E]';

/** Primary page hero */
export const ltHero =
  'font-playfair font-medium text-4xl sm:text-5xl lg:text-[4.25rem] tracking-[-0.02em] leading-[1.08] text-[#2C2621]';

/** Supporting line under hero */
export const ltHeroSub =
  'mt-4 mx-auto max-w-2xl text-[#8A857D] font-inter text-base sm:text-lg leading-relaxed font-normal';

/** Standard section H2 */
export const ltSection =
  'font-playfair font-medium text-3xl sm:text-4xl lg:text-5xl text-[#2C2621] tracking-[-0.02em] leading-[1.12]';

/** Section supporting paragraph */
export const ltSectionSub =
  'mt-3 text-[#8A857D] font-inter font-normal text-base sm:text-lg leading-relaxed';

/** Card / feature title */
export const ltCardTitle =
  'font-playfair font-medium text-xl text-[#2C2621] tracking-tight';

/** Larger feature title (featured bento) */
export const ltCardTitleLg =
  'font-playfair font-medium text-xl sm:text-2xl text-[#2C2621] tracking-tight';

/** Card body copy */
export const ltCardBody =
  'mt-2 text-sm text-[#8A857D] font-inter leading-relaxed';

/** Muted helper / fine print */
export const ltMuted = 'text-sm text-[#8A857D] font-inter leading-relaxed';

/** Primary / secondary CTA label */
export const ltCta = 'text-sm font-inter font-medium tracking-wide';

/** Soft paper panel (replaces pink → lilac gradient) */
export const ltGradientPanel =
  'border border-[#E6E3DB] bg-gradient-to-br from-[#FFFFFF] via-[#F9F8F6] to-[rgba(44,59,46,0.06)] text-[#2C2621] shadow-[0_12px_30px_-12px_rgba(44,38,33,0.08)]';

/** Centered section header stack */
export const ltHeaderWrap = 'max-w-2xl mx-auto text-center mb-8 sm:mb-10';

/** Primary forest CTA fill */
export const ltCtaPrimary =
  'bg-[#2C3B2E] hover:bg-[#243228] text-[#F9F8F6] shadow-none';

/** Secondary outlined CTA */
export const ltCtaSecondary =
  'bg-[#FFFFFF] border border-[#E6E3DB] text-[#2C2621] hover:bg-[#F0EFEA] hover:border-[#D5D0C6]';
