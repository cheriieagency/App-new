'use client';

/**
 * /admin/settings/integrations — Google + social OAuth connections.
 */

import { useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plug } from 'lucide-react';
import { toast } from 'sonner';
import { authClient } from '@/lib/auth-client';
import SocialAccountsPanel from '@/components/planner/SocialAccountsPanel';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { useLanguage } from '@/lib/i18n';

function IntegrationsToast() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  useEffect(() => {
    const success = searchParams.get('success');
    const error = searchParams.get('error');

    if (success === 'google_connected') {
      toast.success('Google connected — Drive, Calendar & Meet enabled');
      void queryClient.invalidateQueries({ queryKey: ['google-status'] });
      void queryClient.invalidateQueries({ queryKey: ['social-accounts'] });
    } else if (error) {
      toast.error(`Connection failed: ${error.replace(/_/g, ' ')}`);
    }
  }, [searchParams, queryClient]);

  return null;
}

export default function AdminIntegrationsSettingsPage() {
  const { data: session, isPending } = authClient.useSession();
  const router = useRouter();
  const { t } = useLanguage();

  useEffect(() => {
    if (!isPending && !session) {
      router.replace('/account/signin');
    }
  }, [isPending, session, router]);

  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-400 text-sm">
        {t('common.loading')}
      </div>
    );
  }
  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-400 text-sm">
        {t('common.loading')}
      </div>
    );
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
              <Plug size={14} />
            </span>
            <h1 className="text-sm sm:text-base font-extrabold text-slate-900 truncate">
              Integrations
            </h1>
          </div>
          <LanguageSwitcher />
        </div>
      </header>

      <main className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-20 space-y-4">
        <Suspense fallback={null}>
          <IntegrationsToast />
        </Suspense>
        <SocialAccountsPanel />
      </main>
    </div>
  );
}
