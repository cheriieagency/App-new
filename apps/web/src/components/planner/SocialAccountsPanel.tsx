'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2,
  Loader2,
  RefreshCw,
  Shield,
  Unplug,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  FacebookIcon,
  InstagramIcon,
  LinkedInIcon,
  PinterestIcon,
  TikTokIcon,
  YouTubeIcon,
} from '@/components/icons/SocialBrandIcons';
import { ClikdMark } from '@/components/brand/ClikdLogo';
import IgBusinessRequiredBanner from '@/components/admin/IgBusinessRequiredBanner';
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
import { useSocialAccounts } from '@/hooks/useSocialAccounts';
import { useWorkspaceOptional } from '@/context/WorkspaceContext';
import WorkspaceOAuthGuideBanner from '@/components/admin/WorkspaceOAuthGuideBanner';
import GoogleIntegrationCard from '@/components/admin/GoogleIntegrationCard';

const DEMO_MODE_KEY = 'clikd_oauth_demo_recording_mode';

function withWorkspaceQuery(path: string, workspaceId: string | null | undefined) {
  if (!workspaceId) return path;
  const url = new URL(path, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
  url.searchParams.set('workspaceId', workspaceId);
  return `${url.pathname}?${url.searchParams.toString()}`;
}

const PLATFORM_TITLES: Record<SocialPlatform, string> = {
  instagram: 'Meta / Instagram Graph API',
  tiktok: 'TikTok Content Posting API',
  youtube: 'YouTube Data API v3',
  linkedin: 'LinkedIn Share API',
  facebook: 'Meta / Facebook Pages API',
  pinterest: 'Pinterest Developer API',
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
    'user.info.stats',
    'video.list',
    'video.upload',
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
  pinterest: [
    'boards:read',
    'boards:write',
    'pins:read',
    'pins:write',
    'user_accounts:read',
  ],
};

const ICONS = {
  instagram: InstagramIcon,
  tiktok: TikTokIcon,
  linkedin: LinkedInIcon,
  youtube: YouTubeIcon,
  facebook: FacebookIcon,
  pinterest: PinterestIcon,
} as const;

const ORDER: SocialPlatform[] = [
  'instagram',
  'facebook',
  'tiktok',
  'youtube',
  'linkedin',
  'pinterest',
];

function formatCount(n: number, language: ReturnType<typeof useLanguage>['language']) {
  return n.toLocaleString(localeTag(language));
}

/** Account label shown under a Connected quick-action button. */
function ConnectedAccountChip({
  account,
}: {
  account: ConnectedSocialAccount;
}) {
  const label =
    account.display_name ||
    account.handle ||
    account.page_name ||
    'Connected account';
  return (
    <div className="flex items-center gap-2 min-w-0 mt-2 px-1">
      {account.avatar_url ? (
        <img
          src={account.avatar_url}
          alt=""
          className="w-7 h-7 rounded-full object-cover border border-emerald-200 flex-shrink-0"
        />
      ) : (
        <span className="w-7 h-7 rounded-full bg-emerald-50 border border-emerald-200 flex-shrink-0" />
      )}
      <div className="min-w-0">
        <p className="text-xs font-extrabold text-slate-900 truncate">{label}</p>
        {account.handle && account.handle !== label ? (
          <p className="text-[11px] font-medium text-slate-500 truncate font-mono">
            {account.handle}
          </p>
        ) : account.page_name && account.page_name !== label ? (
          <p className="text-[11px] font-medium text-slate-500 truncate">
            Page · {account.page_name}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function ConnectOrConnectedButton({
  connected,
  account,
  onConnect,
  onDisconnect,
  idleLabel,
  idleClassName,
  icon,
  disconnectLabel = 'Disconnect',
  helperHint,
}: {
  connected: boolean;
  account?: ConnectedSocialAccount | null;
  onConnect: () => void;
  onDisconnect?: () => void;
  idleLabel: string;
  idleClassName: string;
  icon: ReactNode;
  disconnectLabel?: string;
  /** Small tip under the connect CTA (e.g. per-workspace support). */
  helperHint?: string;
}) {
  if (connected && account) {
    return (
      <div className="min-w-0 sm:min-w-[200px] flex-1 sm:flex-none">
        <button
          type="button"
          disabled
          aria-pressed="true"
          className="w-full inline-flex items-center justify-center gap-2 min-h-[44px] px-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-bold cursor-default"
        >
          <CheckCircle2 size={16} strokeWidth={2.5} />
          Connected ✓
        </button>
        <ConnectedAccountChip account={account} />
        {onDisconnect ? (
          <button
            type="button"
            onClick={onDisconnect}
            className="mt-2 w-full inline-flex items-center justify-center gap-2 min-h-[44px] px-4 rounded-xl border border-rose-200 bg-white text-rose-600 text-xs font-semibold hover:bg-rose-50 transition-colors"
          >
            <Unplug size={14} />
            {disconnectLabel}
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="min-w-0 sm:min-w-[200px] flex-1 sm:flex-none flex flex-col gap-1.5">
      <button
        type="button"
        onClick={onConnect}
        title={helperHint}
        className={`inline-flex items-center justify-center gap-2 min-h-[44px] px-4 rounded-xl text-white text-sm font-bold shadow-sm transition-colors ${idleClassName}`}
      >
        {icon}
        {idleLabel}
      </button>
      {helperHint ? (
        <p className="px-1 text-[10px] font-semibold text-slate-500 leading-snug">
          {helperHint}
        </p>
      ) : null}
    </div>
  );
}

export default function SocialAccountsPanel({
  compact = false,
}: {
  /** Hide page-level title when rendered inside a modal. */
  compact?: boolean;
}) {
  const { t, language } = useLanguage();
  const queryClient = useQueryClient();
  const workspaceCtx = useWorkspaceOptional();
  const activeWorkspace = workspaceCtx?.activeWorkspace;
  const activeWorkspaceId = workspaceCtx?.activeWorkspaceId || null;
  const [demoMode, setDemoMode] = useState(false);

  const connectLabel = (platform: SocialPlatform) => {
    const keys: Partial<Record<SocialPlatform, string>> = {
      instagram: 'socials.connectInstagram',
      tiktok: 'socials.connectTikTok',
      youtube: 'socials.connectYouTube',
      linkedin: 'socials.connectLinkedIn',
      facebook: 'socials.connectFacebook',
    };
    const key = keys[platform];
    return key ? t(key) : PLATFORM_META[platform].connectLabel;
  };
  const [oauthPlatform, setOauthPlatform] = useState<SocialPlatform | null>(null);
  const [disconnectTarget, setDisconnectTarget] =
    useState<ConnectedSocialAccount | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(DEMO_MODE_KEY);
      // Default is live OAuth (off). Only enable Demo Mode when explicitly stored as on.
      if (stored === '1') setDemoMode(true);
      else {
        setDemoMode(false);
        if (stored !== '0') localStorage.setItem(DEMO_MODE_KEY, '0');
      }
    } catch {
      setDemoMode(false);
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

  const { data, isLoading, accounts: liveAccounts } = useSocialAccounts();

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
        body: JSON.stringify({
          platform,
          connect,
          workspaceId: activeWorkspaceId,
        }),
      });
      if (!r.ok) throw new Error('Failed');
      return r.json() as Promise<{ account: ConnectedSocialAccount }>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['social-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['planner-socials'] });
    },
  });

  const resyncMetaWebhooks = useMutation({
    mutationFn: async () => {
      if (!activeWorkspaceId) {
        throw new Error('Select a workspace first');
      }
      const r = await fetch('/api/admin/inbox/automations/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          workspaceId: activeWorkspaceId,
          action: 'resubscribe_webhooks',
        }),
      });
      if (!r.ok) {
        let message = `Re-sync failed (${r.status})`;
        try {
          const errJson = (await r.json()) as { error?: string };
          if (errJson?.error) message = errJson.error;
        } catch {
          /* ignore */
        }
        throw new Error(message);
      }
      return r.json() as Promise<{
        success?: boolean;
        subscribedCount?: number;
        details?: Array<{ ok: boolean; error?: string }>;
        ready?: boolean;
        blockers?: string[];
        subscribeResults?: Array<{ targetId: string; ok: boolean }>;
      }>;
    },
    onSuccess: (json) => {
      const okCount =
        json.subscribedCount ??
        json.details?.filter((row) => row.ok).length ??
        json.subscribeResults?.filter((row) => row.ok).length ??
        0;
      if (json.success || json.ready || okCount > 0) {
        toast.success(
          `Re-synced Meta webhooks (${okCount} account${okCount === 1 ? '' : 's'}).`
        );
      } else {
        const firstDetailError = json.details?.find((d) => d.error)?.error;
        toast.error(
          (
            json.blockers?.join(' ') ||
            firstDetailError ||
            'Could not re-subscribe Meta webhooks.'
          ).slice(0, 180)
        );
      }
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Re-sync failed');
    },
  });

  const startConnect = (platform: SocialPlatform) => {
    // Live OAuth when Demo Mode is off — always bind to active workspace.
    if (!demoMode && platform === 'instagram') {
      window.location.href = withWorkspaceQuery(
        '/api/auth/meta/login?target=instagram',
        activeWorkspaceId
      );
      return;
    }
    if (!demoMode && platform === 'facebook') {
      window.location.href = withWorkspaceQuery(
        '/api/auth/meta/login?target=facebook',
        activeWorkspaceId
      );
      return;
    }
    if (!demoMode && platform === 'youtube') {
      window.location.href = withWorkspaceQuery(
        '/api/auth/youtube/login',
        activeWorkspaceId
      );
      return;
    }
    if (!demoMode && platform === 'linkedin') {
      window.location.href = withWorkspaceQuery(
        '/api/auth/linkedin/login',
        activeWorkspaceId
      );
      return;
    }
    if (!demoMode && platform === 'tiktok') {
      window.location.href = withWorkspaceQuery(
        '/api/auth/tiktok/login',
        activeWorkspaceId
      );
      return;
    }
    if (!demoMode && platform === 'pinterest') {
      window.location.href = withWorkspaceQuery(
        '/api/auth/pinterest/login',
        activeWorkspaceId
      );
      return;
    }
    if (demoMode) {
      setOauthPlatform(platform);
      return;
    }
    toggle.mutate({ platform, connect: true });
  };

  const startMetaConnect = (target: 'instagram' | 'facebook' | 'both') => {
    window.location.href = withWorkspaceQuery(
      `/api/auth/meta/login?target=${target}`,
      activeWorkspaceId
    );
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

    const livePlatforms = new Set([
      'instagram',
      'facebook',
      'youtube',
      'linkedin',
      'tiktok',
      'pinterest',
      'google',
    ]);

    // Live OAuth rows: delete only that platform via unified disconnect API.
    if (!demoMode && livePlatforms.has(account.platform)) {
      try {
        const r = await fetch('/api/auth/disconnect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            platform: account.platform,
            platformUserId: account.external_id ?? '',
            workspaceId: activeWorkspaceId,
          }),
        });
        if (!r.ok) throw new Error('Disconnect failed');
        await queryClient.invalidateQueries({ queryKey: ['social-accounts'] });
        await queryClient.invalidateQueries({ queryKey: ['planner-socials'] });
        await queryClient.invalidateQueries({ queryKey: ['meta-sync'] });
      } catch {
        /* fall through to demo toggle for local state */
        await toggle.mutateAsync({ platform: account.platform, connect: false });
      }
    } else {
      await toggle.mutateAsync({ platform: account.platform, connect: false });
    }

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

  const byPlatform = new Map(
    (data?.accounts ?? liveAccounts ?? []).map((a) => [a.platform, a])
  );
  const needsIgBusiness =
    Boolean(data?.needs_ig_business) ||
    (Boolean(byPlatform.get('facebook')?.connected) &&
      !byPlatform.get('instagram')?.connected &&
      Boolean(data?.meta_connected));

  return (
    <div className="space-y-5">
      {!compact && activeWorkspace ? (
        <div className="rounded-2xl border border-[#E9D5FF]/80 bg-[#FAFAFA] px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-slate-400">
              Managing API Connections for
            </p>
            <p className="text-sm font-extrabold text-slate-900 truncate mt-0.5">
              {activeWorkspace.name}{' '}
              <span className="font-mono text-xs font-semibold text-slate-500">
                {activeWorkspace.handle}
              </span>
            </p>
          </div>
          <p className="text-[11px] font-medium text-slate-500">
            Connections stay private to this workspace.
          </p>
        </div>
      ) : null}

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

      {needsIgBusiness ? <IgBusinessRequiredBanner /> : null}

      {!compact && !demoMode ? <WorkspaceOAuthGuideBanner /> : null}

      {!compact && !demoMode && (
        <div className="rounded-2xl border border-slate-200/80 bg-white px-4 py-4 sm:px-5 space-y-3">
          <div className="min-w-0">
            <p className="text-sm font-extrabold text-slate-900">
              Connect Meta accounts
            </p>
            <p className="text-xs text-slate-500 font-medium mt-0.5 leading-relaxed">
              Connect Instagram and Facebook separately, or link both in one Meta Suite login.
            </p>
            <p className="text-[10px] font-semibold text-slate-500 leading-snug mt-1.5">
              {t('socials.workspaceGuidePerWorkspace')}
            </p>
          </div>
          {(byPlatform.get('instagram')?.connected ||
            byPlatform.get('facebook')?.connected) && (
            <button
              type="button"
              onClick={() => resyncMetaWebhooks.mutate()}
              disabled={resyncMetaWebhooks.isPending || !activeWorkspaceId}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 min-h-[44px] px-4 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-sm font-bold hover:bg-white disabled:opacity-50 transition-colors"
            >
              {resyncMetaWebhooks.isPending ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <RefreshCw size={16} />
              )}
              🔄 Re-sync Meta Webhooks
            </button>
          )}
          <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-2 items-stretch sm:items-start">
            <ConnectOrConnectedButton
              connected={Boolean(byPlatform.get('instagram')?.connected)}
              account={byPlatform.get('instagram') ?? null}
              onConnect={() => startMetaConnect('instagram')}
              onDisconnect={() =>
                setDisconnectTarget(byPlatform.get('instagram') ?? null)
              }
              disconnectLabel={t('socials.disconnectAccount')}
              idleLabel="Connect Instagram Only"
              idleClassName="bg-gradient-to-r from-[#F58529] via-[#DD2A7B] to-[#8134AF] hover:opacity-95"
              icon={<InstagramIcon size={16} />}
            />
            <ConnectOrConnectedButton
              connected={Boolean(byPlatform.get('facebook')?.connected)}
              account={byPlatform.get('facebook') ?? null}
              onConnect={() => startMetaConnect('facebook')}
              onDisconnect={() =>
                setDisconnectTarget(byPlatform.get('facebook') ?? null)
              }
              disconnectLabel={t('socials.disconnectAccount')}
              idleLabel="Connect Facebook Page Only"
              idleClassName="bg-[#1877F2] hover:bg-[#166fe5]"
              icon={<FacebookIcon size={16} />}
            />
            {byPlatform.get('instagram')?.connected &&
            byPlatform.get('facebook')?.connected ? (
              <div className="min-w-0 sm:min-w-[200px] flex-1 sm:flex-none">
                <button
                  type="button"
                  disabled
                  aria-pressed="true"
                  className="w-full inline-flex items-center justify-center gap-2 min-h-[44px] px-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-bold cursor-default"
                >
                  <CheckCircle2 size={16} strokeWidth={2.5} />
                  Connected ✓
                </button>
                <div className="mt-2 space-y-1.5 px-1">
                  <p className="text-[11px] font-semibold text-slate-500">
                    Meta Suite · both linked
                  </p>
                  {byPlatform.get('instagram') ? (
                    <ConnectedAccountChip account={byPlatform.get('instagram')!} />
                  ) : null}
                  {byPlatform.get('facebook') ? (
                    <ConnectedAccountChip account={byPlatform.get('facebook')!} />
                  ) : null}
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => startMetaConnect('both')}
                className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 rounded-xl bg-[#2B2568] hover:bg-[#1a1848] text-white text-sm font-bold shadow-sm transition-colors"
              >
                <FacebookIcon size={16} />
                Connect Meta Suite (Both)
              </button>
            )}
          </div>
        </div>
      )}

      {!compact && !demoMode && (
        <div className="space-y-3 sm:space-y-4">
          <div className="rounded-2xl border border-slate-200/80 bg-white px-4 py-4 sm:px-5 space-y-3 w-full">
            <div className="min-w-0">
              <p className="text-sm font-extrabold text-slate-900">
                Connect TikTok Account
              </p>
              <p className="text-xs text-slate-500 font-medium mt-0.5 leading-relaxed">
                Link TikTok for Display API analytics and Content Posting.
              </p>
              <p className="text-[10px] font-semibold text-slate-500 leading-snug mt-1.5">
                {t('socials.workspaceGuidePerWorkspace')}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-2 items-stretch sm:items-start">
              <ConnectOrConnectedButton
                connected={Boolean(byPlatform.get('tiktok')?.connected)}
                account={byPlatform.get('tiktok') ?? null}
                onConnect={() => {
                  window.location.href = withWorkspaceQuery(
                    '/api/auth/tiktok/login',
                    activeWorkspaceId
                  );
                }}
                onDisconnect={() =>
                  setDisconnectTarget(byPlatform.get('tiktok') ?? null)
                }
                disconnectLabel={t('socials.disconnectAccount')}
                idleLabel="Connect TikTok Account"
                idleClassName="bg-[#0F172A] hover:bg-[#1e293b]"
                icon={<TikTokIcon size={16} />}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white px-4 py-4 sm:px-5 space-y-3 w-full">
            <div className="min-w-0">
              <p className="text-sm font-extrabold text-slate-900">
                Connect YouTube
              </p>
              <p className="text-xs text-slate-500 font-medium mt-0.5 leading-relaxed">
                Link your YouTube channel for publishing and analytics.
              </p>
              <p className="text-[10px] font-semibold text-slate-500 leading-snug mt-1.5">
                {t('socials.workspaceGuidePerWorkspace')}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-2 items-stretch sm:items-start">
              <ConnectOrConnectedButton
                connected={Boolean(byPlatform.get('youtube')?.connected)}
                account={byPlatform.get('youtube') ?? null}
                onConnect={() => {
                  window.location.href = withWorkspaceQuery(
                    '/api/auth/youtube/login',
                    activeWorkspaceId
                  );
                }}
                onDisconnect={() =>
                  setDisconnectTarget(byPlatform.get('youtube') ?? null)
                }
                disconnectLabel={t('socials.disconnectAccount')}
                idleLabel="Connect YouTube"
                idleClassName="bg-[#FF0000] hover:bg-[#e60000]"
                icon={<YouTubeIcon size={16} />}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white px-4 py-4 sm:px-5 space-y-3 w-full">
            <div className="min-w-0">
              <p className="text-sm font-extrabold text-slate-900">
                Connect LinkedIn
              </p>
              <p className="text-xs text-slate-500 font-medium mt-0.5 leading-relaxed">
                Link your LinkedIn profile for publishing and analytics.
              </p>
              <p className="text-[10px] font-semibold text-slate-500 leading-snug mt-1.5">
                {t('socials.workspaceGuidePerWorkspace')}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-2 items-stretch sm:items-start">
              <ConnectOrConnectedButton
                connected={Boolean(byPlatform.get('linkedin')?.connected)}
                account={byPlatform.get('linkedin') ?? null}
                onConnect={() => {
                  window.location.href = withWorkspaceQuery(
                    '/api/auth/linkedin/login',
                    activeWorkspaceId
                  );
                }}
                onDisconnect={() =>
                  setDisconnectTarget(byPlatform.get('linkedin') ?? null)
                }
                disconnectLabel={t('socials.disconnectAccount')}
                idleLabel="Connect LinkedIn"
                idleClassName="bg-[#0A66C2] hover:bg-[#0958a8]"
                icon={<LinkedInIcon size={16} />}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white px-4 py-4 sm:px-5 space-y-3 w-full">
            <div className="min-w-0">
              <p className="text-sm font-extrabold text-slate-900">
                Connect Pinterest Account
              </p>
              <p className="text-xs text-slate-500 font-medium mt-0.5 leading-relaxed">
                Link Pinterest for board access and Content Planner Pin scheduling.
              </p>
              <p className="text-[10px] font-semibold text-slate-500 leading-snug mt-1.5">
                {t('socials.workspaceGuidePerWorkspace')}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-2 items-stretch sm:items-start">
              <ConnectOrConnectedButton
                connected={Boolean(byPlatform.get('pinterest')?.connected)}
                account={byPlatform.get('pinterest') ?? null}
                onConnect={() => {
                  window.location.href = withWorkspaceQuery(
                    '/api/auth/pinterest/login',
                    activeWorkspaceId
                  );
                }}
                onDisconnect={() =>
                  setDisconnectTarget(byPlatform.get('pinterest') ?? null)
                }
                disconnectLabel={t('socials.disconnectAccount')}
                idleLabel="Connect Pinterest Account"
                idleClassName="bg-[#E60023] hover:bg-[#c4001a]"
                icon={<PinterestIcon size={16} />}
              />
            </div>
          </div>

          <GoogleIntegrationCard />
        </div>
      )}

      {!compact && demoMode && (
        <div className="rounded-2xl border border-[#1877F2]/25 bg-[#1877F2]/5 px-4 py-4 sm:px-5 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-extrabold text-slate-900">
              Demo Mode — simulated OAuth
            </p>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Turn Demo Mode off to use live Instagram, Facebook, TikTok, YouTube, LinkedIn, and Pinterest connections.
            </p>
          </div>
        </div>
      )}

      {/* Platform cards only in Demo Mode / compact modal — live settings use the strips above. */}
      {(compact || demoMode) && (
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
                        Connected ✓
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
                        {acc.page_name &&
                        (platform === 'instagram' || platform === 'facebook') ? (
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
      )}

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
