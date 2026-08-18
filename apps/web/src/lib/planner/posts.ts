/**
 * Durable content-planner posts — Postgres when DATABASE_URL is set.
 * Complex nested fields (assignees, comments, media) live in jsonb.
 */

import sql from '@/app/api/utils/sql';
import type {
  PlannerActivity,
  PlannerAssignee,
  PlannerComment,
  PlannerMediaItem,
  PlannerPost,
  PlannerPostStatus,
  PlannerSubtask,
  SocialPlatform,
  WorkflowStatus,
  YoutubeMeta,
} from '@/lib/mock-content-planner';

let schemaReady: Promise<void> | null = null;
const SCHEMA_VERSION = 3;
let schemaVersionApplied = 0;

async function safeAlter(label: string, run: () => Promise<unknown>) {
  try {
    await run();
  } catch (error) {
    console.warn(`[planner/posts] schema heal skipped (${label})`, error);
  }
}

export async function ensurePlannerPostsSchema(): Promise<void> {
  if (!process.env.DATABASE_URL?.trim()) return;
  if (schemaReady && schemaVersionApplied >= SCHEMA_VERSION) {
    return schemaReady;
  }

  schemaReady = (async () => {
    await sql`
      CREATE TABLE IF NOT EXISTS public.planner_posts (
        id              text PRIMARY KEY,
        workspace_id    text,
        user_id         text NOT NULL,
        title           text NOT NULL DEFAULT '',
        caption         text NOT NULL DEFAULT '',
        hashtags        text NOT NULL DEFAULT '',
        platforms       jsonb NOT NULL DEFAULT '[]'::jsonb,
        workflow        text NOT NULL DEFAULT 'IDEA',
        status          text NOT NULL DEFAULT 'draft',
        scheduled_at    timestamptz,
        published_at    timestamptz,
        media_url       text,
        media_type      text,
        media_items     jsonb NOT NULL DEFAULT '[]'::jsonb,
        youtube         jsonb,
        idea_title      text,
        project         text NOT NULL DEFAULT '',
        campaigns       jsonb NOT NULL DEFAULT '[]'::jsonb,
        assignees       jsonb NOT NULL DEFAULT '[]'::jsonb,
        subtasks        jsonb NOT NULL DEFAULT '[]'::jsonb,
        auto_post       boolean NOT NULL DEFAULT false,
        activity        jsonb NOT NULL DEFAULT '[]'::jsonb,
        comments        jsonb NOT NULL DEFAULT '[]'::jsonb,
        created_by      text NOT NULL DEFAULT '',
        created_at      timestamptz NOT NULL DEFAULT now(),
        updated_at      timestamptz NOT NULL DEFAULT now()
      )
    `;
    await safeAlter('planner_posts_user_idx', () => sql`
      CREATE INDEX IF NOT EXISTS planner_posts_user_idx
        ON public.planner_posts (user_id, created_at DESC)
    `);
    await safeAlter('planner_posts_workspace_idx', () => sql`
      CREATE INDEX IF NOT EXISTS planner_posts_workspace_idx
        ON public.planner_posts (workspace_id, created_at DESC)
      WHERE workspace_id IS NOT NULL AND workspace_id <> ''
    `);
    await safeAlter('planner_posts_project_idx', () => sql`
      CREATE INDEX IF NOT EXISTS planner_posts_project_idx
        ON public.planner_posts (user_id, project)
    `);
    await safeAlter('planner_posts_share_token', () => sql`
      ALTER TABLE public.planner_posts
        ADD COLUMN IF NOT EXISTS share_token text
    `);
    await safeAlter('planner_posts_share_enabled', () => sql`
      ALTER TABLE public.planner_posts
        ADD COLUMN IF NOT EXISTS share_enabled boolean NOT NULL DEFAULT false
    `);
    await safeAlter('planner_posts_share_token_uidx', () => sql`
      CREATE UNIQUE INDEX IF NOT EXISTS planner_posts_share_token_uidx
        ON public.planner_posts (share_token)
        WHERE share_token IS NOT NULL AND share_token <> ''
    `);
    await safeAlter('planner_posts_error_log', () => sql`
      ALTER TABLE public.planner_posts
        ADD COLUMN IF NOT EXISTS error_log text
    `);
    await safeAlter('planner_posts_scheduled_auto_idx', () => sql`
      CREATE INDEX IF NOT EXISTS planner_posts_scheduled_auto_idx
        ON public.planner_posts (scheduled_at)
        WHERE workflow = 'SCHEDULED'
          AND auto_post = true
          AND scheduled_at IS NOT NULL
    `);

    schemaVersionApplied = SCHEMA_VERSION;
  })().catch((error) => {
    schemaReady = null;
    schemaVersionApplied = 0;
    throw error;
  });

  return schemaReady;
}

