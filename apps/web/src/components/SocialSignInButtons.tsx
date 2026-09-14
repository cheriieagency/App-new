/**
 * ⚠ ANYTHING PLATFORM — DO NOT REWRITE THIS FILE ⚠
 *
 * Renders the social sign-in buttons on the signin/signup pages. The set of
 * providers comes from NEXT_PUBLIC_CREATE_AUTH_PROVIDERS, which the platform
 * injects from the project's Authentication settings — so a provider only
 * appears here once it's enabled and configured. In the builder preview
 * (NEXT_PUBLIC_CREATE_ENV === 'DEVELOPMENT', inside an iframe) real OAuth can't
 * run, so clicks route to the dev shim; everywhere else they run the real
 * better-auth social flow.
 *
 *   Safe:   restyle the buttons, reorder providers.
 *   Unsafe: bypassing authClient.signIn.social, removing the dev-shim branch.
 */
'use client';

import { useState } from 'react';
import { authClient } from '@/lib/auth-client';
import { useLanguage } from '@/lib/i18n';

const KNOWN_PROVIDERS = ['google', 'apple'] as const;
type SocialProvider = (typeof KNOWN_PROVIDERS)[number];

const PROVIDER_LABELS: Record<SocialProvider, string> = {
  google: 'Google',
  apple: 'Apple',
};

const enabledProviders = (process.env.NEXT_PUBLIC_CREATE_AUTH_PROVIDERS ?? '')
  .split(',')
  .map((p) => p.trim())
  .filter((p): p is SocialProvider =>
    KNOWN_PROVIDERS.includes(p as SocialProvider)
  );

const isDevPreviewIframe = () => {
  if (process.env.NEXT_PUBLIC_CREATE_ENV !== 'DEVELOPMENT') return false;
  try {
    return typeof window !== 'undefined' && window.self !== window.top;
  } catch {
    // Cross-origin access to window.top throws — that means we're framed.
    return true;
  }
};

export function SocialSignInButtons({ callbackUrl }: { callbackUrl: string }) {
  const { t } = useLanguage();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<SocialProvider | null>(null);

  if (enabledProviders.length === 0) {
    return null;
  }

  const onClick = async (provider: SocialProvider) => {
    setError(null);
    setPending(provider);

    if (isDevPreviewIframe()) {
      const params = new URLSearchParams({ provider, callbackUrl });
      window.location.href = `/account/social-dev-shim?${params.toString()}`;
      return;
    }

    const { error: socialError } = await authClient.signIn.social({
      provider,
      callbackURL: callbackUrl,
    });
    if (socialError) {
      setError(
        socialError.message ??
          `Could not sign in with ${PROVIDER_LABELS[provider]}`
      );
      setPending(null);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 text-[11px] font-inter font-medium uppercase tracking-[0.12em] text-[#8A857D]">
        <span className="h-px flex-1 bg-[#E6E3DB]" />
        {t('common.or')}
        <span className="h-px flex-1 bg-[#E6E3DB]" />
      </div>

      {enabledProviders.map((provider) => (
        <button
          key={provider}
          type="button"
          disabled={pending !== null}
          onClick={() => {
            void onClick(provider);
          }}
          className="flex items-center justify-center gap-2 min-h-11 rounded-xl border border-[#E6E3DB] bg-[#FFFFFF] px-3 text-sm font-medium text-[#2C2621] hover:bg-[#F0EFEA] disabled:opacity-50 transition-colors"
        >
          {pending === provider
            ? t('common.redirecting')
            : t('common.continueWith', {
                provider: PROVIDER_LABELS[provider],
              })}
        </button>
      ))}

      {error && (
        <div className="rounded-xl bg-[rgba(184,92,56,0.08)] border border-[rgba(184,92,56,0.2)] px-3 py-2.5 text-sm font-medium text-[#B85C38]">
          {error}
        </div>
      )}
    </div>
  );
}
