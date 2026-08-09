'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Alias: /dashboard/planner → /admin/planner */
export default function DashboardPlannerRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/admin/planner');
  }, [router]);
  return (
    <div className="min-h-screen flex items-center justify-center text-sm text-zinc-400">
      Öppnar Content Planner…
    </div>
  );
}
