'use client';

/**
 * Landing login portal — locked to Admin or Community from the header dropdown.
 * Email sign-in sets platform role then redirects; social OAuth goes through
 * /account/post-login?role=… so the role cookie is set before /admin|/dashboard.
 */

import { type FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { Crown, Users } from 'lucide-react';
import { authClient } from '@/lib/auth-client';
import { formatAuthError, isUnverifiedEmailError, VERIFY_EMAIL_BEFORE_LOGIN } from '@/lib/auth-error';
import { SocialSignInButtons } from '@/components/SocialSignInButtons';
import { ClikdMark } from '@/components/brand/ClikdLogo';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useLanguage } from '@/lib/locale-context';
import { t } from '@/lib/i18n';
import {
  clearRememberedAuth,
  hasRememberedAuth,
  loadRememberedAuth,
  saveRememberedAuth,
} from '@/lib/remember-auth';
import { persistPlatformRole } from '@/lib/use-platform-role';
import { homeForRole, type PlatformRole } from '@/lib/platform-role';
import { isDualAccessEmail } from '@/lib/platform-role';
import { toast } from 'sonner';

type Role = 'member' | 'creator';

type LoginModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Locked portal from header: Community (member) or Admin (creator). */
  initialRole?: Role;
};

export function LoginModal({
  open,
  onOpenChange,
  initialRole = 'member',
}: LoginModalProps) {
  const { locale } = useLanguage();
  // Always follow the dropdown choice — no cross-portal tab switcher.
  const role: Role = initialRole === 'creator' ? 'creator' : 'member';
  const isAdmin = role === 'creator';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setLoading(false);
    const saved = loadRememberedAuth();
    if (!saved) {
      setEmail('');
      setPassword('');
      setRemember(false);
      return;
    }
    setEmail(saved.email);
    setPassword(saved.password);
    setRemember(true);
  }, [open, role]);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !password) {
      setError(t('signInFailed', locale));
      setLoading(false);
      return;
    }

    try {
      const { error: signInError } = await authClient.signIn.email({
        email: trimmedEmail,
        password,
      });

      if (signInError) {
        if (isUnverifiedEmailError(signInError)) {
          toast.warning(VERIFY_EMAIL_BEFORE_LOGIN);
          setError(VERIFY_EMAIL_BEFORE_LOGIN);
        } else {
          setError(formatAuthError(signInError, t('signInFailed', locale)));
        }
        setLoading(false);
        return;
      }

      if (remember) {
        saveRememberedAuth(trimmedEmail, password);
      } else if (hasRememberedAuth()) {
        clearRememberedAuth();
      }

      // Persist Admin vs Community before hard navigate (middleware reads this cookie).
      const platformRole: PlatformRole = isAdmin ? 'creator' : 'member';
      const home = await persistPlatformRole(platformRole);

      if (typeof window !== 'undefined') {
        window.location.href = home || homeForRole(platformRole);
      }
    } catch (err) {
      if (isUnverifiedEmailError(err)) {
        toast.warning(VERIFY_EMAIL_BEFORE_LOGIN);
        setError(VERIFY_EMAIL_BEFORE_LOGIN);
      } else {
        setError(formatAuthError(err, t('signInFailed', locale)));
      }
      setLoading(false);
    }
  };

  const title = isAdmin ? 'Admin Log in' : 'Community Log in';
  const subtitle = isAdmin
    ? 'Sign in to Creator Admin — analytics, planner, bio store, and inbox.'
    : 'Sign in to your Community dashboard — courses, events, and member hub.';
  const socialCallback = `/account/post-login?role=${encodeURIComponent(role)}`;
  const signupHref = isAdmin ? '/onboarding' : '/onboarding';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px] rounded-xl border border-[#E6E3DB] bg-[#FFFFFF] p-0 gap-0 overflow-hidden shadow-none">
        <DialogHeader className="px-6 pt-6 pb-2">
          <div className="flex items-center gap-2.5 mb-3">
            <ClikdMark size={32} />
            <DialogTitle className="font-playfair text-xl font-medium text-[#2C2621] tracking-tight">
              {title}
            </DialogTitle>
          </div>
          <DialogDescription className="text-sm text-[#8A857D] font-medium">
            {subtitle}
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-6">
          {/* Locked portal badge — matches the header dropdown choice */}
          <div
            className={`min-h-11 rounded-xl px-3.5 inline-flex items-center gap-2.5 text-xs font-medium w-full border ${
              isAdmin
                ? 'bg-[rgba(44,59,46,0.08)] border-[rgba(44,59,46,0.18)] text-[#2C3B2E]'
                : 'bg-[#F0EFEA] border-[#E6E3DB] text-[#8A857D]'
            }`}
          >
            {isAdmin ? <Crown size={16} aria-hidden /> : <Users size={16} aria-hidden />}
            {isAdmin ? 'Creator / Admin' : 'Community member'}
          </div>

          <form
            onSubmit={(e) => {
              void onSubmit(e);
            }}
            className="mt-4 flex flex-col gap-3.5"
          >
            <label className="flex flex-col gap-1.5 text-[10px] font-inter font-medium text-[#8A857D] uppercase tracking-[0.14em]">
              {t('emailAddress', locale)}
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                className="min-h-11 rounded-xl border border-[#E6E3DB] bg-[#FFFFFF] px-4 py-3 text-sm text-[#2C2621] font-medium outline-none focus:border-[#2C3B2E] focus:ring-2 focus:ring-[rgba(44,59,46,0.12)] transition-all placeholder:text-[#8A857D]/70"
              />
            </label>
            {isDualAccessEmail(email) ? (
              <p className="text-[11px] font-medium text-[#8A857D] -mt-1.5 leading-snug">
                This account can use both Admin and Community logins.
              </p>
            ) : null}

            <label className="flex flex-col gap-1.5 text-[10px] font-inter font-medium text-[#8A857D] uppercase tracking-[0.14em]">
              {t('password', locale)}
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="min-h-11 rounded-xl border border-[#E6E3DB] bg-[#FFFFFF] px-4 py-3 text-sm text-[#2C2621] font-medium outline-none focus:border-[#2C3B2E] focus:ring-2 focus:ring-[rgba(44,59,46,0.12)] transition-all placeholder:text-[#8A857D]/70"
              />
            </label>

            <div className="flex items-center justify-end -mt-1">
              <Link
                href="/forgot-password"
                className="text-xs font-medium text-[#2C3B2E] hover:underline min-h-[44px] inline-flex items-center"
                onClick={() => onOpenChange(false)}
              >
                Forgot password?
              </Link>
            </div>

            <label className="inline-flex items-center gap-2.5 min-h-11 text-sm font-medium text-[#8A857D] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
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
              {loading
                ? t('signingIn', locale)
                : isAdmin
                  ? 'Sign in to Admin'
                  : 'Sign in to Community'}
            </button>

            <SocialSignInButtons callbackUrl={socialCallback} />

            <p className="text-center text-sm text-[#8A857D]">
              {t('noAccount', locale)}{' '}
              <Link
                href={signupHref}
                className="font-medium text-[#2C3B2E] hover:underline transition-colors"
                onClick={() => onOpenChange(false)}
              >
                {t('signUp', locale)}
              </Link>
            </p>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