function asArray<T>(raw: unknown, map: (item: unknown) => T | null): T[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(map).filter((x): x is T => x != null);
}

function rowToPost(row: Record<string, unknown>): PlannerPost {
  const platforms = asArray(row.platforms, (p) =>
    typeof p === 'string' ? (p as SocialPlatform) : null
  );
  const workflow = String(row.workflow || 'IDEA') as WorkflowStatus;
  const status = String(row.status || 'draft') as PlannerPostStatus;
  return {
    id: String(row.id),
    title: String(row.title ?? ''),
    caption: String(row.caption ?? ''),
    hashtags: String(row.hashtags ?? ''),
    platforms,
    workflow,
    status,
    scheduled_at: row.scheduled_at ? String(row.scheduled_at) : null,
    published_at: row.published_at ? String(row.published_at) : null,
    media_url: (row.media_url as string | null) ?? null,
    media_type: (row.media_type as PlannerPost['media_type']) ?? null,
    media_items: asArray(row.media_items, (item) => {
      if (!item || typeof item !== 'object') return null;
      const m = item as Record<string, unknown>;
      const url = typeof m.url === 'string' ? m.url : '';
      if (!url) return null;
      return {
        id: String(m.id ?? `m-${Math.random().toString(36).slice(2, 8)}`),
        url,
        type: m.type === 'video' ? 'video' : 'image',
      } satisfies PlannerMediaItem;
    }),
    youtube: (row.youtube as YoutubeMeta | null) ?? null,
    idea_title: typeof row.idea_title === 'string' ? row.idea_title : undefined,
    project: String(row.project ?? ''),
    campaigns: asArray(row.campaigns, (c) => (typeof c === 'string' ? c : null)),
    assignees: asArray(row.assignees, (a) => {
      if (!a || typeof a !== 'object') return null;
      const x = a as Record<string, unknown>;
      return {
        id: String(x.id ?? ''),
        name: String(x.name ?? ''),
        avatar_url: String(x.avatar_url ?? ''),
      } satisfies PlannerAssignee;
    }),
    subtasks: asArray(row.subtasks, (s) => {
      if (!s || typeof s !== 'object') return null;
      const x = s as Record<string, unknown>;
      return {
        id: String(x.id ?? ''),
        title: String(x.title ?? ''),
        done: Boolean(x.done),
      } satisfies PlannerSubtask;
    }),
    auto_post: Boolean(row.auto_post),
    activity: asArray(row.activity, (a) => {
      if (!a || typeof a !== 'object') return null;
      const x = a as Record<string, unknown>;
      return {
        id: String(x.id ?? ''),
        text: String(x.text ?? ''),
        created_at: String(x.created_at ?? new Date().toISOString()),
        visibility: x.visibility === 'public' ? 'public' : 'private',
      } satisfies PlannerActivity;
    }),
    comments: asArray(row.comments, (c) => {
      if (!c || typeof c !== 'object') return null;
      const x = c as Record<string, unknown>;
      return {
        id: String(x.id ?? ''),
        author_id: String(x.author_id ?? ''),
        author_name: String(x.author_name ?? ''),
        author_avatar: String(x.author_avatar ?? ''),
        text: String(x.text ?? ''),
        image_url: (x.image_url as string | null) ?? null,
        created_at: String(x.created_at ?? new Date().toISOString()),
        visibility: x.visibility === 'public' ? 'public' : 'private',
      } satisfies PlannerComment;
    }),
    created_at: String(row.created_at ?? new Date().toISOString()),
    created_by: String(row.created_by ?? ''),
    error_log:
      typeof row.error_log === 'string' && row.error_log.trim()
        ? row.error_log
        : null,
    owner_user_id: String(row.user_id ?? ''),
  };
}

