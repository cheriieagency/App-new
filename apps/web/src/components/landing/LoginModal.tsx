'use client';

/**
 * Landing login portal — modal with Member vs Creator/Admin tabs.
 * Auth contract mirrors /account/signin: <form onSubmit> + preventDefault +
 * authClient.signIn.email + window.location.href redirect.
 */

import { type FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { Crown, Users } from 'lucide-react';
import { authClient } from '@/lib/auth-client';
import { formatAuthError } from '@/lib/auth-error';
import { SocialSignInButtons } from '@/components/SocialSignInButtons';
import { ClikdMark } from '@/components/brand/ClikdLogo';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLanguage } from '@/lib/locale-context';
import { t } from '@/lib/i18n';
import {
  clearRememberedAuth,
  hasRememberedAuth,
  loadRememberedAuth,
  saveRememberedAuth,
} from '@/lib/remember-auth';
import { persistPlatformRole } from '@/lib/use-platform-role';

type Role = 'member' | 'creator';

type LoginModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function LoginModal({ open, onOpenChange }: LoginModalProps) {
  const { locale } = useLanguage();
  const [role, setRole] = useState<Role>('member');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    const saved = loadRememberedAuth();
    if (!saved) return;
    setEmail(saved.email);
    setPassword(saved.password);
    setRemember(true);
  }, [open]);

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
        setError(formatAuthError(signInError, t('signInFailed', locale)));
        setLoading(false);
        return;
      }

      if (remember) {
        saveRememberedAuth(email, password);
      } else if (hasRememberedAuth()) {
        clearRememberedAuth();
      }

      // Persist Member vs Creator access before hard redirect
      const home = await persistPlatformRole(role);

      if (typeof window !== 'undefined') {
        window.location.href = home;
      }
    } catch (err) {
      setError(formatAuthError(err, t('signInFailed', locale)));
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px] rounded-[1.5rem] border-white/70 bg-white/80 backdrop-blur-xl p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-2">
          <div className="flex items-center gap-2.5 mb-3">
            <ClikdMark size={32} />
            <DialogTitle className="text-base font-black text-zinc-900">
              {t('loginPortalTitle', locale)}
            </DialogTitle>
          </div>
          <DialogDescription className="text-sm text-zinc-500 font-medium">
            {t('loginPortalSub', locale)}
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-6">
          <Tabs
            value={role}
            onValueChange={(v) => {
              setRole(v as Role);
              setError(null);
            }}
            className="gap-4"
          >
            <TabsList className="w-full h-auto p-1.5 rounded-full bg-[#eef2f7]">
              <TabsTrigger
                value="member"
                className="flex-1 min-h-11 gap-2 rounded-xl text-xs font-black data-[state=active]:bg-[var(--nc-coral)] data-[state=active]:text-white"
              >
                <Users size={14} />
                {t('loginAsMember', locale)}
              </TabsTrigger>
              <TabsTrigger
                value="creator"
                className="flex-1 min-h-11 gap-2 rounded-xl text-xs font-black data-[state=active]:bg-[var(--nc-coral)] data-[state=active]:text-white"
              >
                <Crown size={14} />
                {t('loginAsCreatorAdmin', locale)}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <form
            onSubmit={(e) => {
              void onSubmit(e);
            }}
            className="mt-4 flex flex-col gap-3.5"
          >
            <label className="flex flex-col gap-1.5 text-xs font-black text-zinc-500 uppercase tracking-wider">
              {t('emailAddress', locale)}
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="min-h-11 rounded-xl border border-zinc-200 px-4 py-3 text-sm text-zinc-900 font-medium outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100 transition-all placeholder:text-zinc-300"
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
                className="min-h-11 rounded-xl border border-zinc-200 px-4 py-3 text-sm text-zinc-900 font-medium outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100 transition-all placeholder:text-zinc-300"
              />
            </label>

            <label className="inline-flex items-center gap-2 min-h-11 text-sm font-bold text-zinc-600 cursor-pointer">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="rounded border-zinc-300"
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
              className="min-h-12 rounded-xl text-sm font-black text-white bg-[var(--nc-coral)] hover:opacity-90 transition-all active:scale-95 disabled:opacity-60"
            >
              {loading ? t('signingIn', locale) : t('signIn', locale)}
            </button>

            <SocialSignInButtons callbackUrl={role === 'creator' ? '/admin' : '/dashboard'} />

            <p className="text-center text-sm text-zinc-400">
              {t('noAccount', locale)}{' '}
              <Link
                href={`/account/signup?callbackUrl=${encodeURIComponent(role === 'creator' ? '/admin' : '/dashboard')}`}
                className="font-black text-zinc-900 hover:underline transition-colors"
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
