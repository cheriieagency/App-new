'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, Loader2, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { authClient } from '@/lib/auth-client';
import { signOutAndRedirect } from '@/lib/sign-out-client';
import useUpload from '@/utils/useUpload';
import { FieldRow, SectionBlock } from '@/components/admin/settings/SettingsUi';
import DeleteAccountModal from '@/components/admin/settings/DeleteAccountModal';
import {
  TIMEZONE_OPTIONS,
  detectDefaultTimezone,
  loadTimezone,
  saveTimezone,
} from '@/lib/settings-prefs';
import { t, type Locale } from '@/lib/i18n';

type ProfileTabProps = {
  locale: Locale;
  flash: (msg: string) => void;
};

export default function ProfileTab({ locale, flash }: ProfileTabProps) {
  const { data: session } = authClient.useSession();
  const [upload, { loading: uploading }] = useUpload();
  const fileRef = useRef<HTMLInputElement>(null);
  const [displayName, setDisplayName] = useState(session?.user?.name || '');
  const [email, setEmail] = useState(session?.user?.email || '');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(
    session?.user?.image || null
  );
  const [timezone, setTimezone] = useState('Europe/Stockholm');
  const [password, setPassword] = useState('');
  const [weekStart, setWeekStart] = useState('monday');
  const [twoFaEnabled, setTwoFaEnabled] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    if (session?.user?.name) setDisplayName(session.user.name);
    if (session?.user?.email) setEmail(session.user.email);
    if (session?.user?.image) setAvatarUrl(session.user.image);
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch('/api/settings', { credentials: 'include' });
        if (r.ok) {
          const data = (await r.json()) as { timezone?: string; demo?: boolean };
          if (!cancelled && data.timezone) {
            setTimezone(data.timezone);
            saveTimezone(data.timezone, session?.user?.id);
            return;
          }
        }
      } catch {
        /* fall through to local */
      }
      if (!cancelled) {
        setTimezone(loadTimezone(session?.user?.id) || detectDefaultTimezone());
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session?.user?.id, session?.user?.name, session?.user?.email, session?.user?.image]);

  const initial = (displayName?.[0] || session?.user?.email?.[0] || 'C').toUpperCase();

  const persistAvatar = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file');
      return;
    }
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', 'avatars');
    formData.append('bucket', 'avatars');
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        // Fallback through useUpload without bucket if dedicated bucket fails.
        const fallback = await upload({ file });
        if (fallback.error || !fallback.url) {
          toast.error(data.error || fallback.error || 'Upload failed');
          return;
        }
        setAvatarUrl(fallback.url);
        await authClient.updateUser({ image: fallback.url });
        flash(t('flashDisplayNameSaved', locale));
        toast.success('Profile photo updated');
        return;
      }
      setAvatarUrl(data.url);
      await authClient.updateUser({ image: data.url });
      flash(t('flashDisplayNameSaved', locale));
      toast.success('Profile photo updated');
    } catch {
      toast.error('Could not upload profile photo');
    }
  };

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file) void persistAvatar(file);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [locale]
  );

  const saveProfile = async () => {
    try {
      await authClient.updateUser({ name: displayName.trim() || undefined });
      const r = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ timezone }),
      });
      if (!r.ok) {
        const err = (await r.json().catch(() => ({}))) as { message?: string };
        throw new Error(err.message || 'Failed to save timezone');
      }
      saveTimezone(timezone, session?.user?.id);
      flash(t('flashDisplayNameSaved', locale));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save profile');
    }
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch('/api/settings/delete-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ confirm: 'DELETE' }),
      });
      if (!res.ok) {
        toast.error('Could not delete account — contact support');
        setDeleting(false);
        return;
      }
      await signOutAndRedirect('/');
    } catch {
      toast.error('Could not delete account');
      setDeleting(false);
    }
  };

  return (
    <>
      <SectionBlock
        title={t('settingsNavProfile', locale)}
        subtitle={t('settingsUpdateProfile', locale)}
      >
        <div className="space-y-5">
          <div>
            <p className="text-sm font-semibold text-slate-800 mb-2">Profile photo</p>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              className={`flex flex-col sm:flex-row items-center gap-4 rounded-2xl border border-dashed p-4 transition-colors ${
                dragOver
                  ? 'border-[#F472B6] bg-[#FCE7F3]/40'
                  : 'border-slate-200 bg-slate-50/50'
              }`}
            >
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="relative h-20 w-20 min-h-[80px] min-w-[80px] rounded-full overflow-hidden border-2 border-white shadow-sm bg-[#2B2568] text-white font-extrabold text-2xl flex items-center justify-center"
              >
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  initial
                )}
                <span className="absolute inset-0 bg-slate-900/0 hover:bg-slate-900/35 transition-colors flex items-center justify-center">
                  {uploading ? (
                    <Loader2 size={18} className="animate-spin text-white" />
                  ) : (
                    <Camera
                      size={18}
                      className="text-white opacity-0 hover:opacity-100"
                    />
                  )}
                </span>
              </button>
              <div className="text-center sm:text-left min-w-0">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="inline-flex items-center justify-center h-11 min-h-[44px] px-4 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  {uploading ? 'Uploading…' : 'Upload photo'}
                </button>
                <p className="text-[11px] text-slate-400 font-medium mt-1.5">
                  Drag & drop or click · PNG/JPG · saved to avatars storage
                </p>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void persistAvatar(file);
                  e.target.value = '';
                }}
              />
            </div>
          </div>

          <FieldRow
            label={t('displayName', locale)}
            action={
              <button
                type="button"
                onClick={() => void saveProfile()}
                className="h-11 min-h-[44px] px-4 rounded-xl bg-[#1a1848] text-white text-xs font-bold hover:bg-[#2B2568] transition-colors"
              >
                {t('save', locale)}
              </button>
            }
          >
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full h-11 min-h-[44px] rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 focus:outline-none focus:border-slate-400"
            />
          </FieldRow>

          <FieldRow
            label="Timezone"
            hint="Used for calendars, reports, and scheduled posts."
          >
            <select
              value={timezone}
              onChange={(e) => {
                const next = e.target.value;
                setTimezone(next);
                saveTimezone(next, session?.user?.id);
                void fetch('/api/settings', {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  credentials: 'include',
                  body: JSON.stringify({ timezone: next }),
                }).then(async (r) => {
                  if (!r.ok) toast.error('Could not save timezone');
                });
              }}
              className="w-full h-11 min-h-[44px] rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 focus:outline-none"
            >
              {!TIMEZONE_OPTIONS.some((o) => o.value === timezone) ? (
                <option value={timezone}>{timezone}</option>
              ) : null}
              {TIMEZONE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </FieldRow>
        </div>
      </SectionBlock>

      <SectionBlock
        title={t('settingsCalendar', locale)}
        subtitle={t('settingsCalendarSub', locale)}
      >
        <FieldRow label={t('settingsWeekStart', locale)}>
          <select
            value={weekStart}
            onChange={(e) => setWeekStart(e.target.value)}
            className="w-full h-11 min-h-[44px] rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 focus:outline-none"
          >
            <option value="monday">{t('settingsMonday', locale)}</option>
            <option value="sunday">{t('settingsSunday', locale)}</option>
          </select>
        </FieldRow>
      </SectionBlock>

      <SectionBlock title={t('settingsSecurity', locale)}>
        <div className="space-y-4">
          <FieldRow
            label={t('settingsNewPassword', locale)}
            hint={t('settingsNewPasswordHint', locale)}
            action={
              <button
                type="button"
                onClick={() => {
                  setPassword('');
                  flash(t('flashPasswordUpdated', locale));
                }}
                className="h-11 min-h-[44px] px-4 rounded-xl bg-[#1a1848] text-white text-xs font-bold hover:bg-[#2B2568] transition-colors"
              >
                {t('settingsReset', locale)}
              </button>
            }
          >
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full h-11 min-h-[44px] rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium focus:outline-none focus:border-slate-400"
            />
          </FieldRow>

          <div className="rounded-2xl border border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
            <div className="min-w-0">
              <p className="text-sm font-extrabold text-slate-900">
                {t('settingsEnable2fa', locale)}
              </p>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {twoFaEnabled
                  ? t('settings2faOn', locale)
                  : t('settingsEnable2faSub', locale)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setTwoFaEnabled((v) => !v);
                flash(
                  twoFaEnabled
                    ? t('flash2faDisabled', locale)
                    : t('flash2faEnabled', locale)
                );
              }}
              className="inline-flex items-center justify-center gap-1.5 h-11 min-h-[44px] px-4 rounded-xl bg-[#1a1848] text-white text-xs font-bold hover:bg-[#2B2568] transition-colors flex-shrink-0"
            >
              {twoFaEnabled
                ? t('settingsManage2fa', locale)
                : t('settingsEnable2fa', locale)}
            </button>
          </div>
        </div>
      </SectionBlock>

      <SectionBlock title={t('settingsContact', locale)}>
        <FieldRow
          label={t('settingsNewEmail', locale)}
          hint={t('settingsNewEmailHint', locale)}
          action={
            <button
              type="button"
              onClick={() => flash(t('flashEmailConfirm', locale))}
              className="h-11 min-h-[44px] px-4 rounded-xl bg-[#1a1848] text-white text-xs font-bold hover:bg-[#2B2568] transition-colors"
            >
              {t('settingsReset', locale)}
            </button>
          }
        >
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full h-11 min-h-[44px] rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium focus:outline-none focus:border-slate-400"
          />
        </FieldRow>
      </SectionBlock>

      <div className="pt-6 space-y-4">
        <button
          type="button"
          onClick={() => void signOutAndRedirect('/')}
          className="w-full h-12 min-h-[48px] rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors inline-flex items-center justify-center gap-2"
        >
          <LogOut size={15} />
          {t('settingsLogOut', locale)}
        </button>
        <div className="text-center pt-2">
          <button
            type="button"
            onClick={() => setDeleteOpen(true)}
            className="text-xs font-semibold text-slate-400 hover:text-rose-500 underline-offset-2 hover:underline transition-colors min-h-[44px] px-2"
          >
            {t('settingsDeleteAccount', locale)}…
          </button>
        </div>
      </div>

      <DeleteAccountModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={confirmDelete}
        busy={deleting}
      />
    </>
  );
}
