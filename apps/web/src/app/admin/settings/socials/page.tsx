'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CalendarDays } from 'lucide-react';
import { authClient } from '@/lib/auth-client';
import SocialAccountsPanel from '@/components/planner/SocialAccountsPanel';

export default function AdminSocialSettingsPage() {
  const { data: session, isPending } = authClient.useSession();
  const router = useRouter();

  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center text-zinc-400 text-sm">
        Laddar…
      </div>
    );
  }
  if (!session) {
    router.push('/account/signin');
    return null;
  }

  return (
    <div className="nc-app nc-app-shell min-h-screen">
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-zinc-100">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center gap-3">
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 h-11 min-h-[44px] px-2 rounded-xl text-sm font-extrabold text-zinc-500 hover:text-[#2c3340] hover:bg-zinc-50"
          >
            <ArrowLeft size={15} /> Admin
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm sm:text-base font-black text-[#2c3340] truncate">
              Sociala konton
            </h1>
          </div>
          <Link
            href="/admin/planner"
            className="inline-flex items-center gap-1.5 h-11 min-h-[44px] px-3 rounded-xl text-xs font-extrabold text-zinc-600 bg-zinc-50 hover:bg-zinc-100"
          >
            <CalendarDays size={14} /> Planner
          </Link>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-16">
        <SocialAccountsPanel />
      </main>
    </div>
  );
}
