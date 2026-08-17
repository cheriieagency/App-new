'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import PublicBioView from '@/components/bio/PublicBioView';
import { useLanguage } from '@/lib/i18n';
import {
  getWorkspaceProfileByHandle,
  type WorkspaceProfile,
} from '@/lib/mock-workspace-profiles';

/** Public link-in-bio page — what viewers see at /bio/{handle}. */
export default function PublicBioPage() {
  const { t } = useLanguage();
  const params = useParams<{ handle: string }>();
  const handle = decodeURIComponent(params?.handle || '').replace(/^@/, '');
  const [profile, setProfile] = useState<WorkspaceProfile | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`/api/bio/${encodeURIComponent(handle)}`, {
          cache: 'no-store',
        });
        if (r.ok) {
          const data = (await r.json()) as { profile?: WorkspaceProfile | null };
          if (!cancelled) {
            setProfile(data.profile ?? null);
            setReady(true);
            return;
          }
        }
      } catch {
        /* local fallback for demo */
      }
      if (!cancelled) {
        setProfile(getWorkspaceProfileByHandle(handle));
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [handle]);

  if (!ready) {
    return (
      <div className="min-h-screen bg-clikd-light flex items-center justify-center text-sm text-slate-400 font-bold">
        {t('bio.loading')}
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-clikd-light flex flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-lg font-extrabold text-slate-900">{t('bio.notFound')}</p>
        <p className="text-sm text-slate-500 font-medium">
          No published page for <span className="font-mono">@{handle || '…'}</span>
        </p>
        <Link
          href="/"
          className="mt-2 h-11 min-h-[44px] px-4 rounded-xl bg-clikd-pink text-white text-xs font-extrabold inline-flex items-center"
        >
          {t('bio.backToClikd')}
        </Link>
      </div>
    );
  }

  return <PublicBioView profile={profile} />;
}
