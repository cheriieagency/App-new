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
import { type FormEvent, Suspense, useState } from 'react';
import { SocialSignInButtons } from '@/components/SocialSignInButtons';
import { authClient } from '@/lib/auth-client';
import { formatAuthError } from '@/lib/auth-error';
import { isDemoAuthUiEnabled } from '@/lib/auth-env';
import Link from 'next/link';
import { Users, Crown } from 'lucide-react';

type Role = 'member' | 'creator';

function SignInForm() {
  const searchParams = useSearchParams();
  const rawCallback = searchParams.get('callbackUrl') || '/';
  const [role, setRole] = useState<Role>('member');
  const callbackUrl = role === 'creator' ? '/admin' : rawCallback === '/admin' ? '/' : rawCallback;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const demoMode = isDemoAuthUiEnabled();

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
    <main className="flex min-h-screen w-full items-center justify-center bg-[#F4F4F6] p-4 font-plus-jakarta-sans">
      <div className="w-full max-w-[420px]">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-9 h-9 rounded-xl bg-zinc-900 flex items-center justify-center">
            <span className="text-white font-black text-sm">NC</span>
          </div>
          <span className="font-black text-zinc-900 text-base">Nordic Creator</span>
        </div>

        {/* Role switcher */}
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-1.5 flex gap-1.5 mb-5">
          <button
            type="button"
            onClick={() => setRole('member')}
            className={`flex-1 flex items-center justify-center gap-2 h-10 rounded-xl text-xs font-black transition-all ${role === 'member' ? 'bg-zinc-900 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-700'}`}
          >
            <Users size={14} />
            Logga in som Medlem
          </button>
          <button
            type="button"
            onClick={() => setRole('creator')}
            className={`flex-1 flex items-center justify-center gap-2 h-10 rounded-xl text-xs font-black transition-all ${role === 'creator' ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-700'}`}
          >
            <Crown size={14} />
            Kreatör / Admin
          </button>
        </div>

        {/* Role badge */}
        <div
          className={`flex items-center gap-2 mb-5 px-4 py-2.5 rounded-xl border text-xs font-bold transition-all ${role === 'creator' ? 'bg-violet-50 border-violet-200 text-violet-700' : 'bg-blue-50 border-blue-200 text-blue-700'}`}
        >
          {role === 'creator' ? (
            <>
              <Crown size={13} /> Loggar in till Creator Admin Center
            </>
          ) : (
            <>
              <Users size={13} /> Loggar in till Member Dashboard
            </>
          )}
        </div>

        {demoMode && (
          <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs font-bold text-amber-900">
            Demo-läge: Supabase-env saknas/är placeholder — inloggning använder
            in-memory auth för lokal test.
          </div>
        )}

        {/* Card */}
        <form
          onSubmit={(e) => {
            void onSubmit(e);
          }}
          className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-7 flex flex-col gap-4"
        >
          <div>
            <h1 className="text-xl font-black text-zinc-900">Välkommen tillbaka</h1>
            <p className="text-sm text-zinc-400 font-medium mt-0.5">
              {role === 'creator' ? 'Logga in till ditt skaparkonto' : 'Logga in på din profil'}
            </p>
          </div>

          <label className="flex flex-col gap-1.5 text-xs font-black text-zinc-500 uppercase tracking-wider">
            E-postadress
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="namn@example.com"
              className="rounded-xl border border-zinc-200 px-4 py-3 text-sm text-zinc-900 font-medium outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 transition-all placeholder:text-zinc-300"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-xs font-black text-zinc-500 uppercase tracking-wider">
            Lösenord
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="rounded-xl border border-zinc-200 px-4 py-3 text-sm text-zinc-900 font-medium outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 transition-all placeholder:text-zinc-300"
            />
          </label>

          {error && (
            <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm font-bold text-red-600">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`h-12 rounded-xl text-sm font-black text-white transition-all active:scale-95 disabled:opacity-60 ${role === 'creator' ? 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700' : 'bg-zinc-900 hover:bg-black'}`}
          >
            {loading ? 'Loggar in…' : role === 'creator' ? 'Logga in som Kreatör →' : 'Logga in →'}
          </button>

          <SocialSignInButtons callbackUrl={callbackUrl} />

          <p className="text-center text-sm text-zinc-400">
            Inget konto?{' '}
            <Link
              href={`/account/signup?callbackUrl=${encodeURIComponent(callbackUrl)}`}
              className="font-black text-indigo-600 hover:text-indigo-800 transition-colors"
            >
              Skapa konto
            </Link>
          </p>
        </form>

        <p className="text-center text-xs text-zinc-400 font-medium mt-6">
          <Link href="/" className="hover:text-zinc-600 transition-colors">
            ← Tillbaka till startsidan
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
