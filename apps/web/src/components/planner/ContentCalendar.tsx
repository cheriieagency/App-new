'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Filter,
  StickyNote,
  Trash2,
  X,
} from 'lucide-react';
import { PlatformIcon } from '@/components/planner/PlatformBadge';
import CalendarTimeGrid from '@/components/planner/CalendarTimeGrid';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { PlannerPost } from '@/lib/mock-content-planner';
import { isPlatformImportedPost } from '@/lib/planner/platform-posts';
import { useLanguage } from '@/lib/locale-context';
import { t, tf, localeTag } from '@/lib/i18n';

const NOTES_KEY = 'nc_planner_sticky_notes';

type NoteColor = 'yellow' | 'pink' | 'sky' | 'lime';
type CalendarMode = 'month' | 'week' | 'day' | 'list';

type StickyNoteItem = {
  id: string;
  dateKey: string; // YYYY-MM-DD
  text: string;
  color: NoteColor;
};

const NOTE_COLORS: { key: NoteColor; swatch: string; card: string }[] = [
  { key: 'yellow', swatch: 'bg-amber-300', card: 'bg-amber-100 border-amber-200 text-amber-950' },
  { key: 'pink', swatch: 'bg-pink-300', card: 'bg-pink-100 border-pink-200 text-pink-950' },
  { key: 'sky', swatch: 'bg-sky-300', card: 'bg-sky-100 border-sky-200 text-sky-950' },
  { key: 'lime', swatch: 'bg-lime-300', card: 'bg-lime-100 border-lime-200 text-lime-950' },
];

/** Soft lilac accent for “today” — matches reference calendar. */
const TODAY_ACCENT = '#9089F0';

function dateKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Sunday-first week start (matches reference grid). */
function startOfWeek(d: Date) {
  const x = new Date(d);
  x.setDate(x.getDate() - x.getDay());
  x.setHours(0, 0, 0, 0);
  return x;
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function postDate(post: PlannerPost): Date | null {
  const iso = post.scheduled_at || post.published_at;
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

function statusDot(post: PlannerPost) {
  if (post.workflow === 'PUBLISHED' || post.status === 'published') return 'bg-emerald-500';
  if (post.workflow === 'SCHEDULED' || post.status === 'scheduled') return 'bg-sky-500';
  if (post.workflow === 'READY') return 'bg-violet-500';
  if (post.workflow === 'IN_PROGRESS') return 'bg-indigo-500';
  return 'bg-amber-400';
}

function loadNotes(): StickyNoteItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(NOTES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StickyNoteItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistNotes(notes: StickyNoteItem[]) {
  localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
}

function colorClass(color: NoteColor) {
  return NOTE_COLORS.find((c) => c.key === color)?.card ?? NOTE_COLORS[0].card;
}

function ToolbarBtn({
  children,
  active,
  onClick,
  className = '',
  'aria-label': ariaLabel,
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  className?: string;
  'aria-label'?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={[
        'inline-flex items-center justify-center gap-1.5 h-9 min-h-[36px] px-3 rounded-lg text-[13px] font-medium transition-colors border',
        active
          ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50',
        className,
      ].join(' ')}
    >
      {children}
    </button>
  );
}

export default function ContentCalendar({
  posts,
  view: viewProp = 'month',
  cursor,
  onCursorChange,
  onSelectPost,
  onSelectDay,
  onReschedule,
}: {
  posts: PlannerPost[];
  view?: 'month' | 'week';
  cursor: Date;
  onCursorChange: (d: Date) => void;
  onSelectPost: (post: PlannerPost) => void;
  onSelectDay: (d: Date) => void;
  /** Persist a new scheduled time after drag-and-drop. */
  onReschedule?: (postId: string, scheduledAt: Date) => void;
}) {
  const { locale } = useLanguage();
  const [mode, setMode] = useState<CalendarMode>(viewProp);
  const [notes, setNotes] = useState<StickyNoteItem[]>([]);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorDate, setEditorDate] = useState<Date | null>(null);
  const [editorId, setEditorId] = useState<string | null>(null);
  const [editorText, setEditorText] = useState('');
  const [editorColor, setEditorColor] = useState<NoteColor>('yellow');

  useEffect(() => {
    setNotes(loadNotes());
  }, []);

  useEffect(() => {
    if (viewProp === 'month' || viewProp === 'week') setMode(viewProp);
  }, [viewProp]);

  const days = useMemo(() => {
    if (mode === 'day') return [new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate())];
    if (mode === 'week') {
      const start = startOfWeek(cursor);
      return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        return d;
      });
    }
    // month (+ list uses month grid range for event counts)
    const monthStart = startOfMonth(cursor);
    const gridStart = startOfWeek(monthStart);
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      return d;
    });
  }, [cursor, mode]);

  const monthLabel = useMemo(() => {
    return new Intl.DateTimeFormat(localeTag(locale), {
      month: 'long',
      year: 'numeric',
    }).format(cursor);
  }, [cursor, locale]);

  // Week/day match reference chrome: month + year in the center label.
  const rangeLabel = monthLabel;

  const shift = (dir: number) => {
    const next = new Date(cursor);
    if (mode === 'day') next.setDate(next.getDate() + dir);
    else if (mode === 'week') next.setDate(next.getDate() + dir * 7);
    else next.setMonth(next.getMonth() + dir);
    onCursorChange(next);
  };

  const today = new Date();

  const notesByDay = useMemo(() => {
    const map = new Map<string, StickyNoteItem[]>();
    for (const note of notes) {
      const list = map.get(note.dateKey) ?? [];
      list.push(note);
      map.set(note.dateKey, list);
    }
    return map;
  }, [notes]);

  const postsInView = useMemo(() => {
    if (mode === 'month' || mode === 'list') {
      return posts.filter((p) => {
        const pd = postDate(p);
        return pd && pd.getMonth() === cursor.getMonth() && pd.getFullYear() === cursor.getFullYear();
      });
    }
    if (mode === 'week') {
      const start = startOfWeek(cursor);
      const end = new Date(start);
      end.setDate(start.getDate() + 7);
      return posts.filter((p) => {
        const pd = postDate(p);
        return pd && pd >= start && pd < end;
      });
    }
    return posts.filter((p) => {
      const pd = postDate(p);
      return pd ? sameDay(pd, cursor) : false;
    });
  }, [posts, cursor, mode]);

  const eventCount = postsInView.length;

  const openNewNote = (day: Date) => {
    setEditorDate(day);
    setEditorId(null);
    setEditorText('');
    setEditorColor('yellow');
    setEditorOpen(true);
  };

  const openEditNote = (note: StickyNoteItem) => {
    const [y, m, d] = note.dateKey.split('-').map(Number);
    setEditorDate(new Date(y, m - 1, d));
    setEditorId(note.id);
    setEditorText(note.text);
    setEditorColor(note.color);
    setEditorOpen(true);
  };

  const saveNote = () => {
    if (!editorDate || !editorText.trim()) return;
    const key = dateKey(editorDate);
    setNotes((prev) => {
      let next: StickyNoteItem[];
      if (editorId) {
        next = prev.map((n) =>
          n.id === editorId
            ? { ...n, text: editorText.trim(), color: editorColor, dateKey: key }
            : n
        );
      } else {
        next = [
          {
            id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            dateKey: key,
            text: editorText.trim(),
            color: editorColor,
          },
          ...prev,
        ];
      }
      persistNotes(next);
      return next;
    });
    setEditorOpen(false);
  };

  const deleteNote = () => {
    if (!editorId) return;
    setNotes((prev) => {
      const next = prev.filter((n) => n.id !== editorId);
      persistNotes(next);
      return next;
    });
    setEditorOpen(false);
  };

  const weekdayKeys = [
    'daySun',
    'dayMon',
    'dayTue',
    'dayWed',
    'dayThu',
    'dayFri',
    'daySat',
  ] as const;

  const viewModes: { key: CalendarMode; labelKey: 'viewMonth' | 'viewWeek' | 'viewDay' | 'viewList' }[] =
    [
      { key: 'month', labelKey: 'viewMonth' },
      { key: 'week', labelKey: 'viewWeek' },
      { key: 'day', labelKey: 'viewDay' },
      { key: 'list', labelKey: 'viewList' },
    ];

  const dropOnMonthDay = (day: Date, postId: string) => {
    if (!onReschedule) return;
    const post = posts.find((p) => p.id === postId);
    if (post && isPlatformImportedPost(post)) return;
    const prev = post ? postDate(post) : null;
    const next = new Date(day);
    if (prev) {
      next.setHours(prev.getHours(), prev.getMinutes(), 0, 0);
    } else {
      next.setHours(10, 0, 0, 0);
    }
    onReschedule(postId, next);
  };

  const renderMonthCell = (day: Date) => {
    const inMonth = day.getMonth() === cursor.getMonth();
    const isToday = sameDay(day, today);
    const key = dateKey(day);
    const dayNotes = notesByDay.get(key) ?? [];
    const dayPosts = posts.filter((p) => {
      const pd = postDate(p);
      return pd ? sameDay(pd, day) : false;
    });

    return (
      <div
        key={day.toISOString()}
        role="button"
        tabIndex={0}
        onClick={() => onSelectDay(day)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelectDay(day);
          }
        }}
        onDragOver={(e) => {
          if (!onReschedule) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
        }}
        onDrop={(e) => {
          if (!onReschedule) return;
          e.preventDefault();
          e.stopPropagation();
          const id = e.dataTransfer.getData('text/planner-post-id');
          if (id) dropOnMonthDay(day, id);
        }}
        className={[
          'group relative bg-white text-left transition-colors flex flex-col gap-1 cursor-pointer p-2 sm:p-2.5',
          'min-h-[104px] sm:min-h-[118px] hover:bg-slate-50/80',
          !inMonth ? 'bg-slate-50/40' : '',
        ].join(' ')}
        title={t('createSchedulePost', locale)}
      >
        <div className="flex items-start justify-between gap-1">
          <span
            className={[
              'inline-flex items-center justify-center text-[12px] font-semibold tabular-nums w-7 h-7',
              isToday
                ? 'rounded-md text-white'
                : !inMonth
                  ? 'text-slate-300'
                  : 'text-slate-700',
            ].join(' ')}
            style={isToday ? { background: TODAY_ACCENT } : undefined}
          >
            {day.getDate()}
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              openNewNote(day);
            }}
            className="opacity-0 group-hover:opacity-100 focus:opacity-100 w-7 h-7 min-h-[28px] rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 inline-flex items-center justify-center transition-opacity"
            title={t('addPostIt', locale)}
            aria-label={`${t('addPostIt', locale)} ${day.getDate()}`}
          >
            <StickyNote size={12} />
          </button>
        </div>

        <div className="space-y-1 flex-1 min-h-0 overflow-hidden">
          {dayNotes.slice(0, 1).map((note) => (
            <button
              key={note.id}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                openEditNote(note);
              }}
              className={`w-full rounded-md border px-1.5 py-1 text-left ${colorClass(note.color)}`}
              title={note.text}
            >
              <p className="text-[10px] font-semibold leading-tight line-clamp-2">{note.text}</p>
            </button>
          ))}
          {dayNotes.length > 1 && (
            <p className="text-[10px] font-medium text-slate-400 px-0.5">
              +{dayNotes.length - 1} {t('moreNotes', locale)}
            </p>
          )}

          {dayPosts.slice(0, 3).map((post) => (
            <div
              key={post.id}
              role="button"
              tabIndex={0}
              draggable={Boolean(onReschedule) && !isPlatformImportedPost(post)}
              onDragStart={(e) => {
                if (!onReschedule || isPlatformImportedPost(post)) return;
                e.stopPropagation();
                e.dataTransfer.setData('text/planner-post-id', post.id);
                e.dataTransfer.effectAllowed = 'move';
              }}
              onClick={(e) => {
                e.stopPropagation();
                onSelectPost(post);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.stopPropagation();
                  onSelectPost(post);
                }
              }}
              className={`w-full rounded-md bg-[#E9D5FF]/45 border border-[#E9D5FF]/80 px-1.5 py-1 hover:bg-[#E9D5FF]/70 ${
                isPlatformImportedPost(post)
                  ? 'cursor-pointer'
                  : 'cursor-grab active:cursor-grabbing'
              }`}
            >
              <div className="flex items-center gap-1 mb-0.5">
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${statusDot(post)}`} />
                <div className="flex -space-x-1">
                  {post.platforms.slice(0, 3).map((p) => (
                    <span key={p} className="scale-75 origin-left">
                      <PlatformIcon platform={p} size={10} />
                    </span>
                  ))}
                </div>
              </div>
              <p className="text-[11px] font-semibold text-slate-800 truncate leading-tight">
                {post.title || post.idea_title || post.caption.split('\n')[0]}
              </p>
            </div>
          ))}
          {dayPosts.length > 3 && (
            <p className="text-[10px] font-medium text-slate-400 px-0.5">
              +{dayPosts.length - 3} {t('morePosts', locale)}
            </p>
          )}
        </div>
      </div>
    );
  };

  const weekDays = useMemo(() => {
    const start = startOfWeek(cursor);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [cursor]);

  const dayColumn = useMemo(
    () => [new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate())],
    [cursor]
  );

  const listPosts = useMemo(() => {
    return [...postsInView].sort((a, b) => {
      const da = postDate(a)?.getTime() ?? 0;
      const db = postDate(b)?.getTime() ?? 0;
      return da - db;
    });
  }, [postsInView]);

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
      {/* Toolbar — matches reference calendar chrome */}
      <div className="flex flex-col xl:flex-row xl:items-center gap-3 px-3 sm:px-4 py-3 border-b border-slate-200/80">
        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
          <ToolbarBtn
            onClick={() => shift(-1)}
            className="!px-0 w-9 min-w-[36px]"
            aria-label={t('previous', locale)}
          >
            <ChevronLeft size={16} />
          </ToolbarBtn>
          <ToolbarBtn onClick={() => onCursorChange(new Date())}>{t('today', locale)}</ToolbarBtn>
          <div className="inline-flex items-center rounded-lg border border-slate-200 bg-white p-0.5 gap-0.5">
            {viewModes.map(({ key, labelKey }) => (
              <button
                key={key}
                type="button"
                onClick={() => setMode(key)}
                className={[
                  'h-8 min-h-[32px] px-2.5 sm:px-3 rounded-md text-[12px] sm:text-[13px] font-medium transition-colors',
                  mode === key
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50',
                ].join(' ')}
              >
                {t(labelKey, locale)}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 flex-1 min-w-0">
          <button
            type="button"
            onClick={() => shift(-1)}
            className="h-9 w-9 min-h-[36px] min-w-[36px] rounded-lg text-slate-500 hover:bg-slate-50 inline-flex items-center justify-center"
            aria-label={t('previous', locale)}
          >
            <ChevronLeft size={18} />
          </button>
          <p className="text-[15px] sm:text-base font-semibold text-slate-900 capitalize truncate tracking-tight">
            {rangeLabel}
          </p>
          <button
            type="button"
            onClick={() => shift(1)}
            className="h-9 w-9 min-h-[36px] min-w-[36px] rounded-lg text-slate-500 hover:bg-slate-50 inline-flex items-center justify-center"
            aria-label={t('next', locale)}
          >
            <ChevronRight size={18} />
          </button>
          <span className="hidden sm:inline-flex items-center h-7 px-2.5 rounded-full border border-slate-200 bg-slate-50 text-[11px] font-medium text-slate-500 tabular-nums whitespace-nowrap">
            {tf('eventsCount', locale, { count: eventCount })}
          </span>
        </div>

        <div className="flex items-center justify-end gap-2 flex-shrink-0">
          <button
            type="button"
            className="text-[13px] font-medium text-[#9089F0] hover:text-[#7A72E0] transition-colors h-9 px-1"
          >
            {t('linkGoogleCalendar', locale)}
          </button>
          <ToolbarBtn className="gap-1.5">
            <Filter size={14} strokeWidth={1.75} />
            {t('calendarFilter', locale)}
          </ToolbarBtn>
        </div>
      </div>

      {/* Body */}
      {mode === 'list' ? (
        <div className="divide-y divide-slate-100">
          {listPosts.length === 0 ? (
            <p className="text-sm text-slate-400 font-medium text-center py-16">
              {t('noPostsMatchFilter', locale)}
            </p>
          ) : (
            listPosts.map((post) => {
              const pd = postDate(post);
              return (
                <button
                  key={post.id}
                  type="button"
                  onClick={() => onSelectPost(post)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-slate-50 transition-colors min-h-[44px]"
                >
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${statusDot(post)}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900 truncate">
                      {post.title || post.idea_title || post.caption.split('\n')[0]}
                    </p>
                    <p className="text-[12px] text-slate-500 font-medium mt-0.5">
                      {pd
                        ? pd.toLocaleString(localeTag(locale), {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '—'}
                    </p>
                  </div>
                  <div className="flex -space-x-1 flex-shrink-0">
                    {post.platforms.slice(0, 4).map((p) => (
                      <PlatformIcon key={p} platform={p} size={14} />
                    ))}
                  </div>
                </button>
              );
            })
          )}
        </div>
      ) : mode === 'week' || mode === 'day' ? (
        <CalendarTimeGrid
          days={mode === 'week' ? weekDays : dayColumn}
          cursor={cursor}
          posts={posts}
          showSidebar={mode === 'day'}
          onSelectDay={onCursorChange}
          onSelectPost={onSelectPost}
          onReschedule={onReschedule}
          onEmptySlotClick={(day, hour) => {
            const slotted = new Date(day);
            slotted.setHours(hour, 0, 0, 0);
            onSelectDay(slotted);
          }}
        />
      ) : (
        <>
          <div className="grid grid-cols-7 border-b border-slate-200/80">
            {weekdayKeys.map((key) => (
              <div
                key={key}
                className="text-center text-[11px] font-medium uppercase tracking-wide text-slate-400 py-2.5 border-r border-slate-100 last:border-r-0"
              >
                {t(key, locale)}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 [&>*]:border-r [&>*]:border-b [&>*]:border-slate-100 [&>*:nth-child(7n)]:border-r-0">
            {days.map((day) => renderMonthCell(day))}
          </div>
        </>
      )}

      {/* Sticky note editor */}
      {editorOpen && editorDate && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-6">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/35 backdrop-blur-sm"
            aria-label={t('close', locale)}
            onClick={() => setEditorOpen(false)}
          />
          <div
            className={`relative w-full max-w-md rounded-2xl border shadow-xl p-5 ${colorClass(editorColor)}`}
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <p className="text-[10px] font-mono font-bold uppercase tracking-[0.14em] opacity-70">
                  {t('postItNote', locale)} ·{' '}
                  {editorDate.toLocaleDateString(localeTag(locale), {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                  })}
                </p>
                <p className="text-sm font-semibold mt-0.5">
                  {editorId ? t('editReminder', locale) : t('newReminder', locale)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditorOpen(false)}
                className="h-10 w-10 min-h-[44px] min-w-[44px] rounded-xl hover:bg-black/5 inline-flex items-center justify-center"
                aria-label={t('close', locale)}
              >
                <X size={16} />
              </button>
            </div>

            <Textarea
              value={editorText}
              onChange={(e) => setEditorText(e.target.value)}
              placeholder={t('notePlaceholder', locale)}
              className="min-h-[120px] rounded-xl border-black/10 bg-white/70 resize-none text-sm font-medium"
              autoFocus
            />

            <div className="flex items-center gap-2 mt-3">
              <p className="text-[10px] font-mono font-bold uppercase tracking-wider opacity-60 mr-1">
                {t('colorLabel', locale)}
              </p>
              {NOTE_COLORS.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setEditorColor(c.key)}
                  className={`w-8 h-8 min-h-[32px] rounded-full ${c.swatch} ${
                    editorColor === c.key ? 'ring-2 ring-offset-2 ring-slate-400/50' : ''
                  }`}
                  aria-label={c.key}
                />
              ))}
            </div>

            <div className="flex items-center gap-2 mt-4">
              {editorId && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={deleteNote}
                  className="h-11 min-h-[44px] rounded-xl text-rose-700 hover:bg-rose-50 gap-1.5"
                >
                  <Trash2 size={14} /> {t('delete', locale)}
                </Button>
              )}
              <div className="flex-1" />
              <Button
                type="button"
                variant="ghost"
                onClick={() => setEditorOpen(false)}
                className="h-11 min-h-[44px] rounded-xl"
              >
                {t('cancel', locale)}
              </Button>
              <Button
                type="button"
                onClick={saveNote}
                disabled={!editorText.trim()}
                className="h-11 min-h-[44px] rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold"
              >
                {t('saveNote', locale)}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
