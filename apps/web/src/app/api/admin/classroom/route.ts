import sql from '@/app/api/utils/sql';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import {
  COURSE_CATEGORIES,
  addManagedLesson,
  createManagedCourse,
  deleteManagedCourse,
  deleteManagedLesson,
  getMockClassroomAdmin,
  listManagedCourses,
  updateManagedCourse,
  type AdminCourse,
} from '@/lib/mock-classroom-admin';
import { requireFeature } from '@/lib/plan-guard';

async function requireSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session;
}

let schemaEnsured = false;

async function ensureClassroomSchema(): Promise<void> {
  if (schemaEnsured || !process.env.DATABASE_URL?.trim()) {
    schemaEnsured = true;
    return;
  }
  try {
    await sql`
      ALTER TABLE courses
        ADD COLUMN IF NOT EXISTS category text DEFAULT 'Allmänt',
        ADD COLUMN IF NOT EXISTS video_url text,
        ADD COLUMN IF NOT EXISTS pdf_url text,
        ADD COLUMN IF NOT EXISTS cover_image text,
        ADD COLUMN IF NOT EXISTS community_id integer,
        ADD COLUMN IF NOT EXISTS creator_id text,
        ADD COLUMN IF NOT EXISTS is_published boolean DEFAULT true,
        ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0
    `;
    await sql`
      ALTER TABLE lessons
        ADD COLUMN IF NOT EXISTS pdf_url text,
        ADD COLUMN IF NOT EXISTS video_url text,
        ADD COLUMN IF NOT EXISTS is_published boolean DEFAULT true
    `;
    schemaEnsured = true;
  } catch (error) {
    console.warn('[ensureClassroomSchema]', error);
  }
}

function mapCourseRow(row: Record<string, unknown>, lessons: unknown[] = []): AdminCourse {
  return {
    id: Number(row.id),
    title: String(row.title ?? 'Untitled'),
    description: (row.description as string) ?? null,
    category: String(row.category || 'Allmänt'),
    community_id:
      row.community_id != null && row.community_id !== ''
        ? Number(row.community_id)
        : null,
    cover_image: (row.cover_image as string) ?? null,
    video_url: (row.video_url as string) ?? null,
    pdf_url: (row.pdf_url as string) ?? null,
    is_published: row.is_published !== false,
    sort_order: Number(row.sort_order ?? 0),
    lessons: lessons as AdminCourse['lessons'],
  };
}

function categoriesFor(courses: AdminCourse[]): string[] {
  return Array.from(
    new Set([
      ...COURSE_CATEGORIES,
      ...courses.map((c) => c.category).filter(Boolean),
    ])
  );
}

