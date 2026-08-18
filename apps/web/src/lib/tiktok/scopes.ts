/**
 * TikTok Login Kit / Content Posting scopes (client-safe).
 */

export const TIKTOK_POSTING_SCOPES = ['video.publish', 'video.upload'] as const;

export const TIKTOK_POSTING_SCOPE_HELP =
  'TikTok did not grant posting permission (video.publish / video.upload). In TikTok for Developers: add the Content Posting API product, turn on Direct Post, add those two scopes, then in clikd: Settings → Socials → Disconnect TikTok → Connect again. On the consent screen, allow every permission.';

export function parseTikTokScopeList(scope?: string | null): string[] {
  if (!scope) return [];
  return scope
    .split(/[\s,]+/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function tikTokHasPostingScope(scope?: string | null): boolean {
  const granted = parseTikTokScopeList(scope);
  return (
    granted.includes('video.publish') || granted.includes('video.upload')
  );
}
