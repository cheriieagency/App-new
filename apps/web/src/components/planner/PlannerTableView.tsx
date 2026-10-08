'use client';

import { Pencil, Trash2 } from 'lucide-react';
import {
  WORKFLOW_COLUMNS,
  checklistProgress,
  type PlannerPost,
} from '@/lib/mock-content-planner';
import { PlatformBadge } from '@/components/planner/PlatformBadge';
import { useLanguage } from '@/lib/locale-context';
import { t, localeTag } from '@/lib/i18n';
import { isPlatformImportedPost } from '@/lib/planner/platform-posts';

function formatDate(iso: string | null, locale: string) {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat(locale, {
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
  onDelete,
}: {
  posts: PlannerPost[];
  onOpen: (post: PlannerPost) => void;
  onDelete?: (post: PlannerPost) => void;
}) {
  const { locale } = useLanguage();
  const headers = [
    t('titleAndMedia', locale),
    t('studioStatus', locale),
    t('platformsCol', locale),
    t('studioScheduleDate', locale),
    t('studioAssignees', locale),
    t('studioSubtasks', locale),
    '',
  ];

  return (
    <div className="bg-white border border-[#E6E3DB] rounded-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-left">
          <thead>
            <tr className="border-b border-[#E6E3DB]">
              {headers.map((h, i) => (
                <th
                  key={h || `actions-${i}`}
                  className="px-4 py-3 text-[9px] font-semibold uppercase tracking-[0.12em] text-[#8A857D]"
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
                  className="border-b border-[#E6E3DB]/70 hover:bg-[#F9F8F6] transition-colors"
                >
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => onOpen(post)}
                      className="flex items-center gap-3 min-h-[44px] text-left w-full"
                    >
                      <div className="w-12 h-12 overflow-hidden bg-[#FAFAFA] border border-[#E6E3DB] flex-shrink-0">
                        {thumb ? (
                          thumb.type === 'video' ? (
                            <video
                              src={thumb.url}
                              className="w-full h-full object-cover"
                              muted
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
                          <div className="w-full h-full bg-[#F0EFEA]" />
                        )}
                      </div>
                      <span className="text-xs font-semibold text-[#2C2621] line-clamp-2">
                        {post.title}
                      </span>
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 text-[9px] font-semibold uppercase tracking-[0.1em] px-2 py-1 border ${
                        col?.badge ?? 'border-[#E6E3DB] bg-[#F9F8F6] text-[#5C574F]'
                      }`}
                    >
                      {col?.label ?? post.workflow}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {post.platforms.map((p) => (
                        <PlatformBadge key={p} platform={p} />
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[11px] font-medium text-[#5C574F] whitespace-nowrap">
                    {formatDate(post.scheduled_at, localeTag(locale))}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex -space-x-1.5">
                      {post.assignees.map((a) => (
                        // eslint-disable-next-line @next/next/no-img-element
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
                  <td className="px-4 py-3 text-[11px] font-medium text-[#8A857D]">
                    {post.subtasks.length
                      ? checklistProgress(post.subtasks)
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-1.5 justify-end">
                      <button
                        type="button"
                        onClick={() => onOpen(post)}
                        className="inline-flex items-center gap-1.5 h-9 min-h-[36px] px-2.5 border border-[#1C1917] text-[9px] font-semibold uppercase tracking-[0.1em] text-[#1C1917] hover:bg-[#F5F4F0]"
                      >
                        <Pencil size={12} /> {t('quickEdit', locale)}
                      </button>
                      {onDelete && !isPlatformImportedPost(post) ? (
                        <button
                          type="button"
                          onClick={() => onDelete(post)}
                          className="inline-flex items-center justify-center h-9 w-9 min-h-[36px] min-w-[36px] text-[#8A857D] hover:text-[#B85C38] transition-colors"
                          aria-label={t('deletePost', locale)}
                          title={t('deletePost', locale)}
                        >
                          <Trash2 size={14} />
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
            {posts.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-12 text-center text-xs text-[#8A857D]"
                >
                  {t('noPostsMatchFilter', locale)}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
