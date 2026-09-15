'use client';

/**
 * In-app media editor — text overlays for carousel images/videos.
 * Navigate every slide in upload order; bake images on apply,
 * keep video overlays as metadata for Live Preview.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Check,
  Loader2,
  Trash2,
  Type,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { bakeImageOverlaysToObjectUrl } from '@/lib/planner/bake-media-overlays';
import {
  DEFAULT_OVERLAY_BG,
  MEDIA_OVERLAY_COLORS,
  MEDIA_OVERLAY_FONTS,
  clamp01,
  createTextOverlay,
  overlayBackgroundFill,
  overlayFontClass,
  toColorInputValue,
  type MediaOverlayFontId,
  type MediaTextOverlay,
} from '@/lib/planner/media-overlays';
import type { PlannerMediaItem } from '@/lib/mock-content-planner';

type DragMode = 'move' | 'resize';

function normalizeOverlays(
  overlays?: MediaTextOverlay[] | null
): MediaTextOverlay[] {
  return (overlays ?? []).map((o) => ({
    ...o,
    backgroundColor:
      o.backgroundColor?.trim() ||
      (o.background ? DEFAULT_OVERLAY_BG : 'transparent'),
  }));
}

function cloneItems(items: PlannerMediaItem[]): PlannerMediaItem[] {
  return items.map((it) => ({
    ...it,
    overlays: normalizeOverlays(it.overlays),
  }));
}

/** Text or background color: presets + native color wheel + hex field. */
function OverlayColorPicker({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
}) {
  const wheelValue = toColorInputValue(value);
  return (
    <div
      className={`space-y-2 ${disabled ? 'opacity-45 pointer-events-none' : ''}`}
    >
      <span className="text-[11px] font-medium uppercase tracking-wide text-[#8A857D]">
        {label}
      </span>
      <div className="flex items-center gap-2">
        <label className="relative inline-flex h-11 w-11 min-h-[44px] min-w-[44px] shrink-0 cursor-pointer overflow-hidden rounded-full border-2 border-[#2C2621] shadow-sm">
          <span
            className="absolute inset-0"
            style={{ backgroundColor: value || wheelValue }}
            aria-hidden
          />
          <input
            type="color"
            value={wheelValue}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            aria-label={`${label} color wheel`}
          />
        </label>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          spellCheck={false}
          placeholder="#FFFFFF"
          className="min-h-[44px] flex-1 rounded-xl border border-[#E6E3DB] bg-[#F9F8F6] px-3 font-mono text-xs text-[#2C2621] focus:outline-none focus:border-[#2C2621]/40"
        />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {MEDIA_OVERLAY_COLORS.map((c) => (
          <button
            key={`${label}-${c}`}
            type="button"
            aria-label={`${label} ${c}`}
            onClick={() => onChange(c)}
            className={`h-8 w-8 min-h-[32px] min-w-[32px] rounded-full border-2 transition-transform ${
              toColorInputValue(value) === c.toLowerCase()
                ? 'border-[#2C2621] scale-105'
                : 'border-[#E6E3DB]'
            }`}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>
    </div>
  );
}

export default function MediaEditorModal({
  open,
  items,
  initialIndex = 0,
  onClose,
  onSave,
}: {
  open: boolean;
  /** Full carousel in upload / publish order. */
  items: PlannerMediaItem[];
  /** Slide opened from the thumbnail Edit click. */
  initialIndex?: number;
  onClose: () => void;
  /** Every slide with edits applied (same order). */
  onSave: (next: PlannerMediaItem[]) => void;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState<PlannerMediaItem[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [drag, setDrag] = useState<{
    id: string;
    mode: DragMode;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    origSize: number;
  } | null>(null);

  useEffect(() => {
    if (!open) return;
    const next = cloneItems(items);
    const idx = Math.min(
      Math.max(0, initialIndex),
      Math.max(0, next.length - 1)
    );
    setDraft(next);
    setActiveIndex(idx);
    setSelectedId(next[idx]?.overlays?.[0]?.id ?? null);
    setDrag(null);
    setSaving(false);
    // Snapshot only when the dialog opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const item = draft[activeIndex] ?? null;
  const overlays = item?.overlays ?? [];
  const selected = overlays.find((o) => o.id === selectedId) ?? null;
  const baseUrl = item?.sourceUrl || item?.url || '';
  const total = draft.length;
  const canNavigate = total > 1;

  useEffect(() => {
    if (!open || !stripRef.current) return;
    const el = stripRef.current.querySelector<HTMLElement>(
      `[data-slide-index="${activeIndex}"]`
    );
    el?.scrollIntoView({
      behavior: 'smooth',
      inline: 'center',
      block: 'nearest',
    });
  }, [activeIndex, open]);

  const goTo = useCallback(
    (index: number) => {
      if (index < 0 || index >= total || index === activeIndex) return;
      setActiveIndex(index);
      setSelectedId(draft[index]?.overlays?.[0]?.id ?? null);
      setDrag(null);
    },
    [activeIndex, draft, total]
  );

  const setOverlaysForActive = useCallback(
    (updater: (prev: MediaTextOverlay[]) => MediaTextOverlay[]) => {
      setDraft((prev) =>
        prev.map((it, i) => {
          if (i !== activeIndex) return it;
          return { ...it, overlays: updater(it.overlays ?? []) };
        })
      );
    },
    [activeIndex]
  );

  const updateOverlay = useCallback(
    (id: string, patch: Partial<MediaTextOverlay>) => {
      setOverlaysForActive((prev) =>
        prev.map((o) => (o.id === id ? { ...o, ...patch } : o))
      );
    },
    [setOverlaysForActive]
  );

  const addText = () => {
    const ov = createTextOverlay();
    setOverlaysForActive((prev) => [...prev, ov]);
    setSelectedId(ov.id);
  };

  const removeSelected = () => {
    if (!selectedId) return;
    setOverlaysForActive((prev) => prev.filter((o) => o.id !== selectedId));
    setSelectedId(null);
  };

  const onPointerDown = (
    e: React.PointerEvent,
    id: string,
    mode: DragMode
  ) => {
    e.preventDefault();
    e.stopPropagation();
    const ov = overlays.find((o) => o.id === id);
    if (!ov) return;
    setSelectedId(id);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDrag({
      id,
      mode,
      startX: e.clientX,
      startY: e.clientY,
      origX: ov.x,
      origY: ov.y,
      origSize: ov.fontSizePct,
    });
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag || !stageRef.current) return;
    const rect = stageRef.current.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    if (drag.mode === 'move') {
      const dx = (e.clientX - drag.startX) / rect.width;
      const dy = (e.clientY - drag.startY) / rect.height;
      updateOverlay(drag.id, {
        x: clamp01(drag.origX + dx),
        y: clamp01(drag.origY + dy),
      });
      return;
    }

    const dy = (e.clientY - drag.startY) / rect.height;
    updateOverlay(drag.id, {
      fontSizePct: Math.min(18, Math.max(3.5, drag.origSize + dy * 40)),
    });
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!drag) return;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    setDrag(null);
  };

  const handleSave = async () => {
    if (!draft.length) return;
    setSaving(true);
    try {
      const finalized: PlannerMediaItem[] = [];
      for (const slide of draft) {
        const slideOverlays = normalizeOverlays(slide.overlays);
        if (slide.type === 'image') {
          const source = slide.sourceUrl || slide.url;
          const bakedUrl = await bakeImageOverlaysToObjectUrl(
            source,
            slideOverlays
          );
          if (slide.url.startsWith('blob:') && slide.url !== source) {
            URL.revokeObjectURL(slide.url);
          }
          finalized.push({
            ...slide,
            sourceUrl: source,
            url: bakedUrl,
            overlays: slideOverlays,
          });
        } else {
          finalized.push({
            ...slide,
            overlays: slideOverlays,
          });
        }
      }
      onSave(finalized);
      onClose();
    } catch (err) {
      console.error('[MediaEditor] save failed', err);
      toast.error(
        err instanceof Error ? err.message : 'Could not save media edit'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !saving && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="max-w-[min(1280px,98vw)] sm:max-w-[min(1280px,98vw)] w-full p-0 gap-0 overflow-hidden rounded-2xl border border-[#E6E3DB] bg-[#F9F8F6] text-[#2C2621] shadow-[0_20px_50px_-24px_rgba(44,38,33,0.28)]"
      >
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-[#E6E3DB] bg-[#F9F8F6]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <DialogTitle className="font-semibold text-base text-[#2C2621]">
                Media editor
              </DialogTitle>
              <DialogDescription className="text-xs text-[#8A857D] mt-1">
                {total > 1
                  ? `Slide ${activeIndex + 1} of ${total} · tap a thumbnail below to edit every file in upload order.`
                  : 'Add Instagram / TikTok-style text. Images are baked for publish; video overlays stay editable in Live Preview.'}
              </DialogDescription>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="inline-flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-[#8A857D] hover:bg-[#EFECE6] hover:text-[#2C2621] transition-colors"
              aria-label="Close editor"
            >
              <X size={18} />
            </button>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2.6fr)_minmax(240px,0.55fr)] min-h-[520px] max-h-[min(90vh,900px)]">
          <div className="relative bg-[#2C2621] flex flex-col items-center justify-center gap-3 p-3 sm:p-5 min-h-[400px] min-w-0">
            <div className="relative w-full flex-1 min-h-0 flex items-center justify-center px-1">
              <div
                ref={stageRef}
                role="img"
                aria-label={
                  item?.type === 'video' ? 'Video canvas' : 'Image canvas'
                }
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                onClick={() => setSelectedId(null)}
                className="relative aspect-[4/5] w-[min(100%,720px,calc(min(78vh,820px)*0.82))] rounded-xl overflow-hidden bg-black shadow-[0_12px_40px_-16px_rgba(0,0,0,0.55)] touch-none [container-type:size]"
              >
                {item?.type === 'video' ? (
                  <video
                    key={item.id}
                    src={baseUrl}
                    className="absolute inset-0 h-full w-full object-contain bg-black"
                    muted
                    playsInline
                    loop
                    autoPlay
                  />
                ) : baseUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={item?.id}
                    src={baseUrl}
                    alt=""
                    className="absolute inset-0 h-full w-full object-contain bg-black"
                    draggable={false}
                  />
                ) : null}

                {overlays.map((ov) => {
                  const active = ov.id === selectedId;
                  return (
                    <div
                      key={ov.id}
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedId(ov.id);
                      }}
                      onPointerDown={(e) => onPointerDown(e, ov.id, 'move')}
                      className={`absolute z-10 max-w-[86%] -translate-x-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing select-none ${
                        active
                          ? 'ring-2 ring-[#F9F8F6]/90 ring-offset-2 ring-offset-black/40'
                          : ''
                      }`}
                      style={{
                        left: `${clamp01(ov.x) * 100}%`,
                        top: `${clamp01(ov.y) * 100}%`,
                        fontSize: `${Math.max(3.5, ov.fontSizePct)}cqh`,
                      }}
                    >
                      <span
                        className={`inline-block px-[0.55em] py-[0.28em] leading-tight text-center break-words ${overlayFontClass(ov.font)} ${
                          ov.background ? 'rounded-full' : ''
                        }`}
                        style={{
                          color: ov.color,
                          backgroundColor: overlayBackgroundFill(ov),
                          textShadow: ov.background
                            ? undefined
                            : '0 1px 3px rgba(0,0,0,0.45)',
                        }}
                      >
                        {ov.text || 'Text'}
                      </span>
                      {active ? (
                        <button
                          type="button"
                          aria-label="Resize text"
                          onPointerDown={(e) =>
                            onPointerDown(e, ov.id, 'resize')
                          }
                          className="absolute -right-2 -bottom-2 h-5 w-5 rounded-full bg-[#F9F8F6] border border-[#2C2621] shadow cursor-nwse-resize"
                        />
                      ) : null}
                    </div>
                  );
                })}

                {canNavigate ? (
                  <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-medium text-white tabular-nums">
                    {activeIndex + 1} / {total}
                  </div>
                ) : null}
              </div>
            </div>

            {canNavigate ? (
              <div className="w-full max-w-[760px] shrink-0">
                <div
                  ref={stripRef}
                  className="flex gap-2 overflow-x-auto pb-1 px-1 justify-center"
                >
                  {draft.map((slide, index) => {
                    const active = index === activeIndex;
                    const thumb = slide.sourceUrl || slide.url;
                    const hasText = (slide.overlays?.length ?? 0) > 0;
                    return (
                      <button
                        key={slide.id}
                        type="button"
                        data-slide-index={index}
                        onClick={() => goTo(index)}
                        disabled={saving}
                        className={`relative flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition-colors ${
                          active
                            ? 'border-[#F9F8F6] ring-2 ring-[#F9F8F6]/40'
                            : 'border-white/20 hover:border-white/50'
                        }`}
                        aria-label={`Edit slide ${index + 1}`}
                        aria-current={active ? 'true' : undefined}
                      >
                        {slide.type === 'video' ? (
                          <video
                            src={thumb}
                            className="h-full w-full object-cover"
                            muted
                          />
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={thumb}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        )}
                        <span className="absolute bottom-0.5 left-0.5 rounded bg-black/60 px-1 text-[9px] font-bold text-white">
                          {index + 1}
                          {hasText ? ' · Aa' : ''}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>

          <aside className="border-t lg:border-t-0 lg:border-l border-[#E6E3DB] bg-[#F9F8F6] p-4 sm:p-5 overflow-y-auto space-y-4">
            <button
              type="button"
              onClick={addText}
              disabled={!item}
              className="inline-flex w-full items-center justify-center gap-2 min-h-[44px] rounded-xl bg-[#2C2621] text-[#F9F8F6] text-sm font-medium hover:bg-[#3A322C] disabled:opacity-50 transition-colors"
            >
              <Type size={16} />
              Add text
            </button>

            {selected ? (
              <div className="space-y-4 rounded-xl border border-[#E6E3DB] bg-white p-3.5">
                <label className="block space-y-1.5">
                  <span className="text-[11px] font-medium uppercase tracking-wide text-[#8A857D]">
                    Text
                  </span>
                  <textarea
                    value={selected.text}
                    onChange={(e) =>
                      updateOverlay(selected.id, { text: e.target.value })
                    }
                    rows={3}
                    className="w-full min-h-[72px] rounded-xl border border-[#E6E3DB] bg-[#F9F8F6] px-3 py-2.5 text-sm text-[#2C2621] focus:outline-none focus:border-[#2C2621]/40"
                  />
                </label>

                <div className="space-y-1.5">
                  <span className="text-[11px] font-medium uppercase tracking-wide text-[#8A857D]">
                    Font
                  </span>
                  <div className="max-h-[200px] overflow-y-auto overscroll-contain rounded-xl border border-[#E6E3DB] bg-[#F9F8F6] p-1.5 space-y-1">
                    {MEDIA_OVERLAY_FONTS.map((font) => {
                      const active = selected.font === font.id;
                      return (
                        <button
                          key={font.id}
                          type="button"
                          onClick={() =>
                            updateOverlay(selected.id, {
                              font: font.id as MediaOverlayFontId,
                            })
                          }
                          className={`w-full min-h-[44px] rounded-lg border px-3 text-left text-sm transition-colors ${
                            active
                              ? 'border-[#2C2621] bg-[#2C2621] text-[#F9F8F6]'
                              : 'border-transparent bg-white text-[#2C2621] hover:border-[#2C2621]/25'
                          } ${font.previewClass}`}
                        >
                          {font.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <OverlayColorPicker
                  label="Text color"
                  value={selected.color}
                  onChange={(color) => updateOverlay(selected.id, { color })}
                />

                <label className="flex items-center justify-between gap-3 min-h-[44px] rounded-xl border border-[#E6E3DB] bg-[#F9F8F6] px-3">
                  <span className="text-sm font-medium text-[#2C2621]">
                    Text background
                  </span>
                  <input
                    type="checkbox"
                    checked={selected.background}
                    onChange={(e) => {
                      const on = e.target.checked;
                      updateOverlay(selected.id, {
                        background: on,
                        backgroundColor: on
                          ? selected.backgroundColor?.trim() &&
                            selected.backgroundColor !== 'transparent'
                            ? selected.backgroundColor
                            : DEFAULT_OVERLAY_BG
                          : selected.backgroundColor,
                      });
                    }}
                    className="h-5 w-5 accent-[#2C2621]"
                  />
                </label>

                <OverlayColorPicker
                  label="Background color"
                  value={
                    selected.backgroundColor?.trim() &&
                    selected.backgroundColor !== 'transparent'
                      ? selected.backgroundColor
                      : DEFAULT_OVERLAY_BG
                  }
                  onChange={(backgroundColor) =>
                    updateOverlay(selected.id, {
                      backgroundColor,
                      background: true,
                    })
                  }
                  disabled={!selected.background}
                />

                <label className="block space-y-1.5">
                  <span className="text-[11px] font-medium uppercase tracking-wide text-[#8A857D]">
                    Size
                  </span>
                  <input
                    type="range"
                    min={3.5}
                    max={18}
                    step={0.5}
                    value={selected.fontSizePct}
                    onChange={(e) =>
                      updateOverlay(selected.id, {
                        fontSizePct: Number(e.target.value),
                      })
                    }
                    className="w-full accent-[#2C2621]"
                  />
                </label>

                <button
                  type="button"
                  onClick={removeSelected}
                  className="inline-flex w-full items-center justify-center gap-2 min-h-[44px] rounded-xl border border-[#E6E3DB] text-sm font-medium text-[#8A857D] hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 transition-colors"
                >
                  <Trash2 size={15} />
                  Remove text
                </button>
              </div>
            ) : (
              <p className="text-sm text-[#8A857D] leading-relaxed rounded-xl border border-dashed border-[#E6E3DB] bg-white/70 px-3.5 py-4">
                Tap{' '}
                <span className="font-medium text-[#2C2621]">Add text</span>,
                then drag on the canvas. Use the corner handle to resize
                {canNavigate
                  ? ', and switch slides to edit the whole carousel.'
                  : '.'}
              </p>
            )}

            {item?.type === 'video' ? (
              <p className="text-[11px] text-[#8A857D] leading-snug">
                Video text stays as an overlay for now (shown in Live Preview).
                We can add ffmpeg.wasm later to burn text into the file.
              </p>
            ) : (
              <p className="text-[11px] text-[#8A857D] leading-snug">
                Apply bakes text into every image so publish APIs receive
                ready-to-post files.
              </p>
            )}
          </aside>
        </div>

        <div className="flex items-center justify-between gap-2 px-5 py-4 border-t border-[#E6E3DB] bg-white">
          <p className="text-[11px] text-[#8A857D] tabular-nums hidden sm:block">
            {total > 0 ? `${total} media · order matches upload` : null}
          </p>
          <div className="flex items-center justify-end gap-2 ml-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="inline-flex items-center justify-center min-h-[44px] px-4 rounded-xl border border-[#E6E3DB] text-sm font-medium text-[#8A857D] hover:bg-[#F9F8F6] transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving || !draft.length}
              className="inline-flex items-center justify-center gap-2 min-h-[44px] px-5 rounded-xl bg-[#2C2621] text-[#F9F8F6] text-sm font-medium hover:bg-[#3A322C] disabled:opacity-50 transition-colors"
            >
              {saving ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Check size={16} />
              )}
              Apply to post
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
