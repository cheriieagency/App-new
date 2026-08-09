'use client';

import { Pencil } from 'lucide-react';
import {
  WORKFLOW_COLUMNS,
  checklistProgress,
  type PlannerPost,
} from '@/lib/mock-content-planner';
import { PlatformBadge } from '@/components/planner/PlatformBadge';

function formatDate(iso: string | null) {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('sv-SE', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return '—';
  }
}

export default function PlannerTableView({
  posts,
  onOpen,
}: {
  posts: PlannerPost[];
  onOpen: (post: PlannerPost) => void;
}) {
  return (
    <div className="nc-glass rounded-[1.5rem] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-left">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50/80">
              {[
                'Titel & Media',
                'Status',
                'Plattformar',
                'Schemalagt',
                'Ansvarig',
                'Subtasks',
                '',
              ].map((h) => (
                <th
                  key={h || 'actions'}
                  className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-zinc-400"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {posts.map((post) => {
              const col = WORKFLOW_COLUMNS.find((c) => c.key === post.workflow);
              const thumb = post.media_items[0];
              return (
                <tr
                  key={post.id}
                  className="border-b border-zinc-50 hover:bg-zinc-50/60 transition-colors"
                >
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => onOpen(post)}
                      className="flex items-center gap-3 min-h-[44px] text-left w-full"
                    >
                      <div className="w-12 h-12 rounded-xl overflow-hidden bg-zinc-100 flex-shrink-0">
                        {thumb ? (
                          thumb.type === 'video' ? (
                            <video
                              src={thumb.url}
                              className="w-full h-full object-cover"
                              muted
                            />
                          ) : (
                            <img
                              src={thumb.url}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          )
                        ) : (
                          <div className="w-full h-full bg-zinc-100" />
                        )}
                      </div>
                      <span className="text-sm font-extrabold text-[#2c3340] line-clamp-2">
                        {post.title}
                      </span>
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-1 rounded-full ${col?.badge ?? 'bg-zinc-100 text-zinc-600'}`}
                    >
                      {col?.emoji} {col?.label ?? post.workflow}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {post.platforms.map((p) => (
                        <PlatformBadge key={p} platform={p} />
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs font-bold text-zinc-600 whitespace-nowrap">
                    {formatDate(post.scheduled_at)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex -space-x-1.5">
                      {post.assignees.map((a) => (
                        <img
                          key={a.id}
                          src={a.avatar_url}
                          alt={a.name}
                          title={a.name}
                          className="w-7 h-7 rounded-full border-2 border-white object-cover"
                        />
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs font-extrabold text-zinc-500">
                    {post.subtasks.length
                      ? checklistProgress(post.subtasks)
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => onOpen(post)}
                      className="inline-flex items-center gap-1.5 h-11 min-h-[44px] px-3 rounded-xl text-xs font-extrabold text-[var(--nc-coral)] hover:bg-[color-mix(in_srgb,var(--nc-coral)_10%,white)]"
                    >
                      <Pencil size={13} /> Quick Edit
                    </button>
                  </td>
                </tr>
              );
            })}
            {posts.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-12 text-center text-sm text-zinc-400 font-medium"
                >
                  Inga inlägg matchar filtret.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
