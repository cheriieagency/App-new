'use client';

/**
 * Post Studio media dropzone — device upload, Media Library, or Google Drive.
 */

import { useCallback, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Check,
  FolderOpen,
  Film,
  GripVertical,
  HardDrive,
  ImageIcon,
  Images,
  Loader2,
  Plus,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import useUpload from '@/utils/useUpload';
import {
  mediaTypeBadge,
  nextMediaId,
  type PlannerMediaItem,
} from '@/lib/mock-content-planner';
import {
  MEDIA_LIBRARY_ROOT_ID,
  type MediaAsset,
} from '@/lib/mock-media-library';
import GoogleDriveImportButton from '@/components/admin/GoogleDriveImportButton';

const MAX_ITEMS = 10;

function isVideoAsset(input: {
  kind?: string | null;
  fileType?: string | null;
  fileName?: string | null;
  url?: string | null;
}): boolean {
  if (input.kind === 'video') return true;
  if (input.fileType?.startsWith('video/')) return true;
  if (input.url?.startsWith('data:video')) return true;
  return Boolean(input.fileName && /\.(mp4|mov|webm|m4v)$/i.test(input.fileName));
}

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
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [upload, { loading: uploading }] = useUpload();

  const room = Math.max(0, MAX_ITEMS - items.length);
  const atCap = room <= 0;

  const libraryQuery = useQuery({
    queryKey: ['media-folder', MEDIA_LIBRARY_ROOT_ID, 'picker'],
    queryFn: async () => {
      const r = await fetch(
        `/api/admin/media?folder=${encodeURIComponent(MEDIA_LIBRARY_ROOT_ID)}`,
        { credentials: 'include' }
      );
      if (!r.ok) throw new Error('Failed to load media library');
      return r.json() as Promise<{ assets: MediaAsset[] }>;
    },
    enabled: libraryOpen,
  });

  const libraryAssets = useMemo(
    () => libraryQuery.data?.assets ?? [],
    [libraryQuery.data?.assets]
  );

  const appendItems = useCallback(
    (incoming: PlannerMediaItem[]) => {
      if (!incoming.length) return;
      const next = [...items, ...incoming].slice(0, MAX_ITEMS);
      onChange(next);
      if (items.length + incoming.length > MAX_ITEMS) {
        toast.message(`Only ${MAX_ITEMS} files per post — extra files skipped`);
      }
    },
    [items, onChange]
  );

  const addFiles = useCallback(
    async (files: FileList | null) => {
      if (!files?.length || atCap) return;
      const picked = Array.from(files).slice(0, room);
      const next: PlannerMediaItem[] = [];

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
      appendItems(next);
    },
    [appendItems, atCap, room, upload]
  );

  const addFromLibrary = () => {
    if (!selectedIds.size) {
      toast.message('Select at least one file');
      return;
    }
    const picked = libraryAssets.filter((a) => selectedIds.has(a.id));
    appendItems(
      picked.slice(0, room).map((a) => ({
        id: nextMediaId(),
        url: a.image,
        type: a.kind === 'video' ? 'video' : 'image',
      }))
    );
    setSelectedIds(new Set());
    setLibraryOpen(false);
  };

  const removeAt = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const reorder = (from: number, to: number) => {
    if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length)
      return;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
  };

  const badge = mediaTypeBadge(items);
  const sourceBtn =
    'inline-flex items-center justify-center gap-1.5 h-11 min-h-[44px] px-3 rounded-xl border border-zinc-200 bg-white text-[11px] font-extrabold text-zinc-700 hover:bg-zinc-50 transition-colors disabled:opacity-50 disabled:pointer-events-none';

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
          if (!atCap) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          void addFiles(e.dataTransfer.files);
        }}
        className={`relative rounded-2xl border-2 border-dashed min-h-[120px] flex flex-col items-center justify-center gap-2 transition-colors px-3 py-4 ${
          atCap
            ? 'border-zinc-100 bg-zinc-50 opacity-60'
            : dragOver
              ? 'border-[var(--nc-coral)] bg-[color-mix(in_srgb,var(--nc-coral)_8%,white)]'
              : 'border-zinc-200 bg-zinc-50 hover:border-zinc-300'
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
            <p className="text-sm font-bold text-zinc-600 text-center">
              Single Image, Video eller Karusell
            </p>
            <p className="text-[11px] text-zinc-400 font-medium text-center px-2">
              Dra och släpp filer här — eller välj källa nedan (max {MAX_ITEMS})
            </p>
          </>
        )}
      </div>

      {/* Source options: device / Media Library / Google Drive */}
      <div className="flex flex-col sm:flex-row flex-wrap gap-2">
        <button
          type="button"
          disabled={atCap || uploading}
          onClick={() => fileRef.current?.click()}
          className={sourceBtn}
        >
          <HardDrive size={14} />
          Från enhet
        </button>
        <button
          type="button"
          disabled={atCap}
          onClick={() => {
            setSelectedIds(new Set());
            setLibraryOpen(true);
          }}
          className={sourceBtn}
        >
          <Images size={14} />
          Media Library
        </button>
        <GoogleDriveImportButton
          target="planner"
          className={sourceBtn}
          onImported={(file) => {
            if (!file.fileUrl) {
              toast.error('Drive import returned no file');
              return;
            }
            if (atCap) {
              toast.message(`Max ${MAX_ITEMS} files per post`);
              return;
            }
            appendItems([
              {
                id: nextMediaId(),
                url: file.fileUrl,
                type: isVideoAsset({
                  fileType: file.fileType,
                  fileName: file.fileName,
                  url: file.fileUrl,
                })
                  ? 'video'
                  : 'image',
              },
            ]);
          }}
        />
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
                  // eslint-disable-next-line @next/next/no-img-element
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
            {!atCap && (
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

      {/* Media Library picker (Brand assets) */}
      {libraryOpen ? (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            onClick={() => setLibraryOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Media Library"
            className="relative z-10 w-full sm:max-w-xl bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[85vh] flex flex-col"
          >
            <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-zinc-100">
              <div className="min-w-0">
                <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-400">
                  Media Library
                </p>
                <h3 className="font-clikd-wordmark font-extrabold text-lg text-zinc-900 mt-0.5 flex items-center gap-2">
                  <FolderOpen size={18} className="text-[#F472B6]" />
                  Brand assets
                </h3>
                <p className="text-xs text-zinc-500 font-medium mt-1">
                  Välj upp till {room} fil{room === 1 ? '' : 'er'} från ditt bibliotek
                </p>
              </div>
              <button
                type="button"
                onClick={() => setLibraryOpen(false)}
                className="h-11 w-11 min-h-[44px] min-w-[44px] rounded-xl bg-zinc-50 flex items-center justify-center"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-4 py-4 overflow-y-auto flex-1">
              {libraryQuery.isLoading ? (
                <div className="py-12 flex items-center justify-center gap-2 text-sm text-zinc-400">
                  <Loader2 className="animate-spin" size={16} /> Laddar…
                </div>
              ) : libraryAssets.length === 0 ? (
                <div className="py-10 text-center space-y-2">
                  <p className="text-sm font-semibold text-zinc-600">
                    Inga filer i Media Library ännu
                  </p>
                  <p className="text-xs text-zinc-400 font-medium px-6">
                    Ladda upp under Media Library → Brand assets, eller importera från Google Drive.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {libraryAssets.map((asset) => {
                    const selected = selectedIds.has(asset.id);
                    const disabled =
                      !selected && selectedIds.size >= room;
                    return (
                      <button
                        key={asset.id}
                        type="button"
                        disabled={disabled}
                        onClick={() => {
                          setSelectedIds((prev) => {
                            const next = new Set(prev);
                            if (next.has(asset.id)) next.delete(asset.id);
                            else if (next.size < room) next.add(asset.id);
                            return next;
                          });
                        }}
                        className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-colors disabled:opacity-40 ${
                          selected
                            ? 'border-[#F472B6] ring-2 ring-[#F472B6]/25'
                            : 'border-zinc-100 hover:border-zinc-300'
                        }`}
                        title={asset.label}
                      >
                        {asset.kind === 'video' ? (
                          <video
                            src={asset.image}
                            className="w-full h-full object-cover"
                            muted
                          />
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={asset.image}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        )}
                        {selected ? (
                          <span className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-[#F472B6] text-white flex items-center justify-center">
                            <Check size={12} strokeWidth={3} />
                          </span>
                        ) : null}
                        <span className="absolute bottom-0 inset-x-0 px-1.5 py-1 bg-black/50 text-[9px] font-bold text-white truncate">
                          {asset.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="px-4 py-3 border-t border-zinc-100 flex items-center justify-between gap-3">
              <p className="text-xs font-semibold text-zinc-500">
                {selectedIds.size} valda
              </p>
              <button
                type="button"
                disabled={!selectedIds.size}
                onClick={addFromLibrary}
                className="h-11 min-h-[44px] px-4 rounded-xl bg-[#2B2568] text-white text-xs font-extrabold disabled:opacity-50"
              >
                Lägg till i post
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
