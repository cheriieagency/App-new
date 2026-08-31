/**
 * Scheduled / on-demand publish reminder jobs (Rella notification mode).
 * Stores media download URL, caption, trending sound note, and deep links.
 */

import { randomUUID } from 'node:crypto';
import sql from '@/app/api/utils/sql';
import {
  MANUAL_PUBLISH_DEEP_LINKS,
  type PublishMode,
} from '@/lib/planner/publish-modes';

let schemaReady: Promise<void> | null = null;

export type PublishReminderJob = {
  id: string;
  workspaceId: string;
  userId: string;
  postId: string | null;
  caption: string;
  trendingSoundNote: string | null;
  mediaUrls: string[];
  deepLinks: { instagram: string; tiktok: string };
  platforms: string[];
  status: 'pending' | 'sent' | 'dismissed' | 'completed';
  scheduledAt: string | null;
  createdAt: string;
};

export async function ensurePublishReminderJobsSchema(): Promise<void> {
  if (!process.env.DATABASE_URL?.trim()) return;
  if (schemaReady) return schemaReady;

  schemaReady = (async () => {
    await sql`
      CREATE TABLE IF NOT EXISTS public.publish_reminder_jobs (
        id                    text PRIMARY KEY,
        workspace_id          text NOT NULL,
        user_id               text NOT NULL,
        post_id               text,
        caption               text NOT NULL DEFAULT '',
        trending_sound_note   text,
        media_urls            jsonb NOT NULL DEFAULT '[]'::jsonb,
        deep_links            jsonb NOT NULL DEFAULT '{}'::jsonb,
        platforms             jsonb NOT NULL DEFAULT '[]'::jsonb,
        status                text NOT NULL DEFAULT 'pending',
        scheduled_at          timestamptz,
        created_at            timestamptz NOT NULL DEFAULT now(),
        updated_at            timestamptz NOT NULL DEFAULT now()
      )
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS publish_reminder_jobs_user_idx
        ON public.publish_reminder_jobs (user_id, created_at DESC)
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS publish_reminder_jobs_pending_idx
        ON public.publish_reminder_jobs (scheduled_at)
        WHERE status = 'pending'
    `;
  })().catch((error) => {
    schemaReady = null;
    throw error;
  });

  return schemaReady;
}

export async function createPublishReminderJob(input: {
  workspaceId: string;
  userId: string;
  postId?: string | null;
  caption: string;
  trendingSoundNote?: string | null;
  mediaUrls: string[];
  platforms: string[];
  scheduledAt?: string | null;
}): Promise<PublishReminderJob> {
  await ensurePublishReminderJobsSchema();
  const id = `prj_${randomUUID().replace(/-/g, '').slice(0, 16)}`;
  const deepLinks = {
    instagram: MANUAL_PUBLISH_DEEP_LINKS.instagram,
    tiktok: MANUAL_PUBLISH_DEEP_LINKS.tiktok,
  };
  const mediaUrls = input.mediaUrls.map((u) => String(u).trim()).filter(Boolean);
  const now = new Date().toISOString();

  await sql`
    INSERT INTO public.publish_reminder_jobs (
      id, workspace_id, user_id, post_id, caption, trending_sound_note,
      media_urls, deep_links, platforms, status, scheduled_at, created_at, updated_at
    ) VALUES (
      ${id},
      ${input.workspaceId},
      ${input.userId},
      ${input.postId ?? null},
      ${input.caption},
      ${input.trendingSoundNote?.trim() || null},
      ${JSON.stringify(mediaUrls)},
      ${JSON.stringify(deepLinks)},
      ${JSON.stringify(input.platforms)},
      ${'pending'},
      ${input.scheduledAt ?? null},
      ${now},
      ${now}
    )
  `;

  return {
    id,
    workspaceId: input.workspaceId,
    userId: input.userId,
    postId: input.postId ?? null,
    caption: input.caption,
    trendingSoundNote: input.trendingSoundNote?.trim() || null,
    mediaUrls,
    deepLinks,
    platforms: input.platforms,
    status: 'pending',
    scheduledAt: input.scheduledAt ?? null,
    createdAt: now,
  };
}

/** Narrow helper for TypeScript callers that pass PublishMode. */
export function isNotificationReminderMode(mode: PublishMode): boolean {
  return mode === 'notification_reminder';
}
