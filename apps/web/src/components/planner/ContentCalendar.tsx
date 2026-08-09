'use client';

import { useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { PlatformIcon } from '@/components/planner/PlatformBadge';
import type { PlannerPost } from '@/lib/mock-content-planner';

function startOfWeek(d: Date) {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7; // Monday=0
  x.setDate(x.getDate() - day);
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

export default function ContentCalendar({
  posts,
  view,
  cursor,
  onCursorChange,
  onSelectPost,
  onSelectDay,
}: {
  posts: PlannerPost[];
  view: 'month' | 'week';
  cursor: Date;
  onCursorChange: (d: Date) => void;
  onSelectPost: (post: PlannerPost) => void;
  onSelectDay: (d: Date) => void;
}) {
  const days = useMemo(() => {
    if (view === 'week') {
      const start = startOfWeek(cursor);
      return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        return d;
      });
    }
    const monthStart = startOfMonth(cursor);
    const gridStart = startOfWeek(monthStart);
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      return d;
    });
  }, [cursor, view]);

  const label = useMemo(() => {
    return new Intl.DateTimeFormat('sv-SE', {
      month: 'long',
      year: 'numeric',
      ...(view === 'week' ? { day: 'numeric' } : {}),
    }).format(cursor);
  }, [cursor, view]);

  const shift = (dir: number) => {
    const next = new Date(cursor);
    if (view === 'week') next.setDate(next.getDate() + dir * 7);
    else next.setMonth(next.getMonth() + dir);
    onCursorChange(next);
  };

  const today = new Date();

  return (
    <div className="nc-glass rounded-[1.5rem] p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3 mb-4">
        <button
          type="button"
          onClick={() => shift(-1)}
          className="h-11 w-11 min-h-[44px] min-w-[44px] rounded-xl bg-zinc-50 hover:bg-zinc-100 flex items-center justify-center text-zinc-600"
          aria-label="Föregående"
        >
          <ChevronLeft size={16} />
        </button>
        <div className="text-center min-w-0">
          <p className="text-sm font-black text-[#2c3340] capitalize truncate">{label}</p>
          <button
            type="button"
            onClick={() => onCursorChange(new Date())}
            className="text-[11px] font-extrabold text-[var(--nc-coral)] h-8"
          >
            Idag
          </button>
        </div>
        <button
          type="button"
          onClick={() => shift(1)}
          className="h-11 w-11 min-h-[44px] min-w-[44px] rounded-xl bg-zinc-50 hover:bg-zinc-100 flex items-center justify-center text-zinc-600"
          aria-label="Nästa"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön'].map((d) => (
          <div
            key={d}
            className="text-center text-[10px] font-black uppercase tracking-wider text-zinc-400 py-1"
          >
            {d}
          </div>
        ))}
      </div>

      <div className={`grid grid-cols-7 gap-1 ${view === 'week' ? 'min-h-[220px]' : ''}`}>
        {days.map((day) => {
          const inMonth = day.getMonth() === cursor.getMonth();
          const isToday = sameDay(day, today);
          const dayPosts = posts.filter((p) => {
            const pd = postDate(p);
            return pd ? sameDay(pd, day) : false;
          });

          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => onSelectDay(day)}
              className={`min-h-[72px] sm:min-h-[96px] rounded-xl border p-1.5 text-left transition-colors flex flex-col gap-1 ${
                view === 'month' && !inMonth
                  ? 'border-transparent bg-transparent opacity-35'
                  : isToday
                    ? 'border-[var(--nc-coral)] bg-[color-mix(in_srgb,var(--nc-coral)_6%,white)]'
                    : 'border-zinc-100 bg-white hover:bg-zinc-50'
              }`}
            >
              <span
                className={`text-[11px] font-extrabold w-6 h-6 rounded-full inline-flex items-center justify-center ${
                  isToday ? 'bg-[var(--nc-coral)] text-white' : 'text-zinc-500'
                }`}
              >
                {day.getDate()}
              </span>
              <div className="space-y-1 flex-1 min-h-0 overflow-hidden">
                {dayPosts.slice(0, view === 'week' ? 4 : 2).map((post) => (
                  <div
                    key={post.id}
                    role="button"
                    tabIndex={0}
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
                    className="w-full rounded-lg bg-zinc-50 border border-zinc-100 px-1.5 py-1 hover:border-zinc-200"
                  >
                    <div className="flex items-center gap-1 mb-0.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${statusDot(post)}`} />
                      <div className="flex -space-x-1">
                        {post.platforms.slice(0, 3).map((p) => (
                          <span key={p} className="scale-75 origin-left">
                            <PlatformIcon platform={p} size={10} />
                          </span>
                        ))}
                      </div>
                    </div>
                    <p className="text-[10px] font-bold text-[#2c3340] truncate leading-tight">
                      {post.title || post.idea_title || post.caption.split('\n')[0]}
                    </p>
                  </div>
                ))}
                {dayPosts.length > (view === 'week' ? 4 : 2) && (
                  <p className="text-[10px] font-bold text-zinc-400 px-1">
                    +{dayPosts.length - (view === 'week' ? 4 : 2)} mer
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
