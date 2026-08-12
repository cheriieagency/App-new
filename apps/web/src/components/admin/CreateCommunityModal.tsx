'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Plus, Upload } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { SITE_DISPLAY_HOST } from '@/lib/site';
import useUpload from '@/utils/useUpload';
import type { ManagedCommunity } from '@/lib/mock-community-admin';
import { useWorkspaceOptional } from '@/context/WorkspaceContext';
import CoverImageCropper, {
  bakeCoverCrop,
  DEFAULT_FOCAL,
  type CoverFocal,
} from '@/components/admin/CoverImageCropper';

export const COMMUNITY_CATEGORIES = [
  'Marketing',
  'E-commerce',
  'Coaching',
  'Health & Fitness',
  'Lifestyle',
  'Tech',
  'Other',
] as const;

export type CommunityCategory = (typeof COMMUNITY_CATEGORIES)[number];

export type CreateCommunityPayload = {
  name: string;
  slug: string;
  avatar_url: string | null;
  cover_url: string | null;
  category: CommunityCategory;
  is_free: boolean;
  monthly_price_sek: number;
  description: string;
  workspaceId: string;
};

function slugifyName(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 56) || 'community'
  );
}

export default function CreateCommunityModal({
  open,
  onOpenChange,
  onCreated,
  defaultName = '',
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (community: ManagedCommunity) => void;
  defaultName?: string;
}) {
  const workspaceCtx = useWorkspaceOptional();
  const workspaceId = workspaceCtx?.activeWorkspaceId || '';
  const [name, setName] = useState(defaultName);
  const [slugTouched, setSlugTouched] = useState(false);
  const [slug, setSlug] = useState(slugifyName(defaultName));
  const [category, setCategory] = useState<CommunityCategory>('Other');
  const [isFree, setIsFree] = useState(true);
  const [monthlyPrice, setMonthlyPrice] = useState('199');
  const [description, setDescription] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [avatarManual, setAvatarManual] = useState('');
  const [coverManual, setCoverManual] = useState('');
  const [coverFocal, setCoverFocal] = useState<CoverFocal>(DEFAULT_FOCAL);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [upload, { loading: uploading }] = useUpload();
  const avatarRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);

  const coverPreviewSrc = coverUrl || coverManual.trim() || null;

  useEffect(() => {
    if (!open) return;
    const seed = defaultName || workspaceCtx?.activeWorkspace.name || '';
    setName(seed);
    setSlug(slugifyName(seed));
    setSlugTouched(false);
    setCategory('Other');
    setIsFree(true);
    setMonthlyPrice('199');
    setDescription('');
    setAvatarUrl(null);
    setCoverUrl(null);
    setAvatarManual('');
    setCoverManual('');
    setCoverFocal(DEFAULT_FOCAL);
    setError('');
  }, [open, defaultName, workspaceCtx?.activeWorkspace.name]);

  useEffect(() => {
    if (slugTouched) return;
    setSlug(slugifyName(name));
  }, [name, slugTouched]);

  const slugPreview = useMemo(() => {
    const s = slug.trim() || slugifyName(name) || 'community';
    return `${SITE_DISPLAY_HOST}/communities/${s}`;
  }, [slug, name]);

  const uploadImage = async (
    file: File,
    kind: 'avatar' | 'cover'
  ): Promise<void> => {
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file');
      return;
    }
    const local = URL.createObjectURL(file);
    if (kind === 'avatar') {
      setAvatarUrl(local);
    } else {
      setCoverUrl(local);
      setCoverManual('');
      setCoverFocal(DEFAULT_FOCAL);
    }

    const result = await upload({ file });
    if (result.url) {
      if (kind === 'avatar') setAvatarUrl(result.url);
      else setCoverUrl(result.url);
    }
  };

  const resolveCoverUrl = async (): Promise<string | null> => {
    const src = coverPreviewSrc;
    if (!src) return null;
    // Bake the dragged crop so the public cover matches what you framed.
    try {
      const cropped = await bakeCoverCrop(src, coverFocal);
      const result = await upload({ file: cropped });
      if (result.url) return result.url;
      // Fallback: data URL if upload is unavailable.
      return await fileToDataUrl(cropped);
    } catch {
      // CORS / decode failure — keep original URL (focal is preview-only).
      return src;
    }
  };

  const submit = async () => {
    if (saving) return;
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Enter a community name');
      return;
    }
    if (!workspaceId) {
      setError('Select a workspace before creating a community');
      return;
    }
    const price = isFree ? 0 : Math.max(0, Math.round(Number(monthlyPrice) || 0));
    if (!isFree && price <= 0) {
      setError('Enter a monthly price in SEK (or choose Free)');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const bakedCover = await resolveCoverUrl();
      const payload: CreateCommunityPayload = {
        name: trimmed,
        slug: slug.trim() || slugifyName(trimmed),
        avatar_url: avatarUrl || avatarManual.trim() || null,
        cover_url: bakedCover,
        category,
        is_free: isFree,
        monthly_price_sek: price,
        description: description.trim(),
        workspaceId,
      };

      const r = await fetch('/api/admin/communities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-workspace-id': workspaceId,
          'x-active-workspace-id': workspaceId,
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const json = (await r.json()) as {
        community?: ManagedCommunity;
        public_url?: string;
        error?: string;
        message?: string;
      };
      if (!r.ok || !json.community) {
        throw new Error(json.message || json.error || 'Failed to create community');
      }

      toast.success(`“${json.community.name}” is live`);
      onCreated(json.community);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create community');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(560px,94vw)] max-h-[90vh] overflow-y-auto rounded-2xl border-slate-200 bg-white p-0 gap-0">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-slate-100">
          <DialogTitle className="font-clikd-wordmark text-lg font-extrabold text-slate-900 tracking-tight">
            Create community
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-500 font-medium">
            Bound to this workspace — members can find it at a public clikd: URL.
          </DialogDescription>
        </DialogHeader>

        <div className="px-5 py-4 space-y-4">
          {/* Cover — drag inside the frame to choose the crop */}
          <div className="space-y-2">
            <p className="text-[10px] font-mono font-bold uppercase tracking-[0.12em] text-slate-400">
              Cover banner
            </p>
            <CoverImageCropper
              src={coverPreviewSrc}
              focal={coverFocal}
              onFocalChange={setCoverFocal}
              onRequestUpload={() => coverRef.current?.click()}
            />
            <input
              ref={coverRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (file) void uploadImage(file, 'cover');
              }}
            />
            <input
              type="url"
              value={coverManual}
              onChange={(e) => {
                setCoverManual(e.target.value);
                if (e.target.value.trim()) {
                  setCoverUrl(null);
                  setCoverFocal(DEFAULT_FOCAL);
                }
              }}
              placeholder="Or paste cover image URL"
              className="w-full h-10 min-h-[40px] rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900/5"
            />
          </div>

          {/* Avatar + name */}
          <div className="flex gap-3 items-start">
            <div className="space-y-2 flex-shrink-0">
              <p className="text-[10px] font-mono font-bold uppercase tracking-[0.12em] text-slate-400">
                Avatar
              </p>
              <button
                type="button"
                onClick={() => avatarRef.current?.click()}
                className="w-16 h-16 min-h-[64px] min-w-[64px] rounded-2xl border border-dashed border-slate-200 bg-slate-50 overflow-hidden inline-flex items-center justify-center hover:bg-slate-100 transition-colors"
              >
                {avatarUrl || avatarManual ? (
                  <img
                    src={avatarUrl || avatarManual}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Upload size={16} className="text-slate-400" />
                )}
              </button>
              <input
                ref={avatarRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void uploadImage(file, 'avatar');
                }}
              />
            </div>
            <div className="flex-1 space-y-3 min-w-0">
              <label className="block space-y-1.5">
                <span className="text-[10px] font-mono font-bold uppercase tracking-[0.12em] text-slate-400">
                  Community name
                </span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ebba Creator Inner Circle"
                  className="w-full h-11 min-h-[44px] rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/5"
                  autoFocus
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-[10px] font-mono font-bold uppercase tracking-[0.12em] text-slate-400">
                  URL slug
                </span>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    setSlug(slugifyName(e.target.value));
                  }}
                  className="w-full h-10 min-h-[40px] rounded-xl border border-slate-200 bg-white px-3 text-sm font-mono font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/5"
                />
                <p className="text-[11px] font-medium text-slate-400 truncate">
                  {slugPreview}
                </p>
              </label>
            </div>
          </div>

          <label className="block space-y-1.5">
            <span className="text-[10px] font-mono font-bold uppercase tracking-[0.12em] text-slate-400">
              Avatar URL (optional)
            </span>
            <input
              type="url"
              value={avatarManual}
              onChange={(e) => {
                setAvatarManual(e.target.value);
                if (e.target.value.trim()) setAvatarUrl(null);
              }}
              placeholder="https://…"
              className="w-full h-10 min-h-[40px] rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900/5"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-[10px] font-mono font-bold uppercase tracking-[0.12em] text-slate-400">
              Category
            </span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as CommunityCategory)}
              className="w-full h-11 min-h-[44px] rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/5"
            >
              {COMMUNITY_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>

          {/* Access / pricing */}
          <div className="space-y-2">
            <p className="text-[10px] font-mono font-bold uppercase tracking-[0.12em] text-slate-400">
              Access / pricing
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setIsFree(true)}
                className={`h-11 min-h-[44px] rounded-xl text-sm font-semibold border transition-colors ${
                  isFree
                    ? 'bg-[#E9D5FF]/70 border-[#E9D5FF] text-[#1a1848]'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Free community
              </button>
              <button
                type="button"
                onClick={() => setIsFree(false)}
                className={`h-11 min-h-[44px] rounded-xl text-sm font-semibold border transition-colors ${
                  !isFree
                    ? 'bg-[#E9D5FF]/70 border-[#E9D5FF] text-[#1a1848]'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Paid subscription
              </button>
            </div>
            {!isFree ? (
              <label className="block space-y-1.5 pt-1">
                <span className="text-[10px] font-mono font-bold uppercase tracking-[0.12em] text-slate-400">
                  Monthly price (SEK)
                </span>
                <div className="relative">
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={monthlyPrice}
                    onChange={(e) => setMonthlyPrice(e.target.value)}
                    className="w-full h-11 min-h-[44px] rounded-xl border border-slate-200 bg-white pl-3.5 pr-16 text-sm font-semibold tabular-nums text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/5"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    SEK/mo
                  </span>
                </div>
              </label>
            ) : null}
          </div>

          <label className="block space-y-1.5">
            <span className="text-[10px] font-mono font-bold uppercase tracking-[0.12em] text-slate-400">
              Short description
            </span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="What members get inside this community…"
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/5 resize-y min-h-[88px]"
            />
          </label>

          {error ? (
            <p className="text-xs font-semibold text-rose-500">{error}</p>
          ) : null}
        </div>

        <div className="px-5 py-4 border-t border-slate-100 flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
          <button
            type="button"
            disabled={saving}
            onClick={() => onOpenChange(false)}
            className="h-11 min-h-[44px] px-4 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving || uploading || !name.trim()}
            onClick={() => void submit()}
            className="h-11 min-h-[44px] px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            {saving || uploading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Plus size={16} />
            )}
            Create community
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read cropped cover'));
    reader.readAsDataURL(file);
  });
}
