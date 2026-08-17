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

type StickyTask = { id: string; text: string; done: boolean };

type KanbanColumnId = 'todo' | 'doing' | 'done';

type KanbanTask = {
  id: string;
  title: string;
  category: string;
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

const FILTERS: { id: ActivityCategory; label: string }[] = [
  { id: 'all', label: 'Alla' },
  { id: 'feedback', label: '💬 Feedback' },
  { id: 'purchase', label: '💰 Köp' },
  { id: 'community', label: '👥 Community' },
  { id: 'dm', label: '✉️ DMs & Mejl' },
];

function todayBadge(): string {
  return new Date().toLocaleDateString('sv-SE', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  });
}

/** Admin Command Center — post-it focus, shortcuts, kanban, activity stream. */
export default function AdminHomeDashboard() {
  const router = useRouter();
  const { setSection } = useAdminNav();
  const dateLabel = useMemo(() => {
    const raw = todayBadge();
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }, []);

  const [stickyTasks, setStickyTasks] = useState<StickyTask[]>([
    {
      id: 's1',
      text: 'Godkänn veckans 3 TikTok Reels i Planner',
      done: true,
    },
    {
      id: 's2',
      text: "Svara på 2 nya kund-kommentarer på 'Masterclass'-inlägget",
      done: false,
    },
    {
      id: 's3',
      text: 'Skicka månadsrapporten till Cherii Agency',
      done: false,
    },
    {
      id: 's4',
      text: 'Uppdatera Bio Store-teman inför helgen',
      done: false,
    },
    {
      id: 's5',
      text: 'Kolla DM-automation för #masterclass',
      done: false,
    },
  ]);

  const [kanban, setKanban] = useState<KanbanTask[]>([
    {
      id: 'k1',
      title: 'Skripta carousel för Modul 4',
      category: 'Content',
      assignee: 'E',
      column: 'todo',
    },
    {
      id: 'k2',
      title: 'Uppdatera bio-tema Aurora',
      category: 'Bio',
      assignee: 'C',
      column: 'todo',
    },
    {
      id: 'k3',
      title: 'Review TikTok Reels batch',
      category: 'Planner',
      assignee: 'E',
      column: 'doing',
    },
    {
      id: 'k4',
      title: 'DM-automation #masterclass',
      category: 'Inbox',
      assignee: 'A',
      column: 'doing',
    },
    {
      id: 'k5',
      title: 'Publicera community-välkomstpost',
      category: 'Community',
      assignee: 'E',
      column: 'done',
    },
    {
      id: 'k6',
      title: 'Skicka welcome-broadcast',
      category: 'Email',
      assignee: 'C',
      column: 'done',
    },
  ]);

  const [activityFilter, setActivityFilter] = useState<ActivityCategory>('all');
  const activities: ActivityItem[] = [
    {
      id: 'a1',
      category: 'feedback',
      title: 'Team Feedback (Cherii Agency)',
      body: 'Ser riktigt bra ut! Bild 2 i karusellen behöver…',
      time: '12 min',
    },
    {
      id: 'a2',
      category: 'purchase',
      title: 'Nytt Swish-Köp: Masterclass',
      body: '+1,499 SEK via 1-Tap Swish Checkout',
      time: '34 min',
    },
    {
      id: 'a3',
      category: 'community',
      title: 'Nytt Community-Inlägg',
      body: '@marcus_dev ställde en fråga i koden under Modul 4',
      time: '1 h',
    },
    {
      id: 'a4',
      category: 'dm',
      title: 'Instagram Comment-to-DM',
      body: 'Automatisk Private Reply skickad för #masterclass',
      time: '2 h',
    },
  ];

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
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
    );
  };

  const addStickyNote = () => {
    const text = window.prompt('Ny lapp-notering');
    if (!text?.trim()) return;
    setStickyTasks((prev) => [
      ...prev,
      { id: `s-${Date.now()}`, text: text.trim(), done: false },
    ]);
  };

  const addKanbanTask = () => {
    const title = window.prompt('Ny uppgift');
    if (!title?.trim()) return;
    setKanban((prev) => [
      {
        id: `k-${Date.now()}`,
        title: title.trim(),
        category: 'Allmänt',
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
    title: string;
    dot: string;
  }[] = [
    { id: 'todo', title: 'Att Göra / Idéer', dot: 'bg-amber-400' },
    { id: 'doing', title: 'Pågående', dot: 'bg-indigo-500' },
    { id: 'done', title: 'Klart / Granskas', dot: 'bg-emerald-500' },
  ];

  const shortcuts = [
    {
      key: 'planner' as const,
      title: 'Content Planner',
      icon: CalendarDays,
      metric: '131 Posts',
      detail: '3 redo för review',
      accent: 'bg-[#E9D5FF]/70 text-[#2B2568]',
      onClick: () => go('calendar'),
    },
    {
      key: 'analytics' as const,
      title: 'Analytics & Intäkter',
      icon: BarChart3,
      metric: '+24.5%',
      detail: '42,850 SEK denna månad',
      extra: '142 Swish-köp',
      accent: 'bg-emerald-50 text-[#10B981]',
      onClick: () => go('analytics'),
    },
    {
      key: 'bio' as const,
      title: 'Bio Store & Länkar',
      icon: Link2,
      metric: '34.8% CVR',
      detail: 'Bio Storefront, teman & UTM',
      extra: '2,410 klick totalt',
      accent: 'bg-[#FCE7F3] text-[#F472B6]',
      onClick: () => go('biobuilder'),
    },
  ];

  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <p className="text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-slate-400">
          Command Center
        </p>
        <h1 className="font-clikd-wordmark font-extrabold text-[28px] sm:text-[32px] leading-tight text-slate-900 tracking-tight mt-1">
          Admin Home
        </h1>
        <p className="text-sm text-slate-500 font-medium mt-1">
          Dagens fokus, genvägar, Kanban och senaste aktivitet — samlat på ett ställe.
        </p>
      </div>

      {/* Hero: Post-it + shortcuts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-start">
        <div className="lg:col-span-5">
          <div className="relative bg-[#E9D5FF]/90 border border-[#C4B5FD] shadow-md rounded-3xl p-6 transform -rotate-1 hover:rotate-0 transition-transform">
            <span
              className="w-7 h-7 rounded-full bg-[#F472B6] border-2 border-white absolute -top-3 left-1/2 -translate-x-1/2 shadow-sm"
              aria-hidden
            />
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4 pt-1">
              <h2 className="font-clikd-wordmark font-extrabold text-lg text-slate-900 tracking-tight">
                Dagens Fokus & To-Do&apos;s
              </h2>
              <span className="inline-flex items-center rounded-full bg-[#DDD6FE]/90 border border-[#C4B5FD]/80 px-2.5 py-1 text-[10px] font-bold text-[#2B2568] capitalize">
                {dateLabel}
              </span>
            </div>

            <ul className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
              {stickyTasks.map((task) => (
                <li key={task.id}>
                  <button
                    type="button"
                    onClick={() => toggleSticky(task.id)}
                    className="w-full flex items-start gap-2.5 text-left min-h-[44px] rounded-xl px-2 py-1.5 hover:bg-[#DDD6FE]/50 transition-colors"
                  >
                    <span
                      className={`mt-0.5 h-5 w-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 ${
                        task.done
                          ? 'bg-[#10B981] border-[#10B981] text-white'
                          : 'bg-white/80 border-[#A78BFA]'
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

            <button
              type="button"
              onClick={addStickyNote}
              className="mt-4 inline-flex items-center gap-1.5 min-h-[44px] px-3 rounded-xl text-xs font-bold text-[#2B2568]/80 hover:bg-[#DDD6FE]/60 transition-colors"
            >
              <Plus size={14} strokeWidth={2.5} />
              Lägg till lapp-notering
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
                <p className="mt-3 text-[11px] font-bold text-slate-500 leading-tight">
                  {card.title}
                </p>
                <p className="mt-1 font-mono font-extrabold text-xl text-slate-900 tabular-nums tracking-tight">
                  {card.metric}
                </p>
                <p className="mt-1 text-xs font-medium text-slate-500 leading-snug">
                  {card.detail}
                </p>
                {card.extra ? (
                  <p className="mt-0.5 text-[11px] font-mono font-bold text-[#10B981]">
                    {card.extra}
                  </p>
                ) : null}
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
              Kanban To-Do Board
            </h2>
            <button
              type="button"
              onClick={addKanbanTask}
              className="inline-flex items-center gap-1.5 min-h-[44px] px-3.5 rounded-xl bg-[#2B2568] text-white text-xs font-bold hover:bg-[#1e1b4b] transition-colors"
            >
              <Plus size={14} strokeWidth={2.5} />
              Ny Uppgift
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {columns.map((col) => {
              const tasks = kanban.filter((t) => t.column === col.id);
              return (
                <div
                  key={col.id}
                  className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3 min-h-[220px]"
                >
                  <div className="flex items-center gap-2 mb-3 px-0.5">
                    <span className={`h-2 w-2 rounded-full ${col.dot}`} />
                    <p className="text-[11px] font-extrabold text-slate-700">
                      {col.title}
                    </p>
                    <span className="ml-auto text-[10px] font-mono font-bold text-slate-400">
                      {tasks.length}
                    </span>
                  </div>
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
                            {task.category}
                          </span>
                          <span className="h-6 w-6 rounded-full bg-[#2B2568] text-white text-[10px] font-extrabold flex items-center justify-center">
                            {task.assignee}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>

        <div className={`lg:col-span-5 ${adminCardClass} p-4 sm:p-5`}>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <h2 className="font-clikd-wordmark font-extrabold text-lg text-slate-900 tracking-tight">
              Senaste Aktivitet & Notiser
            </h2>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 text-[10px] font-extrabold text-[#10B981]">
              <Radio size={11} strokeWidth={2.5} className="animate-pulse" />
              Realtid
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
                  {f.label}
                </button>
              );
            })}
          </div>

          <ul className="space-y-2.5">
            {filteredActivities.length === 0 ? (
              <li className="text-sm text-slate-400 font-medium py-6 text-center">
                Inga notiser i den här kategorin ännu.
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
