'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Alias: /dashboard/planner → /planner */
export default function DashboardPlannerRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/planner');
  }, [router]);
  return (
    <div className="min-h-screen flex items-center justify-center text-sm text-zinc-400">
      Öppnar Content Planner…
    </div>
  );
}
