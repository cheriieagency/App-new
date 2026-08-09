'use client';

import { useState } from 'react';
import {
  WORKFLOW_COLUMNS,
  checklistProgress,
  type PlannerPost,
  type SocialPlatform,
  type WorkflowStatus,
} from '@/lib/mock-content-planner';
import { PlatformIcon } from '@/components/planner/PlatformBadge';

function formatShortDate(iso: string | null) {
  if (!iso) return null;
  try {
    return new Intl.DateTimeFormat('sv-SE', {
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
  const thumb = post.media_items[0] || (post.media_url
    ? { url: post.media_url, type: post.media_type === 'video' ? 'video' : 'image' }
    : null);
  const progress = checklistProgress(post.subtasks);
  const [done, total] = progress.split('/').map(Number);

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
      className="w-full text-left rounded-xl border border-zinc-100 bg-white p-3 shadow-sm hover:shadow-md hover:border-zinc-200 transition-all cursor-grab active:cursor-grabbing"
    >
      {thumb && (
        <div className="relative w-full aspect-[16/10] rounded-lg overflow-hidden bg-zinc-100 mb-2.5">
          {thumb.type === 'video' ? (
            <video src={thumb.url} className="w-full h-full object-cover" muted />
          ) : (
            <img src={thumb.url} alt="" className="w-full h-full object-cover" />
          )}
        </div>
      )}
      <p className="text-sm font-extrabold text-[#2c3340] line-clamp-2 mb-2">
        {post.title || post.idea_title || 'Utan titel'}
      </p>

      {total > 0 && (
        <div className="mb-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wide">
              Checklist
            </span>
            <span className="text-[10px] font-extrabold text-zinc-500">{progress}</span>
          </div>
          <div className="h-1.5 rounded-full bg-zinc-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-[var(--nc-coral)]"
              style={{ width: `${total ? (done / total) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex items-center gap-1.5 flex-wrap mb-2">
        {post.platforms.map((p: SocialPlatform) => (
          <PlatformIcon key={p} platform={p} size={11} />
        ))}
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex -space-x-1.5">
          {post.assignees.slice(0, 3).map((a) => (
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
          <span className="text-[10px] font-bold text-zinc-400">
            {formatShortDate(post.scheduled_at)}
          </span>
        )}
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
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<WorkflowStatus | null>(null);

  return (
    <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-none -mx-1 px-1">
      {WORKFLOW_COLUMNS.map((col) => {
        const columnPosts = posts.filter((p) => p.workflow === col.key);
        const isOver = overCol === col.key;
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
            className={`flex-shrink-0 w-[280px] sm:w-[300px] rounded-2xl border p-3 transition-colors ${
              isOver
                ? 'border-[var(--nc-coral)] bg-[color-mix(in_srgb,var(--nc-coral)_6%,white)]'
                : 'border-zinc-100 bg-zinc-50/80'
            }`}
          >
            <div className="flex items-center gap-2 mb-3 px-0.5">
              <span className="text-base">{col.emoji}</span>
              <h3 className="text-sm font-black text-[#2c3340] flex-1">{col.label}</h3>
              <span
                className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${col.badge}`}
              >
                {col.key}
              </span>
              <span className="text-[11px] font-extrabold text-zinc-400 bg-white border border-zinc-100 min-w-[22px] h-6 rounded-full inline-flex items-center justify-center">
                {columnPosts.length}
              </span>
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
                <p className="text-xs text-zinc-400 font-medium text-center py-8">
                  Dra hit kort
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
