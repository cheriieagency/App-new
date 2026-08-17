'use client';

import { useEffect, useRef, useState } from 'react';
import { ImagePlus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { FieldRow, SectionBlock } from '@/components/admin/settings/SettingsUi';
import CustomDomainSettingsCard from '@/components/admin/settings/CustomDomainSettingsCard';
import {
  loadOrgBranding,
  saveOrgBranding,
  type OrgBranding,
} from '@/lib/settings-prefs';
import { t, type Locale } from '@/lib/i18n';

type GeneralTabProps = {
  locale: Locale;
  workspaceId: string | null;
  workspaceName: string;
};

async function uploadAsset(
  file: File,
  folder: string
): Promise<string | null> {
  const form = new FormData();
  form.append('file', file);
  form.append('folder', folder);
  const res = await fetch('/api/upload', { method: 'POST', body: form });
  const data = (await res.json()) as { url?: string };
  return res.ok && data.url ? data.url : null;
}

export default function GeneralTab({
  locale,
  workspaceId,
  workspaceName,
}: GeneralTabProps) {
  const [branding, setBranding] = useState<OrgBranding>({
    name: workspaceName,
    logoUrl: null,
    faviconUrl: null,
  });
  const [busy, setBusy] = useState<'logo' | 'favicon' | null>(null);
  const logoRef = useRef<HTMLInputElement>(null);
  const favRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (workspaceId) {
        try {
          const r = await fetch(
            `/api/settings?workspaceId=${encodeURIComponent(workspaceId)}`,
            { credentials: 'include' }
          );
          if (r.ok) {
            const data = (await r.json()) as {
              branding?: OrgBranding | null;
              demo?: boolean;
            };
            if (!cancelled && data.branding) {
              setBranding({
                name: data.branding.name || workspaceName,
                logoUrl: data.branding.logoUrl,
                faviconUrl: data.branding.faviconUrl,
              });
              saveOrgBranding(data.branding, workspaceId);
              return;
            }
          }
        } catch {
          /* fall through */
        }
      }
      if (cancelled) return;
      const loaded = loadOrgBranding(workspaceId);
      setBranding({
        name: loaded.name || workspaceName,
        logoUrl: loaded.logoUrl,
        faviconUrl: loaded.faviconUrl,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [workspaceId, workspaceName]);

  const persist = (next: OrgBranding) => {
    setBranding(next);
    saveOrgBranding(next, workspaceId);
    if (!workspaceId) return;
    void fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ workspaceId, branding: next }),
    }).then(async (r) => {
      if (!r.ok) toast.error(t('toastBrandingSaveFailed', locale));
    });
  };

  const onPick = async (kind: 'logo' | 'favicon', file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error(t('toastChooseImage', locale));
      return;
    }
    setBusy(kind);
    const url = await uploadAsset(
      file,
      kind === 'logo' ? 'org-logos' : 'favicons'
    );
    setBusy(null);
    if (!url) {
      toast.error(t('toastUploadFailed', locale));
      return;
    }
    persist({
      ...branding,
      ...(kind === 'logo' ? { logoUrl: url } : { faviconUrl: url }),
    });
    toast.success(
      kind === 'logo'
        ? t('toastLogoUpdated', locale)
        : t('toastFaviconUpdated', locale)
    );
  };

  return (
    <>
      <SectionBlock
        title={t('orgBrandingTitle', locale)}
        subtitle={t('orgBrandingSub', locale)}
      >
        <div className="space-y-5">
          <FieldRow label={t('orgNameLabel', locale)}>
            <input
              value={branding.name}
              onChange={(e) => persist({ ...branding, name: e.target.value })}
              placeholder={workspaceName}
              className="w-full h-11 min-h-[44px] rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 focus:outline-none focus:border-slate-400"
            />
          </FieldRow>

          <FieldRow label={t('orgLogoLabel', locale)} hint={t('orgLogoHint', locale)}>
            <div className="flex items-center gap-3">
              <div className="h-14 w-14 min-h-[56px] min-w-[56px] rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center">
                {branding.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={branding.logoUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <ImagePlus size={18} className="text-slate-300" />
                )}
              </div>
              <button
                type="button"
                disabled={busy === 'logo'}
                onClick={() => logoRef.current?.click()}
                className="h-11 min-h-[44px] px-4 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 inline-flex items-center gap-2"
              >
                {busy === 'logo' ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : null}
                {t('uploadLogo', locale)}
              </button>
              <input
                ref={logoRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  void onPick('logo', e.target.files?.[0]);
                  e.target.value = '';
                }}
              />
            </div>
          </FieldRow>

          <FieldRow
            label={t('orgFaviconLabel', locale)}
            hint="16×16 or 32×32 ICO/PNG for your custom domain."
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 min-h-[40px] min-w-[40px] rounded-lg border border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center">
                {branding.faviconUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={branding.faviconUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <ImagePlus size={14} className="text-slate-300" />
                )}
              </div>
              <button
                type="button"
                disabled={busy === 'favicon'}
                onClick={() => favRef.current?.click()}
                className="h-11 min-h-[44px] px-4 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 inline-flex items-center gap-2"
              >
                {busy === 'favicon' ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : null}
                {t('uploadFavicon', locale)}
              </button>
              <input
                ref={favRef}
                type="file"
                accept="image/*,.ico"
                className="hidden"
                onChange={(e) => {
                  void onPick('favicon', e.target.files?.[0]);
                  e.target.value = '';
                }}
              />
            </div>
          </FieldRow>
        </div>
      </SectionBlock>

      <SectionBlock title={t('settingsNavGeneral', locale)}>
        <CustomDomainSettingsCard />
      </SectionBlock>
    </>
  );
}
