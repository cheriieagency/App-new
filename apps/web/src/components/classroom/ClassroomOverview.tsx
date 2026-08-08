'use client';

import { BookOpen } from 'lucide-react';
import type { ClassroomCourse } from '@/lib/classroom-content';
import { courseProgressPct } from '@/lib/classroom-content';

export default function ClassroomOverview({
  courses,
  completedLessons,
  onOpenCourse,
}: {
  courses: ClassroomCourse[];
  completedLessons: Set<number>;
  onOpenCourse: (course: ClassroomCourse) => void;
}) {
  if (!courses.length) {
    return (
      <div className="text-center py-16 text-zinc-400 text-sm font-medium">
        Inga kurser tillgängliga
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
      {courses.map((course) => {
        const pct = courseProgressPct(course, completedLessons);
        return (
          <button
            key={course.id}
            type="button"
            onClick={() => onOpenCourse(course)}
            className="group text-left nc-glass rounded-[1.5rem] overflow-hidden border border-white/60 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 flex flex-col min-h-[44px]"
          >
            <div className="relative aspect-[16/10] bg-zinc-100 overflow-hidden">
              {course.cover_image ? (
                <img
                  src={course.cover_image}
                  alt=""
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-zinc-100 to-zinc-200">
                  <BookOpen size={32} className="text-zinc-300" />
                </div>
              )}
              {course.category && (
                <span className="absolute top-3 left-3 text-[10px] font-black uppercase tracking-wide bg-black/55 text-white px-2 py-1 rounded-lg backdrop-blur-sm">
                  {course.category}
                </span>
              )}
            </div>

            <div className="p-4 sm:p-5 flex flex-col flex-1">
              <h3 className="text-base font-black text-[#2c3340] leading-snug mb-1.5">
                {course.title}
              </h3>
              <p className="text-xs text-zinc-500 leading-relaxed line-clamp-2 flex-1">
                {course.description}
              </p>

              <div className="mt-4 pt-3 border-t border-zinc-100">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                    Progress
                  </span>
                  <span className="text-xs font-black text-[#2c3340]">{pct}%</span>
                </div>
                <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[var(--nc-coral)] transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
