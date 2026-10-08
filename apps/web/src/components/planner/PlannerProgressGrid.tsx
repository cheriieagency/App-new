'use client';

import { useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import type { PlannerPost, WorkflowStatus } from '@/lib/mock-content-planner';
import { useLocale } from '@/lib/locale-context';
import { localeTag } from '@/lib/i18n';

/** Progress-grid status chips — mapped onto Clikd workflow keys. */
type ProgressFilter =
  | 'all'
  | 'READY'
  | 'SCHEDULED'
  | 'PUBLISHED'
  | 'IN_PROGRESS'
  | 'IDEA'
  | 'FAILED';

const SHOW_FILTERS: {
  key: ProgressFilter;
  label: string;
  dot: string;
}[] = [
  { key: 'all', label: 'All', dot: '#2C2621' },
  { key: 'READY', label: 'In approval queue', dot: '#E67E22' },
  { key: 'SCHEDULED', label: 'Scheduled', dot: '#3F3A36' },
  { key: 'PUBLISHED', label: 'Published', dot: '#3B82F6' },
  { key: 'IN_PROGRESS', label: 'Needs editing', dot: '#E11D48' },
  { key: 'IDEA', label: 'Draft', dot: '#A8A29E' },
  { key: 'FAILED', label: 'Failed', dot: '#B85C38' },
];

const FIELD_ROWS: {
  key:
    | 'internal_name'
    | 'content_type'
    | 'visual'
    | 'caption'
    | 'hashtags'
    | 'pillar'
    | 'status'
    | 'internal_notes'
    | 'client_notes';
  label: string;
  tall?: boolean;
}[] = [
  { key: 'internal_name', label: 'Internal name' },
  { key: 'content_type', label: 'Content type' },
  { key: 'visual', label: 'Visual', tall: true },
  { key: 'caption', label: 'Caption' },
  { key: 'hashtags', label: 'Hashtags' },
  { key: 'pillar', label: 'Pillar' },
  { key: 'status', label: 'Status' },
  { key: 'internal_notes', label: 'Internal notes' },
  { key: 'client_notes', label: 'Client notes' },
];

type FieldKey = (typeof FIELD_ROWS)[number]['key'];

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function dayKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function daysInMonth(cursor: Date): Date[] {
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const count = new Date(year, month + 1, 0).getDate();
  return Array.from({ length: count }, (_, i) => new Date(year, month, i + 1));
}

function postDayKey(post: PlannerPost): string | null {
  const iso = post.scheduled_at || post.published_at || post.created_at;
  if (!iso) return null;
  try {
    return dayKey(new Date(iso));
  } catch {
    return null;
  }
}

function contentTypeLabel(post: PlannerPost): string {
  if (post.platforms.length) {
    return post.platforms.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(', ');
  }
  return post.media_type ? post.media_type.toUpperCase() : '—';
}

function pillarLabel(post: PlannerPost): string {
  if (post.campaign_tag?.trim()) return post.campaign_tag.trim();
  if (post.post_tags?.length) return post.post_tags.join(', ');
  if (post.campaigns?.length) return post.campaigns.join(', ');
  return '—';
}

function workflowLabel(workflow: WorkflowStatus): string {
  switch (workflow) {
    case 'IDEA':
      return 'Draft';
    case 'IN_PROGRESS':
      return 'Needs editing';
    case 'READY':
      return 'In approval';
    case 'SCHEDULED':
      return 'Scheduled';
    case 'PUBLISHED':
      return 'Published';
    case 'FAILED':
      return 'Failed';
    default:
      return workflow;
  }
}

function cellValue(post: PlannerPost | null, field: FieldKey): string {
  if (!post) return '—';
  switch (field) {
    case 'internal_name':
      return post.title?.trim() || '—';
    case 'content_type':
      return contentTypeLabel(post);
    case 'caption':
      return post.caption?.trim() || '—';
    case 'hashtags':
      return post.hashtags?.trim() || '—';
    case 'pillar':
      return pillarLabel(post);
    case 'status':
      return workflowLabel(post.workflow);
    case 'internal_notes':
      return post.internal_notes?.trim() || '—';
    case 'client_notes':
      return post.client_notes?.trim() || '—';
    case 'visual':
      return '';
    default:
      return '—';
  }
}

function thumbFor(post: PlannerPost | null) {
  if (!post) return null;
  return (
    post.media_items[0] ||
    (post.media_url
      ? {
          url: post.media_url,
          type: post.media_type === 'video' ? ('video' as const) : ('image' as const),
        }
      : null)
  );
}

export default function PlannerProgressGrid({
  posts,
  cursor,
  onCursorChange,
  onOpen,
  onAddDay,
}: {
  posts: PlannerPost[];
  cursor: Date;
  onCursorChange: (next: Date) => void;
  onOpen: (post: PlannerPost) => void;
  onAddDay: (day: Date) => void;
}) {
  const { locale } = useLocale();
  const tag = localeTag(locale);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [statusFilter, setStatusFilter] = useState<ProgressFilter>('all');
  const [hideEmpty, setHideEmpty] = useState(false);

  const filteredPosts = useMemo(() => {
    if (statusFilter === 'all') return posts;
    return posts.filter((p) => p.workflow === statusFilter);
  }, [posts, statusFilter]);

  const postsByDay = useMemo(() => {
    const map = new Map<string, PlannerPost[]>();
    for (const post of filteredPosts) {
      const key = postDayKey(post);
      if (!key) continue;
      const list = map.get(key) ?? [];
      list.push(post);
      map.set(key, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => {
        const ta = new Date(a.scheduled_at || a.created_at).getTime();
        const tb = new Date(b.scheduled_at || b.created_at).getTime();
        return ta - tb;
      });
    }
    return map;
  }, [filteredPosts]);

  const monthDays = useMemo(() => daysInMonth(cursor), [cursor]);

  const visibleDays = useMemo(() => {
    if (!hideEmpty) return monthDays;
    return monthDays.filter((d) => (postsByDay.get(dayKey(d))?.length ?? 0) > 0);
  }, [monthDays, hideEmpty, postsByDay]);

  const monthLabel = useMemo(() => {
    try {
      return new Intl.DateTimeFormat(tag, {
        month: 'long',
        year: 'numeric',
      }).format(cursor);
    } catch {
      return cursor.toLocaleDateString();
    }
  }, [cursor, tag]);

  const shiftMonth = (delta: number) => {
    const next = new Date(cursor.getFullYear(), cursor.getMonth() + delta, 1);
    onCursorChange(next);
  };

  const goToday = () => {
    onCursorChange(startOfDay(new Date()));
    // Scroll toward today's column when present.
    requestAnimationFrame(() => {
      const el = scrollerRef.current?.querySelector('[data-today="true"]');
      el?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    });
  };

  const scrollDays = () => {
    scrollerRef.current?.scrollBy({ left: 320, behavior: 'smooth' });
  };

  const todayKey = dayKey(new Date());

  return (
    <div className="space-y-4 min-w-0">
      {/* Month navigation */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => shiftMonth(-1)}
          className="inline-flex items-center justify-center h-9 w-9 min-h-[36px] text-[#2C2621] hover:text-[#8A857D] transition-colors"
          aria-label="Previous month"
        >
          <ChevronLeft size={16} strokeWidth={1.75} />
        </button>
        <h2 className="text-xs sm:text-sm font-semibold text-[#2C2621] min-w-[8.5rem] text-center capitalize">
          {monthLabel}
        </h2>
        <button
          type="button"
          onClick={() => shiftMonth(1)}
          className="inline-flex items-center justify-center h-9 w-9 min-h-[36px] text-[#2C2621] hover:text-[#8A857D] transition-colors"
          aria-label="Next month"
        >
          <ChevronRight size={16} strokeWidth={1.75} />
        </button>
        <button
          type="button"
          onClick={goToday}
          className="inline-flex items-center h-9 min-h-[36px] px-2.5 rounded-sm border border-[#E6E3DB] bg-white text-[9px] font-semibold uppercase tracking-[0.14em] text-[#2C2621] hover:bg-[#F0EFEA]"
        >
          Today
        </button>
      </div>

      {/* Status filters */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 min-w-0">
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8A857D]">
            Show
          </span>
          {SHOW_FILTERS.map((f) => {
            const active = statusFilter === f.key;
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setStatusFilter(f.key)}
                className={`inline-flex items-center gap-1.5 h-8 min-h-[32px] px-2 rounded-sm text-[9px] font-semibold uppercase tracking-[0.12em] transition-colors ${
                  active
                    ? 'border border-[#2C2621] text-[#2C2621] bg-white'
                    : 'text-[#8A857D] hover:text-[#2C2621]'
                }`}
              >
                {f.key !== 'all' && (
                  <span
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: f.dot }}
                    aria-hidden
                  />
                )}
                {f.label}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <button
            type="button"
            onClick={() => setHideEmpty((v) => !v)}
            className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[#8A857D] hover:text-[#2C2621] h-8 min-h-[32px]"
          >
            {hideEmpty ? 'Show empty days' : 'Hide empty days'}
          </button>
          <button
            type="button"
            onClick={scrollDays}
            className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[#8A857D] hover:text-[#2C2621] h-8 min-h-[32px]"
          >
            Scroll →
          </button>
        </div>
      </div>

      {/* Day × field matrix */}
      <div className="rounded-sm border border-[#E6E3DB] bg-white overflow-hidden">
        <div ref={scrollerRef} className="overflow-x-auto overscroll-x-contain">
          <table className="border-collapse min-w-full text-left">
            <thead>
              <tr>
                <th
                  className="sticky left-0 z-20 bg-white border-b border-r border-[#E6E3DB] px-3 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8A857D] min-w-[120px] w-[120px]"
                >
                  Field
                </th>
                {visibleDays.length === 0 ? (
                  <th className="border-b border-[#E6E3DB] px-6 py-8 text-[11px] font-medium text-[#8A857D]">
                    No days to show
                  </th>
                ) : (
                  visibleDays.map((day) => {
                    const key = dayKey(day);
                    const dayPosts = postsByDay.get(key) ?? [];
                    const primary = dayPosts[0] ?? null;
                    const isToday = key === todayKey;
                    const weekday = new Intl.DateTimeFormat(tag, {
                      weekday: 'long',
                    })
                      .format(day)
                      .toUpperCase();
                    const dateLabel = new Intl.DateTimeFormat(tag, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    }).format(day);
                    const headerStatus = primary
                      ? workflowLabel(primary.workflow).toUpperCase()
                      : 'EMPTY';

                    return (
                      <th
                        key={key}
                        data-today={isToday ? 'true' : undefined}
                        className={`border-b border-r border-[#E6E3DB] last:border-r-0 px-2 py-2.5 align-top min-w-[148px] w-[148px] bg-white ${
                          isToday ? 'bg-[#FAFAF8]' : ''
                        }`}
                      >
                        <div className="flex flex-col items-center gap-1 text-center relative pt-1">
                          <button
                            type="button"
                            onClick={() => onAddDay(day)}
                            className="absolute left-1 top-0 inline-flex items-center justify-center h-9 w-9 min-h-[36px] text-[#8A857D] hover:text-[#2C2621]"
                            aria-label={`Add post on ${dateLabel}`}
                          >
                            <Plus size={16} strokeWidth={1.75} />
                          </button>
                          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#2C2621] pt-6">
                            {weekday}
                          </span>
                          <span className="text-[11px] font-medium text-[#2C2621]">
                            {dateLabel}
                          </span>
                          <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[#A8A29E]">
                            {headerStatus}
                            {dayPosts.length > 1 ? ` · ${dayPosts.length}` : ''}
                          </span>
                        </div>
                      </th>
                    );
                  })
                )}
              </tr>
            </thead>
            <tbody>
              {FIELD_ROWS.map((row) => (
                <tr key={row.key}>
                  <th
                    scope="row"
                    className={`sticky left-0 z-10 bg-white border-b border-r border-[#E6E3DB] px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8A857D] text-left align-middle ${
                      row.tall ? 'py-4' : 'py-3'
                    }`}
                  >
                    {row.label}
                  </th>
                  {visibleDays.map((day) => {
                    const key = dayKey(day);
                    const dayPosts = postsByDay.get(key) ?? [];
                    const primary = dayPosts[0] ?? null;
                    const isToday = key === todayKey;

                    if (row.key === 'visual') {
                      const thumb = thumbFor(primary);
                      return (
                        <td
                          key={`${key}-${row.key}`}
                          className={`border-b border-r border-[#E6E3DB] last:border-r-0 px-3 py-4 align-middle ${
                            isToday ? 'bg-[#FAFAF8]' : 'bg-white'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              if (primary) onOpen(primary);
                              else onAddDay(day);
                            }}
                            className="mx-auto flex w-[92px] h-[148px] items-center justify-center rounded-sm border border-[#E6E3DB] bg-[#FAFAFA] overflow-hidden hover:border-[#2C2621]/40 transition-colors"
                          >
                            {thumb ? (
                              thumb.type === 'video' ? (
                                <video
                                  src={thumb.url}
                                  className="w-full h-full object-cover"
                                  muted
                                  playsInline
                                />
                              ) : (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={thumb.url}
                                  alt=""
                                  className="w-full h-full object-cover"
                                />
                              )
                            ) : (
                              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#C4BFB6]">
                                Empty
                              </span>
                            )}
                          </button>
                        </td>
                      );
                    }

                    const value = cellValue(primary, row.key);
                    return (
                      <td
                        key={`${key}-${row.key}`}
                        className={`border-b border-r border-[#E6E3DB] last:border-r-0 px-2 py-3 align-middle text-center ${
                          isToday ? 'bg-[#FAFAF8]' : 'bg-white'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            if (primary) onOpen(primary);
                            else onAddDay(day);
                          }}
                          className="w-full min-h-[36px] px-1 text-[10px] font-medium text-[#2C2621] line-clamp-3 hover:text-[#B85C38]"
                          title={value === '—' ? undefined : value}
                        >
                          {value}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
