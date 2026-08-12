/** Classroom admin store — seed + user-created courses (demo / DB fallback). */

import {
  COURSE_COMMUNITY_MAP,
  SKOOL_CLASSROOM_COURSES,
} from '@/lib/classroom-content';

export const COURSE_CATEGORIES = [
  'Onboarding',
  'Content',
  'Marknadsföring',
  'Live & Events',
  'Produkt',
  'Mindset',
  'Tech',
  'Allmänt',
] as const;

export type AdminLesson = {
  id: number;
  course_id: number;
  title: string;
  description: string | null;
  video_url: string | null;
  pdf_url: string | null;
  order: number;
  duration_sec: number | null;
  is_published?: boolean;
};

export type AdminCourse = {
  id: number;
  title: string;
  description: string | null;
  category: string;
  community_id: number | null;
  cover_image: string | null;
  video_url: string | null;
  pdf_url: string | null;
  is_published: boolean;
  sort_order: number;
  lessons: AdminLesson[];
};

/** User-created courses kept in memory for the Node process (and optional localStorage in browser). */
let managedCourses: AdminCourse[] = [];
let courseSeq = 10_000;
let lessonSeq = 50_000;

const STORAGE_KEY = 'clikd_managed_classroom_v1';

function hydrate(): void {
  if (typeof window === 'undefined') return;
  if (managedCourses.length > 0) return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as AdminCourse[];
    if (Array.isArray(parsed) && parsed.length) {
      managedCourses = parsed;
      const maxId = Math.max(...parsed.map((c) => c.id), courseSeq);
      courseSeq = Math.max(courseSeq, maxId);
      const maxLesson = Math.max(
        ...parsed.flatMap((c) => (c.lessons ?? []).map((l) => l.id)),
        lessonSeq
      );
      lessonSeq = Math.max(lessonSeq, maxLesson);
    }
  } catch {
    /* ignore */
  }
}

function persist(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(managedCourses));
  } catch {
    /* ignore */
  }
}

function seedCourses(): AdminCourse[] {
  return SKOOL_CLASSROOM_COURSES.map((c) => ({
    id: c.id,
    title: c.title,
    description: c.description,
    category: c.category ?? 'Allmänt',
    community_id: c.community_id ?? COURSE_COMMUNITY_MAP[c.id] ?? 101,
    cover_image: c.cover_image,
    video_url: c.video_url ?? null,
    pdf_url: c.pdf_url ?? null,
    is_published: c.is_published,
    sort_order: c.sort_order,
    lessons: c.lessons.map((l) => ({
      id: l.id,
      course_id: l.course_id,
      title: l.title,
      description: l.description ?? null,
      video_url: l.video_url ?? null,
      pdf_url: l.pdf_url ?? null,
      order: l.order,
      duration_sec: l.duration_sec ?? null,
      is_published: true,
    })),
  }));
}

export function listManagedCourses(communityId?: number): AdminCourse[] {
  hydrate();
  const list = managedCourses.map((c) => ({
    ...c,
    lessons: [...(c.lessons ?? [])],
  }));
  if (!communityId) return list;
  return list.filter((c) => c.community_id === communityId);
}

export function createManagedCourse(input: {
  title: string;
  description?: string | null;
  category?: string;
  community_id?: number | null;
  cover_image?: string | null;
  video_url?: string | null;
  pdf_url?: string | null;
  is_published?: boolean;
  sort_order?: number;
}): AdminCourse {
  hydrate();
  const id = ++courseSeq;
  const course: AdminCourse = {
    id,
    title: input.title.trim() || 'Untitled course',
    description: input.description?.trim() || null,
    category: input.category?.trim() || 'Allmänt',
    community_id:
      input.community_id != null && Number.isFinite(Number(input.community_id))
        ? Number(input.community_id)
        : null,
    cover_image: input.cover_image ?? null,
    video_url: input.video_url ?? null,
    pdf_url: input.pdf_url ?? null,
    is_published: input.is_published !== false,
    sort_order: Number(input.sort_order ?? 0),
    lessons: [],
  };
  managedCourses = [course, ...managedCourses];
  persist();
  return { ...course, lessons: [] };
}

export function deleteManagedCourse(id: number): boolean {
  hydrate();
  const before = managedCourses.length;
  managedCourses = managedCourses.filter((c) => c.id !== id);
  persist();
  return managedCourses.length < before;
}

export function updateManagedCourse(
  id: number,
  patch: Partial<AdminCourse>
): AdminCourse | null {
  hydrate();
  const idx = managedCourses.findIndex((c) => c.id === id);
  if (idx < 0) return null;
  const next = { ...managedCourses[idx], ...patch, id };
  managedCourses[idx] = next;
  persist();
  return { ...next, lessons: [...(next.lessons ?? [])] };
}

export function addManagedLesson(
  courseId: number,
  input: {
    title: string;
    description?: string | null;
    video_url?: string | null;
    pdf_url?: string | null;
    duration_sec?: number | null;
  }
): AdminLesson | null {
  hydrate();
  const course = managedCourses.find((c) => c.id === courseId);
  if (!course) return null;
  const order = (course.lessons?.length ?? 0) + 1;
  const lesson: AdminLesson = {
    id: ++lessonSeq,
    course_id: courseId,
    title: input.title.trim(),
    description: input.description ?? null,
    video_url: input.video_url ?? null,
    pdf_url: input.pdf_url ?? null,
    order,
    duration_sec: input.duration_sec ?? null,
    is_published: true,
  };
  course.lessons = [...(course.lessons ?? []), lesson];
  persist();
  return { ...lesson };
}

export function deleteManagedLesson(lessonId: number): boolean {
  hydrate();
  let found = false;
  managedCourses = managedCourses.map((c) => {
    const nextLessons = (c.lessons ?? []).filter((l) => {
      if (l.id === lessonId) {
        found = true;
        return false;
      }
      return true;
    });
    return { ...c, lessons: nextLessons };
  });
  if (found) persist();
  return found;
}

export function getMockClassroomAdmin(communityId?: number): {
  courses: AdminCourse[];
  categories: string[];
  demo: true;
} {
  hydrate();
  const seeded = seedCourses().filter((c) =>
    communityId ? c.community_id === communityId : true
  );
  const created = listManagedCourses(communityId);
  // Prefer user-created courses first; keep seed only when no community filter
  // or when this community has seed content.
  const byId = new Map<number, AdminCourse>();
  for (const c of seeded) byId.set(c.id, c);
  for (const c of created) byId.set(c.id, c);
  const courses = Array.from(byId.values()).sort(
    (a, b) => a.sort_order - b.sort_order || b.id - a.id
  );

  const fromCourses = courses.map((c) => c.category).filter(Boolean);
  const categories = Array.from(new Set([...COURSE_CATEGORIES, ...fromCourses]));

  return { courses, categories, demo: true };
}

export function registerManagedCourse(course: AdminCourse): void {
  hydrate();
  const without = managedCourses.filter((c) => c.id !== course.id);
  managedCourses = [{ ...course, lessons: course.lessons ?? [] }, ...without];
  persist();
}