export async function listDurablePlannerPosts(input: {
  userId: string;
  project?: string;
  workspaceId?: string | null;
}): Promise<PlannerPost[]> {
  if (!process.env.DATABASE_URL?.trim()) return [];
  await ensurePlannerPostsSchema();
  const project = input.project?.trim();
  const rows = project
    ? await sql`
        SELECT * FROM public.planner_posts
        WHERE user_id = ${input.userId}
          AND project = ${project}
        ORDER BY created_at DESC
      `
    : await sql`
        SELECT * FROM public.planner_posts
        WHERE user_id = ${input.userId}
        ORDER BY created_at DESC
      `;
  return (rows || []).map((r) => rowToPost(r as Record<string, unknown>));
}

export async function getDurablePlannerPost(input: {
  id: string;
  userId: string;
}): Promise<PlannerPost | null> {
  if (!process.env.DATABASE_URL?.trim()) return null;
  await ensurePlannerPostsSchema();
  const rows = await sql`
    SELECT * FROM public.planner_posts
    WHERE id = ${input.id} AND user_id = ${input.userId}
    LIMIT 1
  `;
  const row = rows?.[0] as Record<string, unknown> | undefined;
  return row ? rowToPost(row) : null;
}

function newId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function workflowFromStatus(status: PlannerPostStatus): WorkflowStatus {
  if (status === 'published') return 'PUBLISHED';
  if (status === 'scheduled') return 'SCHEDULED';
  if (status === 'failed') return 'FAILED';
  return 'IDEA';
}

function statusFromWorkflow(workflow: WorkflowStatus): PlannerPostStatus {
  if (workflow === 'PUBLISHED') return 'published';
  if (workflow === 'SCHEDULED') return 'scheduled';
  if (workflow === 'FAILED') return 'failed';
  return 'draft';
}

export type UpsertDurablePlannerPostInput = {
  id?: string;
  title?: string;
  caption?: string;
  hashtags?: string;
  platforms: SocialPlatform[];
  status?: PlannerPostStatus;
  workflow?: WorkflowStatus;
  scheduled_at?: string | null;
  published_at?: string | null;
  media_url?: string | null;
  media_type?: PlannerPost['media_type'];
  media_items?: PlannerMediaItem[];
  youtube?: YoutubeMeta | null;
  idea_title?: string;
  project?: string;
  campaigns?: string[];
  assignees?: PlannerAssignee[];
  subtasks?: PlannerSubtask[];
  auto_post?: boolean;
  workspaceId?: string | null;
};

