'use client';
/**
 * ⚠ ANYTHING PLATFORM — DO NOT REWRITE THIS FILE ⚠
 *
 * Shipped v2 auth scaffolding. Same contract as signup/page.tsx: <form
 * onSubmit>, e.preventDefault(), and window.location.href redirect are all
 * load-bearing for the mobile WebView. DO NOT replace <form onSubmit> with
 * <button onClick> — that broke signin platform-wide in a prior AI rewrite.
 *
 *   Safe:   restyle, rewrite copy, add form fields.
 *   Unsafe: replacing <form>, removing preventDefault, bypassing
 *           authClient.signIn.email, changing the callbackUrl redirect.
 */
'use client';

import { useSearchParams } from 'next/navigation';
import { type FormEvent, Suspense, useEffect, useState } from 'react';
import { SocialSignInButtons } from '@/components/SocialSignInButtons';
import { authClient } from '@/lib/auth-client';
import { formatAuthError, isUnverifiedEmailError, VERIFY_EMAIL_BEFORE_LOGIN } from '@/lib/auth-error';
import { isDemoAuthUiEnabled } from '@/lib/auth-env';
import Link from 'next/link';
import { Users, Crown } from 'lucide-react';
import { useLanguage } from '@/lib/locale-context';
import { t } from '@/lib/i18n';
import { ClikdWordmark } from '@/components/brand/ClikdLogo';
import {
  clearRememberedAuth,
  hasRememberedAuth,
  loadRememberedAuth,
  saveRememberedAuth,
} from '@/lib/remember-auth';
import { persistPlatformRole } from '@/lib/use-platform-role';
import { toast } from 'sonner';

type Role = 'member' | 'creator';

