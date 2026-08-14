'use client';

import { useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Mail,
  Users,
  Percent,
  Send,
  Download,
  Search,
  Plus,
  X,
  Loader2,
  CheckCircle2,
  Filter,
  ImageIcon,
  Upload,
  GripVertical,
  ArrowUp,
  ArrowDown,
  Eye,
  ChevronRight,
  MousePointerClick,
  Ban,
  AlertTriangle,
  Smartphone,
  Link2,
  BarChart3,
  Zap,
  Pause,
  Play,
  Pencil,
} from 'lucide-react';
import { useLocale } from '@/lib/locale-context';
import { t } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import useUpload from '@/utils/useUpload';
import type {
  CommunityAutomationEmail,
  EmailAutomation,
  EmailAutomationTrigger,
  EmailBroadcast,
  EmailSubscriber,
} from '@/lib/mock-email-crm';
import {
  AUTOMATION_TRIGGER_OPTIONS,
  AUDIENCE_OPTIONS,
  getBroadcastAnalytics,
  listCommunityAutomationEmails,
  listEmailAutomations,
} from '@/lib/mock-email-crm';
import { useSubscription } from '@/components/common/useSubscription';
import UpgradeModal from '@/components/common/UpgradeModal';
import { PlanLockBadge } from '@/components/common/FeatureGate';
import { useWorkspace } from '@/context/WorkspaceContext';
import AdminEmptyState from '@/components/admin/AdminEmptyState';
import { toast } from 'sonner';

type EmailResponse = {
  total_subscribers: number;
  average_open_rate: number;
  total_broadcasts: number;
  subscribers: EmailSubscriber[];
  broadcasts: EmailBroadcast[];
  automations?: EmailAutomation[];
  community_emails?: CommunityAutomationEmail[];
  tags: string[];
  audiences: typeof AUDIENCE_OPTIONS;
  demo?: boolean;
  email_provider_ready?: boolean;
  error?: string;
};

function sourceBadgeClass(source: string) {
  if (source.includes('ebook') || source.includes('E-Book'))
    return 'bg-blue-50 text-blue-700';
  if (source.includes('webinar') || source.includes('Webinar'))
    return 'bg-violet-50 text-violet-700';
  if (source.includes('vip') || source.includes('VIP'))
    return 'bg-amber-50 text-amber-700';
  if (source.includes('store') || source.includes('Store'))
    return 'bg-[#f2eeff] text-[var(--nc-coral)]';
  return 'bg-zinc-100 text-zinc-600';
}

type ImagePlacement = 'top' | 'middle' | 'bottom';

function formatDate(iso: string, locale: string) {
  try {
    return new Date(iso).toLocaleDateString(
      locale === 'en' ? 'en-GB' : 'sv-SE',
      { year: 'numeric', month: 'short', day: 'numeric' }
    );
  } catch {
    return '—';
  }
}

function splitBodyForMiddle(text: string): [string, string] {
  const parts = text.split(/\n\n+/);
  if (parts.length <= 1) return [text, ''];
  return [parts[0], parts.slice(1).join('\n\n')];
}

function EmailPreview({
  subject,
  body,
  imageUrl,
  imagePlacement,
}: {
  subject: string;
  body: string;
  imageUrl: string | null;
  imagePlacement: ImagePlacement;
}) {
  const previewBody = body.replace(/\{first_name\}/gi, 'Emma') || 'Ditt meddelande…';
  const [before, after] = splitBodyForMiddle(previewBody);

  const ImageBlock = imageUrl ? (
    <div className="my-3 rounded-lg overflow-hidden border border-zinc-100">
      <img src={imageUrl} alt="" className="w-full max-h-40 object-cover" />
    </div>
  ) : null;

  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 overflow-hidden">
      <div className="px-3 py-2 border-b border-zinc-200 bg-white flex items-center gap-2">
        <Eye size={12} className="text-zinc-400" />
        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
          Preview
        </p>
      </div>
      <div className="p-4 bg-white m-2 rounded-xl shadow-sm">
        <p className="text-[10px] font-bold text-zinc-400 mb-1">Subject</p>
        <p className="text-sm font-black text-[#2c3340] mb-3">
          {subject.trim() || '(No subject)'}
        </p>
        <div className="h-px bg-zinc-100 mb-3" />
        {imagePlacement === 'top' && ImageBlock}
        <p className="text-sm text-zinc-700 whitespace-pre-wrap leading-relaxed">
          {imagePlacement === 'middle' ? before : previewBody}
        </p>
        {imagePlacement === 'middle' && ImageBlock}
        {imagePlacement === 'middle' && after && (
          <p className="text-sm text-zinc-700 whitespace-pre-wrap leading-relaxed mt-3">
            {after}
          </p>
        )}
        {imagePlacement === 'bottom' && ImageBlock}
      </div>
    </div>
  );
}

