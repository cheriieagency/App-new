/**
 * Normalize community pricing from DB / API rows for public surfaces.
 */

export type CommunityPriceFields = {
  monthly_price: number | null;
  price: number | null;
  is_free: boolean;
  workspace_id: string | null;
  creator_id: string | null;
};

/** Read admin `monthly_price_sek` / `is_free` from a raw community row. */
export function extractCommunityPrice(
  raw: Record<string, unknown>
): CommunityPriceFields {
  const sekRaw = raw.monthly_price_sek ?? raw.monthlyPriceSek;
  const sek =
    typeof sekRaw === 'number' || typeof sekRaw === 'string'
      ? Math.max(0, Math.round(Number(sekRaw)))
      : null;

  const monthlyAlt =
    typeof raw.monthly_price === 'number'
      ? Math.max(0, Math.round(raw.monthly_price))
      : typeof raw.price === 'number'
        ? Math.max(0, Math.round(raw.price))
        : null;

  const amount = sek != null && !Number.isNaN(sek) ? sek : monthlyAlt;

  let isFree: boolean;
  if (typeof raw.is_free === 'boolean') isFree = raw.is_free;
  else if (typeof raw.isFree === 'boolean') isFree = raw.isFree;
  else if (amount == null) isFree = false;
  else isFree = amount <= 0;

  const monthly_price = isFree ? 0 : amount ?? null;

  return {
    monthly_price,
    price: monthly_price,
    is_free: isFree,
    workspace_id:
      raw.workspace_id != null
        ? String(raw.workspace_id)
        : raw.workspaceId != null
          ? String(raw.workspaceId)
          : null,
    creator_id:
      raw.creator_id != null
        ? String(raw.creator_id)
        : raw.creatorId != null
          ? String(raw.creatorId)
          : null,
  };
}

/** Display label for search / about UI. */
export function formatCommunityPriceLabel(
  monthlyPrice: number | null | undefined,
  isFree?: boolean
): string {
  if (isFree || monthlyPrice === 0) return 'Free';
  if (typeof monthlyPrice === 'number' && monthlyPrice > 0) {
    return `${monthlyPrice.toLocaleString('sv-SE')} SEK/mo`;
  }
  return '—';
}
