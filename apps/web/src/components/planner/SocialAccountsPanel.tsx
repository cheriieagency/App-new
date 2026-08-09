'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Link2Off, Loader2, Unplug } from 'lucide-react';
import {
  InstagramIcon,
  LinkedInIcon,
  TikTokIcon,
  YouTubeIcon,
} from '@/components/icons/SocialBrandIcons';
import { Button } from '@/components/ui/button';
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

export default function SocialAccountsPanel() {
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
      <div className="nc-glass rounded-[1.5rem] p-10 text-center text-sm text-zinc-400 font-medium">
        Laddar konton…
      </div>
    );
  }

  const byPlatform = new Map((data?.accounts ?? []).map((a) => [a.platform, a]));

  return (
    <div className="space-y-4">
      <div className="nc-glass rounded-[1.5rem] p-5 sm:p-6">
        <h2 className="text-lg font-black text-[#2c3340] mb-1">
          {t('connectedAccounts', locale)}
        </h2>
        <p className="text-sm text-zinc-500 font-medium mb-5">
          {t('socialAccountsHint', locale)}
        </p>
        {data?.demo && (
          <span className="inline-flex text-[10px] font-black uppercase tracking-wide text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full mb-4">
            Demo OAuth
          </span>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ORDER.map((platform) => {
            const acc = byPlatform.get(platform);
            const meta = PLATFORM_META[platform];
            const Icon = ICONS[platform];
            const connected = Boolean(acc?.connected);
            const pending =
              toggle.isPending && toggle.variables?.platform === platform;

            return (
              <div
                key={platform}
                className="rounded-2xl border border-zinc-100 bg-white p-5 flex flex-col gap-4"
              >
                <div className="flex items-start gap-3">
                  <span
                    className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
                    style={{
                      background: `color-mix(in srgb, ${meta.color} 12%, white)`,
                      color: meta.color,
                    }}
                  >
                    <Icon size={20} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-black text-[#2c3340]">{meta.label}</p>
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                          connected
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-zinc-100 text-zinc-500'
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
                            className="w-10 h-10 rounded-full object-cover border border-zinc-100"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-zinc-100" />
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-[#2c3340] truncate">
                            {acc.display_name}
                          </p>
                          <p className="text-xs text-zinc-500 font-medium truncate">
                            {acc.handle}
                          </p>
                          {platform === 'youtube' && acc.subscriber_count != null && (
                            <p className="text-[11px] font-extrabold text-red-600 mt-0.5">
                              {acc.subscriber_count.toLocaleString(locale === 'en' ? 'en-GB' : 'sv-SE')}{' '}
                              {t('subscribersLabel', locale)}
                            </p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-zinc-400 font-medium mt-2">
                        {t('statusNotConnected', locale)}
                      </p>
                    )}
                  </div>
                </div>

                {connected ? (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={pending}
                    onClick={() => toggle.mutate({ platform, connect: false })}
                    className="h-11 min-h-[44px] rounded-xl font-extrabold gap-2 border-red-100 text-red-600 hover:bg-red-50"
                  >
                    {pending ? (
                      <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                    ) : (
                      <Link2Off size={14} />
                    )}
                    {t('disconnect', locale)}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    disabled={pending}
                    onClick={() => toggle.mutate({ platform, connect: true })}
                    className="h-11 min-h-[44px] rounded-xl font-extrabold gap-2 text-white"
                    style={{ background: meta.color }}
                  >
                    {pending ? (
                      <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                    ) : (
                      <Unplug size={14} />
                    )}
                    {t(CONNECT_KEYS[platform], locale)}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
