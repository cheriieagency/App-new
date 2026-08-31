'use client';

import type { ReactNode } from 'react';
import { WorkspaceProvider } from '@/context/WorkspaceContext';
import { AdminNavProvider } from '@/components/admin/AdminNavContext';
import AdminSidebar from '@/components/admin/AdminSidebar';
import SubscriptionGateBanner from '@/components/admin/SubscriptionGateBanner';

/** Creator dashboard shell (ads + future suite pages) — same chrome as /admin. */
export default function DashboardGroupLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <WorkspaceProvider>
      <AdminNavProvider>
        <div className="min-h-screen bg-[#FAFAFA] text-slate-900 font-sans">
          <AdminSidebar />
          <div className="lg:pl-64 pb-16 lg:pb-0 bg-[#F8FAFC]/60 min-h-screen">
            <SubscriptionGateBanner />
            {children}
          </div>
        </div>
      </AdminNavProvider>
    </WorkspaceProvider>
  );
}