export async function upsertDurablePlannerPost(
  input: UpsertDurablePlannerPostInput,
  actor: string,
  userId: string
): Promise<PlannerPost | null> {
  if (!process.env.DATABASE_URL?.trim()) return null;
  await ensurePlannerPostsSchema();

  const existing = input.id
    ? await getDurablePlannerPost({ id: input.id, userId })
    : null;

  const workflow =
    input.workflow ||
    (input.status ? workflowFromStatus(input.status) : existing?.workflow) ||
    'IDEA';
  const status =
    input.status ||
    (input.workflow ? statusFromWorkflow(input.workflow) : existing?.status) ||
    'draft';

  const id = existing?.id || input.id || newId('pp');
  const now = new Date().toISOString();
  const activity: PlannerActivity[] = [
    ...(existing?.activity ?? []),
    {
      id: newId('act'),
      text: existing ? `${actor} updated the post` : `${actor} created the post`,
      created_at: now,
      visibility: 'private' as const,
    },
  ].slice(-40);

  const post: PlannerPost = {
    id,
    title: input.title ?? existing?.title ?? '',
    caption: input.caption ?? existing?.caption ?? '',
    hashtags: input.hashtags ?? existing?.hashtags ?? '',
    platforms: input.platforms.length
      ? input.platforms
      : existing?.platforms ?? [],
    workflow,
    status,
    scheduled_at:
      input.scheduled_at !== undefined
        ? input.scheduled_at
        : existing?.scheduled_at ?? null,
    published_at:
      input.published_at !== undefined
        ? input.published_at
        : existing?.published_at ?? null,
    media_url:
      input.media_url !== undefined ? input.media_url : existing?.media_url ?? null,
    media_type:
      input.media_type !== undefined
        ? input.media_type
        : existing?.media_type ?? null,
    media_items:
      input.media_items !== undefined
        ? input.media_items
        : existing?.media_items ?? [],
    youtube:
      input.youtube !== undefined ? input.youtube : existing?.youtube ?? null,
    idea_title:
      input.idea_title !== undefined
        ? input.idea_title
        : existing?.idea_title,
    project: input.project ?? existing?.project ?? '',
    campaigns:
      input.campaigns !== undefined
        ? input.campaigns
        : existing?.campaigns ?? [],
    assignees:
      input.assignees !== undefined
        ? input.assignees
        : existing?.assignees ?? [],
    subtasks:
      input.subtasks !== undefined ? input.subtasks : existing?.subtasks ?? [],
    auto_post:
      input.auto_post !== undefined
        ? input.auto_post
        : existing?.auto_post ?? false,
    activity,
    comments: existing?.comments ?? [],
    created_at: existing?.created_at ?? now,
    created_by: existing?.created_by || actor,
    owner_user_id: userId,
  };

  await sql`
    INSERT INTO public.planner_posts (
      id, workspace_id, user_id, title, caption, hashtags, platforms,
      workflow, status, scheduled_at, published_at, media_url, media_type,
      media_items, youtube, idea_title, project, campaigns, assignees,
      subtasks, auto_post, activity, comments, created_by, created_at, updated_at
    ) VALUES (
      ${post.id},
      ${input.workspaceId ?? null},
      ${userId},
      ${post.title},
      ${post.caption},
      ${post.hashtags},
      ${JSON.stringify(post.platforms)},
      ${post.workflow},
      ${post.status},
      ${post.scheduled_at},
      ${post.published_at},
      ${post.media_url},
      ${post.media_type},
      ${JSON.stringify(post.media_items)},
      ${post.youtube ? JSON.stringify(post.youtube) : null},
      ${post.idea_title ?? null},
      ${post.project},
      ${JSON.stringify(post.campaigns)},
      ${JSON.stringify(post.assignees)},
      ${JSON.stringify(post.subtasks)},
      ${post.auto_post},
      ${JSON.stringify(post.activity)},
      ${JSON.stringify(post.comments)},
      ${post.created_by},
      ${post.created_at},
      ${now}
    )
    ON CONFLICT (id) DO UPDATE SET
      title = EXCLUDED.title,
      caption = EXCLUDED.caption,
      hashtags = EXCLUDED.hashtags,
      platforms = EXCLUDED.platforms,
      workflow = EXCLUDED.workflow,
      status = EXCLUDED.status,
      scheduled_at = EXCLUDED.scheduled_at,
      published_at = EXCLUDED.published_at,
      media_url = EXCLUDED.media_url,
      media_type = EXCLUDED.media_type,
      media_items = EXCLUDED.media_items,
      youtube = EXCLUDED.youtube,
      idea_title = EXCLUDED.idea_title,
      project = EXCLUDED.project,
      campaigns = EXCLUDED.campaigns,
      assignees = EXCLUDED.assignees,
      subtasks = EXCLUDED.subtasks,
      auto_post = EXCLUDED.auto_post,
      activity = EXCLUDED.activity,
      comments = EXCLUDED.comments,
      updated_at = EXCLUDED.updated_at
    WHERE public.planner_posts.user_id = ${userId}
  `;

  return getDurablePlannerPost({ id: post.id, userId });
}

