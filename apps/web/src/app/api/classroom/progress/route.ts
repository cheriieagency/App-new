/**
 * GET/POST /api/classroom/progress — lesson completion for the signed-in learner.
 */

import { requireApiSession } from '@/lib/auth/require-api-session';
import {
  listLessonCompletions,
  setLessonCompletion,
} from '@/lib/classroom/progress';

export async function GET(request: Request) {
  const session = await requireApiSession();
  if (!session.ok) return session.response;

  if (!process.env.DATABASE_URL?.trim()) {
    return Response.json({
      lesson_ids: [],
      demo: true,
    });
  }

  try {
    const url = new URL(request.url);
    const courseIdRaw = url.searchParams.get('course_id');
    const communityIdRaw = url.searchParams.get('community_id');
    const courseId = courseIdRaw ? Number(courseIdRaw) : undefined;
    const communityId = communityIdRaw ? Number(communityIdRaw) : undefined;

    const lesson_ids = await listLessonCompletions({
      userId: session.user.id,
      courseId: Number.isFinite(courseId) ? courseId : undefined,
      communityId: Number.isFinite(communityId) ? communityId : undefined,
    });

    return Response.json({ lesson_ids, demo: false });
  } catch (error) {
    console.error('[GET /api/classroom/progress]', error);
    return Response.json(
      { error: 'load_failed', lesson_ids: [], demo: false },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const session = await requireApiSession();
  if (!session.ok) return session.response;

  if (!process.env.DATABASE_URL?.trim()) {
    return Response.json(
      {
        error: 'database_required',
        message: 'DATABASE_URL is required to save lesson progress.',
      },
      { status: 503 }
    );
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const lessonId = Number(body.lesson_id ?? body.lessonId);
    if (!Number.isFinite(lessonId) || lessonId <= 0) {
      return Response.json({ error: 'lesson_id required' }, { status: 400 });
    }

    const completed =
      body.completed === undefined ? true : Boolean(body.completed);
    const courseId =
      body.course_id != null
        ? Number(body.course_id)
        : body.courseId != null
          ? Number(body.courseId)
          : null;
    const communityId =
      body.community_id != null
        ? Number(body.community_id)
        : body.communityId != null
          ? Number(body.communityId)
          : null;

    const result = await setLessonCompletion({
      userId: session.user.id,
      lessonId,
      completed,
      courseId: Number.isFinite(courseId as number) ? courseId : null,
      communityId: Number.isFinite(communityId as number) ? communityId : null,
    });

    const lesson_ids = await listLessonCompletions({
      userId: session.user.id,
      communityId:
        Number.isFinite(communityId as number) && communityId != null
          ? communityId
          : undefined,
    });

    return Response.json({
      ...result,
      lesson_ids,
      demo: false,
    });
  } catch (error) {
    console.error('[POST /api/classroom/progress]', error);
    return Response.json(
      {
        error: 'save_failed',
        message: error instanceof Error ? error.message : 'Failed',
      },
      { status: 500 }
    );
  }
}
