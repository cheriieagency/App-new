'use client';

import { useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ImagePlus, LayoutGrid, Trash2, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import { adminCardClass } from '@/components/admin/AdminUi';
import { useWorkspace } from '@/context/WorkspaceContext';
import { useLanguage } from '@/lib/locale-context';
import { t } from '@/lib/i18n';
import type { CampaignLabel, VisionPin } from '@/lib/mock-content-planner';
import type { MediaAsset } from '@/lib/mock-media-library';

type ProjectVisionBoardProps = {
  campaign: CampaignLabel;
};

/**
 * Moodboard pinned under a project — inspiration images for the campaign look.
 */
export default function ProjectVisionBoard({ campaign }: ProjectVisionBoardProps) {
  const { locale } = useLanguage();
  const { activeWorkspaceId } = useWorkspace();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState('');

  const pins = useMemo(
    () => [...(campaign.vision_pins ?? [])].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    ),
    [campaign.vision_pins]
  );

  const { data: mediaData } = useQuery<{ assets: MediaAsset[] }>({
    queryKey: ['media-assets-vision', activeWorkspaceId],
    queryFn: async () => {
      const r = await fetch('/api/admin/media', {
        headers: activeWorkspaceId
          ? {
              'x-workspace-id': activeWorkspaceId,
              'x-active-workspace-id': activeWorkspaceId,
            }
          : undefined,
        credentials: 'include',
      });
      if (!r.ok) throw new Error('Failed');
      return r.json();
    },
    enabled: pickerOpen,
  });

  const imageAssets = useMemo(
    () => (mediaData?.assets ?? []).filter((a) => a.kind === 'image'),
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
      queryClient.invalidateQueries({ queryKey: ['planner-campaigns'] });
    },
    onError: () => toast.error(t('visionboardSaveFailed', locale)),
  });

  const addPin = (url: string, title = '') => {
    const pin: VisionPin = {
      id: `pin-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      url,
      title: title.trim() || t('visionboardUntitled', locale),
      note: noteDraft.trim(),
      created_at: new Date().toISOString(),
    };
    setNoteDraft('');
    setPickerOpen(false);
    savePins.mutate([pin, ...(campaign.vision_pins ?? [])]);
  };

  const removePin = (id: string) => {
    savePins.mutate((campaign.vision_pins ?? []).filter((p) => p.id !== id));
  };

  const onFiles = (files: FileList | null) => {
    if (!files?.length) return;
    const list = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (!list.length) {
      toast.error(t('visionboardImagesOnly', locale));
      return;
    }
    void (async () => {
      const next = [...(campaign.vision_pins ?? [])];
      for (const file of list) {
        const url = await readFileAsDataUrl(file);
        next.unshift({
          id: `pin-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          url,
          title: file.name.replace(/\.[^.]+$/, '') || t('visionboardUntitled', locale),
          note: noteDraft.trim(),
          created_at: new Date().toISOString(),
        });
      }
      setNoteDraft('');
      savePins.mutate(next);
    })();
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-slate-400">
            {t('visionboardEyebrow', locale)}
          </p>
          <h2 className="font-clikd-wordmark font-extrabold text-xl sm:text-2xl text-slate-900 tracking-tight mt-1">
            {t('visionboardTitle', locale)}
          </h2>
          <p className="text-sm text-slate-500 font-medium mt-1">
            {t('visionboardSub', locale)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="inline-flex items-center justify-center gap-1.5 h-11 min-h-[44px] px-4 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors"
          >
            <LayoutGrid size={14} />
            {t('visionboardFromLibrary', locale)}
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center justify-center gap-1.5 h-11 min-h-[44px] px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors"
          >
            <Upload size={14} />
            {t('visionboardUpload', locale)}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              onFiles(e.target.files);
              e.target.value = '';
            }}
          />
        </div>
      </div>

      <div className={`${adminCardClass} p-3 sm:p-4`}>
        <label className="block mb-3">
          <span className="sr-only">{t('visionboardNotePlaceholder', locale)}</span>
          <input
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            placeholder={t('visionboardNotePlaceholder', locale)}
            className="w-full h-11 min-h-[44px] rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/5"
          />
        </label>

        {pins.length === 0 ? (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="w-full min-h-[180px] rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/60 flex flex-col items-center justify-center gap-2 text-slate-400 hover:border-slate-300 hover:text-slate-500 transition-colors"
          >
            <ImagePlus size={28} strokeWidth={1.75} />
            <p className="text-sm font-semibold">{t('visionboardEmpty', locale)}</p>
          </button>
        ) : (
          <div className="columns-2 sm:columns-3 lg:columns-4 gap-3 space-y-3">
            {pins.map((pin) => (
              <article
                key={pin.id}
                className="break-inside-avoid relative group rounded-2xl overflow-hidden border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={pin.url}
                  alt={pin.title}
                  className="w-full h-auto object-cover"
                />
                <div className="p-2.5 space-y-0.5">
                  <p className="text-xs font-bold text-slate-800 line-clamp-1">
                    {pin.title}
                  </p>
                  {pin.note ? (
                    <p className="text-[11px] font-medium text-slate-500 line-clamp-2">
                      {pin.note}
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => removePin(pin.id)}
                  disabled={savePins.isPending}
                  className="absolute top-2 right-2 h-9 w-9 min-h-[36px] min-w-[36px] rounded-xl bg-white/95 text-slate-500 hover:text-rose-600 shadow-sm opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity inline-flex items-center justify-center"
                  aria-label={t('delete', locale)}
                >
                  <Trash2 size={14} />
                </button>
              </article>
            ))}
          </div>
        )}
      </div>

      {pickerOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/40 p-3 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label={t('visionboardFromLibrary', locale)}
          onClick={() => setPickerOpen(false)}
        >
          <div
            className={`${adminCardClass} w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 border-b border-slate-100">
              <p className="text-sm font-bold text-slate-900">
                {t('visionboardFromLibrary', locale)}
              </p>
              <button
                type="button"
                onClick={() => setPickerOpen(false)}
                className="h-11 w-11 min-h-[44px] min-w-[44px] rounded-xl text-slate-400 hover:bg-slate-50 inline-flex items-center justify-center"
                aria-label={t('cancel', locale)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-4 sm:p-5 overflow-y-auto">
              {imageAssets.length === 0 ? (
                <p className="text-sm text-slate-400 font-medium text-center py-10">
                  {t('visionboardLibraryEmpty', locale)}
                </p>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                  {imageAssets.map((asset) => (
                    <button
                      key={asset.id}
                      type="button"
                      onClick={() => addPin(asset.image, asset.label)}
                      className="aspect-square rounded-xl overflow-hidden border border-slate-200 hover:ring-2 hover:ring-[#F472B6] hover:ring-offset-1 transition-all"
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

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
