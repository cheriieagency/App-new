/**
 * GET /api/auth/callback
 * Supabase Auth email links land here (`type=recovery|signup`, `code`, `token_hash`).
 * Recovery is forwarded to /update-password so the client can call updateUser.
 *
 * Hash fragments (`#access_token&type=recovery`) never reach the server —
 * a tiny HTML page forwards them to /update-password.
 */

import { NextResponse } from 'next/server';

const RECOVERY_TYPES = new Set(['recovery', 'magiclink']);
const VERIFY_TYPES = new Set(['signup', 'email', 'email_change']);

export async function GET(request: Request) {
  const url = new URL(request.url);
  const type = (url.searchParams.get('type') || '').toLowerCase();
  const next = url.searchParams.get('next') || '';
  const tokenHash = url.searchParams.get('token_hash');
  const code = url.searchParams.get('code');
  const error =
    url.searchParams.get('error_description') || url.searchParams.get('error');

  if (error) {
    const dest = new URL('/account/signin', url.origin);
    dest.searchParams.set('error', error);
    return NextResponse.redirect(dest);
  }

  const recovery =
    RECOVERY_TYPES.has(type) || next.includes('update-password');

  if (tokenHash || code || type) {
    const dest = new URL(
      recovery ? '/update-password' : '/account/signin',
      url.origin
    );
    if (tokenHash) dest.searchParams.set('token_hash', tokenHash);
    if (code) dest.searchParams.set('code', code);
    if (type) dest.searchParams.set('type', type);
    if (VERIFY_TYPES.has(type) && !recovery) {
      dest.searchParams.set('verified', '1');
    }
    return NextResponse.redirect(dest);
  }

  // Implicit-flow recovery: tokens live in the hash after this document loads.
  const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Redirecting…</title>
  </head>
  <body style="font-family:system-ui,sans-serif;background:#FAFAFA;color:#64748b;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;">
    <p>Redirecting…</p>
    <script>
      (function () {
        var hash = window.location.hash || '';
        var params = new URLSearchParams(hash.replace(/^#/, ''));
        var type = (params.get('type') || '').toLowerCase();
        if (type === 'recovery') {
          window.location.replace('/update-password' + hash);
          return;
        }
        if (type === 'signup' || type === 'email' || type === 'email_change') {
          window.location.replace('/account/signin?verified=1');
          return;
        }
        window.location.replace('/account/signin' + (hash ? hash : ''));
      })();
    </script>
  </body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
