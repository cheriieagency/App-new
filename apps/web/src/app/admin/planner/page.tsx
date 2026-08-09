'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Legacy /admin/planner → full planner at /planner */
export default function AdminPlannerPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/planner');
  }, [router]);
  return (
    <div className="min-h-screen flex items-center justify-center text-sm text-zinc-400">
      Opening Content Planner…
    </div>
  );
}
