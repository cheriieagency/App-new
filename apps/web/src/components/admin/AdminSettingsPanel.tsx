'use client';

import { Check, CreditCard, Layers } from 'lucide-react';
import { useWorkspace } from '@/context/WorkspaceContext';
import Link from 'next/link';
import { AdminPageHeader, adminCardClass } from '@/components/admin/AdminUi';

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
      <AdminPageHeader
        eyebrow="Settings · Billing"
        title="Inställningar"
        description={`Aktiv yta: ${activeWorkspace.handle} · Plan & konton`}
      />

      <div className={`${adminCardClass} p-5 sm:p-6`}>
        <div className="flex items-center gap-2 mb-1">
          <Layers size={15} className="text-slate-500" />
          <h3 className="text-sm font-extrabold text-slate-900">Social Sets</h3>
        </div>
        <p className="text-sm text-slate-500 mb-4">
          Varje Social Set grupperar profiler för ett varumärke.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {TIERS.map((tier) => (
            <div
              key={tier.id}
              className={`rounded-2xl border p-4 ${
                tier.current
                  ? 'border-slate-900 bg-slate-50'
                  : 'border-slate-200/80 bg-white'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-extrabold text-slate-900">{tier.name}</p>
                {tier.current && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                    <Check size={11} /> Aktiv
                  </span>
                )}
              </div>
              <p className="text-xs font-medium text-slate-600">
                {tier.socialSets} Social Set{tier.socialSets > 1 ? 's' : ''} / {tier.profiles}{' '}
                Profiles
              </p>
              <p className="text-[11px] font-mono font-bold text-slate-400 mt-2 uppercase tracking-wide">
                {tier.price}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className={`${adminCardClass} p-5 sm:p-6 space-y-3`}>
        <div className="flex items-center gap-2">
          <CreditCard size={15} className="text-slate-500" />
          <h3 className="text-sm font-extrabold text-slate-900">Kopplade konton</h3>
        </div>
        <p className="text-sm text-slate-500">
          Koppla Instagram, TikTok med mera till denna Social Set.
        </p>
        <Link
          href="/admin/settings/socials"
          className="inline-flex items-center justify-center h-11 min-h-[44px] px-4 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors"
        >
          Hantera sociala konton
        </Link>
      </div>
    </div>
  );
}
