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
    <main className="flex min-h-screen w-full items-center justify-center bg-[#F9F8F6] text-[#2C2621] p-4 relative z-10">
      <div className="w-full max-w-[420px]">
        <div className="flex items-center justify-center mb-8">
          <Link href="/" className="min-h-11 inline-flex items-center">
            <ClikdWordmark showMark textClassName="text-2xl" className="min-h-0" />
          </Link>
        </div>

        {done ? (
          <div className="rounded-xl border border-[#E6E3DB] bg-[#FFFFFF] p-7 space-y-4 shadow-none">
            <h1 className="font-playfair text-2xl font-medium text-[#2C2621] tracking-tight">
              Password updated
            </h1>
            <p className="text-sm text-[#8A857D] font-medium">
              Sign in with your new password.
            </p>
            <Link
              href="/account/signin"
              className="inline-flex items-center justify-center min-h-12 w-full rounded-xl bg-[#2C3B2E] text-sm font-medium text-[#F9F8F6] hover:bg-[#243228] transition-colors"
            >
              Sign in
            </Link>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              void onSubmit(e);
            }}
            className="rounded-xl border border-[#E6E3DB] bg-[#FFFFFF] p-7 flex flex-col gap-4 shadow-none"
          >
            <div>
              <h1 className="font-playfair text-2xl font-medium text-[#2C2621] tracking-tight">
                Set a new password
              </h1>
              <p className="text-sm text-[#8A857D] font-medium mt-1">
                Choose a password with at least 8 characters.
              </p>
            </div>

            {!ready && (
              <p className="text-xs font-medium text-[#8A857D]">Preparing reset…</p>
            )}

            <label className="flex flex-col gap-1.5 text-[10px] font-inter font-medium text-[#8A857D] uppercase tracking-[0.14em]">
              New password
              <input
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="min-h-11 rounded-xl border border-[#E6E3DB] bg-[#FFFFFF] px-4 py-3 text-sm text-[#2C2621] font-medium outline-none focus:border-[#2C3B2E] focus:ring-2 focus:ring-[rgba(44,59,46,0.12)] transition-all"
              />
            </label>

            <label className="flex flex-col gap-1.5 text-[10px] font-inter font-medium text-[#8A857D] uppercase tracking-[0.14em]">
              Confirm password
              <input
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="min-h-11 rounded-xl border border-[#E6E3DB] bg-[#FFFFFF] px-4 py-3 text-sm text-[#2C2621] font-medium outline-none focus:border-[#2C3B2E] focus:ring-2 focus:ring-[rgba(44,59,46,0.12)] transition-all"
              />
            </label>

            {error && (
              <div className="rounded-xl bg-[rgba(184,92,56,0.08)] border border-[rgba(184,92,56,0.2)] px-4 py-3 text-sm font-medium text-[#B85C38]">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !ready}
              className="min-h-12 rounded-xl text-sm font-medium text-[#F9F8F6] bg-[#2C3B2E] hover:bg-[#243228] transition-colors disabled:opacity-60"
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
