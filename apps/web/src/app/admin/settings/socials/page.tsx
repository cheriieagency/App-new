'use client';

import { useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CalendarDays, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { authClient } from '@/lib/auth-client';
import SocialAccountsPanel from '@/components/planner/SocialAccountsPanel';
import IgBusinessRequiredBanner from '@/components/admin/IgBusinessRequiredBanner';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { useLanguage } from '@/lib/i18n';
import { refreshMetaSync } from '@/hooks/useMetaSync';

function MetaConnectToast() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  useEffect(() => {
    const success = searchParams.get('success');
    const error = searchParams.get('error');
    const warning = searchParams.get('warning');

    const invalidate = async () => {
      try {
        await refreshMetaSync();
      } catch {
        /* callback may already have synced */
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['social-accounts'] }),
        queryClient.invalidateQueries({ queryKey: ['planner-socials'] }),
        queryClient.invalidateQueries({ queryKey: ['meta-sync'] }),
        queryClient.invalidateQueries({ queryKey: ['planner-posts'] }),
      ]);
    };

    if (
      success === 'meta_connected' ||
      success === 'instagram_connected' ||
      success === 'facebook_connected' ||
      success === 'youtube_connected' ||
      success === 'linkedin_connected'
    ) {
      if (success === 'instagram_connected') {
        toast.success('Instagram connected');
      } else if (success === 'facebook_connected') {
        toast.success('Facebook Page connected');
      } else if (success === 'youtube_connected') {
        toast.success('YouTube channel connected');
      } else if (success === 'linkedin_connected') {
        toast.success('LinkedIn profile connected');
      } else {
        toast.success('Instagram & Facebook connected');
      }
      if (warning === 'no_instagram') {
        toast.message(
          'Please convert your Instagram account to a Creator/Business account and link it to a Facebook Page to fetch analytics.'
        );
      }
      void invalidate();
    } else if (error === 'no_instagram_business_account') {
      toast.error(
        'No Instagram Business account was linked to the selected Facebook Page or Business Portfolio.'
      );
    } else if (error === 'meta_fetch_failed') {
      const detail = searchParams.get('detail');
      toast.error(
        detail
          ? `Meta connection failed: ${detail}`
          : 'Meta connection failed while fetching Pages / Instagram Business accounts. Try again and grant Page + Business access.'
      );
    } else if (error === 'no_youtube_channel') {
      toast.error('No YouTube channel was found for this Google account.');
    } else if (error === 'no_pages') {
      toast.message(
        'Meta login succeeded, but no Facebook Pages were returned. Grant Page access and try again.'
      );
    } else if (error) {
      toast.error(`Connection failed: ${error.replace(/_/g, ' ')}`);
    }
  }, [searchParams, queryClient]);

  return null;
}

function NoInstagramBusinessBanner() {
  const searchParams = useSearchParams();
  if (searchParams.get('error') !== 'no_instagram_business_account') return null;
  return <IgBusinessRequiredBanner />;
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
          <NoInstagramBusinessBanner />
        </Suspense>

        <SocialAccountsPanel />
      </main>
    </div>
  );
}
