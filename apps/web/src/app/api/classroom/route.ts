import sql from '@/app/api/utils/sql';

export async function GET() {
  try {
    const courses = await sql`SELECT * FROM courses`;
    const lessons = await sql`SELECT * FROM lessons ORDER BY "order" ASC`;

    const coursesWithLessons = courses.map((course) => ({
      ...course,
      lessons: lessons.filter((lesson) => lesson.course_id === course.id),
    }));

    return Response.json(coursesWithLessons);
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Failed to fetch classroom' }, { status: 500 });
  }
}
