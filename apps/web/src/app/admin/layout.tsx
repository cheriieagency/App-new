'use client';

import type { ReactNode } from 'react';
import { WorkspaceProvider } from '@/context/WorkspaceContext';
import { AdminNavProvider } from '@/components/admin/AdminNavContext';
import AdminSidebar from '@/components/admin/AdminSidebar';

/** Later-style admin shell — left icon rail + brand Social Set context. */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <WorkspaceProvider>
      <AdminNavProvider>
        <div className="min-h-screen bg-[#f3f4f6] text-[#1f2430]">
          <AdminSidebar />
          <div className="md:pl-64 pb-16 md:pb-0">{children}</div>
        </div>
      </AdminNavProvider>
    </WorkspaceProvider>
  );
}
