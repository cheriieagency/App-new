/**
 * Open a centered OAuth window and resolve when the popup posts
 * OAUTH_SUCCESS / OAUTH_ERROR / OAUTH_COMPLETE (or is closed manually).
 */

export type OAuthPopupResult = {
  success: boolean;
  platform?: string;
  error?: string;
  detail?: string;
};

export function openOAuthPopup(
  url: string,
  title = 'Connect Account',
  w = 600,
  h = 750
): Promise<OAuthPopupResult> {
  return new Promise((resolve) => {
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
        'location=no',
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
      if (popup && !popup.closed) {
        try {
          popup.close();
        } catch {
          /* ignore */
        }
      }
      resolve(result);
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

    window.addEventListener('message', handleMessage);

    const timer = window.setInterval(() => {
      if (popup.closed) {
        finish({ success: false, error: 'popup_closed' });
      }
    }, 500);
  });
}
