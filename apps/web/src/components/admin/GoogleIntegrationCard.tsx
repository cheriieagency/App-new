'use client';

/**
 * Google Account (Drive, Calendar & Meet) — matches Social Accounts connect strips.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Loader2, Unplug } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/lib/i18n';
import { useWorkspaceOptional } from '@/context/WorkspaceContext';

function GoogleGlyph({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.8-5.5 3.8-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.9 3.2 14.7 2.2 12 2.2 6.8 2.2 2.5 6.5 2.5 11.7S6.8 21.2 12 21.2c5.5 0 9.1-3.9 9.1-9.3 0-.6-.1-1.1-.2-1.6H12z"
      />
      <path
        fill="#4285F4"
        d="M12 10.2v3.6h9c.1.5.2 1 .2 1.6 0 5.4-3.6 9.3-9.2 9.3v-3.6c3.9 0 5.3-2.5 5.5-3.8H12z"
        opacity="0"
      />
    </svg>
  );
}

export default function GoogleIntegrationCard({
  className = '',
}: {
  className?: string;
}) {
  const { t } = useLanguage();
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
      toast.success(t('toastGoogleDisconnected'));
      void qc.invalidateQueries({ queryKey: ['google-status'] });
    } catch {
      toast.error(t('toastGoogleDisconnectFailed'));
    }
  };

  const connected = Boolean(data?.connected);
  const label = data?.email || data?.displayName || 'Google';

  return (
    <div
      className={`rounded-xl border border-[#E6E3DB] bg-[#FFFFFF] px-4 py-4 sm:px-5 space-y-3 w-full ${className}`}
    >
      <div className="min-w-0">
        <p className="text-sm font-medium text-[#2C2621]">
          Connect Google Account
        </p>
        <p className="text-xs text-[#8A857D] font-medium mt-0.5 leading-relaxed">
          Import files to Media Library &amp; Planner. Auto-create Google Meet
          links for 1:1 coaching purchases.
        </p>
        <p className="text-[10px] font-medium text-[#8A857D] leading-snug mt-1.5">
          {t('socials.workspaceGuidePerWorkspace')}
        </p>
      </div>

      <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-2 items-stretch sm:items-start">
        {isLoading ? (
          <div className="inline-flex min-h-[44px] items-center gap-2 px-4 text-sm font-medium text-[#8A857D]">
            <Loader2 size={16} className="animate-spin" /> Checking…
          </div>
        ) : connected ? (
          <div className="min-w-0 sm:min-w-[200px] flex-1 sm:flex-none">
            <button
              type="button"
              disabled
              aria-pressed="true"
              className="w-full inline-flex items-center justify-center gap-2 min-h-[44px] px-4 rounded-xl bg-[rgba(44,59,46,0.08)] border border-[rgba(44,59,46,0.2)] text-[#2C3B2E] text-sm font-medium cursor-default"
            >
              <CheckCircle2 size={16} strokeWidth={2.5} />
              Connected · Google
            </button>
            <div className="mt-2 flex items-center gap-2 min-w-0 px-1">
              <span className="w-7 h-7 rounded-full bg-[#FFFFFF] border border-[rgba(44,59,46,0.2)] flex items-center justify-center flex-shrink-0">
                <GoogleGlyph size={14} />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-medium uppercase tracking-wide text-[#2C3B2E]">
                  Google
                </p>
                <p className="text-xs font-medium text-[#2C2621] truncate">
                  {label}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void disconnect()}
              className="mt-2 w-full inline-flex items-center justify-center gap-2 min-h-[44px] px-4 rounded-xl border border-[rgba(184,92,56,0.28)] bg-[#FFFFFF] text-[#B85C38] text-xs font-medium hover:bg-[rgba(184,92,56,0.08)] transition-colors"
            >
              <Unplug size={14} />
              {t('socials.disconnectAccount')}
            </button>
          </div>
        ) : (
          <div className="min-w-0 sm:min-w-[200px] flex-1 sm:flex-none flex flex-col gap-1.5">
            <a
              href={connectUrl}
              className="w-full inline-flex items-center justify-center gap-2 min-h-[44px] px-4 rounded-xl bg-[#FFFFFF] border border-[#E6E3DB] text-[#2C2621] text-sm font-medium  hover:bg-[#F0EFEA] transition-colors"
            >
              <GoogleGlyph size={16} />
              Connect Google Account
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
