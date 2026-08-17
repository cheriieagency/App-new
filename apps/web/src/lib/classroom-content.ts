/** Skool-style classroom courses with modules, rich lesson content, and covers. */

export type ClassroomResource = {
  label: string;
  url: string;
  icon?: string;
};

export type ContentBlock =
  | { type: 'heading'; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'bullets'; items: string[] }
  | { type: 'callout'; text: string; tone?: 'quote' | 'tip' | 'warn' }
  | { type: 'image'; url: string; alt?: string };

export type ClassroomLesson = {
  id: number;
  course_id: number;
  module_id: string;
  title: string;
  description?: string | null;
  video_url?: string | null;
  pdf_url?: string | null;
  banner_url?: string | null;
  order: number;
  duration_sec?: number | null;
  content_blocks?: ContentBlock[];
  resources?: ClassroomResource[];
};

export type ClassroomModule = {
  id: string;
  title: string;
  emoji: string;
  order: number;
  lessons: ClassroomLesson[];
};

export type ClassroomCourse = {
  id: number;
  title: string;
  description: string;
  category?: string;
  community_id?: number | null;
  cover_image: string | null;
  video_url?: string | null;
  pdf_url?: string | null;
  is_published: boolean;
  sort_order: number;
  modules: ClassroomModule[];
  /** Flat list for APIs/dashboard that still expect lessons[] */
  lessons: ClassroomLesson[];
};

/** Demo community → course ownership for dashboard filtering. */
export const COURSE_COMMUNITY_MAP: Record<number, number> = {};

const covers = {
  start:
    'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1200&q=80',
  quotes:
    'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=1200&q=80',
  product:
    'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&q=80',
  reels:
    'https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=1200&q=80',
  bootcamp:
    'https://images.unsplash.com/photo-1552664730-d307ca884978?w=1200&q=80',
  live:
    'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=1200&q=80',
};

function flattenLessons(modules: ClassroomModule[]): ClassroomLesson[] {
  return modules
    .slice()
    .sort((a, b) => a.order - b.order)
    .flatMap((m) => m.lessons.slice().sort((a, b) => a.order - b.order));
}

function withFlat(course: Omit<ClassroomCourse, 'lessons'>): ClassroomCourse {
  const lessons = flattenLessons(course.modules);
  const community_id =
    course.community_id ?? COURSE_COMMUNITY_MAP[course.id] ?? null;
  return { ...course, community_id, lessons };
}

/** Filter courses for a dashboard community (by id or slug). */
export function filterCoursesForCommunity(
  courses: ClassroomCourse[],
  opts?: { communityId?: number | null; slug?: string | null }
): ClassroomCourse[] {
  const id = opts?.communityId != null ? Number(opts.communityId) : null;
  const slug = (opts?.slug ?? '').toLowerCase();

  if (id == null && !slug) return courses;

  // Empty communities stay empty — Classroom tab is hidden until courses exist.
  return courses.filter((c) => {
    const cid = c.community_id ?? COURSE_COMMUNITY_MAP[c.id] ?? null;
    return id != null && cid === id;
  });
}

export const SKOOL_CLASSROOM_COURSES: ClassroomCourse[] = [];

export function normalizeClassroomCourses(raw: unknown): ClassroomCourse[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return [];
  }

  const skoolById = new Map(SKOOL_CLASSROOM_COURSES.map((c) => [c.id, c]));

  return raw.map((item, index) => {
    const c = item as Record<string, unknown>;
    const id = Number(c.id ?? index + 1);
    const rich = skoolById.get(id);
    if (rich) {
      return {
        ...rich,
        cover_image: (c.cover_image as string) || rich.cover_image,
        description: String(c.description ?? rich.description),
        title: String(c.title ?? rich.title),
      };
    }

    const lessonsRaw = Array.isArray(c.lessons) ? c.lessons : [];
    const lessons: ClassroomLesson[] = lessonsRaw.map((l, i) => {
      const lesson = l as Record<string, unknown>;
      return {
        id: Number(lesson.id ?? i + 1),
        course_id: id,
        module_id: `${id}-main`,
        title: String(lesson.title ?? `Lesson ${i + 1}`),
        description: (lesson.description as string) ?? null,
        video_url: (lesson.video_url as string) ?? null,
        pdf_url: (lesson.pdf_url as string) ?? null,
        banner_url: null,
        order: Number(lesson.order ?? i + 1),
        duration_sec: (lesson.duration_sec as number) ?? null,
        content_blocks: lesson.description
          ? [{ type: 'paragraph' as const, text: String(lesson.description) }]
          : [{ type: 'paragraph' as const, text: 'Open this lesson to continue.' }],
        resources: lesson.pdf_url
          ? [
              {
                label: 'Lesson PDF',
                url: String(lesson.pdf_url),
                icon: '📄',
              },
            ]
          : [],
      };
    });

    const modules: ClassroomModule[] = [
      {
        id: `${id}-main`,
        title: 'Lessons',
        emoji: '📚',
        order: 1,
        lessons,
      },
    ];

    return {
      id,
      title: String(c.title ?? 'Course'),
      description: String(c.description ?? ''),
      category: (c.category as string) || 'Allmänt',
      community_id:
        c.community_id != null
          ? Number(c.community_id)
          : (COURSE_COMMUNITY_MAP[id] ?? null),
      cover_image: (c.cover_image as string) || covers.bootcamp,
      video_url: (c.video_url as string) ?? null,
      pdf_url: (c.pdf_url as string) ?? null,
      is_published: c.is_published !== false,
      sort_order: Number(c.sort_order ?? index + 1),
      modules,
      lessons,
    };
  });
}

export function courseProgressPct(
  course: ClassroomCourse,
  completed: Set<number>
): number {
  const total = course.lessons?.length ?? 0;
  if (!total) return 0;
  const done = course.lessons.filter((l) => completed.has(l.id)).length;
  return Math.round((done / total) * 100);
}
