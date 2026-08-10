'use client';

import Link from 'next/link';
import { useLanguage } from '@/lib/locale-context';
import { t } from '@/lib/i18n';

/** Client back-link so legal layout can stay a server component. */
export default function LegalBackLink() {
  const { locale } = useLanguage();
  return (
    <Link
      href="/"
      className="text-sm font-bold text-slate-600 hover:text-[#F472B6] transition-colors min-h-11 inline-flex items-center"
    >
      {t('backToHomeShort', locale)}
    </Link>
  );
}