function SignInForm() {
  const searchParams = useSearchParams();
  const { locale } = useLanguage();
  const rawCallbackUrl = searchParams.get('callbackUrl') || '';
  const hideCreateAccountLink = false;
  const inferredRole: Role = rawCallbackUrl.startsWith('/admin') ? 'creator' : 'member';
  const [role, setRole] = useState<Role>(inferredRole);
  const callbackUrl = role === 'creator' ? '/admin' : '/dashboard';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const demoMode = isDemoAuthUiEnabled();

  // Creator mode when redirected from `/admin`.
  useEffect(() => {
    setRole(inferredRole);
  }, [inferredRole]);

  useEffect(() => {
    const saved = loadRememberedAuth();
    if (!saved) return;
    setEmail(saved.email);
    setPassword(saved.password);
    setRememberMe(true);
  }, []);

  useEffect(() => {
    if (searchParams.get('verified') === '1') {
      toast.success('Email verified. You can sign in now.');
    }
    const err = searchParams.get('error');
    if (err) setError(err);
  }, [searchParams]);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error: signInError } = await authClient.signIn.email({
        email,
        password,
      });

      if (signInError) {
        if (isUnverifiedEmailError(signInError)) {
          toast.warning(VERIFY_EMAIL_BEFORE_LOGIN);
          setError(VERIFY_EMAIL_BEFORE_LOGIN);
        } else {
          setError(formatAuthError(signInError, 'Sign in failed'));
        }
        setLoading(false);
        return;
      }

      if (rememberMe) {
        saveRememberedAuth(email, password);
      } else if (hasRememberedAuth()) {
        clearRememberedAuth();
      }

      // Cookie is source of truth; tab chooses member vs creator studio
      const home = await persistPlatformRole(role);

      if (typeof window !== 'undefined') {
        window.location.href = home;
      } else {
        console.warn('signin: window is undefined; cannot redirect to callbackUrl');
      }
    } catch (err) {
      if (isUnverifiedEmailError(err)) {
        toast.warning(VERIFY_EMAIL_BEFORE_LOGIN);
        setError(VERIFY_EMAIL_BEFORE_LOGIN);
      } else {
        setError(formatAuthError(err, 'Sign in failed'));
      }
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-[#F9F8F6] text-[#2C2621] p-4 relative z-10">
      <div className="w-full max-w-[420px]">
        <div className="flex items-center justify-center mb-8">
          <Link href="/" className="min-h-11 inline-flex items-center">
            <ClikdWordmark showMark textClassName="text-2xl" className="min-h-0" />
          </Link>
        </div>

        <div className="rounded-xl border border-[#E6E3DB] bg-[#FFFFFF] p-1.5 flex gap-1.5 mb-5">
          <button
            type="button"
            onClick={() => setRole('member')}
            className={`flex-1 flex items-center justify-center gap-2 min-h-11 rounded-xl text-xs font-medium transition-all ${
              role === 'member'
                ? 'bg-[#2C3B2E] text-[#F9F8F6]'
                : 'text-[#8A857D] hover:text-[#2C2621] hover:bg-[#F0EFEA]'
            }`}
          >
            <Users size={14} aria-hidden />
            {t('loginAsMember', locale)}
          </button>
          <button
            type="button"
            onClick={() => setRole('creator')}
            className={`flex-1 flex items-center justify-center gap-2 min-h-11 rounded-xl text-xs font-medium transition-all ${
              role === 'creator'
                ? 'bg-[#2C3B2E] text-[#F9F8F6]'
                : 'text-[#8A857D] hover:text-[#2C2621] hover:bg-[#F0EFEA]'
            }`}
          >
            <Crown size={14} aria-hidden />
            {t('loginAsCreatorAdmin', locale)}
          </button>
        </div>

        <div
          className={`flex items-center gap-2 mb-5 px-4 py-2.5 min-h-11 rounded-xl border text-xs font-medium transition-all ${
            role === 'creator'
              ? 'bg-[rgba(44,59,46,0.08)] border-[rgba(44,59,46,0.18)] text-[#2C3B2E]'
              : 'bg-[#F0EFEA] border-[#E6E3DB] text-[#8A857D]'
          }`}
        >
          {role === 'creator' ? (
            <>
              <Crown size={13} aria-hidden /> {t('loginAsCreatorAdmin', locale)}
            </>
          ) : (
            <>
              <Users size={13} aria-hidden /> {t('loginAsMember', locale)}
            </>
          )}
        </div>

        {demoMode && (
          <div className="mb-5 rounded-xl border border-[rgba(184,92,56,0.25)] bg-[rgba(184,92,56,0.08)] px-4 py-2.5 text-xs font-medium text-[#B85C38]">
            Demo mode: Supabase env missing/placeholder — sign-in uses in-memory auth for local
            testing.
          </div>
        )}

        <form
          onSubmit={(e) => {
            void onSubmit(e);
          }}
          className="rounded-xl border border-[#E6E3DB] bg-[#FFFFFF] p-7 flex flex-col gap-4 shadow-none"
        >
          <div>
            <h1 className="font-playfair text-2xl font-medium text-[#2C2621] tracking-tight">
              {t('welcomeBack', locale)}
            </h1>
            <p className="text-sm text-[#8A857D] font-medium mt-1">
              {role === 'creator' ? t('loginAsCreatorAdmin', locale) : t('loginAsMember', locale)}
            </p>
          </div>

          <label className="flex flex-col gap-1.5 text-[10px] font-inter font-medium text-[#8A857D] uppercase tracking-[0.14em]">
            {t('emailAddress', locale)}
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="min-h-11 rounded-xl border border-[#E6E3DB] bg-[#FFFFFF] px-4 py-3 text-sm text-[#2C2621] font-medium outline-none focus:border-[#2C3B2E] focus:ring-2 focus:ring-[rgba(44,59,46,0.12)] transition-all placeholder:text-[#8A857D]/70"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-[10px] font-inter font-medium text-[#8A857D] uppercase tracking-[0.14em]">
            {t('password', locale)}
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              className="min-h-11 rounded-xl border border-[#E6E3DB] bg-[#FFFFFF] px-4 py-3 text-sm text-[#2C2621] font-medium outline-none focus:border-[#2C3B2E] focus:ring-2 focus:ring-[rgba(44,59,46,0.12)] transition-all placeholder:text-[#8A857D]/70"
            />
          </label>

          <div className="flex items-center justify-end -mt-1">
            <Link
              href="/forgot-password"
              className="text-xs font-medium text-[#2C3B2E] hover:underline min-h-[44px] inline-flex items-center"
            >
              Forgot password?
            </Link>
          </div>

          <label className="inline-flex items-center gap-2.5 min-h-[44px] text-sm font-medium text-[#8A857D] cursor-pointer select-none">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 rounded border-[#E6E3DB] text-[#2C3B2E] focus:ring-[#2C3B2E]/30"
            />
            {t('rememberMe', locale)}
          </label>

          {error && (
            <div className="rounded-xl bg-[rgba(184,92,56,0.08)] border border-[rgba(184,92,56,0.2)] px-4 py-3 text-sm font-medium text-[#B85C38]">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="min-h-12 rounded-xl text-sm font-medium text-[#F9F8F6] bg-[#2C3B2E] hover:bg-[#243228] transition-colors disabled:opacity-60"
          >
            {loading ? t('signingIn', locale) : t('signIn', locale)}
          </button>

          <SocialSignInButtons callbackUrl={callbackUrl} />

          {hideCreateAccountLink ? (
            <p className="text-center text-sm text-[#8A857D]">{t('noAccount', locale)}</p>
          ) : (
            <p className="text-center text-sm text-[#8A857D]">
              {t('noAccount', locale)}{' '}
              <Link
                href={`/account/signup?callbackUrl=${encodeURIComponent(callbackUrl)}`}
                className="font-medium text-[#2C3B2E] hover:underline transition-colors"
              >
                {t('createAccount', locale)}
              </Link>
            </p>
          )}
        </form>

        <p className="text-center text-xs text-[#8A857D] font-medium mt-6">
          <Link href="/" className="hover:text-[#2C2621] transition-colors">
            {t('backToHome', locale)}
          </Link>
        </p>
      </div>
    </main>
  );

}

export default function SignInPage() {
  return (
    <Suspense>
      <SignInForm />
    </Suspense>
  );
}
