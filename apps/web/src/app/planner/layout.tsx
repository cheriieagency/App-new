'use client';

import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { WorkspaceProvider } from '@/context/WorkspaceContext';
import { AdminNavProvider, useAdminNav } from '@/components/admin/AdminNavContext';
import AdminSidebar from '@/components/admin/AdminSidebar';

/** Keep Planner highlighted while browsing /planner. */
function PlannerSectionSync({ children }: { children: ReactNode }) {
  const { setSection } = useAdminNav();
  useEffect(() => {
    setSection('calendar');
  }, [setSection]);
  return <>{children}</>;
}

/** Same admin chrome as /admin — sidebar + light canvas. */
export default function PlannerLayout({ children }: { children: ReactNode }) {
  return (
    <WorkspaceProvider>
      <AdminNavProvider>
        <PlannerSectionSync>
          <div className="min-h-screen bg-[#FAFAFA] text-slate-900 font-sans">
            <AdminSidebar />
            <div className="md:pl-64 pb-16 md:pb-0 bg-[#F8FAFC]/60 min-h-screen">
              {children}
            </div>
          </div>
        </PlannerSectionSync>
      </AdminNavProvider>
    </WorkspaceProvider>
  );
}
