'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, Copy, Globe, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { FeatureGate, PlanLockBadge } from '@/components/common/FeatureGate';
import UpgradeModal from '@/components/common/UpgradeModal';
import { useSubscription } from '@/components/common/useSubscription';
import { useWorkspace } from '@/context/WorkspaceContext';
import { AdminPageHeader, adminCardClass } from '@/components/admin/AdminUi';

type DnsInfo = {
  type: 'A' | 'CNAME';
  host: string;
  value: string;
  note?: string;
};

type DomainState = {
  domain: string | null;
  verified: boolean;
  status: string;
  dns: DnsInfo | null;
};

export default function DomainSettingsPage() {
  const {
    hasFeature,
    requestUpgrade,
    upgradeOpen,
    setUpgradeOpen,
    upgradeTarget,
  } = useSubscription();
  const { activeWorkspace } = useWorkspace();
  const canUse = hasFeature('customDomain');

  const [input, setInput] = useState('');
  const [state, setState] = useState<DomainState>({
    domain: null,
    verified: false,
    status: 'unset',
    dns: null,
  });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!canUse) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const r = await fetch('/api/admin/domains', { credentials: 'include' });
      if (r.status === 403) {
        setLoading(false);
        return;
      }
      const json = (await r.json()) as DomainState & { ok?: boolean };
      setState({
        domain: json.domain ?? null,
        verified: Boolean(json.verified),
        status: json.status || 'unset',
        dns: json.dns ?? null,
      });
      if (json.domain) setInput(json.domain);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [canUse]);

  useEffect(() => {
    void load();
  }, [load]);

  const connect = async () => {
    if (!canUse) {
      requestUpgrade('pro');
      return;
    }
    const domain = input.trim();
    if (!domain) {
      toast.error('Enter a domain like yourname.se');
      return;
    }
    setBusy(true);
    try {
      const r = await fetch('/api/admin/domains', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'x-workspace-id': activeWorkspace.id,
        },
        body: JSON.stringify({
          domain,
          workspaceId: activeWorkspace.id,
          slug: activeWorkspace.handle,
          workspaceName: activeWorkspace.name,
        }),
      });
      const json = await r.json().catch(() => ({}));
      if (r.status === 403) {
        requestUpgrade('pro');
        return;
      }
      if (!r.ok) {
        throw new Error(json.message || json.error || 'Could not connect domain');
      }
      setState({
        domain: json.domain,
        verified: Boolean(json.verified),
        status: json.status || 'pending_dns',
        dns: json.dns ?? null,
      });
      toast.success(json.message || 'Domain connected');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Connect failed');
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    setBusy(true);
    try {
      const r = await fetch('/api/admin/domains', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify' }),
      });
      const json = await r.json().catch(() => ({}));
      if (!r.ok) {
        throw new Error(json.message || 'Verification failed');
      }
      setState({
        domain: json.domain,
        verified: Boolean(json.verified),
        status: json.status || 'pending_dns',
        dns: json.dns ?? null,
      });
      toast.success(
        json.verified
          ? 'Configured ✓ — DNS verified'
          : 'Still pending — check DNS and try again in a few minutes'
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Verify failed');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!state.domain) return;
    setBusy(true);
    try {
      const r = await fetch('/api/admin/domains', {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: state.domain,
          workspaceId: activeWorkspace.id,
        }),
      });
      const json = await r.json().catch(() => ({}));
      if (!r.ok) {
        throw new Error(json.message || 'Remove failed');
      }
      setState({ domain: null, verified: false, status: 'unset', dns: null });
      setInput('');
      toast.success('Custom domain removed');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Remove failed');
    } finally {
      setBusy(false);
    }
  };

  const copyValue = async (value: string, key: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      window.setTimeout(() => setCopied(null), 1400);
    } catch {
      toast.error('Could not copy');
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-slate-900">
      <main className="max-w-3xl mx-auto px-4 sm:px-8 py-8 pb-24 space-y-6">
        <Link
          href="/admin?tab=settings"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-800 min-h-11"
        >
          <ArrowLeft size={16} />
          Back to Settings
        </Link>

        <AdminPageHeader
          eyebrow="Pro"
          title="Custom domain"
          description="Point yourname.se or hub.yourname.se at your clikd: bio & community."
          actions={<PlanLockBadge minPlan="pro" />}
        />

        {!canUse ? (
          <FeatureGate
            feature="customDomain"
            title="Custom Domain Linking"
            description="Connect your own domain on the Pro plan."
          />
        ) : loading ? (
          <div className={`${adminCardClass} p-8 flex items-center justify-center gap-2 text-slate-400`}>
            <Loader2 size={18} className="animate-spin" />
            Loading domain…
          </div>
        ) : (
          <>
            <div className={`${adminCardClass} p-5 sm:p-6 space-y-4`}>
              <label className="block">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wide text-slate-400">
                  Domain
                </span>
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="ebbabrobeck.se or hub.ebbabrobeck.se"
                  className="mt-1.5 w-full h-11 min-h-[44px] rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#F472B6]/30"
                />
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void connect()}
                  disabled={busy}
                  className="inline-flex items-center justify-center gap-2 min-h-11 px-4 rounded-xl bg-[#0F172A] text-white text-sm font-bold disabled:opacity-50"
                >
                  {busy ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Globe size={16} />
                  )}
                  Connect Domain
                </button>
                {state.domain && (
                  <>
                    <button
                      type="button"
                      onClick={() => void verify()}
                      disabled={busy}
                      className="inline-flex items-center justify-center min-h-11 px-4 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-700 disabled:opacity-50"
                    >
                      Check DNS
                    </button>
                    <button
                      type="button"
                      onClick={() => void remove()}
                      disabled={busy}
                      className="inline-flex items-center justify-center gap-1.5 min-h-11 px-4 rounded-xl border border-rose-200 bg-rose-50 text-sm font-bold text-rose-700 disabled:opacity-50"
                    >
                      <Trash2 size={14} />
                      Remove
                    </button>
                  </>
                )}
              </div>
            </div>

            {state.domain && state.dns && (
              <div className={`${adminCardClass} p-5 sm:p-6 space-y-4`}>
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">
                      DNS setup
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5 font-mono">
                      {state.domain}
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center min-h-9 px-3 rounded-xl text-xs font-bold ${
                      state.verified
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                        : 'bg-amber-50 text-amber-800 border border-amber-100'
                    }`}
                  >
                    {state.verified
                      ? 'Configured ✓'
                      : 'Pending DNS Verification'}
                  </span>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-4 space-y-3">
                  <p className="text-xs font-medium text-slate-600">
                    {state.dns.note}
                  </p>
                  {(
                    [
                      { key: 'type', label: 'Type', value: state.dns.type },
                      { key: 'host', label: 'Name / Host', value: state.dns.host },
                      { key: 'value', label: 'Value', value: state.dns.value },
                    ] as const
                  ).map((row) => (
                    <div
                      key={row.key}
                      className="flex items-center justify-between gap-3 min-h-11"
                    >
                      <div className="min-w-0">
                        <p className="text-[10px] font-mono font-bold uppercase tracking-wide text-slate-400">
                          {row.label}
                        </p>
                        <p className="text-sm font-semibold text-slate-900 font-mono truncate">
                          {row.value}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void copyValue(row.value, row.key)}
                        className="inline-flex items-center gap-1 min-h-11 px-3 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-600"
                      >
                        {copied === row.key ? (
                          <Check size={14} className="text-emerald-600" />
                        ) : (
                          <Copy size={14} />
                        )}
                        {copied === row.key ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      <UpgradeModal
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
        minPlan={upgradeTarget}
      />
    </div>
  );
}
