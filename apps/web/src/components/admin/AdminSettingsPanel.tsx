'use client';

import { Check, CreditCard, Layers } from 'lucide-react';
import { useWorkspace } from '@/context/WorkspaceContext';
import Link from 'next/link';

const TIERS = [
  {
    id: 'starter',
    name: 'Starter',
    socialSets: 1,
    profiles: 8,
    price: 'Free',
    current: true,
  },
  {
    id: 'growth',
    name: 'Growth',
    socialSets: 2,
    profiles: 16,
    price: '199 SEK/mo',
    current: false,
  },
  {
    id: 'scale',
    name: 'Scale',
    socialSets: 6,
    profiles: 48,
    price: '499 SEK/mo',
    current: false,
  },
] as const;

export default function AdminSettingsPanel() {
  const { activeWorkspace } = useWorkspace();

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <p className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400">
          Settings · Billing
        </p>
        <h1 className="text-xl sm:text-2xl font-black text-[#1f2430] tracking-tight">
          Social Sets & Billing
        </h1>
        <p className="text-xs text-zinc-500 font-medium mt-0.5">
          Active set: {activeWorkspace.handle} · Manage plan limits for brands and profiles.
        </p>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-5">
        <div className="flex items-center gap-2 mb-1">
          <Layers size={15} className="text-[#7c6cf0]" />
          <h3 className="text-sm font-black text-[#1f2430]">Social Sets Tier Indicator</h3>
        </div>
        <p className="text-xs text-zinc-500 mb-4">
          Each Social Set groups profiles for one brand (e.g. Instagram + TikTok).
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {TIERS.map((tier) => (
            <div
              key={tier.id}
              className={`rounded-2xl border p-4 ${
                tier.current
                  ? 'border-[#7c6cf0] bg-[#f8f6ff] shadow-sm'
                  : 'border-zinc-200 bg-[#f7f8fa]'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-black text-[#1f2430]">{tier.name}</p>
                {tier.current && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-[#7c6cf0]">
                    <Check size={11} /> Current
                  </span>
                )}
              </div>
              <p className="text-xs font-bold text-zinc-600">
                {tier.socialSets} Social Set{tier.socialSets > 1 ? 's' : ''} / {tier.profiles}{' '}
                Profiles
              </p>
              <p className="text-[11px] font-extrabold text-zinc-400 mt-2 uppercase tracking-wide">
                {tier.price}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-5 space-y-3">
        <div className="flex items-center gap-2">
          <CreditCard size={15} className="text-zinc-500" />
          <h3 className="text-sm font-black text-[#1f2430]">Connected accounts</h3>
        </div>
        <p className="text-xs text-zinc-500">
          Connect Instagram, TikTok, and more for this Social Set.
        </p>
        <Link
          href="/admin/settings/socials"
          className="inline-flex items-center justify-center h-11 min-h-[44px] px-4 rounded-xl bg-[#1f2430] text-white text-xs font-extrabold hover:opacity-90"
        >
          Manage social accounts
        </Link>
      </div>
    </div>
  );
}
