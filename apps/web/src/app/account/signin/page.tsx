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
import { formatAuthError } from '@/lib/auth-error';
import { isDemoAuthUiEnabled } from '@/lib/auth-env';
import Link from 'next/link';
import { Users, Crown } from 'lucide-react';
import { useLanguage } from '@/lib/locale-context';
import { t } from '@/lib/i18n';
import {
  clearRememberedAuth,
  hasRememberedAuth,
  loadRememberedAuth,
  saveRememberedAuth,
} from '@/lib/remember-auth';

type Role = 'member' | 'creator';

function SignInForm() {
  const searchParams = useSearchParams();
  const { locale } = useLanguage();
  const rawCallback = searchParams.get('callbackUrl') || '/';
  const [role, setRole] = useState<Role>('member');
  const callbackUrl = role === 'creator' ? '/admin' : rawCallback === '/admin' ? '/' : rawCallback;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const demoMode = isDemoAuthUiEnabled();

  useEffect(() => {
    const saved = loadRememberedAuth();
    if (!saved) return;
    setEmail(saved.email);
    setPassword(saved.password);
    setRememberMe(true);
  }, []);

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
        setError(formatAuthError(signInError, 'Sign in failed'));
        setLoading(false);
        return;
      }

      if (rememberMe) {
        saveRememberedAuth(email, password);
      } else if (hasRememberedAuth()) {
        clearRememberedAuth();
      }

      if (typeof window !== 'undefined') {
        window.location.href = callbackUrl;
      } else {
        console.warn('signin: window is undefined; cannot redirect to callbackUrl');
      }
    } catch (err) {
      setError(formatAuthError(err, 'Sign in failed'));
      setLoading(false);
    }
  };

  return (
    <main className="nc-app nc-app-shell flex min-h-screen w-full items-center justify-center p-4 relative z-10">
      <div className="w-full max-w-[420px]">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-9 h-9 rounded-full bg-[var(--nc-coral)] flex items-center justify-center">
            <span className="text-white font-display font-extrabold text-sm">N</span>
          </div>
          <span className="font-display font-extrabold text-[#2c3340] text-base">Nordic Creator</span>
        </div>

        {/* Role switcher */}
        <div className="nc-glass rounded-[1.5rem] p-1.5 flex gap-1.5 mb-5">
          <button
            type="button"
            onClick={() => setRole('member')}
            className={`flex-1 flex items-center justify-center gap-2 h-10 rounded-xl text-xs font-black transition-all ${role === 'member' ? 'bg-[var(--nc-coral)] text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-700'}`}
          >
            <Users size={14} />
            {t('loginAsMember', locale)}
          </button>
          <button
            type="button"
            onClick={() => setRole('creator')}
            className={`flex-1 flex items-center justify-center gap-2 h-10 rounded-xl text-xs font-black transition-all ${role === 'creator' ? 'bg-[var(--nc-coral)] text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-700'}`}
          >
            <Crown size={14} />
            {t('loginAsCreatorAdmin', locale)}
          </button>
        </div>

        {/* Role badge */}
        <div
          className={`flex items-center gap-2 mb-5 px-4 py-2.5 rounded-xl border text-xs font-bold transition-all ${role === 'creator' ? 'bg-[#f2eeff] border-[#e8e2ff] text-[#6b5bb8]' : 'bg-[#d7ecff] border-[#b6d9f5] text-[#0369a1]'}`}
        >
          {role === 'creator' ? (
            <>
              <Crown size={13} /> {t('loginAsCreatorAdmin', locale)}
            </>
          ) : (
            <>
              <Users size={13} /> {t('loginAsMember', locale)}
            </>
          )}
        </div>

        {demoMode && (
          <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs font-bold text-amber-900">
            Demo mode: Supabase env missing/placeholder — sign-in uses in-memory auth for local testing.
          </div>
        )}

        {/* Card */}
        <form
          onSubmit={(e) => {
            void onSubmit(e);
          }}
          className="nc-glass rounded-[1.5rem] p-7 flex flex-col gap-4"
        >
          <div>
            <h1 className="text-xl font-display font-extrabold text-[#2c3340]">{t('welcomeBack', locale)}</h1>
            <p className="text-sm text-zinc-400 font-medium mt-0.5">
              {role === 'creator' ? t('loginAsCreatorAdmin', locale) : t('loginAsMember', locale)}
            </p>
          </div>

          <label className="flex flex-col gap-1.5 text-xs font-black text-zinc-500 uppercase tracking-wider">
            {t('emailAddress', locale)}
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="rounded-xl border border-zinc-200 px-4 py-3 text-sm text-zinc-900 font-medium outline-none focus:border-[var(--nc-coral)] focus:ring-2 focus:ring-[#f2eeff] transition-all placeholder:text-zinc-300"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-xs font-black text-zinc-500 uppercase tracking-wider">
            {t('password', locale)}
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              className="rounded-xl border border-zinc-200 px-4 py-3 text-sm text-zinc-900 font-medium outline-none focus:border-[var(--nc-coral)] focus:ring-2 focus:ring-[#f2eeff] transition-all placeholder:text-zinc-300"
            />
          </label>

          <label className="inline-flex items-center gap-2.5 min-h-[44px] text-sm font-bold text-zinc-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 rounded border-zinc-300 text-[var(--nc-coral)] focus:ring-[var(--nc-coral)]"
            />
            {t('rememberMe', locale)}
          </label>

          {error && (
            <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm font-bold text-red-600">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`h-12 rounded-full text-sm font-extrabold text-white transition-all active:scale-95 disabled:opacity-60 ${role === 'creator' ? 'bg-[var(--nc-coral)] hover:opacity-90' : 'bg-[var(--nc-coral)] hover:opacity-90'}`}
          >
            {loading ? t('signingIn', locale) : t('signIn', locale)}
          </button>

          <SocialSignInButtons callbackUrl={callbackUrl} />

          <p className="text-center text-sm text-zinc-400">
            {t('noAccount', locale)}{' '}
            <Link
              href={`/account/signup?callbackUrl=${encodeURIComponent(callbackUrl)}`}
              className="font-black text-[var(--nc-coral)] hover:opacity-80 transition-colors"
            >
              {t('createAccount', locale)}
            </Link>
          </p>
        </form>

        <p className="text-center text-xs text-zinc-400 font-medium mt-6">
          <Link href="/" className="hover:text-zinc-600 transition-colors">
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
