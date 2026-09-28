/**
 * DM Chat Flow editor section — ManyChat-style keyword → Quick Reply → link.
 */

'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  GitBranch,
  Loader2,
  MessageCircle,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { adminCardClass } from '@/components/admin/AdminUi';
import AdminEmptyState from '@/components/admin/AdminEmptyState';
import { useWorkspace } from '@/context/WorkspaceContext';
import { useLanguage } from '@/lib/locale-context';
import { t } from '@/lib/i18n';

export type DmChatFlow = {
  id: string;
  title: string;
  keyword: string;
  welcomeMessage: string;
  quickReplyTitle: string;
  checkFollower: boolean;
  followerMessage: string;
  linkUrl: string;
  notFollowerMessage: string;
  isActive: boolean;
};

type FlowForm = {
  id?: string;
  title: string;
  keyword: string;
  welcomeMessage: string;
  quickReplyTitle: string;
  checkFollower: boolean;
  followerMessage: string;
  linkUrl: string;
  notFollowerMessage: string;
  isActive: boolean;
};

const EMPTY: FlowForm = {
  title: '',
  keyword: '',
  welcomeMessage: '',
  quickReplyTitle: 'Yes, send link',
  checkFollower: true,
  followerMessage: '',
  linkUrl: '',
  notFollowerMessage:
    'Please follow this account first, then tap again 💛',
  isActive: true,
};

