'use client';

import Link from 'next/link';
import { useLanguage } from '@/lib/i18n';

/** Client back-link so legal layout can stay a server component. */
export default function LegalBackLink() {
  const { t } = useLanguage();
  return (
    <Link
      href="/"
      className="text-sm font-medium text-[#8A857D] hover:text-[#2C3B2E] transition-colors min-h-11 inline-flex items-center"
    >
      {t('legal.backToHome')}
    </Link>
  );
}
