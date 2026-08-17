/**
 * Durable classroom lesson completion — per authenticated learner.
 */

import sql from '@/app/api/utils/sql';

let schemaReady: Promise<void> | null = null;

export async function ensureLessonProgressSchema(): Promise<void> {
  if (!process.env.DATABASE_URL?.trim()) return;
  if (schemaReady) return schemaReady;

  schemaReady = (async () => {
    await sql`
      CREATE TABLE IF NOT EXISTS public.lesson_completions (
        user_id      text NOT NULL,
        lesson_id    integer NOT NULL,
        course_id    integer,
        community_id integer,
        completed_at timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY (user_id, lesson_id)
      )
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS lesson_completions_user_idx
        ON public.lesson_completions (user_id, completed_at DESC)
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS lesson_completions_course_idx
        ON public.lesson_completions (user_id, course_id)
      WHERE course_id IS NOT NULL
    `;
  })().catch((error) => {
    schemaReady = null;
    throw error;
  });

  return schemaReady;
}

export async function listLessonCompletions(input: {
  userId: string;
  courseId?: number;
  communityId?: number;
}): Promise<number[]> {
  if (!process.env.DATABASE_URL?.trim()) return [];
  await ensureLessonProgressSchema();

  let rows;
  if (input.courseId != null) {
    rows = await sql`
      SELECT lesson_id FROM public.lesson_completions
      WHERE user_id = ${input.userId}
        AND course_id = ${input.courseId}
    `;
  } else if (input.communityId != null) {
    rows = await sql`
      SELECT lesson_id FROM public.lesson_completions
      WHERE user_id = ${input.userId}
        AND (
          community_id = ${input.communityId}
          OR community_id IS NULL
        )
    `;
  } else {
    rows = await sql`
      SELECT lesson_id FROM public.lesson_completions
      WHERE user_id = ${input.userId}
    `;
  }

  return (rows || []).map((r) => Number((r as { lesson_id: number }).lesson_id));
}

export async function setLessonCompletion(input: {
  userId: string;
  lessonId: number;
  completed: boolean;
  courseId?: number | null;
  communityId?: number | null;
}): Promise<{ lesson_id: number; completed: boolean }> {
  await ensureLessonProgressSchema();
  const lessonId = Math.round(Number(input.lessonId));
  if (!Number.isFinite(lessonId) || lessonId <= 0) {
    throw new Error('Invalid lesson_id');
  }

  if (!input.completed) {
    await sql`
      DELETE FROM public.lesson_completions
      WHERE user_id = ${input.userId} AND lesson_id = ${lessonId}
    `;
    return { lesson_id: lessonId, completed: false };
  }

  await sql`
    INSERT INTO public.lesson_completions (
      user_id, lesson_id, course_id, community_id, completed_at
    ) VALUES (
      ${input.userId},
      ${lessonId},
      ${input.courseId ?? null},
      ${input.communityId ?? null},
      now()
    )
    ON CONFLICT (user_id, lesson_id) DO UPDATE SET
      course_id = COALESCE(EXCLUDED.course_id, public.lesson_completions.course_id),
      community_id = COALESCE(EXCLUDED.community_id, public.lesson_completions.community_id),
      completed_at = now()
  `;

  return { lesson_id: lessonId, completed: true };
}
