'use client';

/**
 * Landing login portal — modal with Medlem vs Kreatör/Admin tabs.
 * Auth contract mirrors /account/signin: <form onSubmit> + preventDefault +
 * authClient.signIn.email + window.location.href redirect.
 */

import { type FormEvent, useState } from 'react';
import Link from 'next/link';
import { Crown, Users } from 'lucide-react';
import { authClient } from '@/lib/auth-client';
import { formatAuthError } from '@/lib/auth-error';
import { SocialSignInButtons } from '@/components/SocialSignInButtons';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type Role = 'member' | 'creator';

type LoginModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function LoginModal({ open, onOpenChange }: LoginModalProps) {
  const [role, setRole] = useState<Role>('member');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Creator lands in admin; members return to home / member dashboard entry.
  const callbackUrl = role === 'creator' ? '/admin' : '/dashboard';

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
        setError(formatAuthError(signInError, 'Inloggningen misslyckades'));
        setLoading(false);
        return;
      }

      if (typeof window !== 'undefined') {
        window.location.href = callbackUrl;
      }
    } catch (err) {
      setError(formatAuthError(err, 'Inloggningen misslyckades'));
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px] rounded-[1.5rem] border-white/70 bg-white/80 backdrop-blur-xl p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-2">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-full bg-[var(--nc-coral)] flex items-center justify-center">
              <span className="text-white font-display font-extrabold text-xs">N</span>
            </div>
            <DialogTitle className="text-base font-black text-zinc-900">
              Logga in
            </DialogTitle>
          </div>
          <DialogDescription className="text-sm text-zinc-500 font-medium">
            Välj hur du vill logga in på Nordic Creator.
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
                Logga in som Medlem
              </TabsTrigger>
              <TabsTrigger
                value="creator"
                className="flex-1 min-h-11 gap-2 rounded-xl text-xs font-black data-[state=active]:bg-[var(--nc-coral)] data-[state=active]:text-white"
              >
                <Crown size={14} />
                Kreatör / Admin
              </TabsTrigger>
            </TabsList>

            <TabsContent value="member" className="mt-0">
              <RoleBadge role="member" />
            </TabsContent>
            <TabsContent value="creator" className="mt-0">
              <RoleBadge role="creator" />
            </TabsContent>
          </Tabs>

          <form
            onSubmit={(e) => {
              void onSubmit(e);
            }}
            className="mt-4 flex flex-col gap-3.5"
          >
            <label className="flex flex-col gap-1.5 text-xs font-black text-zinc-500 uppercase tracking-wider">
              E-postadress
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="namn@example.com"
                className="min-h-11 rounded-xl border border-zinc-200 px-4 py-3 text-sm text-zinc-900 font-medium outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100 transition-all placeholder:text-zinc-300"
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
                className="min-h-11 rounded-xl border border-zinc-200 px-4 py-3 text-sm text-zinc-900 font-medium outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100 transition-all placeholder:text-zinc-300"
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
              className="min-h-12 rounded-xl text-sm font-black text-white bg-[var(--nc-coral)] hover:opacity-90 transition-all active:scale-95 disabled:opacity-60"
            >
              {loading
                ? 'Loggar in…'
                : role === 'creator'
                  ? 'Logga in som Kreatör →'
                  : 'Logga in →'}
            </button>

            <SocialSignInButtons callbackUrl={callbackUrl} />

            <p className="text-center text-sm text-zinc-400">
              Inget konto?{' '}
              <Link
                href={`/account/signup?callbackUrl=${encodeURIComponent(callbackUrl)}`}
                className="font-black text-zinc-900 hover:underline transition-colors"
                onClick={() => onOpenChange(false)}
              >
                Skapa konto
              </Link>
            </p>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function RoleBadge({ role }: { role: Role }) {
  if (role === 'creator') {
    return (
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50 text-xs font-bold text-zinc-700">
        <Crown size={13} /> Loggar in till Creator Admin Center
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50 text-xs font-bold text-zinc-700">
      <Users size={13} /> Loggar in till Member Dashboard
    </div>
  );
}
