import type { ReactNode } from 'react';

/** Member dashboard shell — light canvas matching admin / brand guidelines. */
export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-[#FAFAFA] text-slate-900 font-sans">{children}</div>;
}
