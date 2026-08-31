/**
 * On publish, optionally point the workspace Link in Bio spotlight redirect
 * at the URL set in More Options → Drive Traffic With Link in Bio.
 */

import { upsertBioLinkDestination } from '@/lib/bio-clicks/persist';

/** Stable per-workspace slug for the planner-driven spotlight destination. */
export function workspaceSpotlightSlug(workspaceId: string): string {
  const clean = workspaceId
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return `spotlight-${clean || 'workspace'}`;
}

export async function updateLinkInBioOnPublish(input: {
  workspaceId: string;
  userId: string;
  destinationUrl: string;
  title?: string | null;
}): Promise<{ slug: string; destinationUrl: string } | null> {
  const workspaceId = input.workspaceId.trim();
  const destinationUrl = input.destinationUrl.trim();
  if (!workspaceId || !destinationUrl) return null;
  if (!process.env.DATABASE_URL?.trim()) return null;

  const slug = workspaceSpotlightSlug(workspaceId);
  await upsertBioLinkDestination({
    slug,
    workspaceId,
    userId: input.userId,
    title: input.title?.trim() || 'Spotlight (from Content Planner)',
    destinationUrl,
    blockId: 'planner-spotlight',
  });

  return { slug, destinationUrl };
}
