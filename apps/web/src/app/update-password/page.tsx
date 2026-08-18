'use client';

import { type FormEvent, Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { authClient } from '@/lib/auth-client';
import { formatAuthError } from '@/lib/auth-error';
import { getBrowserSupabase } from '@/lib/supabase/browser';
import { ClikdWordmark } from '@/components/brand/ClikdLogo';

function UpdatePasswordForm() {
  const searchParams = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const hydrateRecoverySession = async () => {
      const supabase = getBrowserSupabase();
      if (!supabase) {
        setReady(true);
        return;
      }

      const hash = typeof window !== 'undefined' ? window.location.hash : '';
      const hashParams = new URLSearchParams(hash.replace(/^#/, ''));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      const hashType = (hashParams.get('type') || '').toLowerCase();
      const tokenHash = searchParams.get('token_hash');
      const type = (searchParams.get('type') || hashType || 'recovery').toLowerCase();
      const code = searchParams.get('code');

      try {
        if (accessToken && refreshToken) {
          await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
        } else if (tokenHash) {
          const otpType =
            type === 'recovery' || type === 'signup' || type === 'email' || type === 'magiclink'
              ? type
              : 'recovery';
          const { error: otpError } = await supabase.auth.verifyOtp({
            type: otpType,
            token_hash: tokenHash,
          });
          if (otpError) {
            console.warn('[update-password] verifyOtp', otpError.message);
          }
        } else if (code) {
          const { error: exchangeError } =
            await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            console.warn('[update-password] exchangeCode', exchangeError.message);
          }
        }
      } catch (err) {
        console.warn('[update-password] hydrate session', err);
      } finally {
        if (!cancelled) setReady(true);
      }
    };

    void hydrateRecoverySession();
    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const supabase = getBrowserSupabase();
      let supabaseUpdated = false;
      if (supabase) {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          const { error: updateError } = await supabase.auth.updateUser({
            password,
          });
          if (updateError) {
            throw updateError;
          }
          supabaseUpdated = true;
        }
      }

      const token = searchParams.get('token');
      const { error: resetError } = await authClient.resetPassword({
        newPassword: password,
        ...(token ? { token } : {}),
      });
      if (resetError && !supabaseUpdated) {
        throw resetError;
      }

      setDone(true);
      toast.success('Password updated. You can sign in now.');
    } catch (err) {
      setError(formatAuthError(err, 'Could not update password'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="nc-app nc-app-shell flex min-h-screen w-full items-center justify-center p-4 relative z-10">
      <div className="w-full max-w-[420px]">
        <div className="flex items-center justify-center mb-8">
          <ClikdWordmark showMark={false} textClassName="text-2xl" className="min-h-0 gap-0" />
        </div>

        {done ? (
          <div className="nc-glass rounded-[1.5rem] p-7 space-y-4">
            <h1 className="text-xl font-display font-extrabold text-[#2c3340]">
              Password updated
            </h1>
            <p className="text-sm text-zinc-500 font-medium">
              Sign in with your new password.
            </p>
            <Link
              href="/account/signin"
              className="inline-flex items-center justify-center h-12 w-full rounded-full bg-[var(--nc-coral)] text-sm font-extrabold text-white hover:opacity-90"
            >
              Sign in
            </Link>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              void onSubmit(e);
            }}
            className="nc-glass rounded-[1.5rem] p-7 flex flex-col gap-4"
          >
            <div>
              <h1 className="text-xl font-display font-extrabold text-[#2c3340]">
                Set a new password
              </h1>
              <p className="text-sm text-zinc-400 font-medium mt-0.5">
                Choose a password with at least 8 characters.
              </p>
            </div>

            {!ready && (
              <p className="text-xs font-medium text-zinc-400">Preparing reset…</p>
            )}

            <label className="flex flex-col gap-1.5 text-xs font-black text-zinc-500 uppercase tracking-wider">
              New password
              <input
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="rounded-xl border border-zinc-200 px-4 py-3 text-sm text-zinc-900 font-medium outline-none focus:border-[var(--nc-coral)] focus:ring-2 focus:ring-[#f2eeff] min-h-[44px]"
              />
            </label>

            <label className="flex flex-col gap-1.5 text-xs font-black text-zinc-500 uppercase tracking-wider">
              Confirm password
              <input
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="rounded-xl border border-zinc-200 px-4 py-3 text-sm text-zinc-900 font-medium outline-none focus:border-[var(--nc-coral)] focus:ring-2 focus:ring-[#f2eeff] min-h-[44px]"
              />
            </label>

            {error && (
              <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm font-bold text-red-600">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !ready}
              className="h-12 min-h-[44px] rounded-full text-sm font-extrabold text-white bg-[var(--nc-coral)] hover:opacity-90 transition-all disabled:opacity-60"
            >
              {loading ? 'Saving…' : 'Update password'}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}

export default function UpdatePasswordPage() {
  return (
    <Suspense>
      <UpdatePasswordForm />
    </Suspense>
  );
}
