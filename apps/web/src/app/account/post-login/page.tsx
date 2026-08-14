'use client';

/**
 * After OAuth (or any callback) — persist Admin vs Community role, then go home.
 * Needed because social login can't set the httpOnly role cookie before redirect.
 */

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { authClient } from '@/lib/auth-client';
import {
  homeForRole,
  normalizePlatformRole,
  type PlatformRole,
} from '@/lib/platform-role';
import { persistPlatformRole } from '@/lib/use-platform-role';
import { ClikdMark } from '@/components/brand/ClikdLogo';

function PostLoginInner() {
  const searchParams = useSearchParams();
  const [message, setMessage] = useState('Signing you in…');
  const { data: session, isPending } = authClient.useSession();

  useEffect(() => {
    if (isPending) return;

    const role = normalizePlatformRole(searchParams.get('role'));
    const fallback = homeForRole(role);

    const run = async () => {
      if (!session?.user) {
        // Not authenticated yet — send back to landing login.
        window.location.href = '/';
        return;
      }

      setMessage(
        role === 'creator' || role === 'admin'
          ? 'Opening Creator Admin…'
          : 'Opening Community…'
      );

      try {
        const home = await persistPlatformRole(role as PlatformRole);
        window.location.href = home || fallback;
      } catch {
        window.location.href = fallback;
      }
    };

    void run();
  }, [isPending, session?.user, searchParams]);

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col items-center justify-center gap-4 px-6">
      <ClikdMark size={40} className="rounded-xl" />
      <p className="text-sm font-bold text-slate-600">{message}</p>
    </div>
  );
}

export default function PostLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center text-sm font-bold text-slate-500">
          Signing you in…
        </div>
      }
    >
      <PostLoginInner />
    </Suspense>
  );
}
