'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BarChart3,
  CalendarDays,
  Check,
  Link2,
  Plus,
  Radio,
} from 'lucide-react';
import { useAdminNav } from '@/components/admin/AdminNavContext';
import { adminCardClass } from '@/components/admin/AdminUi';
import { localeTag, useLanguage, type NestedKey } from '@/lib/i18n';

type StickyTask = { id: string; text: string; done: boolean };

type KanbanColumnId = 'todo' | 'doing' | 'done';

type KanbanTask = {
  id: string;
  title: string;
  categoryKey: NestedKey;
  assignee: string;
  column: KanbanColumnId;
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

/** Admin Command Center — post-it focus, shortcuts, kanban, activity stream. */
export default function AdminHomeDashboard() {
  const router = useRouter();
  const { setSection } = useAdminNav();
  const { t, language } = useLanguage();

  const dateLabel = useMemo(() => {
    const raw = new Date().toLocaleDateString(localeTag(language), {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
    });
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }, [language]);

  const [stickyTasks, setStickyTasks] = useState<StickyTask[]>([]);
  const [kanban, setKanban] = useState<KanbanTask[]>([]);
  const [activityFilter, setActivityFilter] = useState<ActivityCategory>('all');
  const activities: ActivityItem[] = [];

  const go = (section: 'calendar' | 'analytics' | 'biobuilder') => {
    if (section === 'calendar') {
      router.push('/planner');
      return;
    }
    setSection(section);
    router.push(`/admin?tab=${section}`);
  };

  const toggleSticky = (id: string) => {
    setStickyTasks((prev) =>
      prev.map((task) =>
        task.id === id ? { ...task, done: !task.done } : task
      )
    );
  };

  const addStickyNote = () => {
    const text = window.prompt(t('admin.stickyPrompt'));
    if (!text?.trim()) return;
    setStickyTasks((prev) => [
      ...prev,
      { id: `s-${Date.now()}`, text: text.trim(), done: false },
    ]);
  };

  const addKanbanTask = () => {
    const title = window.prompt(t('admin.taskPrompt'));
    if (!title?.trim()) return;
    setKanban((prev) => [
      {
        id: `k-${Date.now()}`,
        title: title.trim(),
        categoryKey: 'admin.catGeneral',
        assignee: 'E',
        column: 'todo',
      },
      ...prev,
    ]);
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

            {stickyTasks.length === 0 ? (
              <p className="text-sm text-slate-400 font-medium py-6 text-center">
                {t('admin.stickyEmpty')}
              </p>
            ) : (
              <ul className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
                {stickyTasks.map((task) => (
                  <li key={task.id}>
                    <button
                      type="button"
                      onClick={() => toggleSticky(task.id)}
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
              onClick={addStickyNote}
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
              onClick={addKanbanTask}
              className="inline-flex items-center gap-1.5 min-h-[44px] px-3.5 rounded-xl bg-[#2B2568] text-white text-xs font-bold hover:bg-[#1e1b4b] transition-colors"
            >
              <Plus size={14} strokeWidth={2.5} />
              {t('admin.newTask')}
            </button>
          </div>

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
                  {tasks.length === 0 ? (
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
                          <div className="mt-2 flex items-center justify-between gap-2">
                            <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-slate-500">
                              {t(task.categoryKey)}
                            </span>
                            <span className="h-6 w-6 rounded-full bg-[#2B2568] text-white text-[10px] font-extrabold flex items-center justify-center">
                              {task.assignee}
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
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
    </div>
  );
}
