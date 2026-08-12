'use client';

/**
 * Cover banner frame with drag-to-reposition (object-cover focal point).
 * Call bakeCoverCrop() before save to export the preferred cut as a File.
 */

import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react';
import { ImageIcon, Move, Replace } from 'lucide-react';

export type CoverFocal = { x: number; y: number };

const DEFAULT_FOCAL: CoverFocal = { x: 50, y: 50 };

/** Export object-cover crop at the given focal point as a JPEG File. */
export async function bakeCoverCrop(
  src: string,
  focal: CoverFocal,
  outWidth = 1600,
  outHeight = 400
): Promise<File> {
  const img = await loadImage(src);
  const canvas = document.createElement('canvas');
  canvas.width = outWidth;
  canvas.height = outHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');

  const ir = img.naturalWidth / img.naturalHeight;
  const fr = outWidth / outHeight;
  let sx: number;
  let sy: number;
  let sw: number;
  let sh: number;

  if (ir > fr) {
    // Image wider than frame — crop left/right; Y is unused.
    sh = img.naturalHeight;
    sw = img.naturalHeight * fr;
    sx = ((img.naturalWidth - sw) * clamp(focal.x, 0, 100)) / 100;
    sy = 0;
  } else {
    // Image taller (or equal) — crop top/bottom; X is unused.
    sw = img.naturalWidth;
    sh = img.naturalWidth / fr;
    sx = 0;
    sy = ((img.naturalHeight - sh) * clamp(focal.y, 0, 100)) / 100;
  }

  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outWidth, outHeight);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Failed to export cover'))),
      'image/jpeg',
      0.92
    );
  });

  return new File([blob], `community-cover-${Date.now()}.jpg`, {
    type: 'image/jpeg',
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // Allow canvas export for remote URLs when CORS headers allow it.
    if (!src.startsWith('blob:') && !src.startsWith('data:')) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not load cover image'));
    img.src = src;
  });
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export default function CoverImageCropper({
  src,
  focal,
  onFocalChange,
  onRequestUpload,
  emptyLabel = 'Upload cover image',
}: {
  src: string | null;
  focal: CoverFocal;
  onFocalChange: (next: CoverFocal) => void;
  onRequestUpload: () => void;
  emptyLabel?: string;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);
  const [dragging, setDragging] = useState(false);
  // Prefer vertical pan for tall photos; allow both axes when image is wide.
  const [axes, setAxes] = useState<{ x: boolean; y: boolean }>({
    x: true,
    y: true,
  });

  useEffect(() => {
    if (!src) {
      setAxes({ x: true, y: true });
      return;
    }
    let cancelled = false;
    void loadImage(src)
      .then((img) => {
        if (cancelled) return;
        const frame = frameRef.current;
        const fr =
          frame && frame.clientHeight > 0
            ? frame.clientWidth / frame.clientHeight
            : 1600 / 400;
        const ir = img.naturalWidth / img.naturalHeight;
        setAxes({
          x: ir > fr + 0.01,
          y: ir < fr - 0.01,
        });
      })
      .catch(() => {
        if (!cancelled) setAxes({ x: true, y: true });
      });
    return () => {
      cancelled = true;
    };
  }, [src]);

  const onPointerDown = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (!src) return;
      e.preventDefault();
      const el = e.currentTarget;
      el.setPointerCapture(e.pointerId);
      dragRef.current = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        originX: focal.x,
        originY: focal.y,
      };
      setDragging(true);
    },
    [src, focal.x, focal.y]
  );

  const onPointerMove = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== e.pointerId) return;
      const frame = frameRef.current;
      if (!frame) return;
      const { width, height } = frame.getBoundingClientRect();
      // Dragging the image moves content with the pointer (invert delta).
      const dx = ((e.clientX - drag.startX) / Math.max(width, 1)) * 100;
      const dy = ((e.clientY - drag.startY) / Math.max(height, 1)) * 100;
      onFocalChange({
        x: axes.x ? clamp(drag.originX - dx, 0, 100) : 50,
        y: axes.y ? clamp(drag.originY - dy, 0, 100) : 50,
      });
    },
    [axes.x, axes.y, onFocalChange]
  );

  const endDrag = useCallback((e: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    dragRef.current = null;
    setDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
  }, []);

  if (!src) {
    return (
      <button
        type="button"
        onClick={onRequestUpload}
        className="relative w-full h-28 min-h-[112px] rounded-2xl border border-dashed border-slate-200 bg-slate-50 overflow-hidden hover:bg-slate-100/80 transition-colors inline-flex items-center justify-center"
      >
        <span className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400">
          <ImageIcon size={14} /> {emptyLabel}
        </span>
      </button>
    );
  }

  return (
    <div className="space-y-2">
      <div
        ref={frameRef}
        role="img"
        aria-label="Cover image — drag to reposition"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className={`relative w-full h-28 min-h-[112px] rounded-2xl border border-slate-200 bg-slate-100 overflow-hidden select-none touch-none ${
          dragging ? 'cursor-grabbing' : 'cursor-grab'
        }`}
      >
        <img
          src={src}
          alt=""
          draggable={false}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          style={{
            objectPosition: `${focal.x}% ${focal.y}%`,
          }}
        />
        <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/45 to-transparent pointer-events-none">
          <p className="text-[10px] font-semibold text-white/95 inline-flex items-center gap-1.5">
            <Move size={11} /> Drag to set cover crop
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onRequestUpload}
        className="inline-flex items-center justify-center gap-1.5 h-10 min-h-[40px] px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
      >
        <Replace size={13} /> Change image
      </button>
    </div>
  );
}

export { DEFAULT_FOCAL };
