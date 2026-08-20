'use client';

/**
 * 3-step Create Campaign wizard — Objective → Audience → Creative (Media + AI).
 * Creative sources: device upload, {t('adsMediaLibrary')}, Google Drive.
 */

import { useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Check,
  FolderOpen,
  HardDrive,
  Images,
  Loader2,
  Sparkles,
  Upload,
  Wand2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import GoogleDriveImportButton from '@/components/admin/GoogleDriveImportButton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useWorkspace } from '@/context/WorkspaceContext';
import {
  MEDIA_LIBRARY_ROOT_ID,
  type MediaAsset,
} from '@/lib/mock-media-library';
import { adsCurrencyCode } from '@/lib/ads/format-money';
import { useLanguage } from '@/lib/i18n';
import useUpload from '@/utils/useUpload';

type ObjectiveId =
  | 'OUTCOME_SALES'
  | 'OUTCOME_LEADS'
  | 'OUTCOME_TRAFFIC'
  | 'OUTCOME_ENGAGEMENT';

const OBJECTIVES: Array<{
  id: ObjectiveId;
  titleKey:
    | 'adsObjSales'
    | 'adsObjLeads'
    | 'adsObjTraffic'
    | 'adsObjEngagement';
  blurbKey:
    | 'adsObjSalesBlurb'
    | 'adsObjLeadsBlurb'
    | 'adsObjTrafficBlurb'
    | 'adsObjEngagementBlurb';
}> = [
  {
    id: 'OUTCOME_SALES',
    titleKey: 'adsObjSales',
    blurbKey: 'adsObjSalesBlurb',
  },
  {
    id: 'OUTCOME_LEADS',
    titleKey: 'adsObjLeads',
    blurbKey: 'adsObjLeadsBlurb',
  },
  {
    id: 'OUTCOME_TRAFFIC',
    titleKey: 'adsObjTraffic',
    blurbKey: 'adsObjTrafficBlurb',
  },
  {
    id: 'OUTCOME_ENGAGEMENT',
    titleKey: 'adsObjEngagement',
    blurbKey: 'adsObjEngagementBlurb',
  },
];

const RETARGETING_NONE = { id: '', label: 'None — cold / broad' };

type MetaAudienceOption = {
  id: string;
  name: string;
  subtype?: string | null;
  description?: string | null;
};

type CreativePick = {
  id: string;
  url: string;
  label: string;
  kind: 'image' | 'video';
};

export type CreateCampaignPayload = {
  name: string;
  objective: ObjectiveId;
  dailyBudget: number;
  countries: string[];
  ageMin: number;
  ageMax: number;
  retargeting: string | null;
  headline: string;
  creativeUrl: string | null;
  creativeName: string | null;
  status: 'PAUSED' | 'ACTIVE';
};

const sourceBtn =
  'inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-50 sm:flex-none';

export default function CreateCampaignWizard({
  open,
  onOpenChange,
  onSubmit,
  submitting,
  audiences = [],
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: CreateCampaignPayload) => Promise<void> | void;
  submitting?: boolean;
  /** Live Meta custom audiences from Sync / GET /api/ads */
  audiences?: MetaAudienceOption[];
}) {
  const { activeWorkspaceId } = useWorkspace();
  const { locale, t } = useLanguage();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [upload, { loading: uploading }] = useUpload();

  const retargetingOptions = useMemo(() => {
    const fromMeta = audiences
      .filter((a) => a.id && a.name)
      .map((a) => ({
        id: a.name,
        label: a.subtype ? `${a.name} (${a.subtype})` : a.name,
      }));
    return [RETARGETING_NONE, ...fromMeta];
  }, [audiences]);

  const [step, setStep] = useState(1);
  const [objective, setObjective] = useState<ObjectiveId>('OUTCOME_SALES');
  const [name, setName] = useState('');
  const [dailyBudget, setDailyBudget] = useState('250');
  const [countries, setCountries] = useState('SE,NO,DK');
  const [ageMin, setAgeMin] = useState('18');
  const [ageMax, setAgeMax] = useState('44');
  const [retargeting, setRetargeting] = useState('');
  const [headline, setHeadline] = useState('');
  const [creative, setCreative] = useState<CreativePick | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [libraryPickId, setLibraryPickId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const mediaQuery = useQuery({
    queryKey: ['ads-media-library', activeWorkspaceId],
    enabled: open && Boolean(activeWorkspaceId),
    queryFn: async () => {
      const res = await fetch(
        `/api/admin/media?folder=${encodeURIComponent(MEDIA_LIBRARY_ROOT_ID)}`,
        {
          credentials: 'include',
          headers: { 'x-workspace-id': activeWorkspaceId },
        }
      );
      const json = (await res.json()) as { assets?: MediaAsset[] };
      return json.assets || [];
    },
  });

  const libraryAssets = useMemo(
    () => mediaQuery.data || [],
    [mediaQuery.data]
  );

  function reset() {
    setStep(1);
    setObjective('OUTCOME_SALES');
    setName('');
    setDailyBudget('250');
    setCountries('SE,NO,DK');
    setAgeMin('18');
    setAgeMax('44');
    setRetargeting('');
    setHeadline('');
    setCreative(null);
    setLibraryOpen(false);
    setLibraryPickId(null);
    setDragOver(false);
  }

  async function persistToMediaLibrary(input: {
    url: string;
    fileName: string;
    fileType?: string | null;
    sizeBytes?: number | null;
    kind: 'image' | 'video';
  }): Promise<MediaAsset | null> {
    try {
      const r = await fetch('/api/admin/media', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'x-workspace-id': activeWorkspaceId,
          'x-active-workspace-id': activeWorkspaceId,
        },
        body: JSON.stringify({
          action: 'upload',
          folderId: MEDIA_LIBRARY_ROOT_ID,
          imageUrl: input.url,
          label: input.fileName,
          fileName: input.fileName,
          fileType: input.fileType || undefined,
          sizeBytes: input.sizeBytes ?? undefined,
          kind: input.kind,
        }),
      });
      if (!r.ok) return null;
      const json = (await r.json()) as { asset?: MediaAsset };
      void queryClient.invalidateQueries({ queryKey: ['ads-media-library'] });
      void queryClient.invalidateQueries({ queryKey: ['media-folder'] });
      return json.asset || null;
    } catch {
      return null;
    }
  }

  async function addFromDevice(files: FileList | File[] | null) {
    const file = files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      toast.error('Choose an image or video file');
      return;
    }
    try {
      const result = await upload({ file });
      const url = result.url || URL.createObjectURL(file);
      if (!result.url) {
        toast.message('Using local preview — cloud upload unavailable');
      }
      const kind: 'image' | 'video' = file.type.startsWith('video/')
        ? 'video'
        : 'image';
      const saved = result.url
        ? await persistToMediaLibrary({
            url,
            fileName: file.name,
            fileType: file.type,
            sizeBytes: file.size,
            kind,
          })
        : null;
      setCreative({
        id: saved?.id || `device-${Date.now()}`,
        url: saved?.image || url,
        label: saved?.label || file.name,
        kind: saved?.kind || kind,
      });
      toast.success(
        saved ? 'Uploaded & saved to Media Library' : 'Creative selected'
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Upload failed');
    }
  }

  function applyLibraryPick() {
    const asset = libraryAssets.find((a) => a.id === libraryPickId);
    if (!asset) {
      toast.message('Select a file from Media Library first');
      return;
    }
    setCreative({
      id: asset.id,
      url: asset.image,
      label: asset.label,
      kind: asset.kind === 'video' ? 'video' : 'image',
    });
    setLibraryOpen(false);
    setLibraryPickId(null);
  }

  async function runAiCopy() {
    setAiLoading(true);
    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: 'facebook',
          tone: 'confident',
          prompt: `Write a short Meta ad headline (max 40 characters) for a Nordic creator campaign about: ${
            name || objective.replace('OUTCOME_', '').toLowerCase()
          }. Return only the headline text.`,
        }),
      });
      const json = (await res.json()) as { caption?: string; message?: string };
      if (!res.ok) throw new Error(json.message || 'AI copy failed');
      const text = String(json.caption || '')
        .replace(/^["']|["']$/g, '')
        .trim();
      if (!text) throw new Error('Empty AI response');
      setHeadline(text.slice(0, 80));
      toast.success('Headline drafted');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'AI copywriter failed'
      );
    } finally {
      setAiLoading(false);
    }
  }

  async function handleCreate() {
    if (!name.trim()) {
      toast.error('Give your campaign a name');
      setStep(1);
      return;
    }
    if (!headline.trim()) {
      toast.error('Add a headline for the creative');
      setStep(3);
      return;
    }
    await onSubmit({
      name: name.trim(),
      objective,
      dailyBudget: Math.max(0, Number(dailyBudget) || 0),
      countries: countries
        .split(/[,\s]+/)
        .map((c) => c.trim().toUpperCase())
        .filter(Boolean),
      ageMin: Number(ageMin) || 18,
      ageMax: Number(ageMax) || 44,
      retargeting: retargeting || null,
      headline: headline.trim(),
      creativeUrl: creative?.url || null,
      creativeName: creative?.label || null,
      status: 'PAUSED',
    });
    reset();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto rounded-2xl border-slate-200 bg-[#FAFAFA] sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-[family-name:var(--font-space-grotesk)] text-[#0F172A]">
            {t('adsCreateTitle')}
          </DialogTitle>
          <DialogDescription>
            Step {step} of 3 —{' '}
            {step === 1
              ? t('adsStepObjective')
              : step === 2
                ? t('adsStepAudience')
                : t('adsStepCreative')}
          </DialogDescription>
        </DialogHeader>

        <div className="mb-4 flex gap-2">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className={`h-1.5 flex-1 rounded-full ${
                n <= step ? 'bg-[#F472B6]' : 'bg-slate-200'
              }`}
            />
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-slate-700">
                {t('adsCampaignName')}
              </span>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Campaign name"
                className="min-h-11 rounded-xl"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-slate-700">
                {t('adsDailyBudgetLabel', {
                  currency: adsCurrencyCode('SEK', locale),
                })}
              </span>
              <Input
                type="number"
                min={0}
                value={dailyBudget}
                onChange={(e) => setDailyBudget(e.target.value)}
                className="min-h-11 rounded-xl font-[family-name:var(--font-fira-code)]"
              />
            </label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {OBJECTIVES.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => setObjective(o.id)}
                  className={`min-h-[88px] rounded-2xl border p-3 text-left transition ${
                    objective === o.id
                      ? 'border-[#F472B6] bg-pink-50/80 ring-1 ring-[#F472B6]'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <p className="font-semibold text-[#0F172A]">{t(o.titleKey)}</p>
                  <p className="mt-1 text-xs text-slate-500">{t(o.blurbKey)}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-slate-700">
                Locations (ISO country codes)
              </span>
              <Input
                value={countries}
                onChange={(e) => setCountries(e.target.value)}
                placeholder="SE, NO, DK, FI"
                className="min-h-11 rounded-xl"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-slate-700">
                  Age min
                </span>
                <Input
                  type="number"
                  min={13}
                  max={65}
                  value={ageMin}
                  onChange={(e) => setAgeMin(e.target.value)}
                  className="min-h-11 rounded-xl"
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-slate-700">
                  Age max
                </span>
                <Input
                  type="number"
                  min={13}
                  max={65}
                  value={ageMax}
                  onChange={(e) => setAgeMax(e.target.value)}
                  className="min-h-11 rounded-xl"
                />
              </label>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-700">
                Meta custom audiences
              </p>
              <div className="space-y-2">
                {retargetingOptions.map((r) => (
                  <button
                    key={r.id || 'none'}
                    type="button"
                    onClick={() => setRetargeting(r.id)}
                    className={`flex min-h-11 w-full items-center rounded-xl border px-3 text-left text-sm transition ${
                      retargeting === r.id
                        ? 'border-[#2B2568] bg-[#2B2568]/10 text-[#2B2568]'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
              {audiences.length === 0 ? (
                <p className="text-xs text-slate-500">
                  No custom audiences loaded yet. Sync Meta Ads after connecting
                  Facebook with ads permissions.
                </p>
              ) : null}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-slate-700">
                  {t('adsHeadline')}
                </span>
                <button
                  type="button"
                  onClick={() => void runAiCopy()}
                  disabled={aiLoading}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-[#2B2568] px-3 text-sm font-medium text-white disabled:opacity-60"
                >
                  {aiLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4 text-[#F472B6]" />
                  )}
                  {t('adsAiCopywriter')}
                </button>
              </div>
              <Input
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="Finish what you started — limited seats"
                className="min-h-11 rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-700">{t('adsCreative')}</p>
              <p className="text-xs text-slate-500">
                {t('adsCreativeSources')}
              </p>

              <input
                ref={fileRef}
                type="file"
                accept="image/*,video/*"
                className="hidden"
                onChange={(e) => {
                  void addFromDevice(e.target.files);
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
                  void addFromDevice(e.dataTransfer.files);
                }}
                className={`relative flex min-h-[120px] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-3 py-4 transition ${
                  dragOver
                    ? 'border-[#F472B6] bg-pink-50/60'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                {uploading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                ) : creative ? (
                  <div className="flex w-full items-center gap-3 px-1">
                    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                      {creative.kind === 'video' ? (
                        <video
                          src={creative.url}
                          className="h-full w-full object-cover"
                          muted
                        />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={creative.url}
                          alt={creative.label}
                          className="h-full w-full object-cover"
                        />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-[#0F172A]">
                        {creative.label}
                      </p>
                      <p className="text-xs capitalize text-slate-400">
                        {creative.kind} selected
                      </p>
                      <button
                        type="button"
                        onClick={() => setCreative(null)}
                        className="mt-1 text-xs font-semibold text-[#F472B6]"
                      >
                        {t('adsRemove')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <Upload className="h-5 w-5 text-slate-300" />
                    <p className="text-center text-sm font-medium text-slate-600">
                      {t('adsDropCreative')}
                    </p>
                    <p className="text-center text-xs text-slate-400">
                      {t('adsOrChooseSource')}
                    </p>
                  </>
                )}
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => fileRef.current?.click()}
                  className={sourceBtn}
                >
                  <HardDrive size={14} />
                  {t('adsFromDevice')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLibraryPickId(creative?.id || null);
                    setLibraryOpen(true);
                    void mediaQuery.refetch();
                  }}
                  className={sourceBtn}
                >
                  <Images size={14} />
                  Media Library
                </button>
                <GoogleDriveImportButton
                  target="media_library"
                  className={sourceBtn}
                  overlayClassName="z-[90]"
                  onImported={(file) => {
                    if (!file.fileUrl) {
                      toast.error('Drive import returned no file URL');
                      return;
                    }
                    const kind: 'image' | 'video' =
                      file.fileType?.startsWith('video/') ||
                      /\.(mp4|mov|webm|m4v)$/i.test(file.fileName)
                        ? 'video'
                        : 'image';
                    setCreative({
                      id: String(file.mediaId || `drive-${Date.now()}`),
                      url: file.fileUrl,
                      label: file.fileName,
                      kind,
                    });
                    void queryClient.invalidateQueries({
                      queryKey: ['ads-media-library'],
                    });
                  }}
                />
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-between">
          <button
            type="button"
            className="min-h-11 rounded-xl px-4 text-sm font-medium text-slate-600 hover:bg-slate-100"
            onClick={() => {
              if (step === 1) onOpenChange(false);
              else setStep((s) => s - 1);
            }}
          >
            {step === 1 ? t('adsCancel') : t('adsBack')}
          </button>
          {step < 3 ? (
            <button
              type="button"
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#F472B6] px-5 text-sm font-semibold text-white"
              onClick={() => {
                if (step === 1 && !name.trim()) {
                  toast.error('Add a campaign name first');
                  return;
                }
                setStep((s) => s + 1);
              }}
            >
              {t('adsContinue')}
            </button>
          ) : (
            <button
              type="button"
              disabled={submitting}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#2B2568] px-5 text-sm font-semibold text-white disabled:opacity-60"
              onClick={() => void handleCreate()}
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Wand2 className="h-4 w-4 text-[#F472B6]" />
              )}
              {t('adsCreateSubmit')}
            </button>
          )}
        </DialogFooter>
      </DialogContent>

      {/* Media Library picker — stacked above the wizard dialog */}
      {libraryOpen ? (
        <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center">
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
            className="relative z-10 flex max-h-[85vh] w-full flex-col rounded-t-3xl bg-white shadow-2xl sm:max-w-xl sm:rounded-2xl"
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
              <div className="min-w-0">
                <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Media Library
                </p>
                <h3 className="mt-0.5 flex items-center gap-2 font-[family-name:var(--font-space-grotesk)] text-lg font-extrabold text-slate-900">
                  <FolderOpen size={18} className="text-[#F472B6]" />
                  Brand assets
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setLibraryOpen(false)}
                className="flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-xl bg-slate-50"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4">
              {mediaQuery.isLoading ? (
                <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-400">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading…
                </div>
              ) : libraryAssets.length === 0 ? (
                <div className="space-y-2 py-10 text-center">
                  <p className="text-sm font-semibold text-slate-600">
                    No files in Media Library yet
                  </p>
                  <p className="px-6 text-xs text-slate-400">
                    Upload from your device or import from Google Drive, then
                    pick it here.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {libraryAssets.map((asset) => {
                    const selected = libraryPickId === asset.id;
                    return (
                      <button
                        key={asset.id}
                        type="button"
                        onClick={() =>
                          setLibraryPickId(selected ? null : asset.id)
                        }
                        className={`relative aspect-square overflow-hidden rounded-xl border-2 transition ${
                          selected
                            ? 'border-[#F472B6] ring-2 ring-[#F472B6]/25'
                            : 'border-slate-100 hover:border-slate-300'
                        }`}
                        title={asset.label}
                      >
                        {asset.kind === 'video' ? (
                          <video
                            src={asset.image}
                            className="h-full w-full object-cover"
                            muted
                          />
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={asset.image}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        )}
                        {selected ? (
                          <span className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-[#F472B6] text-white">
                            <Check size={12} strokeWidth={3} />
                          </span>
                        ) : null}
                        <span className="absolute inset-x-0 bottom-0 truncate bg-black/50 px-1.5 py-1 text-[9px] font-bold text-white">
                          {asset.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-3">
              <p className="text-xs font-semibold text-slate-500">
                {libraryPickId ? '1 selected' : 'None selected'}
              </p>
              <button
                type="button"
                disabled={!libraryPickId}
                onClick={applyLibraryPick}
                className="inline-flex min-h-11 items-center rounded-xl bg-[#2B2568] px-4 text-sm font-semibold text-white disabled:opacity-50"
              >
                Use creative
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </Dialog>
  );
}