export async function GET(request: Request) {
  const session = await requireSession();
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const communityId = searchParams.get('community_id');
  const cid = communityId ? Number(communityId) : undefined;

  await ensureClassroomSchema();

  if (!process.env.DATABASE_URL?.trim()) {
    return Response.json(getMockClassroomAdmin(cid));
  }

  try {
    // Strict workspace/community binding — only courses for this community.
    const courses = cid
      ? await sql`
          SELECT * FROM courses
          WHERE community_id = ${cid}
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

    const courseList = (Array.isArray(courses) ? courses : []) as Array<
      Record<string, unknown>
    >;

    if (courseList.length === 0) {
      // Only return user-created managed fallbacks — never seed mock for live DB.
      const managed = listManagedCourses(cid).filter((c) => c.id >= 10_000);
      return Response.json({
        courses: managed,
        categories: Array.from(
          new Set([...COURSE_CATEGORIES, ...managed.map((c) => c.category)])
        ),
        demo: managed.length > 0,
      });
    }

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

    const coursesWithLessons = courseList.map((course) =>
      mapCourseRow(
        course,
        lessonList.filter((lesson) => Number(lesson.course_id) === Number(course.id))
      )
    );

    // Merge any managed (fallback) courses not yet in DB for this community.
    const managed = listManagedCourses(cid).filter((c) => c.id >= 10_000);
    const ids = new Set(coursesWithLessons.map((c) => c.id));
    for (const c of managed) {
      if (!ids.has(c.id)) {
        coursesWithLessons.unshift(c);
      }
    }

    return Response.json({
      courses: coursesWithLessons,
      categories: categoriesFor(coursesWithLessons),
      demo: false,
    });
  } catch (error) {
    console.error('[GET /api/admin/classroom]', error);
    const managed = listManagedCourses(cid).filter((c) => c.id >= 10_000);
    return Response.json({
      courses: managed,
      categories: [...COURSE_CATEGORIES],
      demo: false,
      error: 'load_failed',
    });
  }
}

export async function POST(request: Request) {
  const session = await requireSession();
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const gate = await requireFeature('coursesAndVideoHosting', request.headers);
  if (gate) return gate;

  try {
    const body = await request.json();
    const { action } = body as { action?: string };

    if (!action) return Response.json({ error: 'action required' }, { status: 400 });

    await ensureClassroomSchema();

    const useDemo = !process.env.DATABASE_URL?.trim();

    if (action === 'create_course') {
      const title = String(body.title ?? '').trim();
      if (!title) {
        return Response.json({ error: 'title required' }, { status: 400 });
      }
      const payload = {
        title,
        description: (body.description as string) ?? null,
        category: String(body.category ?? '').trim() || 'Allmänt',
        community_id: body.community_id ? Number(body.community_id) : null,
        cover_image: (body.cover_image as string) ?? null,
        video_url: (body.video_url as string) ?? null,
        pdf_url: (body.pdf_url as string) ?? null,
        is_published: body.is_published !== false,
        sort_order: Number(body.sort_order ?? 0),
      };

      if (useDemo) {
        const course = createManagedCourse(payload);
        return Response.json({ success: true, course, demo: true });
      }

      try {
        let rows: Record<string, unknown>[] = [];
        try {
          rows = (await sql`
            INSERT INTO courses (
              title, description, category, community_id, cover_image,
              video_url, pdf_url, is_published, creator_id, sort_order
            )
            VALUES (
              ${payload.title},
              ${payload.description},
              ${payload.category},
              ${payload.community_id},
              ${payload.cover_image},
              ${payload.video_url},
              ${payload.pdf_url},
              ${payload.is_published},
              ${session.user.id},
              ${payload.sort_order}
            )
            RETURNING *
          `) as Record<string, unknown>[];
        } catch (fkError) {
          console.warn('[create_course] retry without creator_id', fkError);
          rows = (await sql`
            INSERT INTO courses (
              title, description, category, community_id, cover_image,
              video_url, pdf_url, is_published, sort_order
            )
            VALUES (
              ${payload.title},
              ${payload.description},
              ${payload.category},
              ${payload.community_id},
              ${payload.cover_image},
              ${payload.video_url},
              ${payload.pdf_url},
              ${payload.is_published},
              ${payload.sort_order}
            )
            RETURNING *
          `) as Record<string, unknown>[];
        }

        const row = rows?.[0];
        if (!row?.id) throw new Error('Insert returned no row');
        const course = mapCourseRow(row, []);
        return Response.json({ success: true, course, demo: false });
      } catch (dbError) {
        console.warn('[create_course] DB failed — managed fallback', dbError);
        // Community FK / schema issues — still unlock the admin UI.
        const course = createManagedCourse(payload);
        return Response.json({
          success: true,
          course,
          demo: true,
          warning: 'persisted_in_memory',
        });
      }
    }

    if (action === 'update_course') {
      const id = Number(body.id);
      if (!id) return Response.json({ error: 'id required' }, { status: 400 });

      if (useDemo || id >= 10_000) {
        const course = updateManagedCourse(id, {
          title: body.title != null ? String(body.title) : undefined,
          description: body.description as string | null | undefined,
          category: body.category != null ? String(body.category) : undefined,
          cover_image: body.cover_image as string | null | undefined,
          video_url: body.video_url as string | null | undefined,
          pdf_url: body.pdf_url as string | null | undefined,
          is_published:
            body.is_published != null ? Boolean(body.is_published) : undefined,
        });
        return Response.json({ success: true, course, demo: true });
      }

      const rows = await sql`
        UPDATE courses SET
          title = COALESCE(${body.title ?? null}, title),
          description = COALESCE(${body.description ?? null}, description),
          category = COALESCE(${body.category ?? null}, category),
          cover_image = COALESCE(${body.cover_image ?? null}, cover_image),
          video_url = COALESCE(${body.video_url ?? null}, video_url),
          pdf_url = COALESCE(${body.pdf_url ?? null}, pdf_url),
          is_published = COALESCE(${body.is_published ?? null}, is_published),
          sort_order = COALESCE(${body.sort_order ?? null}, sort_order)
        WHERE id = ${id}
        RETURNING *
      `;
      return Response.json({
        success: true,
        course: mapCourseRow(rows[0] as Record<string, unknown>),
      });
    }

    if (action === 'delete_course') {
      const id = Number(body.id);
      if (!id) return Response.json({ error: 'id required' }, { status: 400 });
      if (useDemo || id >= 10_000) {
        deleteManagedCourse(id);
        return Response.json({ success: true, demo: true });
      }
      await sql`DELETE FROM lessons WHERE course_id = ${id}`;
      await sql`DELETE FROM courses WHERE id = ${id}`;
      return Response.json({ success: true });
    }

    if (action === 'toggle_publish') {
      const id = Number(body.id);
      if (!id) return Response.json({ error: 'id required' }, { status: 400 });
      if (useDemo || id >= 10_000) {
        const course = updateManagedCourse(id, {
          is_published: Boolean(body.is_published),
        });
        return Response.json({ success: true, course, demo: true });
      }
      const rows = await sql`
        UPDATE courses SET is_published = ${Boolean(body.is_published)}
        WHERE id = ${id}
        RETURNING *
      `;
      return Response.json({
        success: true,
        course: mapCourseRow(rows[0] as Record<string, unknown>),
      });
    }

    if (action === 'add_lesson') {
      const courseId = Number(body.course_id);
      const title = String(body.title ?? '').trim();
      if (!courseId || !title) {
        return Response.json({ error: 'course_id and title required' }, { status: 400 });
      }

      if (useDemo || courseId >= 10_000) {
        const lesson = addManagedLesson(courseId, {
          title,
          description: (body.description as string) ?? null,
          video_url: (body.video_url as string) ?? null,
          pdf_url: (body.pdf_url as string) ?? null,
          duration_sec: body.duration_sec ? Number(body.duration_sec) : null,
        });
        return Response.json({ success: true, lesson, demo: true });
      }

      const maxOrder = await sql`
        SELECT COALESCE(MAX("order"), 0)::int AS max_order
        FROM lessons WHERE course_id = ${courseId}
      `;
      const nextOrder = Number(maxOrder[0]?.max_order ?? 0) + 1;
      const rows = await sql`
        INSERT INTO lessons (
          course_id, title, description, video_url, pdf_url,
          "order", duration_sec, is_published
        )
        VALUES (
          ${courseId},
          ${title},
          ${body.description ?? null},
          ${body.video_url ?? null},
          ${body.pdf_url ?? null},
          ${nextOrder},
          ${body.duration_sec ? Number(body.duration_sec) : null},
          true
        )
        RETURNING *
      `;
      return Response.json({ success: true, lesson: rows[0] });
    }

    if (action === 'delete_lesson') {
      const id = Number(body.id);
      if (!id) return Response.json({ error: 'id required' }, { status: 400 });
      if (useDemo || id >= 50_000) {
        deleteManagedLesson(id);
        return Response.json({ success: true, demo: true });
      }
      await sql`DELETE FROM lessons WHERE id = ${id}`;
      return Response.json({ success: true });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('[POST /api/admin/classroom]', error);
    return Response.json(
      {
        error: 'Failed to update classroom',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
