'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, CalendarDays, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { authClient } from '@/lib/auth-client';
import SocialAccountsPanel from '@/components/planner/SocialAccountsPanel';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { useLanguage } from '@/lib/i18n';
import { Suspense } from 'react';

function MetaConnectToast() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const success = searchParams.get('success');
    const error = searchParams.get('error');
    if (success === 'meta_connected') {
      toast.success('Instagram & Facebook connected');
    } else if (error) {
      toast.error(`Meta connection failed: ${error.replace(/_/g, ' ')}`);
    }
  }, [searchParams]);

  return null;
}

/** Settings → Connected Social Accounts (OAuth + Demo Recording Mode). */
export default function AdminSocialSettingsPage() {
  const { data: session, isPending } = authClient.useSession();
  const router = useRouter();
  const { t } = useLanguage();

  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-400 text-sm">
        {t('common.loading')}
      </div>
    );
  }
  if (!session) {
    router.push('/account/signin');
    return null;
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center gap-3">
          <Link
            href="/admin?tab=settings"
            className="inline-flex items-center gap-1.5 h-11 min-h-[44px] px-2 rounded-xl text-sm font-extrabold text-slate-500 hover:text-slate-900 hover:bg-slate-50"
          >
            <ArrowLeft size={15} /> {t('admin.settings')}
          </Link>
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="hidden sm:inline-flex h-8 w-8 rounded-xl bg-slate-50 border border-slate-200/80 items-center justify-center text-slate-500">
              <Settings size={14} />
            </span>
            <h1 className="text-sm sm:text-base font-extrabold text-slate-900 truncate">
              {t('admin.connectedAccounts')}
            </h1>
          </div>
          <LanguageSwitcher />
          <Link
            href="/planner"
            className="inline-flex items-center gap-1.5 h-11 min-h-[44px] px-3 rounded-xl text-xs font-extrabold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200/80"
          >
            <CalendarDays size={14} /> {t('admin.planner')}
          </Link>
        </div>
      </header>

      <main className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-20 space-y-4">
        <Suspense fallback={null}>
          <MetaConnectToast />
        </Suspense>

        <div className="rounded-2xl border border-[#1877F2]/20 bg-white px-4 py-4 sm:px-5 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
          <div>
            <p className="text-sm font-extrabold text-slate-900">
              Connect Instagram & Facebook
            </p>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Authorize Meta to publish and read insights for your Pages & IG Business accounts.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              window.location.href = '/api/auth/meta/login';
            }}
            className="inline-flex items-center justify-center min-h-[44px] px-4 rounded-xl bg-[#1877F2] hover:bg-[#166fe5] text-white text-sm font-bold"
          >
            Connect Instagram & Facebook
          </button>
        </div>

        <SocialAccountsPanel />
      </main>
    </div>
  );
}
