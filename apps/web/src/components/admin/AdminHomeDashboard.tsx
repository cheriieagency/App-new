'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BarChart3,
  CalendarDays,
  Check,
  Link2,
  Loader2,
  Plus,
  Radio,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAdminNav } from '@/components/admin/AdminNavContext';
import { adminCardClass } from '@/components/admin/AdminUi';
import { useWorkspace } from '@/context/WorkspaceContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { localeTag, useLanguage, type NestedKey } from '@/lib/i18n';

type StickyTask = { id: string; text: string; done: boolean };

type KanbanColumnId = 'todo' | 'doing' | 'done';

type KanbanTask = {
  id: string;
  title: string;
  categoryKey: NestedKey;
  assignee: string;
  column: KanbanColumnId;
  /** ISO `YYYY-MM-DD` when set. */
  dueDate: string | null;
};

type ActivityCategory = 'all' | 'feedback' | 'purchase' | 'community' | 'dm';

type ActivityItem = {
  id: string;
  category: Exclude<ActivityCategory, 'all'>;
  title: string;
  body: string;
  time: string;
};

const FILTERS: { id: ActivityCategory; labelKey: NestedKey }[] = [
  { id: 'all', labelKey: 'admin.filterAll' },
  { id: 'feedback', labelKey: 'admin.filterFeedback' },
  { id: 'purchase', labelKey: 'admin.filterPurchase' },
  { id: 'community', labelKey: 'admin.filterCommunity' },
  { id: 'dm', labelKey: 'admin.filterDm' },
];

type DraftKind = 'sticky' | 'kanban' | null;

function mapSticky(row: Record<string, unknown>): StickyTask {
  return {
    id: String(row.id),
    text: String(row.text || ''),
    done: Boolean(row.done),
  };
}

function mapKanban(row: Record<string, unknown>): KanbanTask {
  const col = String(row.column || row.column_id || 'todo');
  const column: KanbanColumnId =
    col === 'doing' || col === 'done' ? col : 'todo';
  const category = String(row.category || 'admin.catGeneral');
  const dueRaw = row.due_date ?? row.dueDate;
  let dueDate: string | null = null;
  if (typeof dueRaw === 'string' && /^\d{4}-\d{2}-\d{2}/.test(dueRaw.trim())) {
    dueDate = dueRaw.trim().slice(0, 10);
  }
  return {
    id: String(row.id),
    title: String(row.title || ''),
    categoryKey: (category.startsWith('admin.')
      ? category
      : 'admin.catGeneral') as NestedKey,
    assignee: String(row.assignee || 'U').slice(0, 2).toUpperCase(),
    column,
    dueDate,
  };
}

