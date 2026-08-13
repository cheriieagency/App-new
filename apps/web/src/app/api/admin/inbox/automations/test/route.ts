/**
 * POST /api/admin/inbox/automations/test
 * Dry-run: does this workspace have a matching active rule + IG account ready?
 * Does NOT send a real Instagram DM.
 */

import { cookies, headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import sql from '@/app/api/utils/sql';
import {
  ACTIVE_WORKSPACE_COOKIE,
  ACTIVE_WORKSPACE_COOKIE_ALIAS,
} from '@/lib/social/persist';
import { ensureDmAutomationsSchema } from '@/lib/dm-automations/schema';
import {
  extractCommentEventsFromWebhook,
  findMatchingKeyword,
} from '@/lib/dm-automations/engine';

async function resolveWorkspaceId(
  request: Request,
  bodyWorkspaceId?: unknown
): Promise<string | null> {
  const jar = await cookies();
  return (
    (typeof bodyWorkspaceId === 'string' && bodyWorkspaceId.trim()) ||
    new URL(request.url).searchParams.get('workspaceId')?.trim() ||
    request.headers.get('x-workspace-id')?.trim() ||
    jar.get(ACTIVE_WORKSPACE_COOKIE)?.value ||
    jar.get(ACTIVE_WORKSPACE_COOKIE_ALIAS)?.value ||
    null
  );
}

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body: {
      workspaceId?: unknown;
      commentText?: unknown;
      webhookPayload?: unknown;
    } = {};
    try {
      body = (await request.json()) as typeof body;
    } catch {
      body = {};
    }

    const workspaceId = await resolveWorkspaceId(request, body.workspaceId);
    if (!workspaceId) {
      return NextResponse.json({ error: 'workspaceId required' }, { status: 400 });
    }

    const commentText = String(
      body.commentText ?? 'Hej! Jag vill ha #KURS info'
    ).trim();

    if (!process.env.DATABASE_URL?.trim()) {
      return NextResponse.json({
        ok: false,
        ready: false,
        reason: 'DATABASE_URL missing',
      });
    }

    await ensureDmAutomationsSchema();

    const rules = await sql`
      SELECT id, title, trigger_keywords, dm_message_text, cta_button_url,
             cta_button_title, cta_button_label, is_active, total_dms_sent
      FROM public.dm_automations
      WHERE workspace_id = ${workspaceId}
      ORDER BY updated_at DESC NULLS LAST
    `;

    const activeRules = (Array.isArray(rules) ? rules : []).filter(
      (r) => r.is_active !== false
    );

    let matched: {
      id: number;
      title: string;
      keyword: string;
      dmPreview: string;
    } | null = null;

    for (const rule of activeRules) {
      const keywords = Array.isArray(rule.trigger_keywords)
        ? (rule.trigger_keywords as string[]).map(String)
        : [];
      const kw = findMatchingKeyword(commentText, keywords);
      if (kw) {
        const url = String(
          rule.cta_button_url || ''
        ).trim();
        const text = String(rule.dm_message_text || '').trim();
        matched = {
          id: Number(rule.id),
          title: String(rule.title || 'Rule'),
          keyword: kw,
          dmPreview: url ? `${text}\n\n${url}` : text,
        };
        break;
      }
    }

    const igRows = await sql`
      SELECT platform, platform_user_id, page_id, handle,
             (access_token IS NOT NULL AND access_token <> '') AS has_token,
             workspace_id
      FROM public.social_accounts
      WHERE workspace_id = ${workspaceId}
        AND platform IN ('instagram', 'facebook')
      ORDER BY CASE WHEN platform = 'instagram' THEN 0 ELSE 1 END
    `;

    const ig = (Array.isArray(igRows) ? igRows : []).find(
      (r) => r.platform === 'instagram'
    );
    const fb = (Array.isArray(igRows) ? igRows : []).find(
      (r) => r.platform === 'facebook'
    );

    const verifyTokenSet = Boolean(
      (process.env.META_WEBHOOK_VERIFY_TOKEN ?? '').trim()
    );
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? '').trim();
    const webhookUrlPublic =
      appUrl && !/localhost|127\.0\.0\.1/i.test(appUrl)
        ? `${appUrl.replace(/\/$/, '')}/api/webhooks/meta/comments`
        : null;

    // Optional: parse a sample Meta payload shape.
    let parsedEvents = 0;
    if (body.webhookPayload) {
      parsedEvents = extractCommentEventsFromWebhook(body.webhookPayload).length;
    } else {
      parsedEvents = extractCommentEventsFromWebhook({
        object: 'instagram',
        entry: [
          {
            id: ig?.platform_user_id || 'test_ig',
            changes: [
              {
                field: 'comments',
                value: {
                  id: 'test_comment_1',
                  text: commentText,
                  from: { id: 'commenter_1', username: 'tester' },
                  media: { id: 'media_1' },
                },
              },
            ],
          },
        ],
      }).length;
    }

    const logs = await sql`
      SELECT COUNT(*)::int AS n
      FROM public.dm_logs
      WHERE workspace_id = ${workspaceId}
        AND status = 'sent'
    `;

    const blockers: string[] = [];
    if (activeRules.length === 0) {
      blockers.push('No active automation rules for this workspace.');
    }
    if (!matched) {
      blockers.push(
        `No keyword matched comment text "${commentText}". Check trigger keywords.`
      );
    }
    if (!ig?.has_token) {
      blockers.push(
        'Instagram is not connected (or missing access token) for this workspace.'
      );
    }
    if (!ig?.platform_user_id && !ig?.page_id && !fb?.page_id) {
      blockers.push(
        'No Instagram/Page id on social_accounts — webhook cannot bind the comment to this workspace.'
      );
    }
    if (!verifyTokenSet) {
      blockers.push('META_WEBHOOK_VERIFY_TOKEN is not set.');
    }
    if (!webhookUrlPublic) {
      blockers.push(
        `Webhook URL is not publicly reachable (NEXT_PUBLIC_APP_URL=${appUrl || 'unset'}). Meta cannot call localhost — deploy or use a tunnel (ngrok) and subscribe comments there.`
      );
    }

    const ready = blockers.length === 0;

    return NextResponse.json({
      ok: true,
      ready,
      workspaceId,
      commentText,
      rulesTotal: Array.isArray(rules) ? rules.length : 0,
      rulesActive: activeRules.length,
      matchedRule: matched,
      instagram: ig
        ? {
            handle: ig.handle,
            platformUserId: ig.platform_user_id,
            pageId: ig.page_id || fb?.page_id || null,
            hasToken: Boolean(ig.has_token),
          }
        : null,
      webhook: {
        verifyTokenSet,
        callbackUrl: webhookUrlPublic,
        sampleEventsParsed: parsedEvents,
      },
      dmsSentTotal: Number(logs?.[0]?.n) || 0,
      blockers,
      nextSteps: ready
        ? [
            'In Meta Developer Console → Webhooks, subscribe Instagram field `comments` to the callback URL.',
            'Comment the keyword on a post from another Instagram account.',
            'Check Active Triggers / DMs Sent and public.dm_logs.',
          ]
        : blockers,
    });
  } catch (err) {
    console.error('[automations/test]', err);
    return NextResponse.json(
      {
        ok: false,
        ready: false,
        error: err instanceof Error ? err.message : 'test_failed',
      },
      { status: 500 }
    );
  }
}
