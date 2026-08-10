'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Link2Off, Loader2, Unplug } from 'lucide-react';
import {
  InstagramIcon,
  LinkedInIcon,
  TikTokIcon,
  YouTubeIcon,
} from '@/components/icons/SocialBrandIcons';
import {
  PLATFORM_META,
  type ConnectedSocialAccount,
  type SocialPlatform,
} from '@/lib/mock-content-planner';
import { useLocale } from '@/lib/locale-context';
import { t, type TranslationKey } from '@/lib/i18n';

const CONNECT_KEYS: Record<SocialPlatform, TranslationKey> = {
  instagram: 'connectInstagramBusiness',
  tiktok: 'connectTikTokBusiness',
  linkedin: 'connectLinkedIn',
  youtube: 'connectYouTube',
};

const ICONS = {
  instagram: InstagramIcon,
  tiktok: TikTokIcon,
  linkedin: LinkedInIcon,
  youtube: YouTubeIcon,
} as const;

const ORDER: SocialPlatform[] = ['instagram', 'tiktok', 'linkedin', 'youtube'];

export default function SocialAccountsPanel({
  compact = false,
}: {
  /** Hide page-level title when rendered inside a modal. */
  compact?: boolean;
}) {
  const { locale } = useLocale();
  const queryClient = useQueryClient();

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
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planner-socials'] });
    },
  });

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-slate-200/80 bg-white p-10 text-center text-sm text-slate-400 font-medium">
        {t('loadingAccounts', locale)}
      </div>
    );
  }

  const byPlatform = new Map((data?.accounts ?? []).map((a) => [a.platform, a]));

  return (
    <div className="space-y-4">
      {!compact && (
        <div>
          <h2 className="font-clikd-wordmark font-extrabold text-xl text-slate-900 tracking-tight">
            {t('connectedAccounts', locale)}
          </h2>
          <p className="text-sm text-slate-500 font-medium mt-1">
            {t('socialAccountsHint', locale)}
          </p>
        </div>
      )}

      {data?.demo && (
        <span className="inline-flex font-mono text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-50 border border-slate-200/80 px-2.5 py-1 rounded-lg">
          {t('demoOAuth', locale)}
        </span>
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
              className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 flex flex-col gap-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)] hover:border-slate-300/90 transition-colors"
            >
              <div className="flex items-start gap-3">
                <span className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-center flex-shrink-0 text-slate-700">
                  <Icon size={18} style={{ color: meta.color }} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-slate-900">{meta.label}</p>
                    <span
                      className={`inline-flex items-center gap-1 font-mono text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                        connected
                          ? 'text-emerald-700 bg-emerald-50 border-emerald-100'
                          : 'text-slate-400 bg-slate-50 border-slate-200/80'
                      }`}
                    >
                      {connected ? (
                        <>
                          <CheckCircle2 size={10} /> {t('statusConnected', locale)}
                        </>
                      ) : (
                        t('statusNotConnected', locale)
                      )}
                    </span>
                  </div>

                  {connected && acc ? (
                    <div className="flex items-center gap-2.5 mt-3">
                      {acc.avatar_url ? (
                        <img
                          src={acc.avatar_url}
                          alt=""
                          className="w-9 h-9 rounded-full object-cover border border-slate-200/80"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200/80" />
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">
                          {acc.display_name}
                        </p>
                        <p className="text-xs text-slate-500 font-medium truncate">{acc.handle}</p>
                        {platform === 'youtube' && acc.subscriber_count != null && (
                          <p className="text-[11px] font-semibold text-slate-500 mt-0.5 tabular-nums">
                            {acc.subscriber_count.toLocaleString(
                              locale === 'en' ? 'en-GB' : 'sv-SE'
                            )}{' '}
                            {t('subscribersLabel', locale)}
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 font-medium mt-2">
                      {t('statusNotConnected', locale)}
                    </p>
                  )}
                </div>
              </div>

              {connected ? (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => toggle.mutate({ platform, connect: false })}
                  className="h-11 min-h-[44px] rounded-xl font-semibold text-xs inline-flex items-center justify-center gap-2 border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors disabled:opacity-50"
                >
                  {pending ? (
                    <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                  ) : (
                    <Link2Off size={14} />
                  )}
                  {t('disconnect', locale)}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => toggle.mutate({ platform, connect: true })}
                  className="h-11 min-h-[44px] rounded-xl font-semibold text-xs inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white transition-colors disabled:opacity-50"
                >
                  {pending ? (
                    <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                  ) : (
                    <Unplug size={14} />
                  )}
                  {t(CONNECT_KEYS[platform], locale)}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
