/**
 * Bake text overlays onto an image via HTML5 canvas → Blob / data URL.
 * Videos keep overlays as metadata and CSS for Live Preview only.
 */

import {
  clamp01,
  overlayFontFamily,
  overlayBackgroundFill,
  type MediaTextOverlay,
} from '@/lib/planner/media-overlays';

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not load image for editor'));
    img.src = src;
  });
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

/** Draw overlays onto an existing 2D context (image already drawn). */
export function drawOverlaysOnCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  overlays: MediaTextOverlay[]
) {
  for (const overlay of overlays) {
    const text = overlay.text.trim() || ' ';
    const fontPx = Math.max(
      12,
      (Math.min(18, Math.max(3.5, overlay.fontSizePct)) / 100) * height
    );
    const family = overlayFontFamily(overlay.font);
    const isStrong =
      overlay.font === 'strong' ||
      overlay.font === 'impact' ||
      overlay.font === 'narrow';
    ctx.font = `${isStrong ? '700' : '600'} ${fontPx}px ${family}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const cx = clamp01(overlay.x) * width;
    const cy = clamp01(overlay.y) * height;
    const metrics = ctx.measureText(text);
    const padX = fontPx * 0.55;
    const padY = fontPx * 0.4;
    const boxW = metrics.width + padX * 2;
    const boxH = fontPx + padY * 2;

    if (overlay.background) {
      ctx.fillStyle = overlayBackgroundFill(overlay);
      roundRect(ctx, cx - boxW / 2, cy - boxH / 2, boxW, boxH, fontPx * 0.45);
      ctx.fill();
    }

    ctx.fillStyle = overlay.color;
    if (!overlay.background) {
      ctx.shadowColor = 'rgba(0,0,0,0.45)';
      ctx.shadowBlur = fontPx * 0.15;
      ctx.shadowOffsetY = fontPx * 0.04;
    }
    ctx.fillText(text, cx, cy);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
  }
}

/** Bake overlays into a JPEG/PNG Blob for publishing. */
export async function bakeImageOverlaysToBlob(
  imageUrl: string,
  overlays: MediaTextOverlay[],
  mime: 'image/jpeg' | 'image/png' = 'image/jpeg',
  quality = 0.92
): Promise<Blob> {
  // Wait for Google Fonts so canvas text matches the editor preview.
  if (typeof document !== 'undefined' && document.fonts?.ready) {
    try {
      await document.fonts.ready;
    } catch {
      /* continue with fallbacks */
    }
  }

  const img = await loadImage(imageUrl);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');

  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  if (overlays.length) {
    drawOverlaysOnCanvas(ctx, canvas.width, canvas.height, overlays);
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Failed to export edited image'));
          return;
        }
        resolve(blob);
      },
      mime,
      quality
    );
  });
}

/** Convenience: bake and return an object URL (caller should revoke when done). */
export async function bakeImageOverlaysToObjectUrl(
  imageUrl: string,
  overlays: MediaTextOverlay[]
): Promise<string> {
  const blob = await bakeImageOverlaysToBlob(imageUrl, overlays);
  return URL.createObjectURL(blob);
}
