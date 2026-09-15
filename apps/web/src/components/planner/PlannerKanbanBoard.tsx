'use client';

import { useState, type ComponentType } from 'react';
import {
  CalendarCheck,
  Eye,
  Lightbulb,
  PenLine,
  Rocket,
  Trash2,
  TriangleAlert,
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
import { isPlatformImportedPost } from '@/lib/planner/platform-posts';

const WORKFLOW_LABEL_KEYS: Record<WorkflowStatus, TranslationKey> = {
  IDEA: 'workflowIdeas',
  IN_PROGRESS: 'workflowInProduction',
  READY: 'workflowReview',
  SCHEDULED: 'workflowScheduled',
  PUBLISHED: 'workflowPublished',
  FAILED: 'workflowFailed',
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
    wrap: 'bg-[rgba(44,59,46,0.06)] text-[#2C3B2E] border border-[#E6E3DB]',
  },
  IN_PROGRESS: {
    Icon: PenLine,
    wrap: 'bg-[rgba(184,92,56,0.08)] text-[#B85C38] border border-[#E6E3DB]',
  },
  READY: {
    Icon: Eye,
    wrap: 'bg-[#F0EFEA] text-[#8A857D] border border-[#E6E3DB]',
  },
  SCHEDULED: {
    Icon: CalendarCheck,
    wrap: 'bg-[rgba(44,59,46,0.06)] text-[#2C3B2E] border border-[#E6E3DB]',
  },
  PUBLISHED: {
    Icon: Rocket,
    wrap: 'bg-[rgba(44,59,46,0.06)] text-[#2C3B2E] border border-[#E6E3DB]',
  },
  FAILED: {
    Icon: TriangleAlert,
    wrap: 'bg-[rgba(184,92,56,0.08)] text-[#B85C38] border border-[#E6E3DB]',
  },
};

const COLUMN_BADGE: Record<WorkflowStatus, string> = {
  IDEA: 'bg-[rgba(44,59,46,0.06)] text-[#2C3B2E] border-[#E6E3DB]',
  IN_PROGRESS: 'bg-[rgba(184,92,56,0.08)] text-[#B85C38] border-[#E6E3DB]',
  READY: 'bg-[#F0EFEA] text-[#8A857D] border-[#E6E3DB]',
  SCHEDULED: 'bg-[rgba(44,59,46,0.06)] text-[#2C3B2E] border-[#E6E3DB]',
  PUBLISHED: 'bg-[rgba(44,59,46,0.06)] text-[#2C3B2E] border-[#E6E3DB]',
  FAILED: 'bg-[rgba(184,92,56,0.08)] text-[#B85C38] border-[#E6E3DB]',
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
  onDelete,
  onDragStart,
}: {
  post: PlannerPost;
  onOpen: (post: PlannerPost) => void;
  onDelete?: (post: PlannerPost) => void;
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
  const canDelete = Boolean(onDelete) && !isPlatformImportedPost(post);

  return (
    <div className="group relative">
      {canDelete ? (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDelete?.(post);
          }}
          className="absolute top-2 right-2 z-10 inline-flex h-9 w-9 min-h-[36px] min-w-[36px] items-center justify-center rounded-lg border border-[#E6E3DB] bg-white text-[#8A857D] opacity-100 sm:opacity-0 sm:group-hover:opacity-100 hover:bg-[#FEF2F2] hover:text-[#B85C38] hover:border-[#F5C6B8] transition-all"
          aria-label={t('deletePost', locale)}
          title={t('deletePost', locale)}
        >
          <Trash2 size={14} strokeWidth={2} />
        </button>
      ) : null}
    <button
      type="button"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', post.id);
        e.dataTransfer.effectAllowed = 'move';
        onDragStart(post.id);
      }}
      onClick={() => onOpen(post)}
      className="w-full text-left bg-[#FFFFFF] border border-[#E6E3DB] rounded-xl p-4 shadow-none hover:bg-[#F0EFEA]/40 hover:border-[#DDD8CE] transition-colors cursor-grab active:cursor-grabbing"
    >
      <div className="aspect-[16/10] bg-[#F0EFEA] rounded-lg overflow-hidden border border-[#E6E3DB] mb-4">
        {thumb ? (
          thumb.type === 'video' ? (
            <video src={thumb.url} className="w-full h-full object-cover" muted />
          ) : (
            <img src={thumb.url} alt="" className="w-full h-full object-cover" />
          )
        ) : (
          <div className="w-full h-full bg-[#F0EFEA]" />
        )}
      </div>

      <p className="font-inter font-medium text-xs text-[#2C2621] line-clamp-2 leading-snug mb-3">
        {post.title || post.idea_title || t('untitledPost', locale)}
      </p>

      {total > 0 && (
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-medium text-[#8A857D] uppercase tracking-wide">
              {t('checklist', locale)}
            </span>
            <span className="text-[10px] font-medium text-[#8A857D]">{progress}</span>
          </div>
          <div className="bg-[#F0EFEA] h-1 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-[#2C3B2E] transition-[width] duration-300"
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
                className="w-6 h-6 rounded-full border border-[#E6E3DB] object-cover"
              />
            ))}
          </div>
          {post.scheduled_at && (
            <span className="text-[10px] font-medium text-[#8A857D] whitespace-nowrap">
              {formatShortDate(post.scheduled_at, localeTag(locale))}
            </span>
          )}
        </div>
      </div>
    </button>
    </div>
  );
}

export default function PlannerKanbanBoard({
  posts,
  onOpen,
  onDelete,
  onMove,
}: {
  posts: PlannerPost[];
  onOpen: (post: PlannerPost) => void;
  onDelete?: (post: PlannerPost) => void;
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
            className={`flex-shrink-0 w-[280px] sm:w-[300px] bg-transparent border rounded-xl p-4 transition-colors ${
              isOver
                ? 'border-[#2C3B2E]/40 bg-[#F0EFEA]/50'
                : 'border-[#E6E3DB]'
            }`}
          >
            <div className="flex items-center gap-2.5 mb-4 px-0.5">
              <span
                className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${wrap}`}
              >
                <Icon size={15} strokeWidth={1.5} />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-playfair font-medium text-[#2C2621] truncate">{colLabel}</h3>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span
                    className={`text-[9px] font-medium uppercase tracking-wide px-1.5 py-0.5 rounded-full border ${COLUMN_BADGE[col.key]}`}
                  >
                    {col.key}
                  </span>
                  <span className="text-[11px] font-medium text-[#8A857D]">
                    {columnPosts.length}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-3 min-h-[120px]">
              {columnPosts.map((post) => (
                <KanbanCard
                  key={post.id}
                  post={post}
                  onOpen={onOpen}
                  onDelete={onDelete}
                  onDragStart={setDraggingId}
                />
              ))}
              {columnPosts.length === 0 && (
                <p className="editorial-empty-title text-center py-12 text-base">
                  No posts planned yet.
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