/** Format stored ISO date for the current UI locale. */
function formatTaskDeadline(isoDate: string, language: Parameters<typeof localeTag>[0]): string {
  const d = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString(localeTag(language), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** Admin Command Center — post-it focus, shortcuts, kanban, activity stream. */
export default function AdminHomeDashboard() {
  const router = useRouter();
  const { setSection } = useAdminNav();
  const { t, language } = useLanguage();
  const { activeWorkspaceId } = useWorkspace();
  const queryClient = useQueryClient();

  const dateLabel = useMemo(() => {
    const raw = new Date().toLocaleDateString(localeTag(language), {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
    });
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }, [language]);

  const homeQueryKey = ['admin-home', activeWorkspaceId] as const;

  const { data, isLoading, isError } = useQuery({
    queryKey: homeQueryKey,
    enabled: Boolean(activeWorkspaceId),
    queryFn: async () => {
      const qs = new URLSearchParams({ workspaceId: activeWorkspaceId });
      const res = await fetch(`/api/admin/home?${qs.toString()}`, {
        headers: { 'x-workspace-id': activeWorkspaceId },
      });
      const json = (await res.json()) as {
        stickies?: Array<Record<string, unknown>>;
        kanban?: Array<Record<string, unknown>>;
        message?: string;
        error?: string;
      };
      if (!res.ok) {
        throw new Error(json.message || json.error || 'Failed to load home');
      }
      return {
        stickies: (json.stickies || []).map(mapSticky),
        kanban: (json.kanban || []).map(mapKanban),
      };
    },
  });

  const stickyTasks = data?.stickies ?? [];
  const kanban = data?.kanban ?? [];
  const [activityFilter, setActivityFilter] = useState<ActivityCategory>('all');
  const activities: ActivityItem[] = [];

  const [draftKind, setDraftKind] = useState<DraftKind>(null);
  const [draftText, setDraftText] = useState('');
  const [draftDueDate, setDraftDueDate] = useState('');

  useEffect(() => {
    if (draftKind) {
      setDraftText('');
      setDraftDueDate('');
    }
  }, [draftKind]);

  const invalidateHome = () =>
    queryClient.invalidateQueries({ queryKey: homeQueryKey });

  const createMutation = useMutation({
    mutationFn: async (input: {
      kind: 'sticky' | 'kanban';
      text: string;
      dueDate?: string;
    }) => {
      const res = await fetch('/api/admin/home', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-workspace-id': activeWorkspaceId,
        },
        body: JSON.stringify(
          input.kind === 'sticky'
            ? { kind: 'sticky', text: input.text, workspaceId: activeWorkspaceId }
            : {
                kind: 'kanban',
                title: input.text,
                dueDate: input.dueDate || null,
                workspaceId: activeWorkspaceId,
              }
        ),
      });
      const json = (await res.json().catch(() => ({}))) as {
        message?: string;
        error?: string;
      };
      if (!res.ok) {
        throw new Error(json.message || json.error || 'Save failed');
      }
      return json;
    },
    onSuccess: () => {
      setDraftKind(null);
      setDraftText('');
      setDraftDueDate('');
      void invalidateHome();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Could not save');
    },
  });

  const patchStickyMutation = useMutation({
    mutationFn: async (input: { id: string; done: boolean }) => {
      const res = await fetch('/api/admin/home', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-workspace-id': activeWorkspaceId,
        },
        body: JSON.stringify({
          kind: 'sticky',
          id: input.id,
          done: input.done,
          workspaceId: activeWorkspaceId,
        }),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(json.message || 'Update failed');
      }
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: homeQueryKey });
      const prev = queryClient.getQueryData<{
        stickies: StickyTask[];
        kanban: KanbanTask[];
      }>(homeQueryKey);
      if (prev) {
        queryClient.setQueryData(homeQueryKey, {
          ...prev,
          stickies: prev.stickies.map((s) =>
            s.id === input.id ? { ...s, done: input.done } : s
          ),
        });
      }
      return { prev };
    },
    onError: (_err, _input, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(homeQueryKey, ctx.prev);
      toast.error('Could not update note');
    },
    onSettled: () => void invalidateHome(),
  });

  const moveKanbanMutation = useMutation({
    mutationFn: async (input: { id: string; column: KanbanColumnId }) => {
      const res = await fetch('/api/admin/home', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-workspace-id': activeWorkspaceId,
        },
        body: JSON.stringify({
          kind: 'kanban',
          id: input.id,
          column: input.column,
          workspaceId: activeWorkspaceId,
        }),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(json.message || 'Update failed');
      }
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: homeQueryKey });
      const prev = queryClient.getQueryData<{
        stickies: StickyTask[];
        kanban: KanbanTask[];
      }>(homeQueryKey);
      if (prev) {
        queryClient.setQueryData(homeQueryKey, {
          ...prev,
          kanban: prev.kanban.map((task) =>
            task.id === input.id ? { ...task, column: input.column } : task
          ),
        });
      }
      return { prev };
    },
    onError: (_err, _input, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(homeQueryKey, ctx.prev);
      toast.error('Could not move task');
    },
    onSettled: () => void invalidateHome(),
  });

  const deleteKanbanMutation = useMutation({
    mutationFn: async (id: string) => {
      const qs = new URLSearchParams({
        workspaceId: activeWorkspaceId,
        id,
        kind: 'kanban',
      });
      const res = await fetch(`/api/admin/home?${qs.toString()}`, {
        method: 'DELETE',
        headers: { 'x-workspace-id': activeWorkspaceId },
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(json.message || 'Delete failed');
      }
    },
    onSuccess: () => void invalidateHome(),
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Delete failed');
    },
  });

  const go = (section: 'calendar' | 'analytics' | 'biobuilder') => {
    if (section === 'calendar') {
      router.push('/planner');
      return;
    }
    setSection(section);
    router.push(`/admin?tab=${section}`);
  };

  const submitDraft = () => {
    const text = draftText.trim();
    if (!text || !draftKind) return;
    createMutation.mutate({
      kind: draftKind,
      text,
      dueDate: draftKind === 'kanban' ? draftDueDate.trim() || undefined : undefined,
    });
  };

  const filteredActivities =
    activityFilter === 'all'
      ? activities
      : activities.filter((a) => a.category === activityFilter);

  const columns: {
    id: KanbanColumnId;
    titleKey: NestedKey;
    dot: string;
  }[] = [
    { id: 'todo', titleKey: 'admin.colTodo', dot: 'bg-amber-400' },
    { id: 'doing', titleKey: 'admin.colDoing', dot: 'bg-indigo-500' },
    { id: 'done', titleKey: 'admin.colDone', dot: 'bg-emerald-500' },
  ];

  const shortcuts = [
    {
      key: 'planner' as const,
      title: t('admin.shortcutPlanner'),
      detail: t('admin.shortcutPlannerOpen'),
      icon: CalendarDays,
      accent: 'bg-[#E9D5FF]/70 text-[#2B2568]',
      onClick: () => go('calendar'),
    },
    {
      key: 'analytics' as const,
      title: t('admin.shortcutAnalytics'),
      detail: t('admin.shortcutAnalyticsOpen'),
      icon: BarChart3,
      accent: 'bg-emerald-50 text-[#10B981]',
      onClick: () => go('analytics'),
    },
    {
      key: 'bio' as const,
      title: t('admin.shortcutBio'),
      detail: t('admin.shortcutBioOpen'),
      icon: Link2,
      accent: 'bg-[#FCE7F3] text-[#F472B6]',
      onClick: () => go('biobuilder'),
    },
  ];

  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <p className="text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-slate-400">
          {t('admin.homeEyebrow')}
        </p>
        <h1 className="font-clikd-wordmark font-extrabold text-[28px] sm:text-[32px] leading-tight text-slate-900 tracking-tight mt-1">
          {t('admin.homeTitle')}
        </h1>
        <p className="text-sm text-slate-500 font-medium mt-1">
          {t('admin.homeSub')}
        </p>
      </div>

      {/* Hero: Post-it + shortcuts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-start">
        <div className="lg:col-span-5">
          <div className="relative bg-[#F8F4FF] border border-[#EDE4FF] shadow-md rounded-3xl p-6 transform -rotate-1 hover:rotate-0 transition-transform">
            <span
              className="w-7 h-7 rounded-full bg-[#F472B6] border-2 border-white absolute -top-3 left-1/2 -translate-x-1/2 shadow-sm"
              aria-hidden
            />
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4 pt-1">
              <h2 className="font-clikd-wordmark font-extrabold text-lg text-slate-900 tracking-tight">
                {t('admin.focusTitle')}
              </h2>
              <span className="inline-flex items-center rounded-full bg-white/80 border border-[#EDE4FF] px-2.5 py-1 text-[10px] font-bold text-[#2B2568] capitalize">
                {dateLabel}
              </span>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center gap-2 py-8 text-slate-400 text-sm font-medium">
                <Loader2 size={16} className="animate-spin" />
                …
              </div>
            ) : stickyTasks.length === 0 ? (
              <p className="text-sm text-slate-400 font-medium py-6 text-center">
                {t('admin.stickyEmpty')}
              </p>
            ) : (
              <ul className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
                {stickyTasks.map((task) => (
                  <li key={task.id}>
                    <button
                      type="button"
                      onClick={() =>
                        patchStickyMutation.mutate({
                          id: task.id,
                          done: !task.done,
                        })
                      }
                      className="w-full flex items-start gap-2.5 text-left min-h-[44px] rounded-xl px-2 py-1.5 hover:bg-[#EFE8FF]/70 transition-colors"
                    >
                      <span
                        className={`mt-0.5 h-5 w-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 ${
                          task.done
                            ? 'bg-[#10B981] border-[#10B981] text-white'
                            : 'bg-white/80 border-[#D4C4F7]'
                        }`}
                      >
                        {task.done ? <Check size={12} strokeWidth={3} /> : null}
                      </span>
                      <span
                        className={`text-sm font-semibold leading-snug ${
                          task.done
                            ? 'text-slate-500 line-through decoration-slate-400'
                            : 'text-slate-800'
                        }`}
                      >
                        {task.text}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <button
              type="button"
              onClick={() => setDraftKind('sticky')}
              className="mt-4 inline-flex items-center gap-1.5 min-h-[44px] px-3 rounded-xl text-xs font-bold text-[#2B2568]/80 hover:bg-[#EFE8FF] transition-colors"
            >
              <Plus size={14} strokeWidth={2.5} />
              {t('admin.addSticky')}
            </button>
          </div>
        </div>

        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          {shortcuts.map((card) => {
            const Icon = card.icon;
            return (
              <button
                key={card.key}
                type="button"
                onClick={card.onClick}
                className={`${adminCardClass} p-4 sm:p-5 text-left hover:border-[#F472B6]/50 hover:shadow-md transition-all min-h-[44px]`}
              >
                <span
                  className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${card.accent}`}
                >
                  <Icon size={18} strokeWidth={2.25} />
                </span>
                <p className="mt-3 font-clikd-wordmark font-extrabold text-base text-slate-900 tracking-tight leading-tight">
                  {card.title}
                </p>
                <p className="mt-1 text-xs font-medium text-slate-500 leading-snug">
                  {card.detail}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Kanban + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-start">
        <div className={`lg:col-span-7 ${adminCardClass} p-4 sm:p-5`}>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 className="font-clikd-wordmark font-extrabold text-lg text-slate-900 tracking-tight">
              {t('admin.kanbanTitle')}
            </h2>
            <button
              type="button"
              onClick={() => setDraftKind('kanban')}
              className="inline-flex items-center gap-1.5 min-h-[44px] px-3.5 rounded-xl bg-[#2B2568] text-white text-xs font-bold hover:bg-[#1e1b4b] transition-colors"
            >
              <Plus size={14} strokeWidth={2.5} />
              {t('admin.newTask')}
            </button>
          </div>

          {isError ? (
            <p className="text-sm text-rose-600 font-medium py-6 text-center">
              Could not load tasks. Try refreshing.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {columns.map((col) => {
                const tasks = kanban.filter((task) => task.column === col.id);
                return (
                  <div
                    key={col.id}
                    className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3 min-h-[220px]"
                  >
                    <div className="flex items-center gap-2 mb-3 px-0.5">
                      <span className={`h-2 w-2 rounded-full ${col.dot}`} />
                      <p className="text-[11px] font-extrabold text-slate-700">
                        {t(col.titleKey)}
                      </p>
                      <span className="ml-auto text-[10px] font-mono font-bold text-slate-400">
                        {tasks.length}
                      </span>
                    </div>
                    {isLoading ? (
                      <div className="flex justify-center py-8 text-slate-300">
                        <Loader2 size={16} className="animate-spin" />
                      </div>
                    ) : tasks.length === 0 ? (
                      <p className="text-[11px] text-slate-400 font-medium px-0.5 py-4">
                        {t('admin.kanbanEmpty')}
                      </p>
                    ) : (
                      <ul className="space-y-2">
                        {tasks.map((task) => (
                          <li
                            key={task.id}
                            className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.03)]"
                          >
                            <p
                              className={`text-[12px] font-bold leading-snug ${
                                col.id === 'done'
                                  ? 'text-slate-400 line-through'
                                  : 'text-slate-900'
                              }`}
                            >
                              {task.title}
                            </p>
                            {task.dueDate ? (
                              <p
                                className={`mt-1.5 inline-flex items-center gap-1 text-[10px] font-semibold ${
                                  col.id === 'done'
                                    ? 'text-slate-400'
                                    : 'text-slate-500'
                                }`}
                              >
                                <CalendarDays size={11} strokeWidth={2.25} aria-hidden />
                                <span>
                                  {t('admin.taskDeadline')}:{' '}
                                  {formatTaskDeadline(task.dueDate, language)}
                                </span>
                              </p>
                            ) : null}
                            <div className="mt-2 flex items-center justify-between gap-2">
                              <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-slate-500">
                                {t(task.categoryKey)}
                              </span>
                              <span className="h-6 w-6 rounded-full bg-[#2B2568] text-white text-[10px] font-extrabold flex items-center justify-center">
                                {task.assignee}
                              </span>
                            </div>
                            <div className="mt-2.5 flex items-center gap-1.5">
                              <label className="sr-only" htmlFor={`move-${task.id}`}>
                                Move
                              </label>
                              <select
                                id={`move-${task.id}`}
                                value={task.column}
                                onChange={(e) =>
                                  moveKanbanMutation.mutate({
                                    id: task.id,
                                    column: e.target.value as KanbanColumnId,
                                  })
                                }
                                className="flex-1 h-9 min-h-[36px] rounded-lg border border-slate-200 bg-slate-50 px-2 text-[10px] font-bold text-slate-600"
                              >
                                {columns.map((c) => (
                                  <option key={c.id} value={c.id}>
                                    {t(c.titleKey)}
                                  </option>
                                ))}
                              </select>
                              <button
                                type="button"
                                onClick={() => deleteKanbanMutation.mutate(task.id)}
                                className="h-9 w-9 min-h-[36px] min-w-[36px] inline-flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                aria-label="Delete task"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className={`lg:col-span-5 ${adminCardClass} p-4 sm:p-5`}>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <h2 className="font-clikd-wordmark font-extrabold text-lg text-slate-900 tracking-tight">
              {t('admin.activityTitle')}
            </h2>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 text-[10px] font-extrabold text-[#10B981]">
              <Radio size={11} strokeWidth={2.5} className="animate-pulse" />
              {t('admin.realtime')}
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5 mb-4">
            {FILTERS.map((f) => {
              const active = activityFilter === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setActivityFilter(f.id)}
                  className={`inline-flex items-center min-h-[40px] px-3 rounded-full text-[11px] font-extrabold transition-colors ${
                    active
                      ? 'bg-[#2B2568] text-white'
                      : 'bg-white border border-slate-200 text-slate-500 hover:border-slate-300'
                  }`}
                >
                  {t(f.labelKey)}
                </button>
              );
            })}
          </div>

          <ul className="space-y-2.5">
            {filteredActivities.length === 0 ? (
              <li className="text-sm text-slate-400 font-medium py-6 text-center">
                {t('admin.activityEmpty')}
              </li>
            ) : (
              filteredActivities.map((item) => (
                <li
                  key={item.id}
                  className="rounded-2xl border border-slate-100 bg-slate-50/60 px-3.5 py-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[12px] font-extrabold text-slate-900 leading-snug">
                      {item.title}
                    </p>
                    <span className="text-[10px] font-mono font-bold text-slate-400 flex-shrink-0">
                      {item.time}
                    </span>
                  </div>
                  <p className="mt-1 text-[12px] font-medium text-slate-500 leading-snug">
                    {item.body}
                  </p>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>

      {/* Add sticky / kanban dialog — replaces blocked window.prompt */}
      <Dialog
        open={draftKind !== null}
        onOpenChange={(open) => {
          if (!open && !createMutation.isPending) setDraftKind(null);
        }}
      >
        <DialogContent className="max-w-[min(420px,94vw)] rounded-2xl border-slate-200/90 p-0 gap-0">
          <DialogHeader className="px-5 pt-5 pb-2">
            <DialogTitle className="font-clikd-wordmark text-lg font-extrabold text-slate-900">
              {draftKind === 'sticky'
                ? t('admin.stickyPrompt')
                : t('admin.taskPrompt')}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 font-medium">
              {draftKind === 'sticky'
                ? t('admin.focusTitle')
                : t('admin.kanbanTitle')}
            </DialogDescription>
          </DialogHeader>
          <form
            className="px-5 pb-5 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              submitDraft();
            }}
          >
            <Input
              autoFocus
              value={draftText}
              onChange={(e) => setDraftText(e.target.value)}
              placeholder={
                draftKind === 'sticky'
                  ? t('admin.stickyPrompt')
                  : t('admin.taskPrompt')
              }
              className="h-11 min-h-[44px] rounded-xl border-slate-200 text-sm font-semibold"
              disabled={createMutation.isPending}
            />
            {draftKind === 'kanban' ? (
              <div className="space-y-1.5">
                <label
                  htmlFor="admin-task-deadline"
                  className="block text-[11px] font-bold uppercase tracking-wide text-slate-500"
                >
                  {t('admin.taskDeadline')}
                </label>
                <Input
                  id="admin-task-deadline"
                  type="date"
                  value={draftDueDate}
                  onChange={(e) => setDraftDueDate(e.target.value)}
                  className="h-11 min-h-[44px] rounded-xl border-slate-200 text-sm font-semibold"
                  disabled={createMutation.isPending}
                />
              </div>
            ) : null}
            <DialogFooter className="flex flex-row gap-2 sm:justify-end">
              <button
                type="button"
                onClick={() => setDraftKind(null)}
                disabled={createMutation.isPending}
                className="inline-flex items-center justify-center min-h-[44px] px-4 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!draftText.trim() || createMutation.isPending}
                className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-4 rounded-xl bg-[#2B2568] text-white text-xs font-bold hover:bg-[#1e1b4b] disabled:opacity-50 transition-colors"
              >
                {createMutation.isPending ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Plus size={14} strokeWidth={2.5} />
                )}
                {draftKind === 'sticky' ? t('admin.addSticky') : t('admin.newTask')}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
