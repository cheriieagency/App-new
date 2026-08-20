'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Check,
  Circle,
  ImageIcon,
  Layers,
  Loader2,
  Sparkles,
  Square,
  Trash2,
  Upload,
  Waves,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  LATER_BIO_FONTS,
  LATER_THEME_PRESETS,
  applyLaterPreset,
  getLaterGoogleFontsHref,
} from '@/components/admin/laterBioThemes';
import type {
  BioAvatarShape,
  BioBlockVariant,
  BioButtonRadius,
  BioHoverEffect,
  BioSocialLayout,
  BioTheme,
} from '@/lib/bio-theme';
import useUpload from '@/utils/useUpload';
import { useLanguage } from '@/lib/i18n';

/** Device image uploader for cover / canvas background. */
function ThemeImageUpload({
  label,
  hint,
  value,
  onChange,
  previewClass = 'h-24 max-w-[200px]',
}: {
  label: string;
  hint: string;
  value: string | null;
  onChange: (url: string | null) => void;
  previewClass?: string;
}) {
  const { t } = useLanguage();
  const fileRef = useRef<HTMLInputElement>(null);
  const [upload, { loading }] = useUpload();
  const [preview, setPreview] = useState<string | null>(value);
  const [error, setError] = useState('');

  useEffect(() => {
    setPreview(value);
  }, [value]);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError(t('chooseImageType'));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError(t('maxFileSize5mb'));
      return;
    }
    setError('');
    const localUrl = URL.createObjectURL(file);
    setPreview(localUrl);
    onChange(localUrl);
    const result = await upload({ file });
    if (result.url) {
      onChange(result.url);
      setPreview(result.url);
    } else {
      setError(result.error || t('uploadFailedRetry'));
      setPreview(value);
      onChange(value);
    }
  };

  return (
    <div className="space-y-2">
      <div>
        <p className="text-[10px] font-mono font-extrabold uppercase tracking-widest text-zinc-400">
          {label}
        </p>
        <p className="text-[10px] text-zinc-500 mt-0.5">{hint}</p>
      </div>

      <div
        className={`relative w-full ${previewClass} rounded-xl border border-dashed border-zinc-200 bg-zinc-50 overflow-hidden`}
      >
        {preview ? (
          <img src={preview} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-zinc-400">
            <ImageIcon size={22} />
            <span className="text-[10px] font-bold">{t('noImageYet')}</span>
          </div>
        )}
        {loading && (
          <div className="absolute inset-0 bg-black/45 flex items-center justify-center">
            <Loader2 size={22} className="text-white animate-spin" />
          </div>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/*"
        className="hidden"
        onChange={(e) => {
          void handleFile(e.target.files?.[0]);
          e.target.value = '';
        }}
      />

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={loading}
          className="h-11 min-h-[44px] px-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold inline-flex items-center gap-1.5 disabled:opacity-60"
        >
          <Upload size={14} />
          {preview ? t('replaceImage') : t('uploadFromDevice')}
        </button>
        {preview && (
          <button
            type="button"
            onClick={() => {
              setPreview(null);
              onChange(null);
              setError('');
            }}
            disabled={loading}
            className="h-11 min-h-[44px] px-3.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 text-xs font-extrabold inline-flex items-center gap-1.5 disabled:opacity-60"
          >
            <Trash2 size={13} /> {t('remove')}
          </button>
        )}
      </div>
      {error ? (
        <p className="text-[10px] font-bold text-red-500">{error}</p>
      ) : (
        <p className="text-[10px] text-zinc-400 font-medium">{t('imageFormatHint')}</p>
      )}
    </div>
  );
}

function ThemeColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  // <input type="color"> only accepts #rrggbb — map rgba / named values to a safe hex.
  const hexForPicker = /^#[0-9A-Fa-f]{6}$/.test(value.trim())
    ? value.trim()
    : '#6366F1';
  return (
    <label className="block space-y-1.5">
      <span className="text-[10px] font-mono font-extrabold uppercase tracking-widest text-zinc-400">
        {label}
      </span>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={hexForPicker}
          onChange={(e) => onChange(e.target.value)}
          className="h-11 w-11 min-h-[44px] min-w-[44px] rounded-xl border border-zinc-200 cursor-pointer bg-white p-1"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 h-11 min-h-[44px] rounded-xl border border-zinc-200 bg-white px-3 text-xs font-bold font-mono text-[#1f2430]"
        />
      </div>
    </label>
  );
}

function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { key: T; label: string; icon?: ReactNode }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5 p-1 rounded-2xl bg-zinc-100/90 border border-zinc-200/80">
      {options.map((opt) => {
        const active = value === opt.key;
        return (
          <button
            key={opt.key}
            type="button"
            onClick={() => onChange(opt.key)}
            className={`inline-flex items-center gap-1.5 h-11 min-h-[44px] px-3 rounded-xl text-xs font-bold transition-all flex-shrink-0 ${
              active
                ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/60'
                : 'text-zinc-500 border border-transparent hover:text-zinc-800'
            }`}
          >
            {opt.icon}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export default function BioBuilderDesignTab({
  theme,
  onChange,
  onPatch,
  onApply,
  saved,
}: {
  theme: BioTheme;
  onChange: (theme: BioTheme) => void;
  onPatch: <K extends keyof BioTheme>(key: K, value: BioTheme[K]) => void;
  onApply: () => void;
  saved: boolean;
}) {
  const { t } = useLanguage();
  const ensureFont = (id: string) => {
    const href = getLaterGoogleFontsHref(id);
    if (!href || typeof document === 'undefined') return;
    const elId = `bio-font-${id}`;
    if (document.getElementById(elId)) return;
    const link = document.createElement('link');
    link.id = elId;
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
  };

  const cardClass =
    'rounded-2xl border border-zinc-200 bg-white p-5 space-y-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] h-fit';

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4">
      {/* Exclusive themes */}
      <section className={cardClass}>
        <div>
          <h3 className="text-sm font-black text-[#1f2430] flex items-center gap-2">
            <Sparkles size={14} className="text-indigo-500" /> {t('exclusiveThemes')}
          </h3>
          <p className="text-xs text-zinc-500">{t('exclusiveThemesSub')}</p>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          {LATER_THEME_PRESETS.map((preset) => {
            const active = theme.presetId === preset.presetId;
            const labelKey =
              (
                {
                  'midnight-glass': 'themeMidnight',
                  'champagne-luxe': 'themeChampagne',
                  'aurora-glow': 'themeAurora',
                  'nordic-minimal': 'themeNordic',
                  'arctic-mist': 'themeArctic',
                  'emerald-vault': 'themeEmerald',
                  'coral-pulse': 'themeCoral',
                  'noir-cinema': 'themeNoir',
                } as const
              )[preset.presetId as string] || null;
            const blurbKey = labelKey
              ? (`${labelKey}Blurb` as
                  | 'themeMidnightBlurb'
                  | 'themeChampagneBlurb'
                  | 'themeAuroraBlurb'
                  | 'themeNordicBlurb'
                  | 'themeArcticBlurb'
                  | 'themeEmeraldBlurb'
                  | 'themeCoralBlurb'
                  | 'themeNoirBlurb')
              : null;
            return (
              <button
                key={preset.presetId}
                type="button"
                onClick={() => {
                  ensureFont(preset.fontId);
                  onChange(applyLaterPreset(preset.presetId));
                }}
                className={`relative overflow-hidden p-3 rounded-2xl border-2 text-left min-h-[44px] transition-all ${
                  active
                    ? 'border-indigo-500 shadow-md shadow-indigo-500/10'
                    : 'border-zinc-100 hover:border-zinc-200'
                }`}
              >
                <div
                  className="absolute inset-0 opacity-90"
                  style={{
                    background: `linear-gradient(135deg, ${preset.swatch.from}, ${
                      preset.swatch.via || preset.swatch.from
                    }, ${preset.swatch.to})`,
                  }}
                />
                <div className="relative z-10">
                  <div className="flex gap-1 mb-2">
                    <span
                      className="w-6 h-6 rounded-lg border border-white/40 shadow-sm backdrop-blur-sm"
                      style={{
                        background: preset.buttonBg.startsWith('#')
                          ? preset.buttonBg
                          : preset.accent,
                      }}
                    />
                    <span
                      className="w-6 h-6 rounded-lg border border-white/40 shadow-sm"
                      style={{ background: preset.accent }}
                    />
                  </div>
                  <p className="text-xs font-extrabold text-white drop-shadow-sm">
                    {labelKey ? t(labelKey) : preset.label}
                  </p>
                  <p className="text-[10px] text-white/80">
                    {blurbKey ? t(blurbKey) : preset.desc}
                  </p>
                </div>
                {active && (
                  <span className="absolute top-2 right-2 z-20 w-5 h-5 rounded-full bg-white text-indigo-600 flex items-center justify-center shadow">
                    <Check size={11} strokeWidth={3} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* Header & cover */}
      <section className={cardClass}>
        <h3 className="text-sm font-black text-[#1f2430]">{t('headerCoverBanner')}</h3>

        <div className="flex items-center justify-between gap-3 rounded-xl border border-zinc-100 bg-zinc-50/80 px-3 py-2.5">
          <div>
            <p className="text-xs font-bold text-[#1f2430]">{t('hdCoverPhoto')}</p>
            <p className="text-[10px] text-zinc-500">{t('optionalBannerAbove')}</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={theme.coverEnabled}
            onClick={() => onPatch('coverEnabled', !theme.coverEnabled)}
            className={`relative h-7 w-12 rounded-full transition-colors ${
              theme.coverEnabled ? 'bg-indigo-600' : 'bg-zinc-300'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
                theme.coverEnabled ? 'translate-x-5' : ''
              }`}
            />
          </button>
        </div>

        {theme.coverEnabled && (
          <ThemeImageUpload
            label={t('coverImage')}
            hint={t('uploadBannerHint')}
            value={theme.coverImageUrl}
            onChange={(url) => onPatch('coverImageUrl', url)}
            previewClass="h-20 max-w-[180px]"
          />
        )}

        <div>
          <p className="text-[10px] font-mono font-extrabold uppercase tracking-widest text-zinc-400 mb-2">
            {t('avatarShape')}
          </p>
          <Segmented<BioAvatarShape>
            value={theme.avatarShape}
            onChange={(v) => onPatch('avatarShape', v)}
            options={[
              { key: 'circle', label: t('shapeCircle'), icon: <Circle size={13} /> },
              { key: 'squircle', label: t('shapeSquircle'), icon: <Square size={13} /> },
            ]}
          />
        </div>

        <div className="flex items-center justify-between gap-3 rounded-xl border border-zinc-100 bg-zinc-50/80 px-3 py-2.5">
          <div>
            <p className="text-xs font-bold text-[#1f2430]">{t('verifiedBadge')}</p>
            <p className="text-[10px] text-zinc-500">{t('verifiedBadgeHint')}</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={theme.verifiedBadge}
            onClick={() => onPatch('verifiedBadge', !theme.verifiedBadge)}
            className={`relative h-7 w-12 rounded-full transition-colors ${
              theme.verifiedBadge ? 'bg-indigo-600' : 'bg-zinc-300'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
                theme.verifiedBadge ? 'translate-x-5' : ''
              }`}
            />
          </button>
        </div>

        <div>
          <p className="text-[10px] font-mono font-extrabold uppercase tracking-widest text-zinc-400 mb-2">
            {t('socialIconsLayout')}
          </p>
          <Segmented<BioSocialLayout>
            value={theme.socialLayout}
            onChange={(v) => onPatch('socialLayout', v)}
            options={[
              { key: 'header', label: t('socialLayoutHeader') },
              { key: 'dock', label: t('socialLayoutDock') },
            ]}
          />
        </div>
      </section>

      {/* Canvas & background */}
      <section className={cardClass}>
        <h3 className="text-sm font-black text-[#1f2430]">{t('canvasBackground')}</h3>
        <div>
          <p className="text-[10px] font-mono font-extrabold uppercase tracking-widest text-zinc-400 mb-2">
            {t('backgroundType')}
          </p>
          <Segmented<'solid' | 'image' | 'liquid'>
            value={
              theme.bgType === 'image' || theme.bgType === 'liquid'
                ? theme.bgType
                : 'solid'
            }
            onChange={(v) => {
              if (v === 'solid') {
                // Keep mesh if already mesh; otherwise solid
                onPatch('bgType', theme.bgType === 'mesh' ? 'mesh' : 'solid');
              } else {
                onPatch('bgType', v);
              }
            }}
            options={[
              { key: 'solid', label: t('bgSolidMesh'), icon: <Layers size={13} /> },
              { key: 'image', label: t('bgHdImage'), icon: <ImageIcon size={13} /> },
              { key: 'liquid', label: t('bgLiquid'), icon: <Sparkles size={13} /> },
            ]}
          />
        </div>

        {(theme.bgType === 'solid' || theme.bgType === 'mesh') && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-zinc-100 bg-zinc-50/80 px-3 py-2.5">
            <div className="flex items-center gap-2">
              <Waves size={14} className="text-indigo-500" />
              <div>
                <p className="text-xs font-bold text-[#1f2430]">{t('meshGradient')}</p>
                <p className="text-[10px] text-zinc-500">{t('meshGradientHint')}</p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={theme.bgType === 'mesh'}
              onClick={() => onPatch('bgType', theme.bgType === 'mesh' ? 'solid' : 'mesh')}
              className={`relative h-7 w-12 rounded-full transition-colors ${
                theme.bgType === 'mesh' ? 'bg-indigo-600' : 'bg-zinc-300'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
                  theme.bgType === 'mesh' ? 'translate-x-5' : ''
                }`}
              />
            </button>
          </div>
        )}

        <ThemeColorField
          label={t('primaryTintColor')}
          value={theme.bgType === 'solid' ? theme.bg : theme.accent}
          onChange={(v) => {
            if (theme.bgType === 'solid') onPatch('bg', v);
            else onPatch('accent', v);
          }}
        />

        {theme.bgType === 'image' && (
          <ThemeImageUpload
            label={t('backgroundImage')}
            hint={t('uploadCanvasBgHint')}
            value={theme.bgImageUrl}
            onChange={(url) => onPatch('bgImageUrl', url)}
            previewClass="h-28 max-w-[120px]"
          />
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <ThemeColorField
            label={t('textIconColor')}
            value={theme.nameColor}
            onChange={(v) => onPatch('nameColor', v)}
          />
          <ThemeColorField
            label={t('mutedTextColor')}
            value={theme.mutedColor}
            onChange={(v) => onPatch('mutedColor', v)}
          />
        </div>

        <div>
          <p className="text-[10px] font-mono font-extrabold uppercase tracking-widest text-zinc-400 mb-2">
            {t('typographyLabel')}
          </p>
          <select
            value={theme.fontId}
            onChange={(e) => {
              ensureFont(e.target.value);
              onPatch('fontId', e.target.value);
            }}
            className="w-full h-11 min-h-[44px] rounded-xl border border-zinc-200 bg-white px-3 text-sm font-bold text-[#1f2430]"
          >
            {LATER_BIO_FONTS.map((f) => (
              <option key={f.id} value={f.id} style={{ fontFamily: f.family }}>
                {f.label}
                {f.id === 'jakarta'
                  ? t('fontHintJakarta')
                  : f.id === 'playfair'
                    ? t('fontHintPlayfair')
                    : f.id === 'space'
                      ? t('fontHintSpace')
                      : t('fontHintDefault')}
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* Block designs */}
      <section className={cardClass}>
        <h3 className="text-sm font-black text-[#1f2430]">{t('exclusiveBlockDesigns')}</h3>
        <div>
          <p className="text-[10px] font-mono font-extrabold uppercase tracking-widest text-zinc-400 mb-2">
            {t('blockVariant')}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                { key: 'frosted' as const, label: t('variantFrosted'), hint: t('variantHintFrosted') },
                { key: 'solid' as const, label: t('variantSolid'), hint: t('variantHintSolid') },
                { key: 'luxe' as const, label: t('variantLuxe'), hint: t('variantHintLuxe') },
                { key: 'minimal' as const, label: t('variantMinimal'), hint: t('variantHintMinimal') },
              ] as { key: BioBlockVariant; label: string; hint: string }[]
            ).map((v) => (
              <button
                key={v.key}
                type="button"
                onClick={() => {
                  onPatch('blockVariant', v.key);
                  if (v.key === 'frosted') onPatch('buttonStyle', 'soft');
                  if (v.key === 'solid') onPatch('buttonStyle', 'filled');
                  if (v.key === 'luxe') onPatch('buttonStyle', 'filled');
                  if (v.key === 'minimal') onPatch('buttonStyle', 'outline');
                }}
                className={`p-3 rounded-xl border text-left min-h-[44px] ${
                  theme.blockVariant === v.key
                    ? 'border-indigo-500 bg-indigo-50/50'
                    : 'border-zinc-100 bg-zinc-50 hover:border-zinc-200'
                }`}
              >
                <p className="text-xs font-extrabold text-[#1f2430]">{v.label}</p>
                <p className="text-[10px] text-zinc-500">{v.hint}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <ThemeColorField
            label={t('blockBackground')}
            value={theme.buttonBg.startsWith('#') ? theme.buttonBg : theme.accent}
            onChange={(v) => onPatch('buttonBg', v)}
          />
          <ThemeColorField
            label={t('blockTextColor')}
            value={theme.buttonText.startsWith('#') ? theme.buttonText : '#FFFFFF'}
            onChange={(v) => onPatch('buttonText', v)}
          />
        </div>

        <div>
          <p className="text-[10px] font-mono font-extrabold uppercase tracking-widest text-zinc-400 mb-2">
            {t('cornerCurvature')}
          </p>
          <Segmented<BioButtonRadius>
            value={theme.buttonRadius}
            onChange={(v) => onPatch('buttonRadius', v)}
            options={[
              { key: 'rounded', label: t('radiusCurved') },
              { key: 'sharp', label: t('radiusSharp') },
              { key: 'pill', label: t('radiusPill') },
            ]}
          />
        </div>

        <div>
          <p className="text-[10px] font-mono font-extrabold uppercase tracking-widest text-zinc-400 mb-2">
            {t('hoverEffect')}
          </p>
          <Segmented<BioHoverEffect>
            value={theme.hoverEffect}
            onChange={(v) => onPatch('hoverEffect', v)}
            options={[
              { key: 'lift', label: t('hoverLift') },
              { key: 'shimmer', label: t('hoverShimmer') },
              { key: 'scale', label: t('hoverScale') },
            ]}
          />
        </div>

      </section>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <Button
          type="button"
          className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-black h-11 min-h-[44px] shadow-md shadow-indigo-600/20"
          onClick={onApply}
        >
          {saved ? t('themeSaved') : t('applyTheme')}
        </Button>
      </div>
    </div>
  );
}
