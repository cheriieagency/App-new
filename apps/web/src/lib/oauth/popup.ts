/**
 * Open a centered OAuth window and resolve when the popup posts
 * OAUTH_SUCCESS / OAUTH_ERROR / OAUTH_COMPLETE (or is closed manually).
 *
 * Google / LinkedIn / Pinterest often set Cross-Origin-Opener-Policy which
 * severs `window.opener`, so we also bridge via localStorage.
 */

export type OAuthPopupResult = {
  success: boolean;
  platform?: string;
  error?: string;
  detail?: string;
};

/** Shared with oauth popup-callback HTML (same-origin only). */
export const OAUTH_POPUP_STORAGE_KEY = 'clikd_oauth_popup_result';

type StoredOAuthPayload = {
  ts: number;
  result: OAuthPopupResult;
};

export function writeOAuthPopupResult(result: OAuthPopupResult): void {
  if (typeof window === 'undefined') return;
  try {
    const payload: StoredOAuthPayload = { ts: Date.now(), result };
    window.localStorage.setItem(OAUTH_POPUP_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* private mode / blocked storage */
  }
}

export function consumeOAuthPopupResult(maxAgeMs = 120_000): OAuthPopupResult | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(OAUTH_POPUP_STORAGE_KEY);
    if (!raw) return null;
    window.localStorage.removeItem(OAUTH_POPUP_STORAGE_KEY);
    const parsed = JSON.parse(raw) as StoredOAuthPayload;
    if (!parsed?.result || typeof parsed.ts !== 'number') return null;
    if (Date.now() - parsed.ts > maxAgeMs) return null;
    return parsed.result;
  } catch {
    return null;
  }
}

export function openOAuthPopup(
  url: string,
  title = 'Connect Account',
  w = 600,
  h = 750
): Promise<OAuthPopupResult> {
  return new Promise((resolve) => {
    // Clear any stale bridge payload from a previous attempt.
    try {
      window.localStorage.removeItem(OAUTH_POPUP_STORAGE_KEY);
    } catch {
      /* ignore */
    }

    const dualScreenLeft =
      window.screenLeft !== undefined ? window.screenLeft : window.screenX;
    const dualScreenTop =
      window.screenTop !== undefined ? window.screenTop : window.screenY;
    const width =
      window.innerWidth ||
      document.documentElement.clientWidth ||
      window.screen.width;
    const height =
      window.innerHeight ||
      document.documentElement.clientHeight ||
      window.screen.height;
    const left = Math.max(0, width / 2 - w / 2 + dualScreenLeft);
    const top = Math.max(0, height / 2 - h / 2 + dualScreenTop);

    const popup = window.open(
      url,
      title,
      [
        'toolbar=no',
        'location=yes',
        'directories=no',
        'status=no',
        'menubar=no',
        'scrollbars=yes',
        'resizable=yes',
        'copyhistory=no',
        `width=${w}`,
        `height=${h}`,
        `top=${Math.round(top)}`,
        `left=${Math.round(left)}`,
      ].join(', ')
    );

    if (!popup) {
      resolve({ success: false, error: 'popup_blocked' });
      return;
    }

    let settled = false;
    const finish = (result: OAuthPopupResult) => {
      if (settled) return;
      settled = true;
      window.clearInterval(timer);
      window.removeEventListener('message', handleMessage);
      window.removeEventListener('storage', handleStorage);
      if (popup && !popup.closed) {
        try {
          popup.close();
        } catch {
          /* ignore */
        }
      }
      resolve(result);
    };

    const applyPayload = (data: {
      type?: string;
      platform?: string;
      error?: string;
      detail?: string;
    }) => {
      if (data.type === 'OAUTH_SUCCESS' || data.type === 'OAUTH_COMPLETE') {
        finish({
          success: true,
          platform: typeof data.platform === 'string' ? data.platform : undefined,
        });
        return;
      }
      if (data.type === 'OAUTH_ERROR') {
        finish({
          success: false,
          platform: typeof data.platform === 'string' ? data.platform : undefined,
          error: typeof data.error === 'string' ? data.error : 'oauth_failed',
          detail: typeof data.detail === 'string' ? data.detail : undefined,
        });
      }
    };

    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data as
        | {
            type?: string;
            platform?: string;
            error?: string;
            detail?: string;
          }
        | null;
      if (!data || typeof data !== 'object') return;
      applyPayload(data);
    };

    // Cross-tab / COOP-safe bridge when opener is severed.
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== OAUTH_POPUP_STORAGE_KEY || !event.newValue) return;
      const stored = consumeOAuthPopupResult();
      if (stored) finish(stored);
    };

    window.addEventListener('message', handleMessage);
    window.addEventListener('storage', handleStorage);

    const timer = window.setInterval(() => {
      // Poll storage in the same tab (storage events only fire cross-tab).
      const stored = consumeOAuthPopupResult();
      if (stored) {
        finish(stored);
        return;
      }
      if (popup.closed) {
        // Final storage check — callback may have written just before close.
        const late = consumeOAuthPopupResult();
        if (late) {
          finish(late);
          return;
        }
        finish({ success: false, error: 'popup_closed' });
      }
    }, 400);
  });
}
