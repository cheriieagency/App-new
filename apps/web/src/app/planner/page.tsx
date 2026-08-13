'use client';

import ContentPlannerShell from '@/components/planner/ContentPlannerShell';
import ConnectSocialsEmpty from '@/components/admin/ConnectSocialsEmpty';
import GoogleDriveImportButton from '@/components/admin/GoogleDriveImportButton';
import { useConnectedSocials } from '@/hooks/useConnectedSocials';
import { toast } from 'sonner';

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

  return (
    <ContentPlannerShell
      headerExtra={
        <GoogleDriveImportButton
          target="planner"
          onImported={(file) => {
            toast.success(`${file.fileName} ready for your next post`);
          }}
        />
      }
    />
  );
}
