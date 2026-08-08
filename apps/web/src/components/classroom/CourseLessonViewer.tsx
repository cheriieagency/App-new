'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  FileText,
  Link2,
} from 'lucide-react';
import type {
  ClassroomCourse,
  ClassroomLesson,
  ContentBlock,
} from '@/lib/classroom-content';
import { courseProgressPct } from '@/lib/classroom-content';

function ContentRenderer({ blocks }: { blocks: ContentBlock[] }) {
  if (!blocks?.length) return null;
  return (
    <div className="space-y-4">
      {blocks.map((block, i) => {
        if (block.type === 'heading') {
          return (
            <h3
              key={i}
              className="text-lg sm:text-xl font-black text-[#2c3340] tracking-tight"
            >
              {block.text}
            </h3>
          );
        }
        if (block.type === 'paragraph') {
          return (
            <p key={i} className="text-sm text-zinc-600 leading-relaxed">
              {block.text}
            </p>
          );
        }
        if (block.type === 'bullets') {
          return (
            <ul key={i} className="space-y-2 pl-1">
              {block.items.map((item, j) => (
                <li key={j} className="flex items-start gap-2.5 text-sm text-zinc-600">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[var(--nc-coral)] flex-shrink-0" />
                  <span className="leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          );
        }
        if (block.type === 'callout') {
          const tone = block.tone ?? 'quote';
          const styles =
            tone === 'tip'
              ? 'bg-emerald-50 border-emerald-100 text-emerald-900'
              : tone === 'warn'
                ? 'bg-amber-50 border-amber-100 text-amber-900'
                : 'bg-[#fff4f0] border-[#ffe0d4] text-[#7a3b2a]';
          return (
            <blockquote
              key={i}
              className={`rounded-2xl border px-4 py-3.5 text-sm leading-relaxed font-medium ${styles}`}
            >
              {tone === 'quote' && (
                <span className="block text-2xl leading-none mb-1 opacity-40">“</span>
              )}
              {block.text}
            </blockquote>
          );
        }
        if (block.type === 'image') {
          return (
            <div key={i} className="rounded-2xl overflow-hidden border border-zinc-100">
              <img
                src={block.url}
                alt={block.alt ?? ''}
                className="w-full max-h-[360px] object-cover"
              />
            </div>
          );
        }
        return null;
      })}
    </div>
  );
}

export default function CourseLessonViewer({
  course,
  completedLessons,
  onToggleComplete,
  onBack,
  initialLessonId,
}: {
  course: ClassroomCourse;
  completedLessons: Set<number>;
  onToggleComplete: (lessonId: number) => void;
  onBack: () => void;
  initialLessonId?: number;
}) {
  const modules = useMemo(
    () => [...(course.modules ?? [])].sort((a, b) => a.order - b.order),
    [course.modules]
  );

  const firstLesson = modules[0]?.lessons?.[0] ?? course.lessons?.[0] ?? null;
  const [activeLesson, setActiveLesson] = useState<ClassroomLesson | null>(() => {
    if (initialLessonId) {
      return course.lessons.find((l) => l.id === initialLessonId) ?? firstLesson;
    }
    return firstLesson;
  });

  const [openModules, setOpenModules] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    const mid = activeLesson?.module_id ?? modules[0]?.id;
    if (mid) initial.add(mid);
    // Open all modules by default for Skool-like browse feel on desktop.
    modules.forEach((m) => initial.add(m.id));
    return initial;
  });

  useEffect(() => {
    if (!activeLesson && firstLesson) setActiveLesson(firstLesson);
  }, [activeLesson, firstLesson]);

  const progress = courseProgressPct(course, completedLessons);
  const isDone = activeLesson ? completedLessons.has(activeLesson.id) : false;

  const toggleModule = (id: string) => {
    setOpenModules((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 lg:gap-5 min-h-[70vh]">
      {/* LEFT SIDEBAR */}
      <aside className="w-full lg:w-[300px] xl:w-[320px] flex-shrink-0">
        <div className="nc-glass rounded-[1.5rem] overflow-hidden lg:sticky lg:top-24">
          <div className="p-4 border-b border-zinc-50">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1.5 h-10 min-h-[44px] -ml-1 px-2 text-xs font-extrabold text-zinc-500 hover:text-[#2c3340] transition-colors"
            >
              <ArrowLeft size={14} /> Alla kurser
            </button>
            <h2 className="text-base font-black text-[#2c3340] leading-snug mt-1">
              {course.title}
            </h2>
            <div className="mt-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                  Progress
                </span>
                <span className="text-xs font-black text-[var(--nc-coral)]">{progress}%</span>
              </div>
              <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-[var(--nc-coral)] transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>

          <nav className="max-h-[55vh] lg:max-h-[calc(100vh-220px)] overflow-y-auto p-2">
            {modules.map((mod) => {
              const open = openModules.has(mod.id);
              return (
                <div key={mod.id} className="mb-1">
                  <button
                    type="button"
                    onClick={() => toggleModule(mod.id)}
                    className="w-full flex items-center gap-2 h-11 min-h-[44px] px-2.5 rounded-xl text-left hover:bg-zinc-50 transition-colors"
                  >
                    {open ? (
                      <ChevronDown size={14} className="text-zinc-400 flex-shrink-0" />
                    ) : (
                      <ChevronRight size={14} className="text-zinc-400 flex-shrink-0" />
                    )}
                    <span className="text-sm leading-none">{mod.emoji}</span>
                    <span className="text-xs font-extrabold text-[#2c3340] truncate">
                      {mod.title}
                    </span>
                  </button>

                  {open && (
                    <div className="ml-2 pl-2 border-l border-zinc-100 space-y-0.5 mb-2">
                      {mod.lessons
                        .slice()
                        .sort((a, b) => a.order - b.order)
                        .map((lesson) => {
                          const active = activeLesson?.id === lesson.id;
                          const done = completedLessons.has(lesson.id);
                          return (
                            <button
                              key={lesson.id}
                              type="button"
                              onClick={() => {
                                setActiveLesson(lesson);
                                setOpenModules((prev) => new Set(prev).add(mod.id));
                              }}
                              className={`w-full flex items-center gap-2 min-h-[44px] px-3 py-2 rounded-xl text-left transition-all ${
                                active
                                  ? 'bg-[#ffe8e1] text-[#c45a3e]'
                                  : 'hover:bg-zinc-50 text-zinc-600'
                              }`}
                            >
                              <span
                                className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                                  done
                                    ? 'bg-emerald-100 text-emerald-600'
                                    : active
                                      ? 'bg-white text-[var(--nc-coral)]'
                                      : 'bg-zinc-100 text-zinc-400'
                                }`}
                              >
                                {done ? (
                                  <CheckCircle2 size={12} />
                                ) : (
                                  <span className="w-1.5 h-1.5 rounded-full bg-current" />
                                )}
                              </span>
                              <span
                                className={`text-xs flex-1 leading-snug ${
                                  active ? 'font-extrabold' : 'font-bold'
                                }`}
                              >
                                {lesson.title}
                              </span>
                            </button>
                          );
                        })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* RIGHT MAIN CONTENT */}
      <main className="flex-1 min-w-0">
        {!activeLesson ? (
          <div className="nc-glass rounded-[1.5rem] p-10 text-center text-sm text-zinc-400">
            Välj en lektion till vänster
          </div>
        ) : (
          <div className="nc-glass rounded-[1.5rem] overflow-hidden">
            {/* Header */}
            <div className="p-4 sm:p-6 border-b border-zinc-50 flex flex-col sm:flex-row sm:items-start gap-3 justify-between">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">
                  {course.title}
                </p>
                <h1 className="text-xl sm:text-2xl font-black text-[#2c3340] leading-tight">
                  {activeLesson.title}
                </h1>
              </div>
              <button
                type="button"
                onClick={() => onToggleComplete(activeLesson.id)}
                className={`inline-flex items-center justify-center gap-2 h-11 min-h-[44px] px-4 rounded-xl text-xs font-extrabold transition-all flex-shrink-0 ${
                  isDone
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-[var(--nc-coral)] text-white hover:opacity-90'
                }`}
              >
                <CheckCircle2 size={15} />
                {isDone ? 'Done' : 'Mark as complete'}
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-5">
              {/* Banner / video */}
              {activeLesson.video_url ? (
                <div className="rounded-2xl overflow-hidden bg-black aspect-video">
                  <iframe
                    key={activeLesson.id}
                    src={
                      activeLesson.video_url.includes('?')
                        ? `${activeLesson.video_url}&enablejsapi=1`
                        : `${activeLesson.video_url}?enablejsapi=1`
                    }
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title={activeLesson.title}
                  />
                </div>
              ) : activeLesson.banner_url ? (
                <div className="rounded-2xl overflow-hidden aspect-[21/9] bg-zinc-100">
                  <img
                    src={activeLesson.banner_url}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : null}

              {activeLesson.description && !activeLesson.content_blocks?.length && (
                <p className="text-sm text-zinc-600 leading-relaxed">
                  {activeLesson.description}
                </p>
              )}

              <ContentRenderer blocks={activeLesson.content_blocks ?? []} />

              {/* Resources */}
              {((activeLesson.resources?.length ?? 0) > 0 || activeLesson.pdf_url) && (
                <div className="pt-4 border-t border-zinc-100">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-3">
                    Resources
                  </h4>
                  <div className="space-y-2">
                    {activeLesson.pdf_url && (
                      <a
                        href={activeLesson.pdf_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 min-h-[44px] px-3.5 py-2.5 rounded-xl bg-zinc-50 border border-zinc-100 hover:border-[var(--nc-coral)] transition-colors"
                      >
                        <FileText size={16} className="text-[var(--nc-coral)] flex-shrink-0" />
                        <span className="text-xs font-extrabold text-[#2c3340] flex-1">
                          Lesson PDF
                        </span>
                        <ExternalLink size={13} className="text-zinc-300" />
                      </a>
                    )}
                    {(activeLesson.resources ?? []).map((res, i) => (
                      <a
                        key={i}
                        href={res.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 min-h-[44px] px-3.5 py-2.5 rounded-xl bg-zinc-50 border border-zinc-100 hover:border-[var(--nc-coral)] transition-colors"
                      >
                        <span className="text-base flex-shrink-0 w-5 text-center">
                          {res.icon || <Link2 size={14} className="text-[var(--nc-coral)]" />}
                        </span>
                        <span className="text-xs font-extrabold text-[#2c3340] flex-1">
                          {res.label}
                        </span>
                        <ExternalLink size={13} className="text-zinc-300" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
