'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2,
  Loader2,
  Shield,
  Unplug,
  X,
} from 'lucide-react';
import {
  FacebookIcon,
  InstagramIcon,
  LinkedInIcon,
  TikTokIcon,
  YouTubeIcon,
} from '@/components/icons/SocialBrandIcons';
import { ClikdMark } from '@/components/brand/ClikdLogo';
import {
  PLATFORM_META,
  type ConnectedSocialAccount,
  type SocialPlatform,
} from '@/lib/mock-content-planner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { localeTag, useLanguage } from '@/lib/i18n';

const DEMO_MODE_KEY = 'clikd_oauth_demo_recording_mode';

const PLATFORM_TITLES: Record<SocialPlatform, string> = {
  instagram: 'Meta / Instagram Graph API',
  tiktok: 'TikTok Content Posting API',
  youtube: 'YouTube Data API v3',
  linkedin: 'LinkedIn Share API',
  facebook: 'Meta / Facebook Pages API',
};

const OAUTH_PERMISSIONS: Record<SocialPlatform, string[]> = {
  instagram: [
    'instagram_basic',
    'instagram_content_publish',
    'pages_show_list',
    'pages_read_engagement',
    'business_management',
  ],
  tiktok: [
    'user.info.basic',
    'video.upload',
    'video.publish',
    'video.list',
  ],
  youtube: [
    'youtube.upload',
    'youtube.readonly',
    'youtube.force-ssl',
    'channel management',
  ],
  linkedin: [
    'openid',
    'profile',
    'w_member_social',
    'r_organization_social',
  ],
  facebook: [
    'pages_show_list',
    'pages_manage_posts',
    'pages_read_engagement',
    'pages_manage_metadata',
    'business_management',
  ],
};

const ICONS = {
  instagram: InstagramIcon,
  tiktok: TikTokIcon,
  linkedin: LinkedInIcon,
  youtube: YouTubeIcon,
  facebook: FacebookIcon,
} as const;

const ORDER: SocialPlatform[] = [
  'instagram',
  'facebook',
  'tiktok',
  'youtube',
  'linkedin',
];

function formatCount(n: number, language: ReturnType<typeof useLanguage>['language']) {
  return n.toLocaleString(localeTag(language));
}

