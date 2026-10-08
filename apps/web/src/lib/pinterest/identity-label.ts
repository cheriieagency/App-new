/**
 * Client-safe Pinterest display helpers (no SQL / Node imports).
 */

/** True when a label looks like an opaque id rather than a Pinterest username. */
export function looksLikeOpaquePinterestId(value: string | null | undefined): boolean {
  if (!value) return true;
  const cleaned = value.replace(/^@/, '').trim();
  if (!cleaned) return true;
  if (cleaned === 'Pinterest account') return true;
  if (/^Pinterest\s+\w{4,}$/i.test(cleaned)) return true;
  // nanoid-ish / opaque tokens e.g. 06w46iaf23z1o7m4u0ya1f4jvsv10w
  if (/^[a-z0-9]{16,}$/i.test(cleaned) && !/[_\-.]/.test(cleaned)) return true;
  return false;
}
