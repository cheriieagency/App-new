/**
 * Public Link-in-bio click tracker.
 * Called from /bio pages (beacon) and used by /r/{slug} redirects.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  hashVisitorKey,
  recordBioLinkClick,
  upsertBioLinkDestination,
} from '@/lib/bio-clicks/persist';

export const runtime = 'nodejs';

const VISITOR_COOKIE = 'clikd_vid';

function readJson(request: NextRequest): Promise<Record<string, unknown>> {
  return request.json().catch(() => ({}));
}

export async function POST(request: NextRequest) {
  const body = await readJson(request);
  const slug = String(body.slug || '').trim();
  const workspaceId = String(body.workspaceId || body.workspace_id || '').trim();
  if (!slug || !workspaceId) {
    return NextResponse.json(
      { error: 'slug and workspaceId are required' },
      { status: 400 }
    );
  }

  const destinationUrl = String(
    body.destinationUrl || body.destination_url || ''
  ).trim();
  const handle = String(body.handle || '').replace(/^@/, '').toLowerCase() || null;
  const blockId = String(body.blockId || body.block_id || '').trim() || null;
  const title = String(body.title || '').trim() || null;
  const userId = String(body.userId || body.user_id || '').trim() || null;
  // registerOnly = map /r/{slug} → destination without counting a click.
  const registerOnly =
    body.registerOnly === true ||
    body.register_only === true ||
    body.mode === 'register';

  const cookieVid = request.cookies.get(VISITOR_COOKIE)?.value || null;
  const visitorKey = hashVisitorKey({
    cookie: cookieVid,
    ip:
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip'),
    ua: request.headers.get('user-agent'),
  });

  try {
    if (destinationUrl) {
      await upsertBioLinkDestination({
        slug,
        workspaceId,
        userId,
        handle,
        title,
        destinationUrl,
        blockId,
      });
    }

    if (!registerOnly) {
      await recordBioLinkClick({
        workspaceId,
        userId,
        handle,
        slug,
        blockId,
        title,
        destinationUrl: destinationUrl || null,
        visitorKey,
      });
    }
  } catch (error) {
    console.error('[api/bio/click]', error);
    return NextResponse.json({ error: 'Failed to record click' }, { status: 500 });
  }

  const res = NextResponse.json({ ok: true, registered: Boolean(destinationUrl) });
  if (!registerOnly && !cookieVid) {
    res.cookies.set(VISITOR_COOKIE, visitorKey, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  return res;
}
