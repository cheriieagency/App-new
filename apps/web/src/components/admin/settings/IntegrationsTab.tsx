'use client';

import Link from 'next/link';
import {
  FacebookIcon,
  InstagramIcon,
  LinkedInIcon,
  PinterestIcon,
  TikTokIcon,
  YouTubeIcon,
} from '@/components/icons/SocialBrandIcons';
import GoogleIntegrationCard from '@/components/admin/GoogleIntegrationCard';
import { SectionBlock } from '@/components/admin/settings/SettingsUi';
import { adminCardClass } from '@/components/admin/AdminUi';
import {
  PLATFORM_META,
  type ConnectedSocialAccount,
  type SocialPlatform,
} from '@/lib/mock-content-planner';
import { openOAuthPopup } from '@/lib/oauth/popup';
import { t, tf, type Locale } from '@/lib/i18n';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

const PLATFORM_ORDER: SocialPlatform[] = [
  'instagram',
  'facebook',
  'tiktok',
  'youtube',
  'linkedin',
  'pinterest',
];

const SOCIAL_ICONS = {
  instagram: InstagramIcon,
  facebook: FacebookIcon,
  tiktok: TikTokIcon,
  youtube: YouTubeIcon,
  linkedin: LinkedInIcon,
  pinterest: PinterestIcon,
} as const;

const LOGIN_PATH: Partial<Record<SocialPlatform, string>> = {
  instagram: '/api/auth/meta/login?target=instagram',
  facebook: '/api/auth/meta/login?target=facebook',
  tiktok: '/api/auth/tiktok?force=true&flow=business',
  youtube: '/api/auth/youtube/login',
  linkedin: '/api/auth/linkedin/login',
  pinterest: '/api/auth/pinterest/login',
};

type IntegrationsTabProps = {
  locale: Locale;
  tag: string;
  workspaceName: string;
  workspaceHandle: string;
  workspaceId: string | null;
  accounts: ConnectedSocialAccount[];
  loading: boolean;
};

function withWorkspaceQuery(path: string, workspaceId: string | null) {
  if (!workspaceId) return path;
  const url = new URL(path, 'http://local');
  url.searchParams.set('workspaceId', workspaceId);
  return `${url.pathname}?${url.searchParams.toString()}`;
}

export default function IntegrationsTab({
  locale,
  tag,
  workspaceName,
  workspaceHandle,
  workspaceId,
  accounts,
  loading,
}: IntegrationsTabProps) {
  const queryClient = useQueryClient();
  const byPlatform = new Map(accounts.map((a) => [a.platform, a]));

  const connect = async (platform: SocialPlatform) => {
    const path = LOGIN_PATH[platform];
    if (!path) return;
    if (!workspaceId) {
      toast.error(t('toastSelectWorkspaceBeforeConnectShort', locale));
      return;
    }
    const label = PLATFORM_META[platform].label;
    const result = await openOAuthPopup(
      withWorkspaceQuery(path, workspaceId),
      `Connect ${label}`
    );
    if (result.success) {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['social-accounts'] }),
        queryClient.invalidateQueries({ queryKey: ['planner-socials'] }),
      ]);
      toast.success(`${label} connected successfully!`);
    } else if (result.error === 'popup_blocked') {
      toast.error(t('toastAllowPopupsConnect', locale));
    } else if (result.error && result.error !== 'popup_closed') {
      toast.error(
        tf('toastConnectionFailedDetail', locale, {
          error: result.error.replace(/_/g, ' '),
        })
      );
    }
  };

  return (
    <SectionBlock
      title={t('settingsNavIntegrations', locale)}
      subtitle={t('settingsIntegrationsSub', locale)}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <p className="text-sm font-bold text-slate-800">{workspaceName}</p>
          <p className="text-xs font-mono font-bold text-slate-400">
            @{workspaceHandle.replace(/^@/, '')}
          </p>
        </div>
        <Link
          href="/admin/settings/socials"
          className="inline-flex items-center justify-center h-11 min-h-[44px] px-4 rounded-xl bg-[#1a1848] text-white text-xs font-bold hover:bg-[#2B2568] transition-colors"
        >
          {t('settingsManageSocials', locale)}
        </Link>
      </div>

      <div className="mb-4">
        <GoogleIntegrationCard />
      </div>

      <p className="text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-slate-400 mb-2">
        {t('settingsIntegrationsOverview', locale)}
      </p>

      {loading ? (
        <p className="text-sm text-slate-400 font-medium py-6">
          {t('loading', locale)}
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {PLATFORM_ORDER.map((platform) => {
            const account = byPlatform.get(platform);
            const connected = Boolean(account?.connected);
            const Icon = SOCIAL_ICONS[platform];
            const meta = PLATFORM_META[platform];
            return (
              <div
                key={platform}
                className={`${adminCardClass} p-4 flex flex-col gap-3`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-10 h-10 min-h-[40px] min-w-[40px] rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: `${meta.color}14` }}
                  >
                    <Icon size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-extrabold text-slate-900">
                      {meta.label}
                    </p>
                    <p className="text-xs font-medium text-slate-500 truncate mt-0.5">
                      {connected
                        ? account?.handle ||
                          account?.display_name ||
                          meta.label
                        : t('settingsApiNotConnected', locale)}
                    </p>
                    {connected && account?.connected_at ? (
                      <p className="text-[10px] text-slate-400 font-medium mt-1">
                        {tf('settingsConnectedAt', locale, {
                          date: new Date(account.connected_at).toLocaleDateString(
                            tag
                          ),
                        })}
                      </p>
                    ) : null}
                  </div>
                </div>
                {connected ? (
                  <span className="inline-flex items-center justify-center h-10 min-h-[40px] rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">
                    {t('settingsApiAuthorized', locale)}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => void connect(platform)}
                    className="inline-flex items-center justify-center h-11 min-h-[44px] rounded-xl bg-[#2B2568] text-white text-xs font-bold hover:bg-[#1e1b4b] transition-colors"
                  >
                    Connect {meta.label}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </SectionBlock>
  );
}