export default function SocialAccountsPanel({
  compact = false,
}: {
  /** Hide page-level title when rendered inside a modal. */
  compact?: boolean;
}) {
  const { t, language } = useLanguage();
  const queryClient = useQueryClient();
  const [demoMode, setDemoMode] = useState(true);

  const connectLabel = (platform: SocialPlatform) => {
    const keys = {
      instagram: 'socials.connectInstagram',
      tiktok: 'socials.connectTikTok',
      youtube: 'socials.connectYouTube',
      linkedin: 'socials.connectLinkedIn',
      facebook: 'socials.connectFacebook',
    } as const;
    return t(keys[platform]);
  };
  const [oauthPlatform, setOauthPlatform] = useState<SocialPlatform | null>(null);
  const [disconnectTarget, setDisconnectTarget] =
    useState<ConnectedSocialAccount | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(DEMO_MODE_KEY);
      if (stored === '0') setDemoMode(false);
      if (stored === '1') setDemoMode(true);
    } catch {
      /* ignore */
    }
  }, []);

  const persistDemoMode = (on: boolean) => {
    setDemoMode(on);
    try {
      localStorage.setItem(DEMO_MODE_KEY, on ? '1' : '0');
    } catch {
      /* ignore */
    }
  };

  const { data, isLoading } = useQuery<{ accounts: ConnectedSocialAccount[]; demo?: boolean }>({
    queryKey: ['planner-socials'],
    queryFn: async () => {
      const r = await fetch('/api/planner/socials');
      if (!r.ok) throw new Error('Failed');
      return r.json();
    },
  });

  const toggle = useMutation({
    mutationFn: async ({
      platform,
      connect,
    }: {
      platform: SocialPlatform;
      connect: boolean;
    }) => {
      const r = await fetch('/api/planner/socials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform, connect }),
      });
      if (!r.ok) throw new Error('Failed');
      return r.json() as Promise<{ account: ConnectedSocialAccount }>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planner-socials'] });
    },
  });

  const startConnect = (platform: SocialPlatform) => {
    if (demoMode) {
      setOauthPlatform(platform);
      return;
    }
    // Live path not fully wired — still use demo connect so the UI stays usable.
    toggle.mutate({ platform, connect: true });
  };

  const grantPermission = () => {
    if (!oauthPlatform) return;
    const platform = oauthPlatform;
    setOauthPlatform(null);
    toggle.mutate({ platform, connect: true });
  };

  const confirmDisconnect = async () => {
    if (!disconnectTarget) return;
    const account = disconnectTarget;
    setDisconnectTarget(null);

    await toggle.mutateAsync({ platform: account.platform, connect: false });

    // Mandatory App Review data-deletion callback.
    try {
      await fetch('/api/auth/data-deletion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: account.platform,
          handle: account.handle,
          display_name: account.display_name,
          source: 'admin_settings_disconnect',
        }),
      });
    } catch {
      /* best-effort */
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-slate-200/80 bg-white p-10 text-center text-sm text-slate-400 font-medium">
        {t('common.loading')}
      </div>
    );
  }

  const byPlatform = new Map((data?.accounts ?? []).map((a) => [a.platform, a]));

  return (
    <div className="space-y-5">
      {!compact && (
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="min-w-0">
            <h2 className="font-outfit font-extrabold text-2xl sm:text-3xl text-slate-900 tracking-tight">
              {t('socials.title')}
            </h2>
            <p className="text-sm sm:text-[15px] text-slate-500 font-medium mt-2 max-w-2xl leading-relaxed">
              {t('socials.subtitle')}
            </p>
          </div>

          <label className="inline-flex items-center gap-2.5 self-start rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 min-h-[44px] shadow-sm cursor-pointer select-none">
            <span className="text-[11px] font-extrabold uppercase tracking-wide text-slate-600">
              {t('socials.demoMode')}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={demoMode}
              onClick={() => persistDemoMode(!demoMode)}
              className={`relative h-6 w-11 rounded-full transition-colors ${
                demoMode ? 'bg-[#10B981]' : 'bg-slate-200'
              }`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  demoMode ? 'translate-x-[22px]' : 'translate-x-0.5'
                }`}
              />
            </button>
          </label>
        </div>
      )}

      {compact && (
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-bold text-slate-500">{t('socials.demoMode')}</p>
          <button
            type="button"
            role="switch"
            aria-checked={demoMode}
            onClick={() => persistDemoMode(!demoMode)}
            className={`relative h-6 w-11 rounded-full transition-colors ${
              demoMode ? 'bg-[#10B981]' : 'bg-slate-200'
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                demoMode ? 'translate-x-[22px]' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>
      )}

      {demoMode && (
        <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/70 px-4 py-3 flex items-start gap-2.5">
          <Shield size={16} className="text-[#10B981] mt-0.5 flex-shrink-0" />
          <p className="text-[12px] sm:text-[13px] text-emerald-900 font-medium leading-snug">
            {t('socials.demoModeHint')}
          </p>
        </div>
      )}

      <div className={`grid grid-cols-1 ${compact ? 'gap-3' : 'md:grid-cols-2 gap-3 sm:gap-4'}`}>
        {ORDER.map((platform) => {
          const acc = byPlatform.get(platform);
          const meta = PLATFORM_META[platform];
          const Icon = ICONS[platform];
          const connected = Boolean(acc?.connected);
          const pending = toggle.isPending && toggle.variables?.platform === platform;

          return (
            <div
              key={platform}
              className={`rounded-2xl border bg-white p-4 sm:p-5 flex flex-col gap-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)] transition-colors ${
                connected
                  ? 'border-[#10B981]/40 ring-1 ring-[#10B981]/15'
                  : 'border-slate-200/80 hover:border-slate-300/90'
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-center flex-shrink-0">
                  <Icon size={18} style={{ color: meta.color }} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-extrabold text-slate-900">{PLATFORM_TITLES[platform]}</p>
                    {connected ? (
                      <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border text-emerald-700 bg-emerald-50 border-emerald-200/80">
                        <CheckCircle2 size={10} strokeWidth={2.75} />
                        {t('socials.activeOauth')}
                      </span>
                    ) : (
                      <span className="inline-flex items-center font-mono text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border text-slate-400 bg-slate-50 border-slate-200/80">
                        {t('socials.disconnected')}
                      </span>
                    )}
                  </div>

                  {connected && acc ? (
                    <div className="flex items-center gap-2.5 mt-3">
                      {acc.avatar_url ? (
                        <img
                          src={acc.avatar_url}
                          alt=""
                          className="w-11 h-11 rounded-full object-cover border-2 border-[#10B981]/40"
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-full bg-slate-100 border border-slate-200/80" />
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-extrabold text-slate-900 truncate">
                          {acc.display_name}
                        </p>
                        <p className="text-xs text-slate-500 font-medium truncate">{acc.handle}</p>
                        {acc.page_name && platform === 'instagram' ? (
                          <p className="text-[11px] font-semibold text-slate-500 mt-0.5 truncate">
                            Page · {acc.page_name}
                          </p>
                        ) : null}
                        {acc.follower_count != null ? (
                          <p className="text-[11px] font-semibold text-slate-500 mt-0.5 tabular-nums">
                            {formatCount(acc.follower_count, language)} followers
                          </p>
                        ) : null}
                        {platform === 'youtube' && acc.subscriber_count != null ? (
                          <p className="text-[11px] font-semibold text-slate-500 mt-0.5 tabular-nums">
                            {formatCount(acc.subscriber_count, language)} subscribers
                          </p>
                        ) : null}
                        {platform === 'linkedin' && acc.company_url ? (
                          <a
                            href={acc.company_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[11px] font-bold text-[#F472B6] hover:underline mt-0.5 inline-block truncate max-w-full"
                          >
                            Company page →
                          </a>
                        ) : null}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 font-medium mt-2 leading-snug">
                      Koppla kontot för schemaläggning, publicering och analytics.
                    </p>
                  )}
                </div>
              </div>

              {connected ? (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => setDisconnectTarget(acc ?? null)}
                  className="h-11 min-h-[44px] rounded-xl font-semibold text-xs inline-flex items-center justify-center gap-2 border border-rose-200 bg-white text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-50"
                >
                  {pending ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Unplug size={14} />
                  )}
                  {t('socials.disconnectAccount')}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => startConnect(platform)}
                  className="h-11 min-h-[44px] rounded-xl font-extrabold text-xs inline-flex items-center justify-center gap-2 bg-[#2B2568] hover:bg-[#1a1848] text-white transition-colors disabled:opacity-50"
                >
                  {pending ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Unplug size={14} />
                  )}
                  {connectLabel(platform)}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Simulated OAuth authorization popup */}
      <Dialog open={Boolean(oauthPlatform)} onOpenChange={(open) => !open && setOauthPlatform(null)}>
        <DialogContent className="max-w-[min(420px,94vw)] rounded-3xl border-slate-200/80 bg-white p-0 gap-0 overflow-hidden shadow-2xl">
          <div className="bg-[#FAFAFA] border-b border-slate-200/80 px-5 py-4 flex items-center gap-3">
            <ClikdMark size={36} className="rounded-[11px] shadow-sm" />
            <div className="min-w-0">
              <p className="font-clikd-wordmark font-extrabold text-[17px] text-slate-900 leading-none">
                clikd<span className="text-[#F472B6]">:</span>
              </p>
              <p className="text-[11px] text-slate-500 font-medium mt-1">
                OAuth authorization · Demo
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOauthPlatform(null)}
              className="ml-auto h-9 w-9 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-100"
              aria-label={t('common.close')}
            >
              <X size={16} />
            </button>
          </div>

          {oauthPlatform ? (
            <div className="px-5 py-5 space-y-4">
              <div>
                <p className="text-sm font-extrabold text-slate-900">
                  {t('socials.oauthTitle', { platform: PLATFORM_META[oauthPlatform].label })}
                </p>
                <p className="text-xs text-slate-500 font-medium mt-1.5 leading-relaxed">
                  {t('socials.oauthBody', { platform: PLATFORM_META[oauthPlatform].label })}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3.5">
                <p className="text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-slate-400 mb-2">
                  {t('socials.permissions')}
                </p>
                <ul className="space-y-1.5">
                  {OAUTH_PERMISSIONS[oauthPlatform].map((perm) => (
                    <li
                      key={perm}
                      className="flex items-center gap-2 text-[12px] font-semibold text-slate-700"
                    >
                      <CheckCircle2 size={13} className="text-[#10B981] flex-shrink-0" />
                      <span className="font-mono text-[11px]">{perm}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                type="button"
                onClick={grantPermission}
                className="w-full min-h-[48px] rounded-2xl bg-[#F472B6] hover:bg-[#e0529c] text-slate-950 text-sm font-black transition-colors"
              >
                {t('socials.grantPermission')}
              </button>
              <button
                type="button"
                onClick={() => setOauthPlatform(null)}
                className="w-full min-h-[44px] rounded-2xl border border-slate-200 text-sm font-bold text-slate-500 hover:bg-slate-50"
              >
                {t('socials.cancel')}
              </button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Disconnect confirmation */}
      <Dialog
        open={Boolean(disconnectTarget)}
        onOpenChange={(open) => !open && setDisconnectTarget(null)}
      >
        <DialogContent className="max-w-[min(400px,94vw)] rounded-3xl">
          <DialogHeader>
            <DialogTitle className="font-outfit font-extrabold text-xl text-slate-900">
              {t('socials.disconnectTitle')}
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-500 font-medium">
              {t('socials.disconnectBody')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <button
              type="button"
              onClick={() => setDisconnectTarget(null)}
              className="min-h-[44px] px-4 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50"
            >
              {t('socials.cancel')}
            </button>
            <button
              type="button"
              onClick={() => void confirmDisconnect()}
              className="min-h-[44px] px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-extrabold"
            >
              {t('socials.confirmDisconnect')}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
