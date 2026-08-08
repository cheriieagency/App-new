'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Deep-link: /admin/email → Admin E-post tab. */
export default function AdminEmailPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/admin?tab=email');
  }, [router]);
  return (
    <div className="min-h-screen flex items-center justify-center text-sm text-zinc-400">
      Öppnar e-post...
    </div>
  );
}
