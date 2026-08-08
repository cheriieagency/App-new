import sql from '@/app/api/utils/sql';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { getMockClassroomAdmin } from '@/lib/mock-classroom-admin';

async function requireSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session;
}

export async function GET(request: Request) {
  const session = await requireSession();
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const communityId = searchParams.get('community_id');
  const cid = communityId ? Number(communityId) : undefined;

  if (!process.env.DATABASE_URL?.trim()) {
    return Response.json(getMockClassroomAdmin(cid));
  }

  try {
    const courses = cid
      ? await sql`
          SELECT * FROM courses
          WHERE community_id = ${cid}
             OR creator_id = ${session.user.id}
          ORDER BY sort_order ASC, id DESC
        `
      : await sql`
          SELECT * FROM courses
          WHERE creator_id = ${session.user.id}
             OR community_id IN (
               SELECT id FROM communities WHERE creator_id = ${session.user.id}
             )
          ORDER BY sort_order ASC, id DESC
        `;

    if (!Array.isArray(courses) || courses.length === 0) {
      return Response.json(getMockClassroomAdmin(cid));
    }

    const courseList = courses as Array<Record<string, unknown>>;
    const courseIds = courseList.map((c) => Number(c.id));
    const lessons =
      courseIds.length > 0
        ? await sql`
            SELECT * FROM lessons
            WHERE course_id = ANY(${courseIds})
            ORDER BY "order" ASC
          `
        : [];
    const lessonList = (Array.isArray(lessons) ? lessons : []) as Array<
      Record<string, unknown>
    >;

    const coursesWithLessons = courseList.map((course) => ({
      ...course,
      category: (course.category as string) || 'Allmänt',
      lessons: lessonList.filter((lesson) => Number(lesson.course_id) === Number(course.id)),
    }));

    const categories = Array.from(
      new Set(
        coursesWithLessons
          .map((c) => c.category || 'Allmänt')
          .concat(['Marknadsföring', 'Live & Events', 'Produkt', 'Mindset', 'Tech', 'Allmänt'])
      )
    );

    return Response.json({ courses: coursesWithLessons, categories, demo: false });
  } catch (error) {
    console.error(error);
    return Response.json(getMockClassroomAdmin(cid));
  }
}

export async function POST(request: Request) {
  const session = await requireSession();
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const { action } = body as { action?: string };

    if (!action) return Response.json({ error: 'action required' }, { status: 400 });

    // Demo mode — echo success so the client can update optimistically.
    if (!process.env.DATABASE_URL?.trim()) {
      return Response.json({
        success: true,
        demo: true,
        action,
        id: body.id ?? Date.now(),
        course: body.course ?? null,
        lesson: body.lesson ?? null,
      });
    }

    if (action === 'create_course') {
      const {
        title,
        description,
        category,
        community_id,
        cover_image,
        video_url,
        pdf_url,
        is_published = true,
      } = body;
      if (!title?.trim()) {
        return Response.json({ error: 'title required' }, { status: 400 });
      }
      const rows = await sql`
        INSERT INTO courses (
          title, description, category, community_id, cover_image,
          video_url, pdf_url, is_published, creator_id, sort_order
        )
        VALUES (
          ${title.trim()},
          ${description ?? null},
          ${category?.trim() || 'Allmänt'},
          ${community_id ? Number(community_id) : null},
          ${cover_image ?? null},
          ${video_url ?? null},
          ${pdf_url ?? null},
          ${Boolean(is_published)},
          ${session.user.id},
          ${Number(body.sort_order ?? 0)}
        )
        RETURNING *
      `;
      return Response.json({ success: true, course: { ...rows[0], lessons: [] } });
    }

    if (action === 'update_course') {
      const {
        id,
        title,
        description,
        category,
        cover_image,
        video_url,
        pdf_url,
        is_published,
        sort_order,
      } = body;
      if (!id) return Response.json({ error: 'id required' }, { status: 400 });
      const rows = await sql`
        UPDATE courses SET
          title = COALESCE(${title ?? null}, title),
          description = COALESCE(${description ?? null}, description),
          category = COALESCE(${category ?? null}, category),
          cover_image = COALESCE(${cover_image ?? null}, cover_image),
          video_url = COALESCE(${video_url ?? null}, video_url),
          pdf_url = COALESCE(${pdf_url ?? null}, pdf_url),
          is_published = COALESCE(${is_published ?? null}, is_published),
          sort_order = COALESCE(${sort_order ?? null}, sort_order)
        WHERE id = ${Number(id)}
        RETURNING *
      `;
      return Response.json({ success: true, course: rows[0] });
    }

    if (action === 'delete_course') {
      const { id } = body;
      if (!id) return Response.json({ error: 'id required' }, { status: 400 });
      await sql`DELETE FROM lessons WHERE course_id = ${Number(id)}`;
      await sql`DELETE FROM courses WHERE id = ${Number(id)}`;
      return Response.json({ success: true });
    }

    if (action === 'toggle_publish') {
      const { id, is_published } = body;
      if (!id) return Response.json({ error: 'id required' }, { status: 400 });
      const rows = await sql`
        UPDATE courses SET is_published = ${Boolean(is_published)}
        WHERE id = ${Number(id)}
        RETURNING *
      `;
      return Response.json({ success: true, course: rows[0] });
    }

    if (action === 'add_lesson') {
      const { course_id, title, description, video_url, pdf_url, duration_sec } = body;
      if (!course_id || !title?.trim()) {
        return Response.json({ error: 'course_id and title required' }, { status: 400 });
      }
      const maxOrder = await sql`
        SELECT COALESCE(MAX("order"), 0)::int AS max_order
        FROM lessons WHERE course_id = ${Number(course_id)}
      `;
      const nextOrder = Number(maxOrder[0]?.max_order ?? 0) + 1;
      const rows = await sql`
        INSERT INTO lessons (
          course_id, title, description, video_url, pdf_url,
          "order", duration_sec, is_published
        )
        VALUES (
          ${Number(course_id)},
          ${title.trim()},
          ${description ?? null},
          ${video_url ?? null},
          ${pdf_url ?? null},
          ${nextOrder},
          ${duration_sec ? Number(duration_sec) : null},
          true
        )
        RETURNING *
      `;
      return Response.json({ success: true, lesson: rows[0] });
    }

    if (action === 'delete_lesson') {
      const { id } = body;
      if (!id) return Response.json({ error: 'id required' }, { status: 400 });
      await sql`DELETE FROM lessons WHERE id = ${Number(id)}`;
      return Response.json({ success: true });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error(error);
    if (!process.env.DATABASE_URL?.trim()) {
      return Response.json({ success: true, demo: true });
    }
    return Response.json({ error: 'Failed to update classroom' }, { status: 500 });
  }
}
