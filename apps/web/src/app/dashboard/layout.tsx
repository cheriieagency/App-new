import type { ReactNode } from 'react';

/** Member dashboard shell — light canvas matching admin / brand guidelines. */
export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-[#F9F8F6] text-[#2C2621] font-sans">{children}</div>;
}
