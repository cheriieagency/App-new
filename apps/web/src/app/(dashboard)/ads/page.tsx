'use client';

import MetaAdsDashboard from '@/components/ads/MetaAdsDashboard';

/** Meta Ads Management — /ads */
export default function AdsPage() {
  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-8 py-8 pb-24 md:pb-16">
        <MetaAdsDashboard />
      </main>
    </div>
  );
}
