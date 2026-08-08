'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Loader2, XCircle, Copy } from 'lucide-react';
import { authClient } from '@/lib/auth-client';
import { EBBA_TEST_USER } from '@/lib/mock-communities';

type SeedResult = {
  success?: boolean;
  mode?: string;
  message?: string;
  user?: { email: string; password: string; name: string; id?: string };
  communities?: Array<{ id: number; slug?: string; name: string; is_joined?: boolean }>;
  content?: {
    posts: number;
    courses: number;
    lessons: number;
    events: number;
    products: number;
  };
};

export default function SeedEbbaPage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [data, setData] = useState<SeedResult | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const run = async () => {
      try {
        // Ensure demo/memory auth also has the Ebba account.
        const signedIn = await authClient.signIn.email({
          email: EBBA_TEST_USER.email,
          password: EBBA_TEST_USER.password,
        });
        if (signedIn.error) {
          await authClient.signUp.email({
            email: EBBA_TEST_USER.email,
            password: EBBA_TEST_USER.password,
            name: EBBA_TEST_USER.name,
          });
        }

        const res = await fetch('/api/seed-ebba-communities');
        const json = (await res.json()) as SeedResult;
        setData(json);
        setStatus(json.success ? 'success' : 'error');
      } catch {
        setStatus('error');
        setData({ message: 'Network error' });
      }
    };
    void run();
  }, []);

  const copyLogin = async () => {
    if (!data?.user) return;
    await navigator.clipboard.writeText(
      `${data.user.email}\n${data.user.password}`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center font-plus-jakarta-sans px-5">
      <div className="bg-white rounded-3xl shadow-xl border border-zinc-100 p-10 max-w-md w-full">
        {status === 'loading' && (
          <div className="text-center">
            <Loader2 size={40} className="text-zinc-300 mx-auto mb-4 animate-spin" />
            <h1 className="text-lg font-black text-zinc-900 mb-2">
              Seedar Ebba-communities…
            </h1>
          </div>
        )}

        {status === 'success' && data && (
          <>
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 size={32} className="text-green-500" />
            </div>
            <h1 className="text-xl font-black text-zinc-900 mb-2 text-center">
              Klart — 2 testcommunities
            </h1>
            <p className="text-sm text-zinc-500 text-center mb-5 font-medium">
              {data.message}
            </p>
            {data.mode && (
              <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 text-center mb-4">
                Mode: {data.mode}
              </p>
            )}

            <div className="bg-zinc-50 rounded-2xl p-5 text-left mb-4 space-y-3">
              <div>
                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">
                  Email
                </p>
                <p className="text-sm font-bold text-zinc-900 font-mono">
                  {data.user?.email}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">
                  Password
                </p>
                <p className="text-sm font-bold text-zinc-900 font-mono">
                  {data.user?.password}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  void copyLogin();
                }}
                className="flex items-center gap-2 text-xs font-bold text-zinc-600 hover:text-zinc-900 min-h-10"
              >
                <Copy size={12} /> {copied ? 'Kopierat!' : 'Kopiera inloggning'}
              </button>
            </div>

            <ul className="space-y-2 mb-4">
              {(data.communities ?? []).map((c) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between rounded-xl border border-zinc-100 px-3 py-2.5 text-sm"
                >
                  <span className="font-bold text-zinc-900">{c.name}</span>
                  <Link
                    href={`/communities/${c.id}?from=dashboard`}
                    className="text-xs font-black text-emerald-700 hover:underline"
                  >
                    Öppna →
                  </Link>
                </li>
              ))}
            </ul>

            {data.content && (
              <div className="grid grid-cols-2 gap-2 mb-6">
                {[
                  ['Posts', data.content.posts],
                  ['Kurser', data.content.courses],
                  ['Lektioner', data.content.lessons],
                  ['Events', data.content.events],
                  ['Produkter', data.content.products],
                ].map(([label, value]) => (
                  <div
                    key={String(label)}
                    className="rounded-xl bg-zinc-50 border border-zinc-100 px-3 py-2 text-center"
                  >
                    <p className="text-sm font-black text-zinc-900">{value}</p>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                      {label}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-3">
              <Link
                href="/account/signin"
                className="block w-full h-12 rounded-xl bg-zinc-900 text-white font-black text-sm flex items-center justify-center hover:bg-black transition-colors"
              >
                Logga in som Ebba →
              </Link>
              <Link
                href="/dashboard"
                className="block w-full h-10 rounded-xl text-zinc-400 font-bold text-sm flex items-center justify-center hover:text-zinc-700 transition-colors"
              >
                Gå till Dashboard
              </Link>
            </div>
          </>
        )}

        {status === 'error' && (
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <XCircle size={32} className="text-red-500" />
            </div>
            <h1 className="text-xl font-black text-zinc-900 mb-2">Seed misslyckades</h1>
            <p className="text-sm text-zinc-400 mb-6">{data?.message}</p>
            <Link
              href="/"
              className="block w-full h-12 rounded-xl bg-zinc-900 text-white font-black text-sm flex items-center justify-center"
            >
              Till startsidan
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
