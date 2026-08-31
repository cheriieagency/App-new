/**
 * Later-style More Options helpers for Content Planner posts.
 */

const IG_USERNAME_RE = /^[a-z0-9._]{1,30}$/i;

/** Strip @ and normalize; keep only valid IG handles (max 3). */
export function normalizeCollaborators(raw: unknown): string[] {
  const list = Array.isArray(raw)
    ? raw
    : typeof raw === 'string'
      ? raw.split(/[,;\s]+/)
      : [];
  const cleaned: string[] = [];
  const seen = new Set<string>();
  for (const item of list) {
    const handle = String(item || '')
      .trim()
      .replace(/^@+/, '')
      .toLowerCase();
    if (!handle || !IG_USERNAME_RE.test(handle) || seen.has(handle)) continue;
    seen.add(handle);
    cleaned.push(handle);
    if (cleaned.length >= 3) break;
  }
  return cleaned;
}

export function isValidInstagramUsername(raw: string): boolean {
  const handle = raw.trim().replace(/^@+/, '');
  return IG_USERNAME_RE.test(handle);
}

export function normalizePostTags(raw: unknown): string[] {
  const list = Array.isArray(raw)
    ? raw
    : typeof raw === 'string'
      ? raw.split(/[,]+/)
      : [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of list) {
    const tag = String(item || '')
      .trim()
      .replace(/^#+/, '')
      .slice(0, 48);
    if (!tag) continue;
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(tag);
    if (out.length >= 24) break;
  }
  return out;
}

export function normalizeOptionalText(raw: unknown, max = 2200): string | null {
  if (raw == null) return null;
  const text = String(raw).trim();
  if (!text) return null;
  return text.slice(0, max);
}

export function normalizeOptionalUrl(raw: unknown): string | null {
  const text = normalizeOptionalText(raw, 2048);
  if (!text) return null;
  try {
    const url = new URL(text.startsWith('http') ? text : `https://${text}`);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return url.toString();
  } catch {
    return null;
  }
}

export type PlannerMoreOptions = {
  collaborators: string[];
  first_comment: string | null;
  location_name: string | null;
  location_id: string | null;
  link_in_bio_url: string | null;
  post_tags: string[];
  campaign_tag: string | null;
};

export function parseMoreOptionsFromBody(
  body: Record<string, unknown>
): Partial<PlannerMoreOptions> {
  const out: Partial<PlannerMoreOptions> = {};
  if (
    body.collaborators !== undefined ||
    body.collaboratorUsernames !== undefined
  ) {
    out.collaborators = normalizeCollaborators(
      body.collaborators ?? body.collaboratorUsernames
    );
  }
  if (body.first_comment !== undefined || body.firstComment !== undefined) {
    out.first_comment = normalizeOptionalText(
      body.first_comment ?? body.firstComment,
      2200
    );
  }
  if (body.location_name !== undefined || body.locationName !== undefined) {
    out.location_name = normalizeOptionalText(
      body.location_name ?? body.locationName,
      200
    );
  }
  if (body.location_id !== undefined || body.locationId !== undefined) {
    const id = normalizeOptionalText(
      body.location_id ?? body.locationId,
      64
    );
    out.location_id = id;
  }
  if (
    body.link_in_bio_url !== undefined ||
    body.linkInBioUrl !== undefined
  ) {
    out.link_in_bio_url = normalizeOptionalUrl(
      body.link_in_bio_url ?? body.linkInBioUrl
    );
  }
  if (body.post_tags !== undefined || body.postTags !== undefined) {
    out.post_tags = normalizePostTags(body.post_tags ?? body.postTags);
  }
  if (body.campaign_tag !== undefined || body.campaignTag !== undefined) {
    out.campaign_tag = normalizeOptionalText(
      body.campaign_tag ?? body.campaignTag,
      120
    );
  }
  return out;
}
