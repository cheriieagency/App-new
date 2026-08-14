/**
 * Authenticated Link-in-bio analytics for the selected date range.
 * Returns click aggregates only — Bio Builder Active blocks decide which products appear.
 */

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { aggregateBioLinkClicks } from '@/lib/bio-clicks/persist';
import sql from '@/app/api/utils/sql';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const workspaceId = String(
    searchParams.get('workspaceId') ||
      request.headers.get('x-workspace-id') ||
      ''
  ).trim();
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  let handle = String(searchParams.get('handle') || '')
    .replace(/^@/, '')
    .toLowerCase();

  if (!workspaceId) {
    return NextResponse.json({ error: 'workspaceId required' }, { status: 400 });
  }

  // Optional handle from published bio (for click matching) — product list stays client-side.
  if (!handle) {
    try {
      const rows = await sql`
        SELECT handle FROM bio_blocks
        WHERE user_id::text = ${session.user.id}
        LIMIT 1
      `;
      const row = rows?.[0] as { handle?: string } | undefined;
      if (row?.handle) {
        handle = String(row.handle).replace(/^@/, '').toLowerCase();
      }
    } catch {
      /* ignore */
    }
  }

  const aggs = await aggregateBioLinkClicks({
    workspaceId,
    handle: handle || null,
    from,
    to,
  });

  // Click aggregates only — Bio Builder Active blocks on the client decide which products appear.
  const links = aggs.map((a) => ({
    slug: a.slug,
    title: a.title || 'Link',
    clicks: a.clicks,
    unique: a.unique,
    destination_url: a.destination_url || '',
    tracked_url: `/r/${a.slug}`,
    block_id: a.block_id,
  }));

  const totalClicks = links.reduce((n, l) => n + l.clicks, 0);
  const totalUnique = links.reduce((n, l) => n + l.unique, 0);

  return NextResponse.json({
    workspace_id: workspaceId,
    handle: handle || null,
    from: from || null,
    to: to || null,
    total_clicks: totalClicks,
    total_unique: totalUnique,
    links,
  });
}
