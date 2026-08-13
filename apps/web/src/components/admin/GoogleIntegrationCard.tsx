'use client';

/**
 * Google Account (Drive, Calendar & Meet) connection card for Settings.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Unplug } from 'lucide-react';
import { toast } from 'sonner';
import { useWorkspaceOptional } from '@/context/WorkspaceContext';
import { adminCardClass } from '@/components/admin/AdminUi';

function GoogleGlyph({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.8-5.5 3.8-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.9 3.2 14.7 2.2 12 2.2 6.8 2.2 2.5 6.5 2.5 11.7S6.8 21.2 12 21.2c5.5 0 9.1-3.9 9.1-9.3 0-.6-.1-1.1-.2-1.6H12z"
      />
    </svg>
  );
}

export default function GoogleIntegrationCard({
  className = '',
}: {
  className?: string;
}) {
  const workspace = useWorkspaceOptional();
  const workspaceId = workspace?.activeWorkspace?.id ?? null;
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['google-status', workspaceId],
    queryFn: async () => {
      const qs = workspaceId
        ? `?workspaceId=${encodeURIComponent(workspaceId)}`
        : '';
      const r = await fetch(`/api/admin/google/status${qs}`);
      if (!r.ok) throw new Error('Failed');
      return r.json() as Promise<{
        connected: boolean;
        email: string | null;
        displayName: string | null;
        platformUserId: string | null;
      }>;
    },
    enabled: Boolean(workspaceId),
  });

  const connectUrl = workspaceId
    ? `/api/auth/google/login?workspaceId=${encodeURIComponent(workspaceId)}`
    : '/api/auth/google/login';

  const disconnect = async () => {
    if (!data?.platformUserId && !data?.connected) return;
    try {
      const r = await fetch('/api/auth/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: 'google',
          platformUserId: data.platformUserId || '',
          workspaceId,
        }),
      });
      if (!r.ok) throw new Error('Disconnect failed');
      toast.success('Google account disconnected');
      void qc.invalidateQueries({ queryKey: ['google-status'] });
    } catch {
      toast.error('Could not disconnect Google');
    }
  };

  return (
    <div className={`${adminCardClass} p-4 sm:p-5 ${className}`}>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 min-h-[40px] min-w-[40px] rounded-xl bg-white border border-slate-200 flex items-center justify-center flex-shrink-0">
          <GoogleGlyph size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-extrabold text-slate-900">
              Google Account (Drive, Calendar & Meet)
            </p>
            {data?.connected ? (
              <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                Connected ✓
              </span>
            ) : (
              <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md">
                Not connected
              </span>
            )}
          </div>
          <p className="text-xs font-medium text-slate-500 mt-1">
            Import files to Media Library & Planner. Auto-create Google Meet
            links for 1:1 coaching purchases.
          </p>
          {data?.connected ? (
            <p className="text-xs font-semibold text-slate-700 mt-2 truncate">
              {data.email || data.displayName || 'Google user'}
            </p>
          ) : null}

          <div className="mt-3 flex flex-wrap gap-2">
            {isLoading ? (
              <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
                <Loader2 className="animate-spin" size={14} /> Checking…
              </span>
            ) : data?.connected ? (
              <button
                type="button"
                onClick={() => void disconnect()}
                className="inline-flex items-center justify-center gap-1.5 h-11 min-h-[44px] px-3.5 rounded-xl border border-slate-200 bg-white text-xs font-extrabold text-slate-700 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 transition-colors"
              >
                <Unplug size={14} /> Disconnect
              </button>
            ) : (
              <a
                href={connectUrl}
                className="inline-flex items-center justify-center h-11 min-h-[44px] px-3.5 rounded-xl bg-[#2B2568] text-white text-xs font-extrabold hover:bg-[#1a1848] transition-colors"
              >
                Connect Google
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
