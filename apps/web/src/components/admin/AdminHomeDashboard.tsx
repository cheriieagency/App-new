'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CalendarDays,
  Check,
  GripVertical,
  Link2,
  Loader2,
  Palette,
  Pencil,
  Plus,
  Radio,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAdminNav, type AdminSection } from '@/components/admin/AdminNavContext';
import { ADMIN_NAV_ITEMS } from '@/components/admin/adminNavItems';
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
import {
  DEFAULT_HOME_SHORTCUTS,
  HOME_SHORTCUT_KEYS,
  HOME_SHORTCUT_META,
  MAX_HOME_SHORTCUTS,
  normalizeHomeShortcuts,
  type HomeShortcutKey,
} from '@/lib/admin-home/shortcuts';
import {
  DEFAULT_STICKY_COLOR,
  STICKY_COLOR_IDS,
  normalizeStickyColor,
  stickyTheme,
  type StickyColorId,
} from '@/lib/admin-home/sticky-colors';
import { authClient } from '@/lib/auth-client';
import {
  detectDefaultTimezone,
  loadTimezone,
  saveTimezone,
} from '@/lib/settings-prefs';

/** Local hour (0–23) in an IANA timezone. */
function hourInTimezone(timeZone: string): number {
  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone,
      hour: 'numeric',
      hourCycle: 'h23',
    }).formatToParts(new Date());
    const raw = Number(parts.find((p) => p.type === 'hour')?.value);
    if (!Number.isFinite(raw)) return new Date().getHours();
    return raw === 24 ? 0 : raw;
  } catch {
    return new Date().getHours();
  }
}

/** Time-of-day greeting key for the user's timezone. */
function greetingKeyForHour(hour: number): NestedKey {
  if (hour >= 5 && hour < 11) return 'admin.greetMorning';
  if (hour >= 11 && hour < 14) return 'admin.greetDay';
  if (hour >= 14 && hour < 17) return 'admin.greetAfternoon';
  return 'admin.greetEvening';
}

type StickyTask = { id: string; text: string; done: boolean };

type KanbanColumnId = 'todo' | 'doing' | 'done';

type KanbanTask = {
  id: string;
  title: string;
  /** i18n key (`admin.catGeneral`) or a custom free-text label. */
  category: string;
  assignee: string;
  column: KanbanColumnId;
  /** ISO `YYYY-MM-DD` when set. */
  dueDate: string | null;
};

/** Built-in category chips; anything else is treated as a custom label. */
const CATEGORY_PRESETS: { value: string; labelKey?: NestedKey; label?: string }[] =
  [
    { value: 'admin.catGeneral', labelKey: 'admin.catGeneral' },
    { value: 'Marketing', label: 'Marketing' },
    { value: 'Content', label: 'Content' },
    { value: 'Community', label: 'Community' },
    { value: 'Sales', label: 'Sales' },
  ];