export default function EmailAdminPanel() {
  const { locale } = useLocale();
  const queryClient = useQueryClient();
  const { activeWorkspace } = useWorkspace();
  const {
    hasFeature,
    requestUpgrade,
    upgradeOpen,
    setUpgradeOpen,
    upgradeTarget,
  } = useSubscription();
  const canBroadcast = hasFeature('emailBroadcasts');
  // Only scope to a real community id — mock/0 ids would hide all creator-level contacts.
  const rawCommunityId = Number(activeWorkspace.community?.community_id);
  const workspaceCommunityId =
    Number.isFinite(rawCommunityId) && rawCommunityId > 0 ? rawCommunityId : null;
  const [tag, setTag] = useState('all');
  const [q, setQ] = useState('');
  const [composerOpen, setComposerOpen] = useState(false);
  const [analyticsBroadcast, setAnalyticsBroadcast] = useState<EmailBroadcast | null>(
    null
  );
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState(
    'Hi {first_name}!\n\nWe have something new for you in the community.\n\nBest'
  );
  const [audience, setAudience] = useState('all');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imagePlacement, setImagePlacement] = useState<ImagePlacement>('middle');
  const [fileDragOver, setFileDragOver] = useState(false);
  const [slotDragOver, setSlotDragOver] = useState<ImagePlacement | null>(null);
  const [flash, setFlash] = useState('');
  const [upload, { loading: uploading }] = useUpload();
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [automationEditorOpen, setAutomationEditorOpen] = useState(false);
  const [editingAutomationId, setEditingAutomationId] = useState<string | null>(null);
  const [autoName, setAutoName] = useState('');
  const [autoDescription, setAutoDescription] = useState('');
  const [autoTrigger, setAutoTrigger] =
    useState<EmailAutomationTrigger>('purchase_community_access');
  const [autoSubject, setAutoSubject] = useState('');
  const [autoBody, setAutoBody] = useState('');
  const [autoStatus, setAutoStatus] = useState<'active' | 'paused'>('active');

  // Workspace CRM list — optional community scope when a real community is linked.
  const { data, isLoading } = useQuery<EmailResponse>({
    queryKey: ['admin-email', tag, q, workspaceCommunityId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (tag && tag !== 'all') params.set('tag', tag);
      if (q.trim()) params.set('q', q.trim());
      if (workspaceCommunityId) {
        params.set('community_id', String(workspaceCommunityId));
      }
      const r = await fetch(`/api/admin/email?${params.toString()}`);
      if (!r.ok) throw new Error('Failed');
      return r.json();
    },
  });

  const handleImageFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setFlash('Only image files are supported');
      setTimeout(() => setFlash(''), 2000);
      return;
    }
    const result = await upload({ file });
    if (result.url) {
      setImageUrl(result.url);
      return;
    }
    setImageUrl(URL.createObjectURL(file));
  };

  const onFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setFileDragOver(false);
    // Ignore internal image reposition drops.
    if (e.dataTransfer.types.includes('application/x-email-image')) return;
    const file = e.dataTransfer.files?.[0];
    if (file) void handleImageFile(file);
  };

  const moveImage = (dir: -1 | 1) => {
    const order: ImagePlacement[] = ['top', 'middle', 'bottom'];
    const idx = order.indexOf(imagePlacement);
    const next = order[Math.max(0, Math.min(order.length - 1, idx + dir))];
    setImagePlacement(next);
  };

  const sendMutation = useMutation({
    mutationFn: async (action: 'send' | 'test') => {
      const r = await fetch('/api/admin/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId: activeWorkspace.id,
          communityId: workspaceCommunityId,
          subject,
          bodyContent: body,
          recipientFilter: audience,
          test: action === 'test',
          imageUrl,
        }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        const msg =
          typeof data.message === 'string'
            ? data.message
            : typeof data.error === 'string'
              ? data.error
              : 'Failed to send';
        throw new Error(msg);
      }
      return data;
    },
    onSuccess: (_res, action) => {
      queryClient.invalidateQueries({ queryKey: ['admin-email'] });
      setFlash(action === 'test' ? 'Provmejl skickat!' : 'Utskick skickat!');
      setTimeout(() => setFlash(''), 2500);
      if (action === 'send') {
        setComposerOpen(false);
        setSubject('');
        setImageUrl(null);
        setImagePlacement('middle');
      }
    },
    onError: (err) => {
      const msg = err instanceof Error ? err.message : 'Send failed';
      setFlash(msg);
      setTimeout(() => setFlash(''), 4500);
    },
  });

  const importMembersMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch('/api/admin/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sync_community_members',
          community_id: workspaceCommunityId,
        }),
      });
      const payload = await r.json().catch(() => ({}));
      if (!r.ok) {
        throw new Error(
          typeof payload.error === 'string' ? payload.error : 'Import failed'
        );
      }
      return payload as { imported?: number };
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['admin-email'] });
      const n = Number(res.imported ?? 0);
      setFlash(
        n > 0
          ? `Imported ${n} community member${n === 1 ? '' : 's'} into Email CRM`
          : 'No community members to import yet'
      );
      setTimeout(() => setFlash(''), 3500);
    },
    onError: (err) => {
      setFlash(err instanceof Error ? err.message : 'Import failed');
      setTimeout(() => setFlash(''), 4500);
    },
  });

  const subscribers = data?.subscribers ?? [];
  const broadcasts = data?.broadcasts ?? [];
  // Community-scoped automations + sent emails (fallback if API omits them).
  const automations = useMemo(() => {
    if (data?.automations) return data.automations;
    return listEmailAutomations(
      workspaceCommunityId ? { community_id: workspaceCommunityId } : undefined
    );
  }, [data?.automations, workspaceCommunityId]);
  const communityEmails = useMemo(() => {
    if (data?.community_emails) return data.community_emails;
    return listCommunityAutomationEmails(
      workspaceCommunityId ? { community_id: workspaceCommunityId } : undefined
    );
  }, [data?.community_emails, workspaceCommunityId]);
  const tags = data?.tags ?? ['all'];
  const analytics = analyticsBroadcast
    ? getBroadcastAnalytics(analyticsBroadcast)
    : null;
  const maxHourOpens = analytics
    ? Math.max(...analytics.opens_by_hour.map((h) => h.opens), 1)
    : 1;

  const openNewAutomation = () => {
    const def = AUTOMATION_TRIGGER_OPTIONS[0];
    setEditingAutomationId(null);
    setAutoName(def.defaultName);
    setAutoDescription('');
    setAutoTrigger(def.value);
    setAutoSubject(def.defaultSubject);
    setAutoBody(def.defaultBody);
    setAutoStatus('active');
    setAutomationEditorOpen(true);
  };

  const openEditAutomation = (auto: EmailAutomation) => {
    setEditingAutomationId(auto.id);
    setAutoName(auto.name);
    setAutoDescription(auto.description);
    setAutoTrigger(auto.trigger);
    setAutoSubject(auto.subject);
    setAutoBody(auto.body || '');
    setAutoStatus(auto.status);
    setAutomationEditorOpen(true);
  };

  const applyTriggerDefaults = (trigger: EmailAutomationTrigger) => {
    const def =
      AUTOMATION_TRIGGER_OPTIONS.find((o) => o.value === trigger) ??
      AUTOMATION_TRIGGER_OPTIONS[0];
    setAutoTrigger(trigger);
    // Only fill empty fields when switching trigger on a new automation.
    if (!editingAutomationId) {
      setAutoName(def.defaultName);
      setAutoSubject(def.defaultSubject);
      setAutoBody(def.defaultBody);
    }
  };

  const toggleAutomation = useMutation({
    mutationFn: async (input: { id: string; status: 'active' | 'paused' }) => {
      const r = await fetch('/api/admin/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle_automation',
          id: input.id,
          status: input.status,
        }),
      });
      if (!r.ok) throw new Error('Failed');
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-email'] });
    },
  });

  const upsertAutomation = useMutation({
    mutationFn: async () => {
      const name = autoName.trim();
      const subject = autoSubject.trim();
      const bodyText = autoBody.trim();
      if (!name || !subject || !bodyText) {
        throw new Error('Name, subject, and body are required');
      }
      const communityId =
        Number.isFinite(Number(workspaceCommunityId)) &&
        Number(workspaceCommunityId) > 0
          ? Number(workspaceCommunityId)
          : null;

      const r = await fetch('/api/admin/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: 'upsert_automation',
          id: editingAutomationId ?? undefined,
          name,
          description: autoDescription.trim(),
          trigger: autoTrigger,
          subject,
          body: bodyText,
          status: autoStatus,
          community_id: communityId,
          workspaceId: activeWorkspace.id,
        }),
      });
      const payload = await r.json().catch(() => ({}));
      if (!r.ok) {
        throw new Error(
          typeof payload.error === 'string'
            ? payload.error
            : typeof payload.message === 'string'
              ? payload.message
              : 'Failed to save automation'
        );
      }
      return payload as { success?: boolean; automation?: EmailAutomation };
    },
    onSuccess: async (payload) => {
      await queryClient.invalidateQueries({ queryKey: ['admin-email'] });
      setAutomationEditorOpen(false);
      setEditingAutomationId(null);
      const savedName = payload.automation?.name || autoName.trim();
      toast.success(t('automationSaved', locale), {
        description: savedName,
      });
      setFlash(t('automationSaved', locale));
      setTimeout(() => setFlash(''), 2200);
    },
    onError: (err) => {
      const msg =
        err instanceof Error ? err.message : 'Failed to save automation';
      toast.error(msg);
      setFlash(msg);
      setTimeout(() => setFlash(''), 4500);
    },
  });

  const exportCsv = () => {
    const header = 'Name,Email,Source,Tags,Subscribed\n';
    const rows = subscribers
      .map(
        (s) =>
          `"${s.name}","${s.email}","${s.source_label}","${s.tags.join('; ')}","${s.subscribed_at.slice(0, 10)}"`
      )
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'email-list.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const canSend = Boolean(subject.trim() && body.trim()) && !sendMutation.isPending;

  const stats = useMemo(
    () => [
      {
        label: t('totalSubscribers', locale),
        value: data?.total_subscribers ?? activeWorkspace.email.total_subscribers,
        icon: Users,
        color: '#3B82F6',
      },
      {
        label: t('averageOpenRate', locale),
        value: `${data?.average_open_rate ?? activeWorkspace.email.average_open_rate}%`,
        icon: Percent,
        color: '#10B981',
      },
      {
        label: t('broadcastsSent', locale),
        value: data?.total_broadcasts ?? activeWorkspace.email.broadcasts_sent,
        icon: Send,
        color: '#9b8afb',
      },
    ],
    [data, activeWorkspace.email, locale]
  );

  if (isLoading) {
    return (
      <div className="nc-glass rounded-[1.5rem] p-10 text-center text-sm text-zinc-400">
        {t('loading', locale)}
      </div>
    );
  }

  const subscriberCount = data?.total_subscribers ?? 0;

  return (
    <div className="space-y-6">
      {flash && !composerOpen && (
        <div className="rounded-xl border border-emerald-100 bg-emerald-50 text-emerald-800 px-4 py-3 text-sm font-semibold inline-flex items-center gap-2">
          <CheckCircle2 size={14} /> {flash}
        </div>
      )}
      {data?.email_provider_ready === false && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 text-amber-900 px-4 py-3 text-sm">
          <p className="font-semibold">Email delivery is not configured</p>
          <p className="mt-1 text-amber-800/90">
            Add <code className="font-mono text-xs">RESEND_API_KEY</code> (and a verified{' '}
            <code className="font-mono text-xs">RESEND_FROM_EMAIL</code>) to{' '}
            <code className="font-mono text-xs">apps/web/.env.local</code>, then restart the
            dev server. Broadcasts will stay blocked until Resend is connected.
          </p>
        </div>
      )}
      {!data?.demo && subscriberCount === 0 && (
        <AdminEmptyState
          icon={Users}
          headline="No subscribers yet"
          description="Import community members, or wait for joins / purchases / RSVPs. Open rate stays at 0% until Resend reports opens."
          ctaLabel="+ Import Community Members"
          onCta={() => {
            if (!importMembersMutation.isPending && workspaceCommunityId) {
              importMembersMutation.mutate();
            }
          }}
        />
      )}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-slate-400">
            Email CRM
          </p>
          <h1 className="font-clikd-wordmark font-extrabold text-[28px] sm:text-[32px] leading-tight text-slate-900 tracking-tight mt-1 flex items-center gap-2">
            {t('emailCrmTitle', locale)}
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            {activeWorkspace.name} ({activeWorkspace.handle}) — {t('workspaceScopedData', locale)}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            disabled={importMembersMutation.isPending || !workspaceCommunityId}
            onClick={() => importMembersMutation.mutate()}
            className="inline-flex items-center justify-center gap-2 h-10 min-h-[40px] px-4 rounded-xl border border-slate-200 bg-white text-slate-800 text-xs font-semibold hover:bg-slate-50 disabled:opacity-50"
          >
            {importMembersMutation.isPending ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Users size={14} />
            )}
            Sync members
          </button>
          <button
            type="button"
            onClick={() => {
              if (!canBroadcast) {
                requestUpgrade('creator');
                return;
              }
              setComposerOpen(true);
            }}
            className="inline-flex items-center justify-center gap-2 h-10 min-h-[40px] px-4 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors"
          >
            <Plus size={14} /> {t('createEmailBroadcast', locale).replace(/^\+\s*/, '')}
            {!canBroadcast && <PlanLockBadge minPlan="creator" className="ml-1 normal-case" />}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.label}
              className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-[0_1px_2px_rgba(15,23,42,0.03)]"
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-mono font-bold uppercase tracking-[0.12em] text-slate-400">
                  {s.label}
                </p>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-slate-50 text-slate-500">
                  <Icon size={14} />
                </div>
              </div>
              <p className="font-clikd-wordmark font-extrabold text-2xl text-slate-900 tabular-nums">
                {s.value}
              </p>
            </div>
          );
        })}
      </div>

      {/* Community emails — purchase unlocks + member automations */}
      <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
        <div className="px-4 sm:px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Zap size={14} className="text-[#9089F0]" />
              {t('emailAutomations', locale)}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {t('emailAutomationsSub', locale)}
              <span className="text-slate-300"> · </span>
              {activeWorkspace.community.community_name}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wide text-slate-400 bg-slate-50 border border-slate-100 px-2 py-1 rounded-lg">
              {communityEmails.length} {t('automationSent', locale).toLowerCase()}
            </span>
            <button
              type="button"
              onClick={openNewAutomation}
              className="inline-flex items-center gap-1.5 h-11 min-h-[44px] px-3 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors"
            >
              <Plus size={13} /> {t('addAutomation', locale)}
            </button>
          </div>
        </div>

        {/* Active rules for this community */}
        <div className="px-4 sm:px-5 py-3 border-b border-slate-100 bg-slate-50/60">
          <p className="text-[10px] font-mono font-bold uppercase tracking-[0.12em] text-slate-400 mb-2">
            {t('automationRules', locale)}
          </p>
          <div className="flex flex-col gap-2">
            {automations.length === 0 ? (
              <p className="text-xs text-slate-400 py-2">{t('noAutomationsYet', locale)}</p>
            ) : (
              automations.map((auto) => {
                const active = auto.status === 'active';
                return (
                  <div
                    key={auto.id}
                    className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 rounded-xl border border-slate-200/80 bg-white px-3 py-2.5"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-xs font-bold text-slate-900 truncate">
                          {auto.name}
                        </p>
                        <span
                          className={`inline-flex text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-md ${
                            active
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {active
                            ? t('automationActive', locale)
                            : t('automationPaused', locale)}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 font-medium truncate mt-0.5">
                        {auto.trigger_label}
                        <span className="mx-1 text-slate-300">·</span>
                        {auto.subject}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 self-start sm:self-center">
                      <button
                        type="button"
                        onClick={() => openEditAutomation(auto)}
                        className="inline-flex items-center gap-1.5 h-10 min-h-[40px] px-3 rounded-xl text-[11px] font-semibold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <Pencil size={11} /> {t('editAutomation', locale)}
                      </button>
                      <button
                        type="button"
                        disabled={toggleAutomation.isPending}
                        onClick={() =>
                          toggleAutomation.mutate({
                            id: auto.id,
                            status: active ? 'paused' : 'active',
                          })
                        }
                        className={`inline-flex items-center gap-1.5 h-10 min-h-[40px] px-3 rounded-xl text-[11px] font-semibold border transition-colors ${
                          active
                            ? 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                            : 'bg-slate-900 text-white border-slate-900 hover:bg-slate-800'
                        }`}
                      >
                        {active ? <Pause size={11} /> : <Play size={11} />}
                        {active
                          ? t('automationPause', locale)
                          : t('automationResume', locale)}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Recent community automation emails */}
        <div className="px-4 sm:px-5 py-3 border-b border-slate-50">
          <p className="text-[10px] font-mono font-bold uppercase tracking-[0.12em] text-slate-400">
            {t('communityEmailsRecent', locale)}
          </p>
        </div>
        <div className="divide-y divide-slate-100">
          {communityEmails.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-400">
              {t('communityEmailsEmpty', locale)}
            </div>
          ) : (
            communityEmails.map((email) => {
              const isPurchase = email.kind === 'purchase_access';
              return (
                <div
                  key={email.id}
                  className="px-4 sm:px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3"
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div
                      className={`w-10 h-10 min-h-[40px] min-w-[40px] rounded-xl flex items-center justify-center flex-shrink-0 ${
                        isPurchase
                          ? 'bg-[#E9D5FF]/70 text-[#1a1848]'
                          : 'bg-emerald-50 text-emerald-700'
                      }`}
                    >
                      <Mail size={15} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-0.5">
                        <span
                          className={`inline-flex text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-md ${
                            isPurchase
                              ? 'bg-[#E9D5FF]/80 text-[#1a1848]'
                              : 'bg-emerald-50 text-emerald-700'
                          }`}
                        >
                          {isPurchase
                            ? t('purchaseAccessEmail', locale)
                            : t('memberAutoEmail', locale)}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400">
                          {formatDate(email.sent_at, locale)}
                        </span>
                      </div>
                      <p className="text-sm font-black text-slate-900 truncate">
                        {email.subject}
                      </p>
                      <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
                        {email.recipient_name} · {email.recipient_email}
                        {email.product_title ? (
                          <>
                            <span className="mx-1 text-slate-300">·</span>
                            {email.product_title}
                          </>
                        ) : null}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Add / edit automation drawer */}
      {automationEditorOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-40"
            onClick={() => setAutomationEditorOpen(false)}
          />
          <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white z-50 shadow-2xl flex flex-col">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3 flex-shrink-0">
              <div>
                <p className="text-[10px] font-mono font-bold uppercase tracking-[0.12em] text-slate-400">
                  {t('emailAutomations', locale)}
                </p>
                <h3 className="text-sm font-black text-slate-900 mt-0.5">
                  {editingAutomationId
                    ? t('editAutomation', locale)
                    : t('addAutomation', locale)}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setAutomationEditorOpen(false)}
                className="h-11 w-11 min-h-[44px] min-w-[44px] rounded-xl hover:bg-slate-100 inline-flex items-center justify-center"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
              <label className="block space-y-1.5">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wide text-slate-400">
                  {t('automationTrigger', locale)}
                </span>
                <select
                  value={autoTrigger}
                  onChange={(e) =>
                    applyTriggerDefaults(e.target.value as EmailAutomationTrigger)
                  }
                  className="w-full h-11 min-h-[44px] rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-800 focus:outline-none focus:border-slate-400"
                >
                  {AUTOMATION_TRIGGER_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-1.5">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wide text-slate-400">
                  {t('automationName', locale)}
                </span>
                <Input
                  value={autoName}
                  onChange={(e) => setAutoName(e.target.value)}
                  className="h-11 min-h-[44px] rounded-xl bg-slate-50 border-slate-200"
                />
              </label>

              <label className="block space-y-1.5">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wide text-slate-400">
                  {t('automationDescription', locale)}
                </span>
                <Input
                  value={autoDescription}
                  onChange={(e) => setAutoDescription(e.target.value)}
                  placeholder={t('optionalLabel', locale)}
                  className="h-11 min-h-[44px] rounded-xl bg-slate-50 border-slate-200"
                />
              </label>

              <label className="block space-y-1.5">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wide text-slate-400">
                  {t('automationSubject', locale)}
                </span>
                <Input
                  value={autoSubject}
                  onChange={(e) => setAutoSubject(e.target.value)}
                  className="h-11 min-h-[44px] rounded-xl bg-slate-50 border-slate-200"
                />
              </label>

              <label className="block space-y-1.5">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wide text-slate-400">
                  {t('automationBody', locale)}
                </span>
                <textarea
                  value={autoBody}
                  onChange={(e) => setAutoBody(e.target.value)}
                  rows={8}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-slate-400 resize-none min-h-[160px]"
                />
                <p className="text-[10px] text-slate-400 font-medium">
                  {t('mergeTagsHint', locale)}
                </p>
              </label>

              <div className="space-y-1.5">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wide text-slate-400">
                  {t('statusLabel', locale)}
                </span>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setAutoStatus('active')}
                    className={`h-11 min-h-[44px] px-3 rounded-xl text-xs font-semibold border transition-colors ${
                      autoStatus === 'active'
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-600 border-slate-200'
                    }`}
                  >
                    {t('automationActive', locale)}
                  </button>
                  <button
                    type="button"
                    onClick={() => setAutoStatus('paused')}
                    className={`h-11 min-h-[44px] px-3 rounded-xl text-xs font-semibold border transition-colors ${
                      autoStatus === 'paused'
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-600 border-slate-200'
                    }`}
                  >
                    {t('automationPaused', locale)}
                  </button>
                </div>
              </div>
            </div>

            <div className="px-5 py-4 border-t border-slate-100 flex-shrink-0 space-y-2">
              {flash && upsertAutomation.isError ? (
                <p className="text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">
                  {flash}
                </p>
              ) : null}
              <button
                type="button"
                disabled={
                  !autoName.trim() ||
                  !autoSubject.trim() ||
                  !autoBody.trim() ||
                  upsertAutomation.isPending
                }
                onClick={() => upsertAutomation.mutate()}
                className="w-full h-11 min-h-[44px] rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2"
              >
                {upsertAutomation.isPending ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <CheckCircle2 size={14} />
                )}
                {upsertAutomation.isPending
                  ? t('loading', locale)
                  : t('saveAutomation', locale)}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Directory */}
      <div className="nc-glass rounded-[1.5rem] overflow-hidden">
        <div className="px-4 sm:px-5 py-4 border-b border-zinc-50 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-black text-[#2c3340]">
              {t('subscriberDirectory', locale)}
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              {subscribers.length} {t('members', locale).toLowerCase()}
              {data?.demo ? ' · Demo' : ''}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <div className="relative">
              <Search
                size={13}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
              />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t('searchNameOrEmail', locale)}
                className="pl-9 h-11 min-h-[44px] rounded-xl bg-zinc-50 border-zinc-100 text-sm w-full sm:w-56"
              />
            </div>
            <div className="relative">
              <Filter
                size={13}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
              />
              <select
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                className="h-11 min-h-[44px] pl-9 pr-8 rounded-xl border border-zinc-100 bg-zinc-50 text-sm font-bold text-zinc-700 focus:outline-none appearance-none"
              >
                {tags.map((tg) => (
                  <option key={tg} value={tg === 'all' ? 'all' : tg}>
                    {tg === 'all' ? t('allTags', locale) : tg}
                  </option>
                ))}
              </select>
            </div>
            <Button
              type="button"
              onClick={exportCsv}
              className="h-11 min-h-[44px] rounded-xl bg-[var(--nc-coral)] text-white font-bold text-xs gap-1.5"
            >
              <Download size={12} /> {t('exportCsv', locale)}
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[640px]">
            <thead>
              <tr className="border-b border-zinc-50 text-[10px] font-black uppercase tracking-widest text-zinc-400">
                <th className="px-5 py-3 font-black">{t('memberCol', locale)}</th>
                <th className="px-3 py-3 font-black">{t('email', locale)}</th>
                <th className="px-3 py-3 font-black">{t('sourceCol', locale)}</th>
                <th className="px-5 py-3 font-black text-right">{t('subscribedDate', locale)}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {subscribers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-12 text-center text-sm text-zinc-400">
                    No subscribers match this filter
                  </td>
                </tr>
              ) : (
                subscribers.map((s) => (
                  <tr key={s.id} className="hover:bg-zinc-50/60">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-zinc-100 flex items-center justify-center text-xs font-black text-zinc-600 flex-shrink-0 overflow-hidden">
                          {s.image ? (
                            <img src={s.image} alt="" className="w-full h-full object-cover" />
                          ) : (
                            s.name?.[0] ?? '?'
                          )}
                        </div>
                        <p className="text-sm font-black text-[#2c3340] truncate">{s.name}</p>
                      </div>
                    </td>
                    <td className="px-3 py-3.5 text-sm text-zinc-500 truncate max-w-[200px]">
                      {s.email}
                    </td>
                    <td className="px-3 py-3.5">
                      <span
                        className={`inline-flex text-[10px] font-black px-2 py-1 rounded-full ${sourceBadgeClass(s.source)}`}
                      >
                        {s.source_label}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right text-xs font-bold text-zinc-400">
                      {formatDate(s.subscribed_at, locale)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sent history */}
      <div className="nc-glass rounded-[1.5rem] overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-50">
          <h3 className="text-sm font-black text-[#2c3340]">
            {t('sentBroadcastsTitle', locale)}
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            {t('sentBroadcastsSub', locale)}
          </p>
        </div>
        <div className="divide-y divide-zinc-50">
          {broadcasts.filter((b) => b.status === 'sent').length === 0 ? (
            <div className="py-10 text-center text-sm text-zinc-400">
              {t('noBroadcastsYet', locale)}
            </div>
          ) : (
            broadcasts
              .filter((b) => b.status === 'sent')
              .map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setAnalyticsBroadcast(b)}
                  className="w-full text-left px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3 hover:bg-zinc-50/80 transition-colors min-h-[44px]"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-[#2c3340] truncate">{b.subject}</p>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {formatDate(b.sent_at, locale)} · {b.audience_label} ·{' '}
                      {b.recipient_count} mottagare
                      {b.image_url ? ' · med bild' : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <div className="text-right">
                      <p className="text-sm font-black text-[#2c3340]">{b.open_rate}%</p>
                      <p className="text-[10px] font-bold text-zinc-400 uppercase">Open</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-[#2c3340]">{b.click_rate}%</p>
                      <p className="text-[10px] font-bold text-zinc-400 uppercase">Click</p>
                    </div>
                    <span className="h-11 w-11 min-h-[44px] min-w-[44px] rounded-xl bg-zinc-50 flex items-center justify-center text-zinc-400">
                      <ChevronRight size={16} />
                    </span>
                  </div>
                </button>
              ))
          )}
        </div>
      </div>

      {/* Broadcast analytics drawer */}
      {analyticsBroadcast && analytics && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-40"
            onClick={() => setAnalyticsBroadcast(null)}
          />
          <div className="fixed right-0 top-0 h-full w-full max-w-lg bg-white shadow-2xl z-50 flex flex-col">
            <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-zinc-100">
              <div className="min-w-0">
                <p className="text-[10px] font-mono font-extrabold uppercase tracking-widest text-zinc-400 mb-1">
                  Analytics
                </p>
                <h3 className="text-sm font-black text-[#2c3340] leading-snug">
                  {analyticsBroadcast.subject}
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  {formatDate(analyticsBroadcast.sent_at, locale)} ·{' '}
                  {analyticsBroadcast.audience_label}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAnalyticsBroadcast(null)}
                className="h-11 w-11 min-h-[44px] min-w-[44px] rounded-xl bg-zinc-50 flex items-center justify-center flex-shrink-0"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
              {/* Key rates */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  {
                    label: 'Open rate',
                    value: `${analytics.open_rate}%`,
                    sub: `${analytics.unique_opens} unika`,
                    icon: Eye,
                  },
                  {
                    label: 'Klickfrekvens',
                    value: `${analytics.click_rate}%`,
                    sub: `${analytics.unique_clicks} unika`,
                    icon: MousePointerClick,
                  },
                  {
                    label: 'Click-to-open',
                    value: `${analytics.ctor}%`,
                    sub: 'Of opened',
                    icon: Percent,
                  },
                  {
                    label: 'Leverans',
                    value: `${analytics.delivery_rate}%`,
                    sub: `${analytics.delivered} levererade`,
                    icon: CheckCircle2,
                  },
                ].map(({ label, value, sub, icon: Icon }) => (
                  <div
                    key={label}
                    className="rounded-2xl border border-zinc-100 bg-zinc-50/80 p-3.5"
                  >
                    <div className="flex items-center gap-1.5 text-zinc-400 mb-2">
                      <Icon size={13} />
                      <span className="text-[10px] font-extrabold uppercase tracking-wide">
                        {label}
                      </span>
                    </div>
                    <p className="text-xl font-black text-[#2c3340]">{value}</p>
                    <p className="text-[11px] font-medium text-zinc-400 mt-0.5">{sub}</p>
                  </div>
                ))}
              </div>

              {/* Volume funnel */}
              <div className="rounded-2xl border border-zinc-100 p-4">
                <h4 className="text-xs font-black text-[#2c3340] mb-3 flex items-center gap-1.5">
                  <BarChart3 size={13} className="text-[var(--nc-coral)]" /> Volym
                </h4>
                <div className="space-y-2.5">
                  {(
                    [
                      { label: 'Skickade', value: analytics.sent, tone: 'bg-[#2c3340]' },
                      {
                        label: 'Levererade',
                        value: analytics.delivered,
                        tone: 'bg-emerald-500',
                      },
                      {
                        label: 'Opens (total)',
                        value: analytics.opens,
                        tone: 'bg-sky-500',
                      },
                      {
                        label: 'Klick (totalt)',
                        value: analytics.clicks,
                        tone: 'bg-[var(--nc-coral)]',
                      },
                    ] as const
                  ).map((row) => (
                    <div key={row.label}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-bold text-zinc-600">{row.label}</span>
                        <span className="font-black text-[#2c3340]">{row.value}</span>
                      </div>
                      <div className="h-2 rounded-full bg-zinc-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${row.tone}`}
                          style={{
                            width: `${Math.max(4, (row.value / Math.max(analytics.sent, 1)) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Health */}
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-2xl border border-zinc-100 p-3 text-center">
                  <Ban size={14} className="text-zinc-400 mx-auto mb-1" />
                  <p className="text-base font-black text-[#2c3340]">{analytics.bounced}</p>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase">Bounce</p>
                </div>
                <div className="rounded-2xl border border-zinc-100 p-3 text-center">
                  <Users size={14} className="text-zinc-400 mx-auto mb-1" />
                  <p className="text-base font-black text-[#2c3340]">
                    {analytics.unsubscribed}
                  </p>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase">Avreg.</p>
                </div>
                <div className="rounded-2xl border border-zinc-100 p-3 text-center">
                  <AlertTriangle size={14} className="text-zinc-400 mx-auto mb-1" />
                  <p className="text-base font-black text-[#2c3340]">
                    {analytics.spam_complaints}
                  </p>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase">Spam</p>
                </div>
              </div>

              {/* Opens over time */}
              <div className="rounded-2xl border border-zinc-100 p-4">
                <h4 className="text-xs font-black text-[#2c3340] mb-3">
                  Opens after send
                </h4>
                <div className="flex items-end gap-1 h-28">
                  {analytics.opens_by_hour.map((h) => (
                    <div key={h.label} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                      <div
                        className="w-full rounded-t-md bg-[var(--nc-coral)]/80 min-h-[4px]"
                        style={{ height: `${(h.opens / maxHourOpens) * 100}%` }}
                        title={`${h.opens} opens`}
                      />
                      <span className="text-[8px] font-bold text-zinc-400">{h.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Devices */}
              <div className="rounded-2xl border border-zinc-100 p-4">
                <h4 className="text-xs font-black text-[#2c3340] mb-3 flex items-center gap-1.5">
                  <Smartphone size={13} className="text-zinc-400" /> Enheter
                </h4>
                <div className="space-y-2.5">
                  {analytics.devices.map((d) => (
                    <div key={d.label}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-bold text-zinc-600">{d.label}</span>
                        <span className="font-black text-[#2c3340]">{d.pct}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-zinc-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-zinc-700"
                          style={{ width: `${d.pct}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top links */}
              <div className="rounded-2xl border border-zinc-100 p-4">
                <h4 className="text-xs font-black text-[#2c3340] mb-3 flex items-center gap-1.5">
                  <Link2 size={13} className="text-zinc-400" /> Top clicked links
                </h4>
                <ul className="space-y-2">
                  {analytics.top_links.map((link) => (
                    <li
                      key={link.url}
                      className="flex items-center gap-3 p-2.5 rounded-xl bg-zinc-50"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-[#2c3340] truncate">
                          {link.label}
                        </p>
                        <p className="text-[10px] text-zinc-400 truncate">{link.url}</p>
                      </div>
                      <span className="text-sm font-black text-[#2c3340] flex-shrink-0">
                        {link.clicks}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Composer drawer */}
      {composerOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-40"
            onClick={() => setComposerOpen(false)}
          />
          <div className="fixed right-0 top-0 h-full w-full max-w-lg bg-white shadow-2xl z-50 flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
              <div>
                <h3 className="text-sm font-black text-[#2c3340]">
                  {t('createEmailBroadcast', locale).replace(/^\+\s*/, '')}
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {'{first_name}'} merge tag
                </p>
              </div>
              <button
                type="button"
                onClick={() => setComposerOpen(false)}
                className="h-11 w-11 min-h-[44px] min-w-[44px] rounded-xl bg-zinc-50 flex items-center justify-center"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
              <div>
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block mb-1.5">
                  {t('subjectLine', locale)}
                </label>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. New lesson in Classroom"
                  className="h-11 rounded-xl"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block mb-1.5">
                  {t('recipients', locale)}
                </label>
                <select
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                  className="w-full h-11 min-h-[44px] rounded-xl border border-zinc-200 bg-white px-3 text-sm font-bold text-[#2c3340] focus:outline-none focus:border-[var(--nc-coral)]"
                >
                  {(data?.audiences ?? AUDIENCE_OPTIONS).map((a) => (
                    <option key={a.value} value={a.value}>
                      {a.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5 gap-2">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                    Meddelande
                  </label>
                  <button
                    type="button"
                    disabled={uploading}
                    onClick={() => imageInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 h-9 min-h-[36px] px-2.5 rounded-lg text-[11px] font-extrabold text-zinc-500 hover:text-[var(--nc-coral)] hover:bg-[#f2eeff] transition-colors disabled:opacity-50"
                  >
                    {uploading ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <ImageIcon size={12} />
                    )}
                    Add image
                  </button>
                </div>

                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void handleImageFile(f);
                    e.target.value = '';
                  }}
                />

                {/* Layout builder: text + movable image slots */}
                <div
                  className={`rounded-xl border p-2 space-y-2 transition-colors ${
                    fileDragOver
                      ? 'border-[var(--nc-coral)] bg-[#f2eeff]/50'
                      : 'border-zinc-200 bg-white'
                  }`}
                  onDragEnter={(e) => {
                    if (e.dataTransfer.types.includes('Files')) {
                      e.preventDefault();
                      setFileDragOver(true);
                    }
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (e.dataTransfer.types.includes('Files')) setFileDragOver(true);
                  }}
                  onDragLeave={(e) => {
                    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                    setFileDragOver(false);
                  }}
                  onDrop={onFileDrop}
                >
                  {(['top', 'middle', 'bottom'] as ImagePlacement[]).map((slot, i) => (
                    <div key={slot}>
                      {/* Drop slot for repositioning the image */}
                      <div
                        onDragOver={(e) => {
                          if (!e.dataTransfer.types.includes('application/x-email-image'))
                            return;
                          e.preventDefault();
                          setSlotDragOver(slot);
                        }}
                        onDragLeave={() => setSlotDragOver((s) => (s === slot ? null : s))}
                        onDrop={(e) => {
                          if (!e.dataTransfer.types.includes('application/x-email-image'))
                            return;
                          e.preventDefault();
                          e.stopPropagation();
                          setImagePlacement(slot);
                          setSlotDragOver(null);
                        }}
                        className={`rounded-lg transition-all ${
                          slotDragOver === slot
                            ? 'min-h-[52px] border-2 border-dashed border-[var(--nc-coral)] bg-[#f2eeff] flex items-center justify-center mb-2'
                            : imageUrl && imagePlacement !== slot
                              ? 'min-h-[10px] mb-1'
                              : ''
                        }`}
                      >
                        {slotDragOver === slot && (
                          <p className="text-[10px] font-black text-[var(--nc-coral)]">
                            Drop image here
                          </p>
                        )}
                      </div>

                      {imageUrl && imagePlacement === slot && (
                        <div
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData('application/x-email-image', '1');
                            e.dataTransfer.effectAllowed = 'move';
                          }}
                          className="relative group rounded-xl overflow-hidden border border-[#ffe0d4] bg-[#f2eeff] mb-2 cursor-grab active:cursor-grabbing"
                        >
                          <div className="absolute top-2 left-2 z-10 flex items-center gap-1">
                            <span className="h-8 min-h-[32px] px-2 rounded-lg bg-black/50 text-white text-[10px] font-black inline-flex items-center gap-1">
                              <GripVertical size={12} /> Dra
                            </span>
                          </div>
                          <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
                            <button
                              type="button"
                              disabled={imagePlacement === 'top'}
                              onClick={() => moveImage(-1)}
                              className="h-10 w-10 min-h-[44px] min-w-[44px] rounded-xl bg-black/55 text-white flex items-center justify-center hover:bg-black/70 disabled:opacity-30"
                              title="Flytta upp"
                            >
                              <ArrowUp size={14} />
                            </button>
                            <button
                              type="button"
                              disabled={imagePlacement === 'bottom'}
                              onClick={() => moveImage(1)}
                              className="h-10 w-10 min-h-[44px] min-w-[44px] rounded-xl bg-black/55 text-white flex items-center justify-center hover:bg-black/70 disabled:opacity-30"
                              title="Flytta ner"
                            >
                              <ArrowDown size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setImageUrl(null)}
                              className="h-10 w-10 min-h-[44px] min-w-[44px] rounded-xl bg-black/55 text-white flex items-center justify-center hover:bg-black/70"
                              title="Ta bort bild"
                            >
                              <X size={14} />
                            </button>
                          </div>
                          <img
                            src={imageUrl}
                            alt="E-postbild"
                            className="w-full max-h-44 object-cover"
                            draggable={false}
                          />
                          <p className="px-3 py-2 text-[10px] font-bold text-[#6b5bb8]">
                            {slot === 'top'
                              ? 'Image at top of email'
                              : slot === 'middle'
                                ? 'Image mid-email (after first paragraph)'
                                : 'Image at bottom of email'}
                          </p>
                        </div>
                      )}

                      {/* Text editor only once, after top slot / before middle content conceptually */}
                      {i === 0 && (
                        <textarea
                          value={body}
                          onChange={(e) => setBody(e.target.value)}
                          className="w-full min-h-[160px] rounded-xl resize-none text-sm border border-zinc-100 bg-zinc-50/50 px-3 py-2.5 text-[#2c3340] placeholder:text-zinc-400 focus:outline-none focus:border-[var(--nc-coral)]"
                          placeholder={t('emailBodyPlaceholder', locale)}
                        />
                      )}
                    </div>
                  ))}

                  {!imageUrl && (
                    <button
                      type="button"
                      disabled={uploading}
                      onClick={() => imageInputRef.current?.click()}
                      className="w-full min-h-[72px] rounded-xl border border-dashed border-zinc-200 bg-zinc-50/80 hover:border-[var(--nc-coral)] hover:bg-[#f2eeff]/40 flex flex-col items-center justify-center gap-1.5 text-zinc-400 transition-colors disabled:opacity-50"
                    >
                      {uploading ? (
                        <Loader2 size={18} className="animate-spin" />
                      ) : (
                        <Upload size={18} />
                      )}
                      <span className="text-[11px] font-extrabold">
                        Drag &amp; drop an image, or click to choose
                      </span>
                    </button>
                  )}
                </div>
              </div>

              {/* Live preview */}
              <EmailPreview
                subject={subject}
                body={body}
                imageUrl={imageUrl}
                imagePlacement={imagePlacement}
              />

              {flash && (
                <div
                  className={`flex items-center gap-2 text-sm font-bold rounded-xl px-3 py-2.5 ${
                    /missing|fail|error|forbidden|unauthorized/i.test(flash)
                      ? 'text-rose-600 bg-rose-50'
                      : 'text-green-600 bg-green-50'
                  }`}
                >
                  <CheckCircle2 size={14} /> {flash}
                </div>
              )}
            </div>

            <div className="px-5 py-4 border-t border-zinc-100 flex flex-col sm:flex-row gap-2">
              {!canBroadcast && (
                <div className="w-full mb-1">
                  <PlanLockBadge minPlan="creator" />
                  <p className="text-xs text-slate-500 font-medium mt-1">
                    Broadcasts available on Creator Plan
                  </p>
                </div>
              )}
              <button
                type="button"
                disabled={!canSend || !canBroadcast}
                onClick={() => sendMutation.mutate('test')}
                className="flex-1 h-11 min-h-[44px] rounded-xl border border-zinc-200 text-sm font-extrabold text-zinc-600 hover:bg-zinc-50 disabled:opacity-50 inline-flex items-center justify-center gap-2"
              >
                {sendMutation.isPending ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Mail size={14} />
                )}
                {t('sendTestEmail', locale)}
              </button>
              <button
                type="button"
                disabled={!canSend || !canBroadcast}
                onClick={() => {
                  if (!canBroadcast) {
                    requestUpgrade('creator');
                    return;
                  }
                  sendMutation.mutate('send');
                }}
                className="flex-1 h-11 min-h-[44px] rounded-xl bg-[var(--nc-coral)] text-white text-sm font-black hover:opacity-90 disabled:opacity-50 inline-flex items-center justify-center gap-2"
              >
                {sendMutation.isPending ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Send size={14} />
                )}
                {t('sendBroadcastNow', locale)}
              </button>
            </div>
          </div>
        </>
      )}

      <UpgradeModal
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
        minPlan={upgradeTarget}
      />
    </div>
  );
}
