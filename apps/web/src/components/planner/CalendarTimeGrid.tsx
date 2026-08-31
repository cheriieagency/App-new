'use client';

import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { PlatformIcon } from '@/components/planner/PlatformBadge';
import type { PlannerPost } from '@/lib/mock-content-planner';
import { isPlatformImportedPost } from '@/lib/planner/platform-posts';
import { useLanguage } from '@/lib/locale-context';
import { t, localeTag, type Locale } from '@/lib/i18n';

const HOUR_HEIGHT = 64;
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const TIME_ACCENT = '#6B8CFF';
const DAY_ACCENT = '#9089F0';
const SNAP_MINUTES = 15;
const DRAG_THRESHOLD = 6;

type DragState = {
  post: PlannerPost;
  startX: number;
  startY: number;
  moved: boolean;
  dayIndex: number;
  minutes: number;
};

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function startOfWeek(d: Date) {
  const x = new Date(d);
  x.setDate(x.getDate() - x.getDay());
  x.setHours(0, 0, 0, 0);
  return x;
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function postDate(post: PlannerPost): Date | null {
  const iso = post.scheduled_at || post.published_at;
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

function minutesFromMidnight(d: Date) {
  return d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60;
}

function snapMinutes(raw: number) {
  const snapped = Math.round(raw / SNAP_MINUTES) * SNAP_MINUTES;
  return Math.max(0, Math.min(24 * 60 - SNAP_MINUTES, snapped));
}

function formatHourLabel(hour: number, locale: Locale) {
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  return new Intl.DateTimeFormat(localeTag(locale), {
    hour: 'numeric',
  }).format(d);
}

function formatNowLabel(d: Date, locale: Locale) {
  return new Intl.DateTimeFormat(localeTag(locale), {
    hour: 'numeric',
    minute: '2-digit',
  }).format(d);
}

function statusBar(post: PlannerPost) {
  if (post.workflow === 'PUBLISHED' || post.status === 'published') return 'bg-emerald-400';
  if (post.workflow === 'SCHEDULED' || post.status === 'scheduled') return 'bg-sky-400';
  return 'bg-[#9089F0]';
}

function EventChip({
  post,
  style,
  dragging,
  ghost,
  onPointerDown,
}: {
  post: PlannerPost;
  style: CSSProperties;
  dragging?: boolean;
  ghost?: boolean;
  onPointerDown?: (e: ReactPointerEvent) => void;
}) {
  return (
    <button
      type="button"
      onPointerDown={onPointerDown}
      className={[
        'absolute left-1 right-1 z-10 rounded-md border border-[#E9D5FF] bg-[#E9D5FF]/55 px-1.5 py-1 text-left overflow-hidden shadow-sm touch-none select-none',
        dragging ? 'opacity-35 cursor-grabbing' : '',
        ghost ? 'pointer-events-none opacity-100 shadow-lg ring-2 ring-[#9089F0]/40' : '',
        !dragging && !ghost ? 'hover:bg-[#E9D5FF]/80 cursor-grab active:cursor-grabbing' : '',
      ].join(' ')}
      style={style}
      title={post.title || post.idea_title || post.caption}
    >
      <div className="flex items-center gap-1 mb-0.5">
        <span className={`w-1 h-3 rounded-full ${statusBar(post)}`} />
        {post.platforms.slice(0, 2).map((p) => (
          <PlatformIcon key={p} platform={p} size={10} />
        ))}
      </div>
      <p className="text-[11px] font-semibold text-slate-800 leading-tight line-clamp-2">
        {post.title || post.idea_title || post.caption.split('\n')[0]}
      </p>
    </button>
  );
}

/** Mini month picker for day-view sidebar. */
function MiniMonth({
  cursor,
  onSelectDay,
}: {
  cursor: Date;
  onSelectDay: (d: Date) => void;
}) {
  const { locale } = useLanguage();
  const [monthCursor, setMonthCursor] = useState(
    () => new Date(cursor.getFullYear(), cursor.getMonth(), 1)
  );

  useEffect(() => {
    setMonthCursor(new Date(cursor.getFullYear(), cursor.getMonth(), 1));
  }, [cursor]);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(monthCursor));
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [monthCursor]);

  const today = new Date();
  const monthLabel = new Intl.DateTimeFormat(localeTag(locale), {
    month: 'long',
    year: 'numeric',
  }).format(monthCursor);

  const weekdayKeys = ['daySun', 'dayMon', 'dayTue', 'dayWed', 'dayThu', 'dayFri', 'daySat'] as const;

  return (
    <div className="px-4 pt-4 pb-3">
      <div className="flex items-center justify-between gap-2 mb-3">
        <button
          type="button"
          onClick={() =>
            setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() - 1, 1))
          }
          className="h-8 w-8 min-h-[32px] rounded-lg text-slate-400 hover:bg-slate-50 inline-flex items-center justify-center"
          aria-label={t('previous', locale)}
        >
          <ChevronLeft size={16} />
        </button>
        <p className="text-[13px] font-semibold text-slate-800 capitalize tracking-tight">
          {monthLabel}
        </p>
        <button
          type="button"
          onClick={() =>
            setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 1))
          }
          className="h-8 w-8 min-h-[32px] rounded-lg text-slate-400 hover:bg-slate-50 inline-flex items-center justify-center"
          aria-label={t('next', locale)}
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="grid grid-cols-7 mb-1">
        {weekdayKeys.map((key) => (
          <div key={key} className="text-center text-[10px] font-medium text-slate-400 py-1">
            {t(key, locale).slice(0, 2)}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-0.5">
        {days.map((day) => {
          const inMonth = day.getMonth() === monthCursor.getMonth();
          const selected = sameDay(day, cursor);
          const isToday = sameDay(day, today);
          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => onSelectDay(day)}
              className={[
                'h-8 min-h-[32px] rounded-full text-[12px] font-medium tabular-nums inline-flex items-center justify-center transition-colors',
                selected
                  ? 'text-white'
                  : isToday
                    ? 'text-[#9089F0] font-semibold'
                    : inMonth
                      ? 'text-slate-700 hover:bg-slate-50'
                      : 'text-slate-300',
              ].join(' ')}
              style={selected ? { background: DAY_ACCENT } : undefined}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function CalendarTimeGrid({
  days,
  cursor,
  posts,
  showSidebar,
  onSelectDay,
  onSelectPost,
  onEmptySlotClick,
  onReschedule,
}: {
  days: Date[];
  cursor: Date;
  posts: PlannerPost[];
  showSidebar?: boolean;
  onSelectDay: (d: Date) => void;
  onSelectPost: (post: PlannerPost) => void;
  onEmptySlotClick: (day: Date, hour: number) => void;
  onReschedule?: (postId: string, scheduledAt: Date) => void;
}) {
  const { locale } = useLanguage();
  const scrollRef = useRef<HTMLDivElement>(null);
  const columnRefs = useRef<(HTMLDivElement | null)[]>([]);
  const dragRef = useRef<DragState | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [drag, setDrag] = useState<DragState | null>(null);
  const today = new Date();

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const scrollAnchor = `${days[0]?.toDateString() ?? ''}:${days.length}`;

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const minutes = days.some((d) => sameDay(d, new Date()))
      ? minutesFromMidnight(new Date())
      : 8 * 60;
    el.scrollTop = Math.max(0, (minutes / 60) * HOUR_HEIGHT - 80);
  }, [scrollAnchor, days]);

  const resolveDropTarget = (clientX: number, clientY: number) => {
    let best = 0;
    let bestDist = Infinity;
    columnRefs.current.forEach((col, i) => {
      if (!col) return;
      const r = col.getBoundingClientRect();
      if (clientX >= r.left && clientX <= r.right) {
        best = i;
        bestDist = 0;
        return;
      }
      const mid = (r.left + r.right) / 2;
      const dist = Math.abs(clientX - mid);
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    });

    const col = columnRefs.current[best];
    if (!col) return { dayIndex: 0, minutes: 0 };
    const rect = col.getBoundingClientRect();
    const y = clientY - rect.top;
    return { dayIndex: best, minutes: snapMinutes((y / HOUR_HEIGHT) * 60) };
  };

  useEffect(() => {
    if (!drag) return;

    const onMove = (e: PointerEvent) => {
      const current = dragRef.current;
      if (!current) return;
      const dx = e.clientX - current.startX;
      const dy = e.clientY - current.startY;
      const moved = current.moved || Math.hypot(dx, dy) > DRAG_THRESHOLD;
      const target = resolveDropTarget(e.clientX, e.clientY);
      const next: DragState = {
        ...current,
        moved,
        dayIndex: target.dayIndex,
        minutes: target.minutes,
      };
      dragRef.current = next;
      setDrag(next);
    };

    const onUp = () => {
      const current = dragRef.current;
      dragRef.current = null;
      setDrag(null);
      if (!current) return;
      if (!current.moved) {
        onSelectPost(current.post);
        return;
      }
      if (!onReschedule) return;
      const day = days[current.dayIndex] ?? days[0];
      const next = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, 0, 0, 0);
      next.setMinutes(current.minutes);
      onReschedule(current.post.id, next);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [drag, days, onReschedule, onSelectPost]);

  const showNowLine = days.some((d) => sameDay(d, now));
  const nowTop = (minutesFromMidnight(now) / 60) * HOUR_HEIGHT;
  const gridHeight = HOURS.length * HOUR_HEIGHT;

  const postsByDay = useMemo(() => {
    const map = new Map<string, PlannerPost[]>();
    for (const day of days) {
      map.set(
        day.toDateString(),
        posts.filter((p) => {
          if (drag?.moved && drag.post.id === p.id) return false;
          const pd = postDate(p);
          return pd ? sameDay(pd, day) : false;
        })
      );
    }
    return map;
  }, [days, posts, drag]);

  const dayTasks = useMemo(() => {
    if (!showSidebar) return [] as PlannerPost[];
    return posts.filter((p) => {
      const pd = postDate(p);
      return pd ? sameDay(pd, cursor) : false;
    });
  }, [showSidebar, posts, cursor]);

  const startDrag = (post: PlannerPost, e: ReactPointerEvent) => {
    // Platform-imported posts are read-only on the calendar — open permalink instead.
    if (!onReschedule || isPlatformImportedPost(post)) {
      onSelectPost(post);
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    const pd = postDate(post);
    const dayIndex = Math.max(
      0,
      days.findIndex((d) => (pd ? sameDay(d, pd) : false))
    );
    const state: DragState = {
      post,
      startX: e.clientX,
      startY: e.clientY,
      moved: false,
      dayIndex: dayIndex < 0 ? 0 : dayIndex,
      minutes: pd ? snapMinutes(minutesFromMidnight(pd)) : 10 * 60,
    };
    dragRef.current = state;
    setDrag(state);
  };

  const chipHeight = Math.max(28, HOUR_HEIGHT * 0.85);

  const grid = (
    <div className="flex flex-col min-w-0 flex-1 min-h-0">
      <div
        className="grid border-b border-slate-200/80 flex-shrink-0"
        style={{ gridTemplateColumns: `56px repeat(${days.length}, minmax(0, 1fr))` }}
      >
        <div className="border-r border-slate-100" />
        {days.map((day) => {
          const isToday = sameDay(day, today);
          const weekday = new Intl.DateTimeFormat(localeTag(locale), {
            weekday: 'short',
          }).format(day);
          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => onSelectDay(day)}
              className="flex items-center justify-center gap-1.5 py-2.5 border-r border-slate-100 last:border-r-0 hover:bg-slate-50/60 transition-colors min-h-[44px]"
            >
              <span className="text-[12px] font-medium text-slate-500">{weekday}</span>
              <span
                className={[
                  'inline-flex items-center justify-center text-[12px] font-semibold tabular-nums w-7 h-7',
                  isToday ? 'rounded-md text-white' : 'text-slate-800',
                ].join(' ')}
                style={isToday ? { background: DAY_ACCENT } : undefined}
              >
                {day.getDate()}
              </span>
            </button>
          );
        })}
      </div>

      <div
        ref={scrollRef}
        className={`overflow-auto max-h-[min(68vh,720px)] relative ${drag?.moved ? 'cursor-grabbing' : ''}`}
      >
        <div
          className="grid relative"
          style={{
            gridTemplateColumns: `56px repeat(${days.length}, minmax(0, 1fr))`,
            height: gridHeight,
          }}
        >
          <div className="relative border-r border-slate-100">
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="absolute right-2 text-[11px] font-medium text-slate-400 tabular-nums -translate-y-1/2"
                style={{ top: hour * HOUR_HEIGHT }}
              >
                {hour === 0 ? '' : formatHourLabel(hour, locale)}
              </div>
            ))}
          </div>

          {days.map((day, dayIndex) => {
            const dayPosts = postsByDay.get(day.toDateString()) ?? [];
            return (
              <div
                key={day.toISOString()}
                ref={(el) => {
                  columnRefs.current[dayIndex] = el;
                }}
                className={[
                  'relative border-r border-slate-100 last:border-r-0',
                  drag?.moved && drag.dayIndex === dayIndex ? 'bg-[#E9D5FF]/12' : '',
                ].join(' ')}
                style={{ height: gridHeight }}
              >
                {HOURS.map((hour) => (
                  <div
                    key={hour}
                    className="absolute inset-x-0"
                    style={{ top: hour * HOUR_HEIGHT, height: HOUR_HEIGHT }}
                  >
                    <div className="absolute inset-x-0 top-0 border-t border-slate-200/80" />
                    <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-slate-100" />
                    {drag?.moved &&
                      drag.dayIndex === dayIndex &&
                      Math.floor(drag.minutes / 60) === hour && (
                        <div
                          className="absolute inset-x-1 rounded-md bg-[#9089F0]/18 border border-dashed border-[#9089F0]/45 pointer-events-none z-[5]"
                          style={{
                            top: ((drag.minutes % 60) / 60) * HOUR_HEIGHT + 2,
                            height: chipHeight,
                          }}
                        />
                      )}
                    <button
                      type="button"
                      className="absolute inset-0 w-full h-full hover:bg-slate-50/40 transition-colors"
                      aria-label={`${formatHourLabel(hour, locale)} ${day.getDate()}`}
                      onClick={() => {
                        if (drag?.moved) return;
                        onEmptySlotClick(day, hour);
                      }}
                    />
                  </div>
                ))}

                {dayPosts.map((post) => {
                  const pd = postDate(post);
                  if (!pd) return null;
                  const top = (minutesFromMidnight(pd) / 60) * HOUR_HEIGHT;
                  return (
                    <EventChip
                      key={post.id}
                      post={post}
                      dragging={drag?.post.id === post.id}
                      onPointerDown={(e) => startDrag(post, e)}
                      style={{ top: top + 2, height: chipHeight }}
                    />
                  );
                })}

                {drag?.moved && drag.dayIndex === dayIndex && (
                  <EventChip
                    post={drag.post}
                    ghost
                    style={{
                      top: (drag.minutes / 60) * HOUR_HEIGHT + 2,
                      height: chipHeight,
                      zIndex: 30,
                    }}
                  />
                )}
              </div>
            );
          })}

          {showNowLine && (
            <div
              className="absolute left-0 right-0 z-20 pointer-events-none"
              style={{ top: nowTop }}
            >
              <div className="absolute left-0 -translate-y-1/2 flex items-center z-20">
                <span
                  className="inline-flex items-center h-5 px-1.5 rounded-full text-[10px] font-semibold text-white tabular-nums shadow-sm ml-0.5"
                  style={{ background: TIME_ACCENT }}
                >
                  {formatNowLabel(now, locale)}
                </span>
              </div>
              <div
                className="absolute left-14 right-0 h-[2px] -translate-y-1/2"
                style={{ background: TIME_ACCENT }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (!showSidebar) return grid;

  return (
    <div className="flex min-h-0">
      {grid}
      <aside className="hidden lg:flex w-[260px] flex-shrink-0 flex-col border-l border-slate-200/80 bg-white">
        <MiniMonth cursor={cursor} onSelectDay={onSelectDay} />
        <div className="flex-1 border-t border-slate-100 px-4 py-5">
          {dayTasks.length === 0 ? (
            <p className="text-[13px] italic text-slate-400 leading-relaxed">
              {t('noContentTasksHappening', locale)}
            </p>
          ) : (
            <ul className="space-y-2">
              {dayTasks.map((post) => (
                <li key={post.id}>
                  <button
                    type="button"
                    onClick={() => onSelectPost(post)}
                    draggable={Boolean(onReschedule) && !isPlatformImportedPost(post)}
                    onDragStart={(e) => {
                      if (!onReschedule || isPlatformImportedPost(post)) return;
                      e.dataTransfer.setData('text/planner-post-id', post.id);
                      e.dataTransfer.effectAllowed = 'move';
                    }}
                    className="w-full text-left rounded-xl border border-slate-100 bg-slate-50/80 hover:bg-slate-50 px-3 py-2.5 min-h-[44px]"
                  >
                    <p className="text-[12px] font-semibold text-slate-800 truncate">
                      {post.title || post.idea_title || post.caption.split('\n')[0]}
                    </p>
                    {postDate(post) && (
                      <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                        {formatNowLabel(postDate(post)!, locale)}
                      </p>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </div>
  );
}
