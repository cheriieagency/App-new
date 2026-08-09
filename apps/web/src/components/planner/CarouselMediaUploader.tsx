'use client';

import { useCallback, useRef, useState } from 'react';
import { GripVertical, Loader2, Plus, Trash2, Upload, Film, ImageIcon } from 'lucide-react';
import useUpload from '@/utils/useUpload';
import {
  mediaTypeBadge,
  nextMediaId,
  type PlannerMediaItem,
} from '@/lib/mock-content-planner';

const MAX_ITEMS = 10;

export default function CarouselMediaUploader({
  items,
  onChange,
}: {
  items: PlannerMediaItem[];
  onChange: (items: PlannerMediaItem[]) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const [upload, { loading: uploading }] = useUpload();

  const addFiles = useCallback(
    async (files: FileList | null) => {
      if (!files?.length) return;
      const room = MAX_ITEMS - items.length;
      if (room <= 0) return;
      const picked = Array.from(files).slice(0, room);
      const next: PlannerMediaItem[] = [...items];

      for (const file of picked) {
        const isVideo = file.type.startsWith('video/');
        const result = await upload({ file });
        const url = result.url || URL.createObjectURL(file);
        next.push({
          id: nextMediaId(),
          url,
          type: isVideo ? 'video' : 'image',
        });
      }
      onChange(next);
    },
    [items, onChange, upload]
  );

  const removeAt = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const reorder = (from: number, to: number) => {
    if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) return;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
  };

  const badge = mediaTypeBadge(items);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
          Media
        </label>
        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wide px-2.5 py-1 rounded-full bg-zinc-100 text-zinc-600">
          {items.length === 1 && items[0].type === 'video' ? (
            <Film size={10} />
          ) : (
            <ImageIcon size={10} />
          )}
          {badge}
        </span>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*,video/*"
        multiple
        className="hidden"
        onChange={(e) => {
          void addFiles(e.target.files);
          e.target.value = '';
        }}
      />

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          void addFiles(e.dataTransfer.files);
        }}
        onClick={() => items.length < MAX_ITEMS && fileRef.current?.click()}
        className={`relative rounded-2xl border-2 border-dashed min-h-[120px] flex flex-col items-center justify-center gap-2 transition-colors ${
          items.length >= MAX_ITEMS
            ? 'border-zinc-100 bg-zinc-50 cursor-not-allowed opacity-60'
            : dragOver
              ? 'border-[var(--nc-coral)] bg-[color-mix(in_srgb,var(--nc-coral)_8%,white)] cursor-pointer'
              : 'border-zinc-200 bg-zinc-50 hover:border-zinc-300 cursor-pointer'
        }`}
      >
        {uploading ? (
          <Loader2
            size={22}
            className="text-zinc-400"
            style={{ animation: 'spin 1s linear infinite' }}
          />
        ) : (
          <>
            <Upload size={22} className="text-zinc-300" />
            <p className="text-sm font-bold text-zinc-600">
              Single Image, Video eller Karusell
            </p>
            <p className="text-[11px] text-zinc-400 font-medium text-center px-4">
              Dra och släpp eller klicka — upp till {MAX_ITEMS} filer
            </p>
          </>
        )}
      </div>

      {items.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] text-zinc-400 font-medium">
            Dra miniatyrerna för att ändra ordning
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {items.map((item, index) => (
              <div
                key={item.id}
                draggable
                onDragStart={() => setDragIndex(index)}
                onDragOver={(e) => {
                  e.preventDefault();
                  setOverIndex(index);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (dragIndex != null) reorder(dragIndex, index);
                  setDragIndex(null);
                  setOverIndex(null);
                }}
                onDragEnd={() => {
                  setDragIndex(null);
                  setOverIndex(null);
                }}
                className={`relative flex-shrink-0 w-24 h-24 rounded-xl overflow-hidden border-2 bg-zinc-100 group ${
                  overIndex === index && dragIndex !== index
                    ? 'border-[var(--nc-coral)]'
                    : 'border-zinc-100'
                }`}
              >
                {item.type === 'video' ? (
                  <video src={item.url} className="w-full h-full object-cover" muted />
                ) : (
                  <img src={item.url} alt="" className="w-full h-full object-cover" />
                )}
                <div className="absolute inset-x-0 top-0 flex items-center justify-between p-1">
                  <span className="h-7 w-7 rounded-lg bg-black/45 text-white flex items-center justify-center cursor-grab active:cursor-grabbing">
                    <GripVertical size={12} />
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeAt(index);
                    }}
                    className="h-11 w-11 min-h-[44px] min-w-[44px] -m-1 rounded-lg bg-black/45 text-white flex items-center justify-center"
                    aria-label="Ta bort"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
                <span className="absolute bottom-1 left-1 text-[9px] font-extrabold uppercase tracking-wide text-white bg-black/50 px-1.5 py-0.5 rounded">
                  {item.type === 'video' ? 'Video' : index + 1}
                </span>
              </div>
            ))}
            {items.length < MAX_ITEMS && (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex-shrink-0 w-24 h-24 rounded-xl border-2 border-dashed border-zinc-200 text-zinc-400 hover:border-[var(--nc-coral)] hover:text-[var(--nc-coral)] flex flex-col items-center justify-center gap-1"
              >
                <Plus size={18} />
                <span className="text-[10px] font-extrabold">Lägg till</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
