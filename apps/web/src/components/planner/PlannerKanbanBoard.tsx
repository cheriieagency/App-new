'use client';

import { useState, type ComponentType } from 'react';
import {
  CalendarCheck,
  Eye,
  Lightbulb,
  PenLine,
  Rocket,
} from 'lucide-react';
import {
  WORKFLOW_COLUMNS,
  checklistProgress,
  type PlannerPost,
  type SocialPlatform,
  type WorkflowStatus,
} from '@/lib/mock-content-planner';
import { PlatformBadge } from '@/components/planner/PlatformBadge';
import { useLocale } from '@/lib/locale-context';
import { localeTag, t, type TranslationKey } from '@/lib/i18n';

const WORKFLOW_LABEL_KEYS: Record<WorkflowStatus, TranslationKey> = {
  IDEA: 'workflowIdeas',
  IN_PROGRESS: 'workflowInProduction',
  READY: 'workflowReview',
  SCHEDULED: 'workflowScheduled',
  PUBLISHED: 'workflowPublished',
};

const COLUMN_ICON: Record<
  WorkflowStatus,
  {
    Icon: ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
    wrap: string;
  }
> = {
  IDEA: {
    Icon: Lightbulb,
    wrap: 'bg-amber-50 text-amber-600 border border-amber-200/80',
  },
  IN_PROGRESS: {
    Icon: PenLine,
    wrap: 'bg-indigo-50 text-indigo-600 border border-indigo-200/80',
  },
  READY: {
    Icon: Eye,
    wrap: 'bg-purple-50 text-purple-600 border border-purple-200/80',
  },
  SCHEDULED: {
    Icon: CalendarCheck,
    wrap: 'bg-emerald-50 text-emerald-600 border border-emerald-200/80',
  },
  PUBLISHED: {
    Icon: Rocket,
    wrap: 'bg-cyan-50 text-cyan-600 border border-cyan-200/80',
  },
};

const COLUMN_BADGE: Record<WorkflowStatus, string> = {
  IDEA: 'bg-amber-50 text-amber-700 border-amber-200/70',
  IN_PROGRESS: 'bg-indigo-50 text-indigo-700 border-indigo-200/70',
  READY: 'bg-purple-50 text-purple-700 border-purple-200/70',
  SCHEDULED: 'bg-emerald-50 text-emerald-700 border-emerald-200/70',
  PUBLISHED: 'bg-cyan-50 text-cyan-700 border-cyan-200/70',
};

function formatShortDate(iso: string | null, locale: string) {
  if (!iso) return null;
  try {
    return new Intl.DateTimeFormat(locale, {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return null;
  }
}

function KanbanCard({
  post,
  onOpen,
  onDragStart,
}: {
  post: PlannerPost;
  onOpen: (post: PlannerPost) => void;
  onDragStart: (id: string) => void;
}) {
  const { locale } = useLocale();
  const thumb =
    post.media_items[0] ||
    (post.media_url
      ? {
          url: post.media_url,
          type: post.media_type === 'video' ? 'video' : 'image',
        }
      : null);
  const progress = checklistProgress(post.subtasks);
  const [done, total] = progress.split('/').map(Number);
  const pct = total ? (done / total) * 100 : 0;

  return (
    <button
      type="button"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', post.id);
        e.dataTransfer.effectAllowed = 'move';
        onDragStart(post.id);
      }}
      onClick={() => onOpen(post)}
      className="w-full text-left bg-white border border-slate-200/90 rounded-2xl p-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:shadow-md hover:border-slate-300 transition-all cursor-grab active:cursor-grabbing"
    >
      <div className="aspect-[16/10] bg-slate-100 rounded-xl overflow-hidden border border-slate-100 mb-3">
        {thumb ? (
          thumb.type === 'video' ? (
            <video src={thumb.url} className="w-full h-full object-cover" muted />
          ) : (
            <img src={thumb.url} alt="" className="w-full h-full object-cover" />
          )
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-slate-100 to-slate-200" />
        )}
      </div>

      <p className="font-bold text-xs text-slate-900 line-clamp-2 leading-snug mb-2">
        {post.title || post.idea_title || t('untitledPost', locale)}
      </p>

      {total > 0 && (
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
              {t('checklist', locale)}
            </span>
            <span className="text-[10px] font-bold text-slate-500">{progress}</span>
          </div>
          <div className="bg-slate-100 h-1.5 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-slate-900 transition-[width] duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 flex-wrap min-w-0">
          {post.platforms.map((p: SocialPlatform) => (
            <PlatformBadge key={p} platform={p} size="sm" />
          ))}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <div className="flex -space-x-1.5">
            {post.assignees.slice(0, 2).map((a) => (
              <img
                key={a.id}
                src={a.avatar_url}
                alt={a.name}
                title={a.name}
                className="w-6 h-6 rounded-full border-2 border-white object-cover"
              />
            ))}
          </div>
          {post.scheduled_at && (
            <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap">
              {formatShortDate(post.scheduled_at, localeTag(locale))}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

export default function PlannerKanbanBoard({
  posts,
  onOpen,
  onMove,
}: {
  posts: PlannerPost[];
  onOpen: (post: PlannerPost) => void;
  onMove: (id: string, workflow: WorkflowStatus) => void;
}) {
  const { locale } = useLocale();
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<WorkflowStatus | null>(null);

  return (
    <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-none -mx-1 px-1">
      {WORKFLOW_COLUMNS.map((col) => {
        const columnPosts = posts.filter((p) => p.workflow === col.key);
        const isOver = overCol === col.key;
        const colLabel = t(WORKFLOW_LABEL_KEYS[col.key], locale);
        const { Icon, wrap } = COLUMN_ICON[col.key];

        return (
          <div
            key={col.key}
            onDragOver={(e) => {
              e.preventDefault();
              setOverCol(col.key);
            }}
            onDragLeave={() => {
              if (overCol === col.key) setOverCol(null);
            }}
            onDrop={(e) => {
              e.preventDefault();
              const id = e.dataTransfer.getData('text/plain') || draggingId;
              if (id) onMove(id, col.key);
              setDraggingId(null);
              setOverCol(null);
            }}
            className={`flex-shrink-0 w-[280px] sm:w-[300px] bg-slate-100/60 border rounded-3xl p-3.5 transition-colors ${
              isOver
                ? 'border-slate-300 bg-slate-50'
                : 'border-slate-200/80'
            }`}
          >
            <div className="flex items-center gap-2.5 mb-3.5 px-0.5">
              <span
                className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${wrap}`}
              >
                <Icon size={15} strokeWidth={2.25} />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-bold text-slate-900 truncate">{colLabel}</h3>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span
                    className={`text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-md border ${COLUMN_BADGE[col.key]}`}
                  >
                    {col.key}
                  </span>
                  <span className="text-[11px] font-bold text-slate-400">
                    {columnPosts.length}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2.5 min-h-[120px]">
              {columnPosts.map((post) => (
                <KanbanCard
                  key={post.id}
                  post={post}
                  onOpen={onOpen}
                  onDragStart={setDraggingId}
                />
              ))}
              {columnPosts.length === 0 && (
                <p className="text-xs text-slate-400 font-medium text-center py-10">—</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
