/**
 * HTML responses for OAuth callbacks opened in a popup.
 * Notifies window.opener via postMessage, then closes the popup.
 */

import { NextResponse } from 'next/server';

export type OAuthPopupCompleteOptions = {
  success: boolean;
  platform: string;
  /** Error code for OAUTH_ERROR */
  error?: string;
  detail?: string;
  /** Fallback link when there is no opener (full-tab OAuth). */
  continueHref: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeJs(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '');
}

/** Build a NextResponse HTML page that posts OAuth result to the opener. */
export function oauthPopupCompleteResponse(
  opts: OAuthPopupCompleteOptions
): NextResponse {
  const platform = escapeJs(opts.platform);
  const error = escapeJs(opts.error || 'oauth_failed');
  const detail = escapeJs((opts.detail || '').slice(0, 180));
  const href = escapeHtml(opts.continueHref);
  const hrefJs = escapeJs(opts.continueHref);
  const ok = opts.success;

  const title = ok ? 'Connection Successful! ✓' : 'Connection failed';
  const titleColor = ok ? '#10b981' : '#f87171';
  const message = ok
    ? 'Closing this window and returning to Clikd…'
    : escapeHtml(
        (opts.detail || opts.error || 'Something went wrong').replace(/_/g, ' ')
      );

  const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Authentication Complete</title>
  </head>
  <body style="background:#0f172a;color:#ffffff;font-family:system-ui,-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;text-align:center;">
    <div style="padding:24px;max-width:360px;">
      <h2 style="color:${titleColor};margin:0 0 8px;font-size:1.25rem;">${title}</h2>
      <p style="color:#94a3b8;font-size:14px;margin:0 0 16px;line-height:1.45;">${message}</p>
      <p style="margin:0;">
        <a href="${href}" style="color:#F472B6;font-size:13px;font-weight:600;">Continue to Clikd</a>
      </p>
    </div>
    <script>
      (function () {
        var payload = ${
          ok
            ? `{ type: 'OAUTH_SUCCESS', platform: '${platform}' }`
            : `{ type: 'OAUTH_ERROR', platform: '${platform}', error: '${error}', detail: '${detail}' }`
        };
        try {
          localStorage.setItem(
            'clikd_oauth_popup_result',
            JSON.stringify({ ts: Date.now(), result: {
              success: ${ok ? 'true' : 'false'},
              platform: '${platform}',
              error: ${ok ? 'undefined' : `'${error}'`},
              detail: ${ok ? 'undefined' : `'${detail}'`}
            }})
          );
        } catch (e) {}
        try {
          if (window.opener && !window.opener.closed) {
            window.opener.postMessage(payload, window.location.origin);
            setTimeout(function () { window.close(); }, 800);
            return;
          }
        } catch (e) {}
        setTimeout(function () {
          window.location.replace('${hrefJs}');
        }, 900);
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