export default function DmChatFlowSection({
  storefrontDefault,
  openSignal,
}: {
  storefrontDefault: string;
  /** Increment to open create modal from parent (Create chooser). */
  openSignal?: number;
}) {
  const { locale } = useLanguage();
  const { activeWorkspace } = useWorkspace();
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FlowForm>(EMPTY);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['dm-chat-flows', activeWorkspace.id],
    queryFn: async () => {
      const res = await fetch(
        `/api/admin/inbox/flows?workspaceId=${encodeURIComponent(activeWorkspace.id)}`,
        {
          headers: { 'x-workspace-id': activeWorkspace.id },
          credentials: 'include',
        }
      );
      const json = (await res.json().catch(() => ({}))) as {
        flows?: DmChatFlow[];
        error?: string;
        message?: string;
      };
      if (!res.ok) {
        throw new Error(json.message || json.error || 'Failed to load flows');
      }
      return json.flows ?? [];
    },
  });

  const flows = data ?? [];

  // Parent can bump openSignal to open the create modal.
  useEffect(() => {
    if (!openSignal || openSignal <= 0) return;
    setForm({
      ...EMPTY,
      title: t('dmFlowDefaultTitle', locale),
      keyword: 'Hey Eve!',
      welcomeMessage: t('dmFlowDefaultWelcome', locale),
      quickReplyTitle: t('dmFlowDefaultButton', locale),
      followerMessage: t('dmFlowDefaultFollowerMsg', locale),
      linkUrl: storefrontDefault,
      notFollowerMessage: t('dmFlowDefaultNotFollowerMsg', locale),
    });
    setModalOpen(true);
  }, [openSignal, locale, storefrontDefault]);

  const saveMutation = useMutation({
    mutationFn: async (payload: FlowForm) => {
      const res = await fetch('/api/admin/inbox/flows', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-workspace-id': activeWorkspace.id,
        },
        credentials: 'include',
        body: JSON.stringify({
          workspaceId: activeWorkspace.id,
          id: payload.id,
          title: payload.title,
          keyword: payload.keyword,
          welcomeMessage: payload.welcomeMessage,
          quickReplyTitle: payload.quickReplyTitle,
          checkFollower: payload.checkFollower,
          followerMessage: payload.followerMessage,
          linkUrl: payload.linkUrl,
          notFollowerMessage: payload.notFollowerMessage,
          isActive: payload.isActive,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        flow?: DmChatFlow;
        error?: string;
        message?: string;
      };
      if (!res.ok) {
        throw new Error(json.message || json.error || 'Save failed');
      }
      return json.flow;
    },
    onSuccess: () => {
      toast.success(t('dmFlowSaved', locale));
      setModalOpen(false);
      void qc.invalidateQueries({
        queryKey: ['dm-chat-flows', activeWorkspace.id],
      });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : t('dmFlowSaveFailed', locale));
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async (flow: DmChatFlow) => {
      const res = await fetch('/api/admin/inbox/flows', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-workspace-id': activeWorkspace.id,
        },
        credentials: 'include',
        body: JSON.stringify({
          workspaceId: activeWorkspace.id,
          id: flow.id,
          isActive: !flow.isActive,
        }),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as {
          message?: string;
          error?: string;
        };
        throw new Error(json.message || json.error || 'Toggle failed');
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: ['dm-chat-flows', activeWorkspace.id],
      });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : t('toastToggleFailed', locale));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(
        `/api/admin/inbox/flows?id=${encodeURIComponent(id)}`,
        {
          method: 'DELETE',
          headers: { 'x-workspace-id': activeWorkspace.id },
          credentials: 'include',
        }
      );
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as {
          message?: string;
          error?: string;
        };
        throw new Error(json.message || json.error || 'Delete failed');
      }
    },
    onSuccess: () => {
      toast.success(t('dmFlowDeleted', locale));
      void qc.invalidateQueries({
        queryKey: ['dm-chat-flows', activeWorkspace.id],
      });
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : t('toastDeleteAutomationFailed', locale)
      );
    },
  });

  const openCreate = () => {
    setForm({
      ...EMPTY,
      title: t('dmFlowDefaultTitle', locale),
      keyword: 'Hey Eve!',
      welcomeMessage: t('dmFlowDefaultWelcome', locale),
      quickReplyTitle: t('dmFlowDefaultButton', locale),
      followerMessage: t('dmFlowDefaultFollowerMsg', locale),
      linkUrl: storefrontDefault,
      notFollowerMessage: t('dmFlowDefaultNotFollowerMsg', locale),
    });
    setModalOpen(true);
  };

  const openEdit = (flow: DmChatFlow) => {
    setForm({
      id: flow.id,
      title: flow.title,
      keyword: flow.keyword,
      welcomeMessage: flow.welcomeMessage,
      quickReplyTitle: flow.quickReplyTitle || t('dmFlowDefaultButton', locale),
      checkFollower: flow.checkFollower,
      followerMessage: flow.followerMessage,
      linkUrl: flow.linkUrl || storefrontDefault,
      notFollowerMessage:
        flow.notFollowerMessage || t('dmFlowDefaultNotFollowerMsg', locale),
      isActive: flow.isActive,
    });
    setModalOpen(true);
  };

  return (
    <>
      <div className={`${adminCardClass} overflow-hidden`}>
        <div className="px-5 sm:px-7 py-5 border-b border-[#E6E3DB] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="font-playfair font-medium text-lg text-[#2C2621] tracking-tight inline-flex items-center gap-2">
              <GitBranch size={18} className="text-[#2C3B2E]" />
              {t('dmFlowTitle', locale)}
            </h2>
            <p className="text-sm text-[#8A857D] mt-0.5">
              {t('dmFlowSub', locale)}
            </p>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="h-11 min-h-[44px] px-4 rounded-xl bg-[#2C3B2E] text-[#F9F8F6] text-sm font-medium inline-flex items-center justify-center gap-2 hover:opacity-90"
          >
            <Plus size={16} />
            {t('dmFlowCreate', locale)}
          </button>
        </div>

        {isError ? (
          <div className="px-5 sm:px-7 py-4 text-sm text-rose-800 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <p>
              {error instanceof Error ? error.message : t('dmUnknownError', locale)}
            </p>
            <button
              type="button"
              onClick={() => void refetch()}
              className="h-11 min-h-[44px] px-4 rounded-xl bg-[#2C3B2E] text-[#F9F8F6] text-xs font-medium"
            >
              {t('dmRetry', locale)}
            </button>
          </div>
        ) : isLoading ? (
          <div className="px-5 sm:px-7 py-10 flex justify-center text-[#8A857D]">
            <Loader2 className="animate-spin" size={22} />
          </div>
        ) : flows.length === 0 ? (
          <div className="px-5 sm:px-7 py-8">
            <AdminEmptyState
              icon={MessageCircle}
              headline={t('dmFlowEmptyHeadline', locale)}
              description={t('dmFlowEmptyDesc', locale)}
              ctaLabel={t('dmFlowCreate', locale)}
              onCta={openCreate}
            />
          </div>
        ) : (
          <ul className="divide-y divide-[#E6E3DB]">
            {flows.map((flow) => (
              <li
                key={flow.id}
                className="px-5 sm:px-7 py-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-[#2C2621] truncate">
                      {flow.title}
                    </p>
                    <span
                      className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        flow.isActive
                          ? 'bg-[rgba(44,59,46,0.1)] text-[#2C3B2E]'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {flow.isActive
                        ? t('dmActive', locale)
                        : t('dmPaused', locale)}
                    </span>
                  </div>
                  <p className="text-xs text-[#8A857D] mt-1 font-mono truncate">
                    “{flow.keyword}” → {flow.quickReplyTitle}
                    {flow.checkFollower
                      ? ` → ${t('dmFlowFollowerGate', locale)}`
                      : ''}{' '}
                    → link
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={flow.isActive}
                    onClick={() => toggleMutation.mutate(flow)}
                    className={`relative h-11 min-h-[44px] w-[52px] rounded-full transition-colors ${
                      flow.isActive ? 'bg-[#2C3B2E]' : 'bg-slate-200'
                    }`}
                  >
                    <span
                      className={`absolute top-1.5 h-8 w-8 rounded-full bg-[#FFFFFF] shadow transition-transform ${
                        flow.isActive ? 'left-5' : 'left-1.5'
                      }`}
                    />
                  </button>
                  <button
                    type="button"
                    onClick={() => openEdit(flow)}
                    className="h-11 min-h-[44px] min-w-[44px] px-3 rounded-xl border border-[#E6E3DB] bg-[#FFFFFF] text-[#2C2621] inline-flex items-center justify-center gap-1.5 text-xs font-medium"
                  >
                    <Pencil size={14} /> {t('dmEdit', locale)}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(t('dmFlowDeleteConfirm', locale))) {
                        deleteMutation.mutate(flow.id);
                      }
                    }}
                    className="h-11 min-h-[44px] min-w-[44px] px-3 rounded-xl border border-rose-100 bg-rose-50 text-rose-700 inline-flex items-center justify-center gap-1.5 text-xs font-medium"
                  >
                    <Trash2 size={14} /> {t('dmDelete', locale)}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <button
            type="button"
            aria-label={t('dmClose', locale)}
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            onClick={() => !saveMutation.isPending && setModalOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            className="relative z-10 w-full sm:max-w-lg max-h-[92vh] overflow-y-auto bg-[#FFFFFF] rounded-t-3xl sm:rounded-xl shadow-2xl p-5 sm:p-6 space-y-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-mono font-medium uppercase tracking-widest text-[#8A857D]">
                  {t('dmFlowModalEyebrow', locale)}
                </p>
                <h3 className="font-playfair font-medium text-xl text-[#2C2621] mt-1">
                  {form.id
                    ? t('dmFlowEditTitle', locale)
                    : t('dmFlowCreateTitle', locale)}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="h-11 w-11 min-h-[44px] min-w-[44px] rounded-xl bg-[#F0EFEA] inline-flex items-center justify-center"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-[#8A857D] leading-relaxed rounded-xl bg-[#F0EFEA]/80 border border-[#E6E3DB] px-3 py-2.5">
              {t('dmFlowWizardHint', locale)}
            </p>

            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-[#8A857D]">
                {t('dmFieldTitle', locale)}
              </span>
              <input
                value={form.title}
                onChange={(e) =>
                  setForm((f) => ({ ...f, title: e.target.value }))
                }
                className="w-full h-11 min-h-[44px] rounded-xl border border-[#E6E3DB] px-3 text-sm"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-[#8A857D]">
                {t('dmFlowKeyword', locale)}
              </span>
              <input
                value={form.keyword}
                onChange={(e) =>
                  setForm((f) => ({ ...f, keyword: e.target.value }))
                }
                placeholder="Hey Eve!"
                className="w-full h-11 min-h-[44px] rounded-xl border border-[#E6E3DB] px-3 text-sm font-mono"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-[#8A857D]">
                {t('dmFlowWelcome', locale)}
              </span>
              <textarea
                value={form.welcomeMessage}
                onChange={(e) =>
                  setForm((f) => ({ ...f, welcomeMessage: e.target.value }))
                }
                rows={3}
                className="w-full rounded-xl border border-[#E6E3DB] px-3 py-2.5 text-sm resize-y min-h-[88px]"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-[#8A857D]">
                {t('dmFlowQuickReply', locale)}
              </span>
              <input
                value={form.quickReplyTitle}
                onChange={(e) =>
                  setForm((f) => ({ ...f, quickReplyTitle: e.target.value }))
                }
                maxLength={20}
                className="w-full h-11 min-h-[44px] rounded-xl border border-[#E6E3DB] px-3 text-sm"
              />
            </label>

            <label className="flex items-start gap-3 cursor-pointer rounded-xl border border-[#E6E3DB] bg-[#F0EFEA]/80 px-4 py-3">
              <input
                type="checkbox"
                checked={form.checkFollower}
                onChange={(e) =>
                  setForm((f) => ({ ...f, checkFollower: e.target.checked }))
                }
                className="mt-1 h-4 w-4 rounded border-[#E6E3DB]"
              />
              <span className="text-sm font-medium text-[#2C2621]">
                {t('dmFlowCheckFollower', locale)}
              </span>
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-[#8A857D]">
                {t('dmFlowFinalMessage', locale)}
              </span>
              <textarea
                value={form.followerMessage}
                onChange={(e) =>
                  setForm((f) => ({ ...f, followerMessage: e.target.value }))
                }
                rows={3}
                className="w-full rounded-xl border border-[#E6E3DB] px-3 py-2.5 text-sm resize-y min-h-[88px]"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-[#8A857D]">
                {t('dmFlowLinkUrl', locale)}
              </span>
              <input
                value={form.linkUrl}
                onChange={(e) =>
                  setForm((f) => ({ ...f, linkUrl: e.target.value }))
                }
                placeholder={storefrontDefault}
                className="w-full h-11 min-h-[44px] rounded-xl border border-[#E6E3DB] px-3 text-sm font-mono"
              />
            </label>

            {form.checkFollower ? (
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-[#8A857D]">
                  {t('dmFlowNotFollowerMessage', locale)}
                </span>
                <textarea
                  value={form.notFollowerMessage}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      notFollowerMessage: e.target.value,
                    }))
                  }
                  rows={2}
                  className="w-full rounded-xl border border-[#E6E3DB] px-3 py-2.5 text-sm resize-y min-h-[72px]"
                />
              </label>
            ) : null}

            <button
              type="button"
              disabled={saveMutation.isPending}
              onClick={() => saveMutation.mutate(form)}
              className="h-11 min-h-[44px] w-full rounded-xl bg-[#2C3B2E] text-[#F9F8F6] text-sm font-medium inline-flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {saveMutation.isPending ? (
                <Loader2 className="animate-spin" size={16} />
              ) : null}
              {form.id ? t('dmSaveChanges', locale) : t('dmFlowCreateBtn', locale)}
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
