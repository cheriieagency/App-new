import sql from '@/app/api/utils/sql';
import {
  SKOOL_CLASSROOM_COURSES,
  filterCoursesForCommunity,
  normalizeClassroomCourses,
} from '@/lib/classroom-content';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const communityIdParam = searchParams.get('community_id');
  const communityId = communityIdParam ? Number(communityIdParam) : undefined;

  const respond = (courses: unknown) => {
    const normalized = normalizeClassroomCourses(courses);
    const byId = new Map(normalized.map((c) => [c.id, c]));
    for (const demo of SKOOL_CLASSROOM_COURSES) {
      if (!byId.has(demo.id)) byId.set(demo.id, demo);
    }
    const merged = Array.from(byId.values()).sort(
      (a, b) => a.sort_order - b.sort_order
    );
    if (communityId != null && !Number.isNaN(communityId)) {
      return Response.json(
        filterCoursesForCommunity(merged, { communityId })
      );
    }
    return Response.json(merged);
  };

  // Local/demo: always serve rich Skool-style courses so the layout is visible.
  if (!process.env.DATABASE_URL?.trim()) {
    return respond(SKOOL_CLASSROOM_COURSES);
  }

  try {
    const courses =
      communityId != null && !Number.isNaN(communityId)
        ? await sql`
            SELECT * FROM courses
            WHERE community_id = ${communityId}
               OR community_id IS NULL
            ORDER BY sort_order ASC, id ASC
          `
        : await sql`SELECT * FROM courses ORDER BY sort_order ASC, id ASC`;
    const lessons = await sql`SELECT * FROM lessons ORDER BY "order" ASC`;

    if (!Array.isArray(courses) || courses.length === 0) {
      return respond(SKOOL_CLASSROOM_COURSES);
    }

    const coursesWithLessons = courses.map((course) => ({
      ...course,
      lessons: (Array.isArray(lessons) ? lessons : []).filter(
        (lesson) => lesson.course_id === course.id
      ),
    }));

    return respond(coursesWithLessons);
  } catch (error) {
    console.error(error);
    return respond(SKOOL_CLASSROOM_COURSES);
  }
}
