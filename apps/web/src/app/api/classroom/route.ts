import sql from '@/app/api/utils/sql';
import {
  filterCoursesForCommunity,
  normalizeClassroomCourses,
} from '@/lib/classroom-content';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const communityIdParam = searchParams.get('community_id');
  const communityId = communityIdParam ? Number(communityIdParam) : undefined;

  const respond = (courses: unknown) => {
    const normalized = normalizeClassroomCourses(courses);
    const merged = [...normalized].sort(
      (a, b) => a.sort_order - b.sort_order
    );
    if (communityId != null && !Number.isNaN(communityId)) {
      return Response.json(
        filterCoursesForCommunity(merged, { communityId })
      );
    }
    return Response.json(merged);
  };

  if (!process.env.DATABASE_URL?.trim()) {
    return respond([]);
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
      return respond([]);
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
    return respond([]);
  }
}
