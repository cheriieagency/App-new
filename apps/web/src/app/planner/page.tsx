'use client';

import ContentPlannerShell from '@/components/planner/ContentPlannerShell';
import ConnectSocialsEmpty from '@/components/admin/ConnectSocialsEmpty';
import { useConnectedSocials } from '@/hooks/useConnectedSocials';

export default function PlannerPage() {
  const { hasConnectedSocials, isLoading } = useConnectedSocials();

  if (isLoading) {
    return (
      <div className="py-16 text-center text-sm font-semibold text-slate-400">
        Loading…
      </div>
    );
  }

  if (!hasConnectedSocials) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10">
        <ConnectSocialsEmpty />
      </div>
    );
  }

  return <ContentPlannerShell />;
}
