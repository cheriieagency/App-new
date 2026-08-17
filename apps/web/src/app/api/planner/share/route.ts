/**
 * POST /api/planner/share — create client review link; optionally email via Resend.
 * Body.mode: "link" (default) | "email"
 */

import { requireApiSession } from '@/lib/auth/require-api-session';
import { appBaseUrl } from '@/lib/config/env';
import { resendMissingResponse } from '@/lib/email/send';
import { saveAndEnablePlannerShare } from '@/lib/planner/share';
import { sendPostReviewEmails } from '@/lib/planner/share-email';
import type { PlannerMediaItem, SocialPlatform } from '@/lib/mock-content-planner';

export async function POST(request: Request) {
  const session = await requireApiSession();
  if (!session.ok) return session.response;

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const mode = String(body.mode || 'link').toLowerCase();
    const platforms = Array.isArray(body.platforms)
      ? (body.platforms as SocialPlatform[])
      : [];
    if (platforms.length === 0) {
      return Response.json(
        { error: 'platforms_required', message: 'Select at least one platform.' },
        { status: 400 }
      );
    }

    const caption = typeof body.caption === 'string' ? body.caption : '';
    if (!caption.trim()) {
      return Response.json(
        {
          error: 'caption_required',
          message: 'Add a caption before sharing with a client.',
        },
        { status: 400 }
      );
    }

    const media_items = Array.isArray(body.media_items)
      ? (body.media_items as PlannerMediaItem[]).slice(0, 10)
      : [];

    const title =
      (typeof body.title === 'string' && body.title.trim()) ||
      caption.split('\n')[0]?.trim().slice(0, 72) ||
      'New post';
    const project = typeof body.project === 'string' ? body.project : '';

    const result = await saveAndEnablePlannerShare({
      userId: session.user.id,
      actor: session.user.name?.trim() || 'Creator',
      postId: typeof body.id === 'string' ? body.id : null,
      title,
      caption,
      hashtags: typeof body.hashtags === 'string' ? body.hashtags : '',
      platforms,
      project,
      media_items,
      workspaceId:
        typeof body.workspaceId === 'string' ? body.workspaceId : null,
    });

    if (!result) {
      return Response.json(
        { error: 'share_failed', message: 'Could not create share link.' },
        { status: 500 }
      );
    }

    const origin =
      (() => {
        try {
          return appBaseUrl();
        } catch {
          return new URL(request.url).origin;
        }
      })() || new URL(request.url).origin;
    const shareUrl = `${origin.replace(/\/$/, '')}${result.path}`;

    if (mode === 'email') {
      const sent = await sendPostReviewEmails({
        shareUrl,
        postTitle: title,
        caption,
        workspaceName: project || 'Workspace',
        senderName: session.user.name?.trim() || session.user.email || 'Creator',
        recipients: body.to ?? body.email ?? body.recipients,
        customNote:
          typeof body.note === 'string'
            ? body.note
            : typeof body.customNote === 'string'
              ? body.customNote
              : null,
      });

      if (!sent.ok && sent.error === 'missing_env') {
        return resendMissingResponse();
      }
      if (!sent.ok && sent.error === 'recipients_required') {
        return Response.json(
          {
            error: 'recipients_required',
            message: 'Enter at least one client email address.',
            shareUrl,
            postId: result.postId,
          },
          { status: 400 }
        );
      }
      if (!sent.ok) {
        return Response.json(
          {
            error: 'email_failed',
            message: sent.error || 'Failed to send email',
            results: sent.results,
            shareUrl,
            postId: result.postId,
          },
          { status: 502 }
        );
      }

      return Response.json({
        ok: true,
        mode: 'email',
        postId: result.postId,
        token: result.token,
        path: result.path,
        shareUrl,
        emailed: sent.results.filter((r) => r.ok).map((r) => r.email),
        results: sent.results,
      });
    }

    return Response.json({
      ok: true,
      mode: 'link',
      postId: result.postId,
      token: result.token,
      path: result.path,
      shareUrl,
    });
  } catch (error) {
    console.error('[POST /api/planner/share]', error);
    return Response.json(
      {
        error: 'share_failed',
        message: error instanceof Error ? error.message : 'share_failed',
      },
      { status: 500 }
    );
  }
}
