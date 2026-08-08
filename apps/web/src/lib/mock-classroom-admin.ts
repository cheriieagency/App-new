/** Demo classroom payload for admin when DATABASE_URL is missing. */

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

export function getMockClassroomAdmin(communityId?: number): {
  courses: AdminCourse[];
  categories: string[];
  demo: true;
} {
  const courses: AdminCourse[] = SKOOL_CLASSROOM_COURSES.map((c) => ({
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
  })).filter((c) =>
    communityId ? c.community_id === communityId : true
  );

  const fromCourses = courses.map((c) => c.category).filter(Boolean);
  const categories = Array.from(new Set([...COURSE_CATEGORIES, ...fromCourses]));

  return { courses, categories, demo: true };
}
