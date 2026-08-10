'use client';

import type { ReactNode } from 'react';
import { WorkspaceProvider } from '@/context/WorkspaceContext';
import { AdminNavProvider } from '@/components/admin/AdminNavContext';
import AdminSidebar from '@/components/admin/AdminSidebar';

/** Admin shell — light sidebar + content column matching landing aesthetic. */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <WorkspaceProvider>
      <AdminNavProvider>
        <div className="min-h-screen bg-[#FAFAFA] text-slate-900 font-sans">
          <AdminSidebar />
          <div className="md:pl-64 pb-16 md:pb-0 bg-[#F8FAFC]/60 min-h-screen">{children}</div>
        </div>
      </AdminNavProvider>
    </WorkspaceProvider>
  );
}
