'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';

export default function SeedPage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'exists' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('/api/seed-test-user')
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setStatus('success');
        } else if (
          data.message?.toLowerCase().includes('already') ||
          data.message?.toLowerCase().includes('exist') ||
          data.message?.toLowerCase().includes('unique')
        ) {
          setStatus('exists');
          setMessage(data.message);
        } else {
          setStatus('error');
          setMessage(data.message);
        }
      })
      .catch(() => {
        setStatus('error');
        setMessage('Network error');
      });
  }, []);

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center font-plus-jakarta-sans px-5">
      <div className="bg-white rounded-3xl shadow-xl border border-zinc-100 p-10 max-w-sm w-full text-center">
        {status === 'loading' && (
          <>
            <Loader2 size={40} className="text-zinc-300 mx-auto mb-4 animate-spin" />
            <h1 className="text-lg font-black text-zinc-900 mb-2">Creating test account…</h1>
            <p className="text-sm text-zinc-400">Just a moment</p>
          </>
        )}

        {(status === 'success' || status === 'exists') && (
          <>
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 size={32} className="text-green-500" />
            </div>
            <h1 className="text-xl font-black text-zinc-900 mb-3">
              {status === 'success' ? 'Test account created! 🎉' : 'Account already exists ✓'}
            </h1>
            <div className="bg-zinc-50 rounded-2xl p-5 text-left mb-6 space-y-3">
              <div>
                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">
                  Email
                </p>
                <p className="text-sm font-bold text-zinc-900 font-mono">test@test.se</p>
              </div>
              <div>
                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">
                  Password
                </p>
                <p className="text-sm font-bold text-zinc-900 font-mono">1234abcd</p>
              </div>
            </div>
            <div className="space-y-3">
              <Link
                href="/account/signin"
                className="block w-full h-12 rounded-xl bg-zinc-900 text-white font-black text-sm flex items-center justify-center hover:bg-black transition-colors"
              >
                Sign in now →
              </Link>
              <Link
                href="/"
                className="block w-full h-10 rounded-xl text-zinc-400 font-bold text-sm flex items-center justify-center hover:text-zinc-700 transition-colors"
              >
                Back to store
              </Link>
            </div>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <XCircle size={32} className="text-red-500" />
            </div>
            <h1 className="text-xl font-black text-zinc-900 mb-2">Something went wrong</h1>
            <p className="text-sm text-zinc-400 mb-6">
              {message || 'Could not create account. Try signing up manually.'}
            </p>
            <Link
              href="/account/signup"
              className="block w-full h-12 rounded-xl bg-zinc-900 text-white font-black text-sm flex items-center justify-center"
            >
              Sign up manually →
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