function categoryLabel(
  category: string,
  t: (key: NestedKey) => string
): string {
  const preset = CATEGORY_PRESETS.find((p) => p.value === category);
  if (preset?.labelKey) return t(preset.labelKey);
  if (preset?.label) return preset.label;
  if (category === 'admin.catGeneral') return t('admin.catGeneral');
  if (category.startsWith('admin.')) {
    const translated = t(category as NestedKey);
    return translated.startsWith('admin.')
      ? category.replace(/^admin\./, '')
      : translated;
  }
  return category;
}

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
  const rawCategory = String(row.category || 'admin.catGeneral').trim();
  const dueRaw = row.due_date ?? row.dueDate;
  let dueDate: string | null = null;
  if (typeof dueRaw === 'string' && /^\d{4}-\d{2}-\d{2}/.test(dueRaw.trim())) {
    dueDate = dueRaw.trim().slice(0, 10);
  }
  return {
    id: String(row.id),
    title: String(row.title || ''),
    category: rawCategory || 'admin.catGeneral',
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
  const { data: session } = authClient.useSession();
  const userId = session?.user?.id ?? null;
  const firstName = useMemo(() => {
    const name = session?.user?.name?.trim() || '';
    if (!name) return '';
    return name.split(/\s+/)[0] || '';
  }, [session?.user?.name]);

  const [timezone, setTimezone] = useState(() =>
    typeof window !== 'undefined'
      ? loadTimezone(userId) || detectDefaultTimezone()
      : 'Europe/Stockholm'
  );

  useEffect(() => {
    const cached = loadTimezone(userId);
    if (cached) setTimezone(cached);
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch('/api/settings');
        if (!res.ok) return;
        const data = (await res.json()) as { timezone?: string };
        if (cancelled || !data.timezone?.trim()) return;
        setTimezone(data.timezone.trim());
        saveTimezone(data.timezone.trim(), userId);
      } catch {
        /* keep cached / detected tz */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const greetingTitle = useMemo(() => {
    const base = t(greetingKeyForHour(hourInTimezone(timezone)));
    return firstName ? `${base}, ${firstName}` : base;
  }, [t, timezone, firstName]);

  const dateLabel = useMemo(() => {
    const raw = new Date().toLocaleDateString(localeTag(language), {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
      timeZone: timezone,
    });
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }, [language, timezone]);

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
        shortcuts?: unknown;
        stickyColor?: unknown;
        sticky_color?: unknown;
        message?: string;
        error?: string;
      };
      if (!res.ok) {
        throw new Error(json.message || json.error || 'Failed to load home');
      }
      return {
        stickies: (json.stickies || []).map(mapSticky),
        kanban: (json.kanban || []).map(mapKanban),
        shortcuts: normalizeHomeShortcuts(json.shortcuts),
        stickyColor: normalizeStickyColor(
          json.stickyColor ?? json.sticky_color
        ),
      };
    },
  });

  const stickyTasks = data?.stickies ?? [];
  const kanban = data?.kanban ?? [];
  const shortcutKeys = data?.shortcuts ?? DEFAULT_HOME_SHORTCUTS;
  const stickyColor = data?.stickyColor ?? DEFAULT_STICKY_COLOR;
  const noteTheme = stickyTheme(stickyColor);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [activityFilter, setActivityFilter] = useState<ActivityCategory>('all');
  const activities: ActivityItem[] = [];

  const [draftKind, setDraftKind] = useState<DraftKind>(null);
  const [draftText, setDraftText] = useState('');
  const [draftDueDate, setDraftDueDate] = useState('');
  const [editingSticky, setEditingSticky] = useState<StickyTask | null>(null);
  const [editShortcutsOpen, setEditShortcutsOpen] = useState(false);
  const [draftShortcuts, setDraftShortcuts] = useState<HomeShortcutKey[]>([]);
  const [draftCategory, setDraftCategory] = useState('admin.catGeneral');
  const [customCategoryDraft, setCustomCategoryDraft] = useState('');
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [dropColumnId, setDropColumnId] = useState<KanbanColumnId | null>(null);
  const [categoryMenuTaskId, setCategoryMenuTaskId] = useState<string | null>(null);

  useEffect(() => {
    if (draftKind) {
      setDraftText('');
      setDraftDueDate('');
      setDraftCategory('admin.catGeneral');
      setCustomCategoryDraft('');
      setEditingSticky(null);
    }
  }, [draftKind]);

  useEffect(() => {
    if (editingSticky) {
      setDraftText(editingSticky.text);
      setDraftKind(null);
    }
  }, [editingSticky]);

  useEffect(() => {
    if (editShortcutsOpen) {
      setDraftShortcuts([...shortcutKeys]);
    }
  }, [editShortcutsOpen, shortcutKeys]);

  const invalidateHome = () =>
    queryClient.invalidateQueries({ queryKey: homeQueryKey });

  const createMutation = useMutation({
    mutationFn: async (input: {
      kind: 'sticky' | 'kanban';
      text: string;
      dueDate?: string;
      category?: string;
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
                category: input.category || 'admin.catGeneral',
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
      setDraftCategory('admin.catGeneral');
      setCustomCategoryDraft('');
      void invalidateHome();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Could not save');
    },
  });

  const patchStickyMutation = useMutation({
    mutationFn: async (input: { id: string; done?: boolean; text?: string }) => {
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
          text: input.text,
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
        shortcuts?: HomeShortcutKey[];
      }>(homeQueryKey);
      if (prev) {
        queryClient.setQueryData(homeQueryKey, {
          ...prev,
          stickies: prev.stickies.map((s) =>
            s.id === input.id
              ? {
                  ...s,
                  done: typeof input.done === 'boolean' ? input.done : s.done,
                  text:
                    typeof input.text === 'string' && input.text.trim()
                      ? input.text.trim()
                      : s.text,
                }
              : s
          ),
        });
      }
      return { prev };
    },
    onSuccess: (_data, input) => {
      if (typeof input.text === 'string') {
        setEditingSticky(null);
        setDraftText('');
      }
    },
    onError: (_err, _input, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(homeQueryKey, ctx.prev);
      toast.error('Could not update note');
    },
    onSettled: () => void invalidateHome(),
  });

  const deleteStickyMutation = useMutation({
    mutationFn: async (id: string) => {
      const qs = new URLSearchParams({
        workspaceId: activeWorkspaceId,
        id,
        kind: 'sticky',
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
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: homeQueryKey });
      const prev = queryClient.getQueryData<{
        stickies: StickyTask[];
        kanban: KanbanTask[];
        shortcuts?: HomeShortcutKey[];
      }>(homeQueryKey);
      if (prev) {
        queryClient.setQueryData(homeQueryKey, {
          ...prev,
          stickies: prev.stickies.filter((s) => s.id !== id),
        });
      }
      return { prev };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(homeQueryKey, ctx.prev);
      toast.error('Could not delete note');
    },
    onSettled: () => void invalidateHome(),
  });

  const moveKanbanMutation = useMutation({
    mutationFn: async (input: {
      id: string;
      column?: KanbanColumnId;
      category?: string;
    }) => {
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
          category: input.category,
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
            task.id === input.id
              ? {
                  ...task,
                  column: input.column ?? task.column,
                  category: input.category ?? task.category,
                }
              : task
          ),
        });
      }
      return { prev };
    },
    onError: (_err, _input, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(homeQueryKey, ctx.prev);
      toast.error('Could not update task');
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

  const saveShortcutsMutation = useMutation({
    mutationFn: async (shortcuts: HomeShortcutKey[]) => {
      const res = await fetch('/api/admin/home', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-workspace-id': activeWorkspaceId,
        },
        body: JSON.stringify({
          kind: 'shortcuts',
          shortcuts,
          workspaceId: activeWorkspaceId,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        message?: string;
        error?: string;
        shortcuts?: unknown;
      };
      if (!res.ok) {
        throw new Error(json.message || json.error || 'Save failed');
      }
      return normalizeHomeShortcuts(json.shortcuts ?? shortcuts);
    },
    onSuccess: (shortcuts) => {
      queryClient.setQueryData(homeQueryKey, (prev: unknown) => {
        const typed = prev as
          | {
              stickies: StickyTask[];
              kanban: KanbanTask[];
              shortcuts: HomeShortcutKey[];
              stickyColor: StickyColorId;
            }
          | undefined;
        if (!typed) {
          return {
            stickies: [],
            kanban: [],
            shortcuts,
            stickyColor: DEFAULT_STICKY_COLOR,
          };
        }
        return { ...typed, shortcuts };
      });
      setEditShortcutsOpen(false);
      void invalidateHome();
      toast.success('Saved');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Could not save shortcuts');
    },
  });

  const saveStickyColorMutation = useMutation({
    mutationFn: async (color: StickyColorId) => {
      const res = await fetch('/api/admin/home', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-workspace-id': activeWorkspaceId,
        },
        body: JSON.stringify({
          kind: 'sticky_color',
          stickyColor: color,
          workspaceId: activeWorkspaceId,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        message?: string;
        error?: string;
        stickyColor?: unknown;
      };
      if (!res.ok) {
        throw new Error(json.message || json.error || 'Save failed');
      }
      return normalizeStickyColor(json.stickyColor ?? color);
    },
    onMutate: async (color) => {
      await queryClient.cancelQueries({ queryKey: homeQueryKey });
      const prev = queryClient.getQueryData<{
        stickies: StickyTask[];
        kanban: KanbanTask[];
        shortcuts: HomeShortcutKey[];
        stickyColor: StickyColorId;
      }>(homeQueryKey);
      if (prev) {
        queryClient.setQueryData(homeQueryKey, { ...prev, stickyColor: color });
      }
      return { prev };
    },
    onSuccess: () => setColorPickerOpen(false),
    onError: (_err, _color, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(homeQueryKey, ctx.prev);
      toast.error('Could not save note color');
    },
    onSettled: () => void invalidateHome(),
  });

  const go = (section: AdminSection) => {
    if (section === 'calendar') {
      router.push('/planner');
      return;
    }
    if (section === 'ads') {
      router.push('/ads');
      return;
    }
    setSection(section);
    router.push(`/admin?tab=${section}`);
  };

  const toggleDraftShortcut = (key: HomeShortcutKey) => {
    setDraftShortcuts((prev) => {
      if (prev.includes(key)) return prev.filter((k) => k !== key);
      if (prev.length >= MAX_HOME_SHORTCUTS) return prev;
      return [...prev, key];
    });
  };

  const submitDraft = () => {
    const text = draftText.trim();
    if (!text) return;
    if (editingSticky) {
      patchStickyMutation.mutate({ id: editingSticky.id, text });
      return;
    }
    if (!draftKind) return;
    const category =
      draftCategory === '__custom__'
        ? customCategoryDraft.trim() || 'admin.catGeneral'
        : draftCategory;
    createMutation.mutate({
      kind: draftKind,
      text,
      dueDate: draftKind === 'kanban' ? draftDueDate.trim() || undefined : undefined,
      category: draftKind === 'kanban' ? category : undefined,
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
    { id: 'done', titleKey: 'admin.colDone', dot: 'bg-[#2C3B2E]' },
  ];

  const shortcuts = shortcutKeys.map((key) => {
    const meta = HOME_SHORTCUT_META[key];
    const nav = ADMIN_NAV_ITEMS.find((item) => item.key === key);
    return {
      key,
      title: t(meta.labelKey),
      detail: t(meta.openKey),
      icon: nav?.icon ?? Link2,
      accent: meta.accent,
      onClick: () => go(key),
    };
  });

  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <p className="font-inter text-[10px] font-medium uppercase tracking-[0.16em] text-[#8A857D]">
          {t('admin.homeEyebrow')}
        </p>
        <h1 className="font-playfair font-medium text-[28px] sm:text-[34px] leading-tight text-[#2C2621] tracking-[-0.02em] mt-2">
          {greetingTitle}
        </h1>
        <p className="font-inter text-sm text-[#8A857D] font-normal mt-2 max-w-xl leading-relaxed">
          {t('admin.homeSub')}
        </p>
      </div>

      {/* Hero: Post-it + shortcuts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-start">
        <div className="lg:col-span-5">
          <div
            className="relative border border-[#E6E3DB] shadow-none rounded-xl p-8 transition-colors"
            style={{
              backgroundColor: noteTheme.bg,
              borderColor: noteTheme.border,
            }}
          >
            <span
              className="w-2.5 h-2.5 rounded-full bg-[#B85C38] absolute -top-1 left-1/2 -translate-x-1/2"
              aria-hidden
            />
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4 pt-1">
              <h2 className="font-playfair font-medium text-lg text-[#2C2621] tracking-tight">
                {t('admin.focusTitle')}
              </h2>
              <span
                className="inline-flex items-center rounded-full bg-[#FFFFFF]/90 border px-2.5 py-1 text-[10px] font-medium text-[#2C3B2E] capitalize"
                style={{ borderColor: noteTheme.chipBorder }}
              >
                {dateLabel}
              </span>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center gap-2 py-8 text-[#8A857D] text-sm font-medium">
                <Loader2 size={16} className="animate-spin" />
                …
              </div>
            ) : stickyTasks.length === 0 ? (
              <p className="font-playfair italic text-base text-[#8A857D] py-8 text-center">
                {t('admin.stickyEmpty')}
              </p>
            ) : (
              <ul className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
                {stickyTasks.map((task) => (
                  <li
                    key={task.id}
                    className="group flex items-start gap-1.5 min-h-[44px] rounded-xl px-1.5 py-1 transition-colors"
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = noteTheme.rowHover;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        patchStickyMutation.mutate({
                          id: task.id,
                          done: !task.done,
                        })
                      }
                      aria-label={task.done ? 'Mark incomplete' : 'Mark complete'}
                      className="mt-0.5 h-9 w-9 flex items-center justify-center flex-shrink-0 rounded-lg"
                    >
                      <span
                        className={`h-5 w-5 rounded-md border-2 flex items-center justify-center ${
                          task.done
                            ? 'bg-[#2C3B2E] border-[#2C3B2E] text-[#F9F8F6]'
                            : 'bg-white/80'
                        }`}
                        style={
                          task.done
                            ? undefined
                            : { borderColor: noteTheme.checkBorder }
                        }
                      >
                        {task.done ? <Check size={12} strokeWidth={3} /> : null}
                      </span>
                    </button>
                    <p
                      className={`flex-1 min-w-0 pt-2 text-sm font-semibold leading-snug ${
                        task.done
                          ? 'text-[#8A857D] line-through decoration-[#8A857D]'
                          : 'text-[#2C2621]'
                      }`}
                    >
                      {task.text}
                    </p>
                    <div className="flex items-center gap-0.5 flex-shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => setEditingSticky(task)}
                        aria-label={t('admin.editSticky')}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[#2C3B2E]/70 hover:bg-white/80 hover:text-[#2C3B2E] transition-colors"
                      >
                        <Pencil size={14} strokeWidth={2.25} />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteStickyMutation.mutate(task.id)}
                        disabled={deleteStickyMutation.isPending}
                        aria-label={t('admin.deleteSticky')}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[#8A857D] hover:bg-rose-50 hover:text-rose-600 transition-colors disabled:opacity-50"
                      >
                        <Trash2 size={14} strokeWidth={2.25} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-4 flex items-center justify-between gap-2 pr-10">
              <button
                type="button"
                onClick={() => setDraftKind('sticky')}
                className="inline-flex items-center gap-1.5 min-h-[44px] px-3 rounded-xl text-xs font-medium text-[#2C3B2E]/80 hover:bg-white/60 transition-colors"
              >
                <Plus size={14} strokeWidth={2.5} />
                {t('admin.addSticky')}
              </button>
            </div>

            <div className="absolute bottom-3 right-3 z-10">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setColorPickerOpen((o) => !o)}
                  aria-label={t('admin.stickyColor')}
                  aria-expanded={colorPickerOpen}
                  className="inline-flex h-8 w-8 min-h-[32px] min-w-[32px] items-center justify-center rounded-full text-[#2C3B2E]/35 hover:text-[#2C3B2E]/70 hover:bg-white/50 transition-colors"
                >
                  <Palette size={13} strokeWidth={2} />
                </button>
                {colorPickerOpen ? (
                  <div
                    className="absolute right-0 bottom-full mb-2 z-20 flex flex-wrap gap-1.5 w-[148px] p-2 rounded-xl bg-white border border-[#E6E3DB] shadow-[0_12px_30px_-12px_rgba(44,38,33,0.08)]"
                    role="listbox"
                    aria-label={t('admin.stickyColor')}
                  >
                    {STICKY_COLOR_IDS.map((id) => {
                      const swatch = stickyTheme(id);
                      const selected = id === stickyColor;
                      return (
                        <button
                          key={id}
                          type="button"
                          role="option"
                          aria-selected={selected}
                          disabled={saveStickyColorMutation.isPending}
                          onClick={() => saveStickyColorMutation.mutate(id)}
                          className={`h-8 w-8 rounded-full border-2 transition-transform hover:scale-105 disabled:opacity-50 ${
                            selected
                              ? 'border-[#2C3B2E] ring-2 ring-[#2C3B2E]/20'
                              : 'border-white shadow-sm'
                          }`}
                          style={{ backgroundColor: swatch.bg }}
                          title={id}
                        />
                      );
                    })}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 space-y-2.5">
          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={() => setEditShortcutsOpen(true)}
              className="inline-flex items-center gap-1.5 min-h-[44px] px-3 rounded-xl text-xs font-medium text-[#8A857D] hover:text-[#2C3B2E] hover:bg-white border border-transparent hover:border-[#E6E3DB] transition-colors"
            >
              <Pencil size={13} strokeWidth={2.5} />
              {t('admin.editShortcuts')}
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {shortcuts.map((card) => {
              const Icon = card.icon;
              return (
                <button
                  key={card.key}
                  type="button"
                  onClick={card.onClick}
                  className={`${adminCardClass} p-4 sm:p-5 text-left hover:border-[#2C3B2E]/50 hover:shadow-none transition-all min-h-[44px]`}
                >
                  <span
                    className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${card.accent}`}
                  >
                    <Icon size={18} strokeWidth={2.25} />
                  </span>
                  <p className="mt-3 font-playfair font-medium text-base text-[#2C2621] tracking-tight leading-tight">
                    {card.title}
                  </p>
                  <p className="mt-1 text-xs font-medium text-[#8A857D] leading-snug">
                    {card.detail}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Kanban + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-start">
        <div className={`lg:col-span-7 ${adminCardClass} p-4 sm:p-5`}>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 className="font-playfair font-medium text-lg text-[#2C2621] tracking-tight">
              {t('admin.kanbanTitle')}
            </h2>
            <button
              type="button"
              onClick={() => setDraftKind('kanban')}
              className="inline-flex items-center gap-1.5 min-h-[44px] px-3.5 rounded-xl bg-[#2C3B2E] text-[#F9F8F6] text-xs font-medium hover:bg-[#243228] transition-colors"
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
                const isDropTarget = dropColumnId === col.id && draggingTaskId;
                return (
                  <div
                    key={col.id}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                      setDropColumnId(col.id);
                    }}
                    onDragLeave={(e) => {
                      if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                        setDropColumnId((cur) => (cur === col.id ? null : cur));
                      }
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const id =
                        e.dataTransfer.getData('text/task-id') || draggingTaskId;
                      setDropColumnId(null);
                      setDraggingTaskId(null);
                      if (!id) return;
                      const task = kanban.find((t) => t.id === id);
                      if (!task || task.column === col.id) return;
                      moveKanbanMutation.mutate({ id, column: col.id });
                    }}
                    className={`rounded-xl border p-3 min-h-[220px] transition-colors ${
                      isDropTarget
                        ? 'border-[#2C3B2E] bg-[rgba(44,59,46,0.08)]'
                        : 'border-[#E6E3DB] bg-[#F0EFEA]/50'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-3 px-0.5">
                      <span className={`h-2 w-2 rounded-full ${col.dot}`} />
                      <p className="text-[11px] font-medium text-[#2C2621]">
                        {t(col.titleKey)}
                      </p>
                      <span className="ml-auto text-[10px] font-mono font-medium text-[#8A857D]">
                        {tasks.length}
                      </span>
                    </div>
                    {isLoading ? (
                      <div className="flex justify-center py-8 text-[#8A857D]">
                        <Loader2 size={16} className="animate-spin" />
                      </div>
                    ) : tasks.length === 0 ? (
                      <p className="text-[11px] text-[#8A857D] font-medium px-0.5 py-4">
                        {draggingTaskId
                          ? 'Drop here'
                          : t('admin.kanbanEmpty')}
                      </p>
                    ) : (
                      <ul className="space-y-2">
                        {tasks.map((task) => {
                          const menuOpen = categoryMenuTaskId === task.id;
                          const isPreset = CATEGORY_PRESETS.some(
                            (p) => p.value === task.category
                          );
                          return (
                            <li
                              key={task.id}
                              draggable
                              onDragStart={(e) => {
                                e.dataTransfer.setData('text/task-id', task.id);
                                e.dataTransfer.effectAllowed = 'move';
                                setDraggingTaskId(task.id);
                                setCategoryMenuTaskId(null);
                              }}
                              onDragEnd={() => {
                                setDraggingTaskId(null);
                                setDropColumnId(null);
                              }}
                              className={`rounded-xl border border-[#E6E3DB] bg-white p-3 shadow-none cursor-grab active:cursor-grabbing touch-manipulation ${
                                draggingTaskId === task.id ? 'opacity-60' : ''
                              }`}
                            >
                              <div className="flex items-start gap-1.5">
                                <span
                                  className="mt-0.5 text-[#C4BFB6] flex-shrink-0"
                                  aria-hidden
                                >
                                  <GripVertical size={14} strokeWidth={2.25} />
                                </span>
                                <p
                                  className={`flex-1 min-w-0 text-[12px] font-medium leading-snug ${
                                    col.id === 'done'
                                      ? 'text-[#8A857D] line-through'
                                      : 'text-[#2C2621]'
                                  }`}
                                >
                                  {task.title}
                                </p>
                                <button
                                  type="button"
                                  onClick={() =>
                                    deleteKanbanMutation.mutate(task.id)
                                  }
                                  className="h-9 w-9 min-h-[36px] min-w-[36px] -mt-1 -mr-1 inline-flex items-center justify-center rounded-lg text-[#8A857D] hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                  aria-label="Delete task"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                              {task.dueDate ? (
                                <p className="mt-1.5 ml-5 inline-flex items-center gap-1 text-[10px] font-semibold text-[#8A857D]">
                                  <CalendarDays
                                    size={11}
                                    strokeWidth={2.25}
                                    aria-hidden
                                  />
                                  <span>
                                    {t('admin.taskDeadline')}:{' '}
                                    {formatTaskDeadline(task.dueDate, language)}
                                  </span>
                                </p>
                              ) : null}
                              <div className="mt-2 ml-5 flex items-center justify-between gap-2 relative">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCategoryMenuTaskId((cur) =>
                                      cur === task.id ? null : task.id
                                    );
                                    setCustomCategoryDraft(
                                      isPreset ? '' : task.category
                                    );
                                  }}
                                  className="inline-flex items-center min-h-[28px] rounded-full bg-[#F0EFEA] px-2 py-0.5 text-[9px] font-medium uppercase tracking-wide text-[#8A857D] hover:bg-[#E6E3DB] transition-colors"
                                  aria-expanded={menuOpen}
                                  aria-haspopup="listbox"
                                >
                                  {categoryLabel(task.category, t)}
                                </button>
                                <span className="h-6 w-6 rounded-full bg-[#2C3B2E] text-[#F9F8F6] text-[10px] font-medium flex items-center justify-center">
                                  {task.assignee}
                                </span>
                                {menuOpen ? (
                                  <div
                                    className="absolute left-0 top-full mt-1.5 z-30 w-[200px] rounded-xl border border-[#E6E3DB] bg-white p-2 shadow-[0_12px_30px_-12px_rgba(44,38,33,0.12)]"
                                    role="listbox"
                                  >
                                    {CATEGORY_PRESETS.map((preset) => {
                                      const selected =
                                        task.category === preset.value;
                                      const label = preset.labelKey
                                        ? t(preset.labelKey)
                                        : preset.label || preset.value;
                                      return (
                                        <button
                                          key={preset.value}
                                          type="button"
                                          role="option"
                                          aria-selected={selected}
                                          onClick={() => {
                                            setCategoryMenuTaskId(null);
                                            if (task.category === preset.value)
                                              return;
                                            moveKanbanMutation.mutate({
                                              id: task.id,
                                              category: preset.value,
                                            });
                                          }}
                                          className={`w-full text-left min-h-[40px] px-2.5 rounded-lg text-[11px] font-medium transition-colors ${
                                            selected
                                              ? 'bg-[rgba(44,59,46,0.08)] text-[#2C3B2E]'
                                              : 'text-[#2C2621] hover:bg-[#F0EFEA]'
                                          }`}
                                        >
                                          {label}
                                        </button>
                                      );
                                    })}
                                    <div className="mt-1.5 pt-1.5 border-t border-[#E6E3DB] space-y-1.5">
                                      <p className="px-2.5 text-[9px] font-medium uppercase tracking-wide text-[#8A857D]">
                                        Custom
                                      </p>
                                      <div className="flex gap-1.5 px-1">
                                        <input
                                          value={customCategoryDraft}
                                          onChange={(e) =>
                                            setCustomCategoryDraft(e.target.value)
                                          }
                                          onKeyDown={(e) => {
                                            if (e.key !== 'Enter') return;
                                            e.preventDefault();
                                            const next =
                                              customCategoryDraft.trim();
                                            if (!next) return;
                                            setCategoryMenuTaskId(null);
                                            moveKanbanMutation.mutate({
                                              id: task.id,
                                              category: next.slice(0, 48),
                                            });
                                          }}
                                          placeholder="Your category"
                                          className="flex-1 h-9 min-h-[36px] rounded-lg border border-[#E6E3DB] bg-[#F0EFEA] px-2 text-[11px] font-medium text-[#2C2621]"
                                          maxLength={48}
                                        />
                                        <button
                                          type="button"
                                          disabled={!customCategoryDraft.trim()}
                                          onClick={() => {
                                            const next =
                                              customCategoryDraft.trim();
                                            if (!next) return;
                                            setCategoryMenuTaskId(null);
                                            moveKanbanMutation.mutate({
                                              id: task.id,
                                              category: next.slice(0, 48),
                                            });
                                          }}
                                          className="h-9 min-h-[36px] px-2.5 rounded-lg bg-[#2C3B2E] text-[#F9F8F6] text-[10px] font-medium disabled:opacity-40"
                                        >
                                          Set
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                ) : null}
                              </div>
                            </li>
                          );
                        })}
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
            <h2 className="font-playfair font-medium text-lg text-[#2C2621] tracking-tight">
              {t('admin.activityTitle')}
            </h2>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[rgba(44,59,46,0.08)] border border-[rgba(44,59,46,0.18)] px-2.5 py-1 text-[10px] font-medium text-[#2C3B2E]">
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
                  className={`inline-flex items-center min-h-[40px] px-3 rounded-full text-[11px] font-medium transition-colors ${
                    active
                      ? 'bg-[#2C3B2E] text-[#F9F8F6]'
                      : 'bg-white border border-[#E6E3DB] text-[#8A857D] hover:border-[#E6E3DB]'
                  }`}
                >
                  {t(f.labelKey)}
                </button>
              );
            })}
          </div>

          <ul className="space-y-2.5">
            {filteredActivities.length === 0 ? (
              <li className="font-playfair italic text-base text-[#8A857D] py-8 text-center">
                {t('admin.activityEmpty')}
              </li>
            ) : (
              filteredActivities.map((item) => (
                <li
                  key={item.id}
                  className="rounded-xl border border-[#E6E3DB] bg-[#F0EFEA]/50 px-3.5 py-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[12px] font-medium text-[#2C2621] leading-snug">
                      {item.title}
                    </p>
                    <span className="text-[10px] font-mono font-medium text-[#8A857D] flex-shrink-0">
                      {item.time}
                    </span>
                  </div>
                  <p className="mt-1 text-[12px] font-medium text-[#8A857D] leading-snug">
                    {item.body}
                  </p>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>

      {/* Add / edit sticky or kanban dialog — replaces blocked window.prompt */}
      <Dialog
        open={draftKind !== null || editingSticky !== null}
        onOpenChange={(open) => {
          if (
            !open &&
            !createMutation.isPending &&
            !patchStickyMutation.isPending
          ) {
            setDraftKind(null);
            setEditingSticky(null);
          }
        }}
      >
        <DialogContent className="max-w-[min(420px,94vw)] rounded-xl border-[#E6E3DB] p-0 gap-0">
          <DialogHeader className="px-5 pt-5 pb-2">
            <DialogTitle className="font-playfair text-lg font-medium text-[#2C2621]">
              {editingSticky
                ? t('admin.editSticky')
                : draftKind === 'sticky'
                  ? t('admin.stickyPrompt')
                  : t('admin.taskPrompt')}
            </DialogTitle>
            <DialogDescription className="text-xs text-[#8A857D] font-medium">
              {editingSticky || draftKind === 'sticky'
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
                editingSticky || draftKind === 'sticky'
                  ? t('admin.stickyPrompt')
                  : t('admin.taskPrompt')
              }
              className="h-11 min-h-[44px] rounded-xl border-[#E6E3DB] text-sm font-semibold"
              disabled={
                createMutation.isPending || patchStickyMutation.isPending
              }
            />
            {draftKind === 'kanban' && !editingSticky ? (
              <>
                <div className="space-y-1.5">
                  <label
                    htmlFor="admin-task-deadline"
                    className="block text-[11px] font-medium uppercase tracking-wide text-[#8A857D]"
                  >
                    {t('admin.taskDeadline')}
                  </label>
                  <Input
                    id="admin-task-deadline"
                    type="date"
                    value={draftDueDate}
                    onChange={(e) => setDraftDueDate(e.target.value)}
                    className="h-11 min-h-[44px] rounded-xl border-[#E6E3DB] text-sm font-semibold"
                    disabled={createMutation.isPending}
                  />
                </div>
                <div className="space-y-1.5">
                  <p className="block text-[11px] font-medium uppercase tracking-wide text-[#8A857D]">
                    Category
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {CATEGORY_PRESETS.map((preset) => {
                      const selected = draftCategory === preset.value;
                      const label = preset.labelKey
                        ? t(preset.labelKey)
                        : preset.label || preset.value;
                      return (
                        <button
                          key={preset.value}
                          type="button"
                          onClick={() => setDraftCategory(preset.value)}
                          className={`inline-flex items-center min-h-[40px] px-3 rounded-full text-[11px] font-medium transition-colors ${
                            selected
                              ? 'bg-[#2C3B2E] text-[#F9F8F6]'
                              : 'bg-white border border-[#E6E3DB] text-[#8A857D] hover:border-[#2C3B2E]/40'
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => setDraftCategory('__custom__')}
                      className={`inline-flex items-center min-h-[40px] px-3 rounded-full text-[11px] font-medium transition-colors ${
                        draftCategory === '__custom__'
                          ? 'bg-[#2C3B2E] text-[#F9F8F6]'
                          : 'bg-white border border-[#E6E3DB] text-[#8A857D] hover:border-[#2C3B2E]/40'
                      }`}
                    >
                      Custom
                    </button>
                  </div>
                  {draftCategory === '__custom__' ? (
                    <Input
                      value={customCategoryDraft}
                      onChange={(e) => setCustomCategoryDraft(e.target.value)}
                      placeholder="Your category"
                      maxLength={48}
                      className="h-11 min-h-[44px] rounded-xl border-[#E6E3DB] text-sm font-semibold"
                      disabled={createMutation.isPending}
                    />
                  ) : null}
                </div>
              </>
            ) : null}
            <DialogFooter className="flex flex-row gap-2 sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  setDraftKind(null);
                  setEditingSticky(null);
                }}
                disabled={
                  createMutation.isPending || patchStickyMutation.isPending
                }
                className="inline-flex items-center justify-center min-h-[44px] px-4 rounded-xl border border-[#E6E3DB] bg-white text-xs font-medium text-[#8A857D] hover:bg-[#F0EFEA] transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={
                  !draftText.trim() ||
                  createMutation.isPending ||
                  patchStickyMutation.isPending
                }
                className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-4 rounded-xl bg-[#2C3B2E] text-[#F9F8F6] text-xs font-medium hover:bg-[#243228] disabled:opacity-50 transition-colors"
              >
                {createMutation.isPending || patchStickyMutation.isPending ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : editingSticky ? null : (
                  <Plus size={14} strokeWidth={2.5} />
                )}
                {editingSticky
                  ? t('admin.saveSticky')
                  : draftKind === 'sticky'
                    ? t('admin.addSticky')
                    : t('admin.newTask')}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editShortcutsOpen}
        onOpenChange={(open) => {
          if (!saveShortcutsMutation.isPending) setEditShortcutsOpen(open);
        }}
      >
        <DialogContent className="sm:max-w-md rounded-xl border-[#E6E3DB] p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-5 pt-5 pb-2">
            <DialogTitle className="font-playfair font-medium text-lg text-[#2C2621]">
              {t('admin.editShortcutsTitle')}
            </DialogTitle>
            <DialogDescription className="text-sm text-[#8A857D] font-medium">
              {t('admin.editShortcutsSub')}
            </DialogDescription>
          </DialogHeader>
          <div className="px-5 pb-2 grid grid-cols-1 gap-2 max-h-[50vh] overflow-y-auto">
            {HOME_SHORTCUT_KEYS.map((key) => {
              const selected = draftShortcuts.includes(key);
              const atMax = draftShortcuts.length >= MAX_HOME_SHORTCUTS && !selected;
              const meta = HOME_SHORTCUT_META[key];
              const nav = ADMIN_NAV_ITEMS.find((item) => item.key === key);
              const Icon = nav?.icon ?? Link2;
              return (
                <button
                  key={key}
                  type="button"
                  disabled={atMax}
                  onClick={() => toggleDraftShortcut(key)}
                  className={`flex items-center gap-3 min-h-[44px] rounded-xl border px-3 py-2.5 text-left transition-colors disabled:opacity-40 ${
                    selected
                      ? 'border-[#2C3B2E] bg-[rgba(44,59,46,0.06)]'
                      : 'border-[#E6E3DB] bg-white hover:border-[#E6E3DB]'
                  }`}
                >
                  <span
                    className={`inline-flex h-9 w-9 items-center justify-center rounded-lg flex-shrink-0 ${meta.accent}`}
                  >
                    <Icon size={16} strokeWidth={2.25} />
                  </span>
                  <span className="flex-1 text-sm font-medium text-[#2C2621]">
                    {t(meta.labelKey)}
                  </span>
                  <span
                    className={`h-5 w-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 ${
                      selected
                        ? 'bg-[#2C3B2E] border-[#2C3B2E] text-white'
                        : 'bg-white border-[#E6E3DB]'
                    }`}
                  >
                    {selected ? <Check size={12} strokeWidth={3} /> : null}
                  </span>
                </button>
              );
            })}
          </div>
          <DialogFooter className="px-5 pb-5 pt-3 flex flex-row gap-2 sm:justify-end">
            <button
              type="button"
              onClick={() => setEditShortcutsOpen(false)}
              disabled={saveShortcutsMutation.isPending}
              className="inline-flex items-center justify-center min-h-[44px] px-4 rounded-xl border border-[#E6E3DB] bg-white text-xs font-medium text-[#8A857D] hover:bg-[#F0EFEA] transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={
                draftShortcuts.length === 0 || saveShortcutsMutation.isPending
              }
              onClick={() => saveShortcutsMutation.mutate(draftShortcuts)}
              className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-4 rounded-xl bg-[#2C3B2E] text-[#F9F8F6] text-xs font-medium hover:bg-[#243228] disabled:opacity-50 transition-colors"
            >
              {saveShortcutsMutation.isPending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : null}
              {t('admin.saveShortcuts')}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
