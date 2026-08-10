'use client';

import { Suspense, use, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CommunityAboutView } from '@/components/community/CommunityAboutView';
import { fetchCommunityAbout, type CommunityAbout } from '@/lib/community-about';
import { useLanguage } from '@/lib/locale-context';
import { t } from '@/lib/i18n';

type PageProps = {
  params: Promise<{ id: string }>;
};

function CommunityAboutInner({ id }: { id: string }) {
  const searchParams = useSearchParams();
  const from = searchParams.get('from');
  const { locale } = useLanguage();
  const [community, setCommunity] = useState<CommunityAbout | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void fetchCommunityAbout(id).then((data) => {
      if (!cancelled) {
        setCommunity(data);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const backHref = from === 'dashboard' || from === 'search' ? '/dashboard' : '/';
  const backLabel =
    from === 'dashboard' || from === 'search'
      ? '← Tillbaka till Dashboard'
      : '← Tillbaka till Sök';

  if (loading) {
    return (
      <div className="nc-app nc-app-shell min-h-screen flex items-center justify-center">
        <p className="text-sm font-bold text-zinc-400">{t('loadingCommunity', locale)}</p>
      </div>
    );
  }

  if (!community) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-transparent  px-4">
        <p className="text-lg font-black text-zinc-900">{t('communityNotFound', locale)}</p>
        <a href="/" className="text-sm font-bold text-zinc-600 hover:text-zinc-900 underline">
          ← Tillbaka till startsidan
        </a>
      </div>
    );
  }

  return (
    <CommunityAboutView community={community} backHref={backHref} backLabel={backLabel} />
  );
}

function LoadingCommunityFallback() {
  const { locale } = useLanguage();
  return (
    <div className="nc-app nc-app-shell min-h-screen flex items-center justify-center">
      <p className="text-sm font-bold text-zinc-400">{t('loadingCommunity', locale)}</p>
    </div>
  );
}

export default function CommunityAboutPage({ params }: PageProps) {
  const { id } = use(params);
  return (
    <Suspense fallback={<LoadingCommunityFallback />}>
      <CommunityAboutInner id={id} />
    </Suspense>
  );
}