export async function deleteDurablePlannerPost(input: {
  id: string;
  userId: string;
}): Promise<boolean> {
  if (!process.env.DATABASE_URL?.trim()) return false;
  await ensurePlannerPostsSchema();
  const rows = await sql`
    DELETE FROM public.planner_posts
    WHERE id = ${input.id} AND user_id = ${input.userId}
    RETURNING id
  `;
  return Array.isArray(rows) && rows.length > 0;
}

export async function moveDurablePlannerPost(input: {
  id: string;
  workflow: WorkflowStatus;
  actor: string;
  userId: string;
}): Promise<PlannerPost | null> {
  const existing = await getDurablePlannerPost({
    id: input.id,
    userId: input.userId,
  });
  if (!existing) return null;
  return upsertDurablePlannerPost(
    {
      id: existing.id,
      platforms: existing.platforms,
      workflow: input.workflow,
      status: statusFromWorkflow(input.workflow),
      published_at:
        input.workflow === 'PUBLISHED'
          ? existing.published_at || new Date().toISOString()
          : existing.published_at,
    },
    input.actor,
    input.userId
  );
}

export async function rescheduleDurablePlannerPost(input: {
  id: string;
  scheduledAt: string;
  actor: string;
  userId: string;
}): Promise<PlannerPost | null> {
  const existing = await getDurablePlannerPost({
    id: input.id,
    userId: input.userId,
  });
  if (!existing) return null;
  return upsertDurablePlannerPost(
    {
      id: existing.id,
      platforms: existing.platforms,
      scheduled_at: input.scheduledAt,
      workflow: 'SCHEDULED',
      status: 'scheduled',
    },
    input.actor,
    input.userId
  );
}

export async function addDurablePlannerComment(input: {
  id: string;
  userId: string;
  comment: Omit<PlannerComment, 'id' | 'created_at'> & {
    text: string;
  };
}): Promise<PlannerComment | null> {
  const existing = await getDurablePlannerPost({
    id: input.id,
    userId: input.userId,
  });
  if (!existing) return null;
  const comment: PlannerComment = {
    id: newId('cmt'),
    author_id: input.comment.author_id,
    author_name: input.comment.author_name,
    author_avatar: input.comment.author_avatar || '',
    text: input.comment.text.trim(),
    image_url: input.comment.image_url ?? null,
    created_at: new Date().toISOString(),
    visibility: input.comment.visibility === 'public' ? 'public' : 'private',
  };
  if (!comment.text && !comment.image_url) return null;

  const comments = [...existing.comments, comment].slice(-100);
  await ensurePlannerPostsSchema();
  await sql`
    UPDATE public.planner_posts
    SET comments = ${JSON.stringify(comments)}, updated_at = now()
    WHERE id = ${input.id} AND user_id = ${input.userId}
  `;
  return comment;
}

/** Set planner post workflow after a publish attempt (success → PUBLISHED, failure → FAILED). */
export async function markPlannerPostPublishOutcome(input: {
  postId: string;
  userId: string;
  success: boolean;
  errorLog: string | null;
  activityText: string;
}): Promise<void> {
  if (!process.env.DATABASE_URL?.trim()) return;
  await ensurePlannerPostsSchema();

  const existing = await getDurablePlannerPost({
    id: input.postId,
    userId: input.userId,
  });
  if (!existing) return;

  const now = new Date().toISOString();
  const activity = [
    ...existing.activity,
    {
      id: newId('act'),
      text: input.activityText,
      created_at: now,
      visibility: 'private' as const,
    },
  ].slice(-40);

  if (input.success) {
    await sql`
      UPDATE public.planner_posts
      SET
        workflow = 'PUBLISHED',
        status = 'published',
        published_at = ${now},
        error_log = NULL,
        activity = ${JSON.stringify(activity)},
        updated_at = ${now}
      WHERE id = ${input.postId} AND user_id = ${input.userId}
    `;
    return;
  }

  await sql`
    UPDATE public.planner_posts
    SET
      workflow = 'FAILED',
      status = 'failed',
      error_log = ${input.errorLog},
      activity = ${JSON.stringify(activity)},
      updated_at = ${now}
    WHERE id = ${input.postId} AND user_id = ${input.userId}
  `;
}
