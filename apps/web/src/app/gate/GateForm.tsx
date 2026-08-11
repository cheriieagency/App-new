'use client';

import { FormEvent, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { SITE_GATE_API_PATH } from '@/lib/site-gate';

/** Password form that unlocks the site cookie via /api/gate. */
export function GateForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    try {
      const res = await fetch(SITE_GATE_API_PATH, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (!res.ok) {
        setError('Fel lösenord. Försök igen.');
        setPending(false);
        return;
      }

      const next = searchParams.get('next');
      const destination =
        next && next.startsWith('/') && !next.startsWith('//') ? next : '/';
      router.replace(destination);
      router.refresh();
    } catch {
      setError('Något gick fel. Försök igen.');
      setPending(false);
    }
  }

  return (
    <main className="relative min-h-[100dvh] flex items-center justify-center overflow-hidden bg-[#FAFAFA] px-6">
      {/* Soft atmospheric wash — keeps the gate from reading as a flat blank page. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_0%,rgba(233,213,255,0.55),transparent_55%),radial-gradient(ellipse_at_80%_100%,rgba(244,114,182,0.18),transparent_50%)]"
      />

      <div className="relative w-full max-w-sm text-center">
        <p className="font-[family-name:var(--font-space-grotesk)] text-4xl sm:text-5xl font-bold tracking-tight text-[#0F172A]">
          clikd<span className="text-[#F472B6]">:</span>
        </p>
        <p className="mt-3 text-sm text-slate-500 font-[family-name:var(--font-plus-jakarta)]">
          Ange lösenord för att fortsätta
        </p>

        <form onSubmit={onSubmit} className="mt-10 space-y-4 text-left">
          <label className="block">
            <span className="sr-only">Lösenord</span>
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              inputMode="numeric"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Lösenord"
              className="w-full h-12 min-h-[44px] rounded-2xl border border-slate-200 bg-white/80 px-4 text-base text-[#0F172A] placeholder:text-slate-400 outline-none focus:border-[#F472B6] focus:ring-2 focus:ring-[#F472B6]/25 transition"
              autoFocus
              required
            />
          </label>

          {error ? (
            <p className="text-sm font-medium text-rose-600" role="alert">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={pending || !password}
            className="w-full h-12 min-h-[44px] rounded-2xl bg-[#2B2568] text-white text-sm font-bold tracking-wide hover:bg-[#1a1848] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {pending ? 'Öppnar…' : 'Fortsätt'}
          </button>
        </form>
      </div>
    </main>
  );
}
