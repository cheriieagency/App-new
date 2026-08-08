'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { GraduationCap } from 'lucide-react';
import {
  filterCoursesForCommunity,
  normalizeClassroomCourses,
  SKOOL_CLASSROOM_COURSES,
  type ClassroomCourse,
} from '@/lib/classroom-content';
import ClassroomOverview from '@/components/classroom/ClassroomOverview';
import CourseLessonViewer from '@/components/classroom/CourseLessonViewer';

const STORAGE_KEY = 'nc-classroom-completed';

function loadCompleted(): Set<number> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as number[];
    return new Set(Array.isArray(arr) ? arr.map(Number) : []);
  } catch {
    return new Set();
  }
}

export default function ClassroomView({
  initialCourseId,
  communityId,
  communitySlug,
  communityName,
}: {
  initialCourseId?: number;
  communityId?: number | null;
  communitySlug?: string | null;
  communityName?: string | null;
} = {}) {
  const [activeCourse, setActiveCourse] = useState<ClassroomCourse | null>(null);
  const [completedLessons, setCompletedLessons] = useState<Set<number>>(new Set());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setCompletedLessons(loadCompleted());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...completedLessons]));
  }, [completedLessons, hydrated]);

  // Reset open course when switching communities in the dashboard.
  useEffect(() => {
    setActiveCourse(null);
  }, [communityId, communitySlug]);

  const { data, isLoading } = useQuery({
    queryKey: ['classroom', communityId ?? 'all'],
    queryFn: async () => {
      const qs =
        communityId != null ? `?community_id=${communityId}` : '';
      const r = await fetch(`/api/classroom${qs}`);
      if (!r.ok) throw new Error('Failed');
      return r.json();
    },
  });

  const courses = useMemo(() => {
    const normalized = normalizeClassroomCourses(data);
    const base = normalized.length ? normalized : SKOOL_CLASSROOM_COURSES;
    const ids = new Set(base.map((c) => c.id));
    const missing = SKOOL_CLASSROOM_COURSES.filter((c) => !ids.has(c.id));
    const merged = [...base, ...missing].sort((a, b) => a.sort_order - b.sort_order);
    return filterCoursesForCommunity(merged, {
      communityId,
      slug: communitySlug,
    });
  }, [data, communityId, communitySlug]);

  useEffect(() => {
    if (!initialCourseId || activeCourse || !courses.length) return;
    const found = courses.find((c) => c.id === initialCourseId);
    if (found) setActiveCourse(found);
  }, [initialCourseId, courses, activeCourse]);

  const toggleComplete = (lessonId: number) => {
    setCompletedLessons((prev) => {
      const next = new Set(prev);
      if (next.has(lessonId)) next.delete(lessonId);
      else next.add(lessonId);
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="text-center py-16 text-zinc-400 text-sm font-medium">
        Laddar kurser...
      </div>
    );
  }

  if (activeCourse) {
    return (
      <CourseLessonViewer
        course={activeCourse}
        completedLessons={completedLessons}
        onToggleComplete={toggleComplete}
        onBack={() => setActiveCourse(null)}
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-[#2c3340] flex items-center gap-2">
            <GraduationCap size={18} className="text-[var(--nc-coral)]" />
            Classroom
          </h2>
          <p className="text-xs text-zinc-400 mt-1 font-medium">
            {communityName
              ? `Kurser i ${communityName} — ditt framsteg sparas här.`
              : 'Välj en kurs för att börja — ditt framsteg sparas här.'}
          </p>
        </div>
        <p className="text-[11px] font-extrabold text-zinc-400">
          {courses.length} kurser
        </p>
      </div>
      <ClassroomOverview
        courses={courses}
        completedLessons={completedLessons}
        onOpenCourse={setActiveCourse}
      />
    </div>
  );
}
