'use client';

import { useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ImagePlus, LayoutGrid, Loader2, Trash2, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import { adminCardClass } from '@/components/admin/AdminUi';
import { useWorkspace } from '@/context/WorkspaceContext';
import { useLanguage } from '@/lib/locale-context';
import { t } from '@/lib/i18n';
import type { CampaignLabel, VisionPin } from '@/lib/mock-content-planner';
import {
  isMediaLibraryRoot,
  type MediaAsset,
  type MediaFolder,
} from '@/lib/mock-media-library';
import useUpload from '@/utils/useUpload';

type ProjectVisionBoardProps = {
  campaign: CampaignLabel;
};

const OUTLINE_BTN =
  'inline-flex items-center justify-center gap-1.5 h-8 min-h-[32px] px-2.5 rounded-sm bg-transparent text-[9px] font-medium uppercase tracking-[0.08em] text-[#8A857D] hover:bg-[#F0EFEA] hover:text-[#2C2621] transition-colors disabled:opacity-40';
const PRIMARY_BTN =
  'inline-flex items-center justify-center gap-1.5 h-8 min-h-[32px] px-3 rounded-sm bg-[#F0EFEA] text-[#2C2621] text-[9px] font-medium uppercase tracking-[0.08em] hover:bg-[#E6E3DB] transition-colors disabled:opacity-40';

/**
 * Moodboard pinned under a project — inspiration images for the campaign look.
 */
export default function ProjectVisionBoard({ campaign }: ProjectVisionBoardProps) {
  const { locale } = useLanguage();
  const { activeWorkspaceId } = useWorkspace();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [upload, { loading: uploading }] = useUpload();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState('');
  const [dragOver, setDragOver] = useState(false);

  const pins = useMemo(
    () =>
      [...(campaign.vision_pins ?? [])].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ),
    [campaign.vision_pins]
  );

  const workspaceHeaders: Record<string, string> | undefined = activeWorkspaceId
    ? {
        'x-workspace-id': activeWorkspaceId,
        'x-active-workspace-id': activeWorkspaceId,
      }
    : undefined;

  // Load root + folder assets so "From media library" isn't empty when images live in subfolders.
  const { data: mediaData, isLoading: mediaLoading } = useQuery<{
    assets: MediaAsset[];
  }>({
    queryKey: ['media-assets-vision', activeWorkspaceId],
    queryFn: async () => {
      const r = await fetch('/api/admin/media', {
        headers: workspaceHeaders,
        credentials: 'include',
      });
      if (!r.ok) throw new Error('Failed');
      const root = (await r.json()) as {
        assets?: MediaAsset[];
        folders?: MediaFolder[];
      };
      const folders = (root.folders ?? []).filter((f) => !isMediaLibraryRoot(f.id));
      const nested = await Promise.all(
        folders.slice(0, 24).map(async (folder) => {
          const fr = await fetch(
            `/api/admin/media?folder=${encodeURIComponent(folder.id)}`,
            { headers: workspaceHeaders, credentials: 'include' }
          );
          if (!fr.ok) return [] as MediaAsset[];
          const json = (await fr.json()) as { assets?: MediaAsset[] };
          return json.assets ?? [];
        })
      );
      const byId = new Map<string, MediaAsset>();
      for (const asset of [...(root.assets ?? []), ...nested.flat()]) {
        byId.set(asset.id, asset);
      }
      return { assets: Array.from(byId.values()) };
    },
    enabled: pickerOpen,
  });

  const imageAssets = useMemo(
    () => (mediaData?.assets ?? []).filter((a) => a.kind === 'image' || !a.kind),
    [mediaData?.assets]
  );

  const savePins = useMutation({
    mutationFn: async (nextPins: VisionPin[]) => {
      const r = await fetch('/api/planner/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: 'update',
          id: campaign.id,
          vision_pins: nextPins,
        }),
      });
      if (!r.ok) throw new Error('save failed');
      return r.json() as Promise<{ campaign: CampaignLabel }>;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['planner-campaigns'] });
    },
    onError: () => toast.error(t('visionboardSaveFailed', locale)),
  });

  const busy = savePins.isPending || uploading;

  const addPin = (url: string, title = '') => {
    if (!url.trim()) return;
    const pin: VisionPin = {
      id: `pin-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      url,
      title: title.trim() || t('visionboardUntitled', locale),
      note: noteDraft.trim(),
      created_at: new Date().toISOString(),
    };
    setNoteDraft('');
    setPickerOpen(false);
    savePins.mutate([pin, ...(campaign.vision_pins ?? [])], {
      onSuccess: () => toast.success('Pinned to visionboard'),
    });
  };

  const removePin = (id: string) => {
    savePins.mutate((campaign.vision_pins ?? []).filter((p) => p.id !== id));
  };

  const onFiles = async (files: FileList | null) => {
    if (!files?.length || busy) return;
    const list = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (!list.length) {
      toast.error(t('visionboardImagesOnly', locale));
      return;
    }
    const next = [...(campaign.vision_pins ?? [])];
    let added = 0;
    for (const file of list) {
      const result = await upload({
        file,
        folder: 'posts',
        workspaceId: activeWorkspaceId ?? undefined,
      });
      if (result.error || !result.url?.trim()) {
        toast.error(result.error || t('visionboardSaveFailed', locale));
        continue;
      }
      next.unshift({
        id: `pin-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        url: result.url,
        title:
          file.name.replace(/\.[^.]+$/, '') || t('visionboardUntitled', locale),
        note: noteDraft.trim(),
        created_at: new Date().toISOString(),
      });
      added += 1;
    }
    if (!added) return;
    setNoteDraft('');
    savePins.mutate(next, {
      onSuccess: () => toast.success('Pinned to visionboard'),
    });
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#8A857D]">
            {t('visionboardEyebrow', locale)}
          </p>
          <h2 className="text-sm font-semibold text-[#2C2621] tracking-tight mt-1">
            {t('visionboardTitle', locale)}
          </h2>
          <p className="text-[11px] text-[#8A857D] mt-1 leading-snug">
            {t('visionboardSub', locale)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => setPickerOpen(true)}
            className={OUTLINE_BTN}
          >
            <LayoutGrid size={12} />
            {t('visionboardFromLibrary', locale)}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
            className={PRIMARY_BTN}
          >
            {uploading ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Upload size={12} />
            )}
            {t('visionboardUpload', locale)}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              void onFiles(e.target.files);
              e.target.value = '';
            }}
          />
        </div>
      </div>

      <div
        className={`${adminCardClass} p-3 sm:p-4 ${
          dragOver ? 'border-[#1C1917]' : ''
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          void onFiles(e.dataTransfer.files);
        }}
      >
        <label className="block mb-3">
          <span className="sr-only">{t('visionboardNotePlaceholder', locale)}</span>
          <input
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            placeholder={t('visionboardNotePlaceholder', locale)}
            className="w-full h-9 min-h-[36px] border-0 border-b border-[#E6E3DB] bg-transparent px-0 text-xs text-[#2C2621] placeholder:text-[#C4BFB6] focus:outline-none focus:border-[#2C2621]"
          />
        </label>

        {pins.length === 0 ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
            className="w-full min-h-[160px] border border-dashed border-[#E6E3DB] bg-[#F9F8F6] flex flex-col items-center justify-center gap-2 text-[#A8A29E] hover:border-[#1C1917]/40 hover:text-[#8A857D] transition-colors disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 size={22} className="animate-spin" />
            ) : (
              <ImagePlus size={22} strokeWidth={1.75} />
            )}
            <p className="text-xs font-semibold">{t('visionboardEmpty', locale)}</p>
          </button>
        ) : (
          <div className="columns-2 sm:columns-3 lg:columns-4 gap-3 space-y-3">
            {pins.map((pin) => (
              <article
                key={pin.id}
                className="break-inside-avoid relative group overflow-hidden border border-[#E6E3DB] bg-white"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={pin.url}
                  alt={pin.title}
                  className="w-full h-auto object-cover"
                />
                <div className="p-2 space-y-0.5">
                  <p className="text-[11px] font-semibold text-[#2C2621] line-clamp-1">
                    {pin.title}
                  </p>
                  {pin.note ? (
                    <p className="text-[10px] font-medium text-[#8A857D] line-clamp-2">
                      {pin.note}
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => removePin(pin.id)}
                  disabled={busy}
                  className="absolute top-1.5 right-1.5 h-8 w-8 min-h-[32px] min-w-[32px] bg-white/95 border border-[#E6E3DB] text-[#8A857D] hover:text-[#B85C38] opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity inline-flex items-center justify-center disabled:opacity-40"
                  aria-label={t('delete', locale)}
                >
                  <Trash2 size={12} />
                </button>
              </article>
            ))}
          </div>
        )}
      </div>

      {pickerOpen ? (
        <div
          className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-[#2C2621]/40 p-3 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label={t('visionboardFromLibrary', locale)}
          onClick={() => setPickerOpen(false)}
        >
          <div
            className={`${adminCardClass} w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 border-b border-[#E6E3DB]">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#2C2621]">
                {t('visionboardFromLibrary', locale)}
              </p>
              <button
                type="button"
                onClick={() => setPickerOpen(false)}
                className="h-9 w-9 min-h-[36px] min-w-[36px] text-[#A8A29E] hover:text-[#2C2621] inline-flex items-center justify-center"
                aria-label={t('cancel', locale)}
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-4 sm:p-5 overflow-y-auto">
              {mediaLoading ? (
                <div className="py-12 flex items-center justify-center gap-2 text-xs text-[#8A857D]">
                  <Loader2 size={14} className="animate-spin" />
                  Loading…
                </div>
              ) : imageAssets.length === 0 ? (
                <p className="text-xs text-[#A8A29E] font-medium text-center py-10">
                  {t('visionboardLibraryEmpty', locale)}
                </p>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                  {imageAssets.map((asset) => (
                    <button
                      key={asset.id}
                      type="button"
                      disabled={busy}
                      onClick={() => addPin(asset.image, asset.label)}
                      className="aspect-square overflow-hidden border border-[#E6E3DB] hover:border-[#1C1917] transition-colors disabled:opacity-40"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={asset.image}
                        alt={asset.label}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
