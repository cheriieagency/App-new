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

function dryRunPayload(extra: Record<string, unknown> = {}) {
  return {
    ok: true,
    ready: false,
    workspaceId: null as string | null,
    commentText: '',
    rulesTotal: 0,
    rulesActive: 0,
    matchedRule: null as null | {
      id: number;
      title: string;
      keyword: string;
      dmPreview: string;
    },
    instagram: null as null | Record<string, unknown>,
    webhook: {
      verifyTokenSet: Boolean(
        (process.env.META_WEBHOOK_VERIFY_TOKEN ?? '').trim()
      ),
      callbackUrl: null as string | null,
      sampleEventsParsed: 0,
    },
    dmsSentTotal: 0,
    blockers: [] as string[],
    nextSteps: [] as string[],
    ...extra,
  };
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
      return NextResponse.json(
        dryRunPayload({
          ok: false,
          blockers: ['workspaceId required'],
          nextSteps: ['Select an active workspace and retry.'],
        }),
        { status: 400 }
      );
    }

    const commentText = String(
      body.commentText ?? 'Hej! Jag vill ha #KURS info'
    ).trim();

    if (!process.env.DATABASE_URL?.trim()) {
      return NextResponse.json(
        dryRunPayload({
          ok: false,
          workspaceId,
          commentText,
          reason: 'DATABASE_URL missing',
          blockers: ['DATABASE_URL missing'],
        })
      );
    }

    try {
      await ensureDmAutomationsSchema();
    } catch (schemaErr) {
      console.warn('[automations/test] schema ensure', schemaErr);
    }

    // Prefer id sort — never depend on created_at / updated_at existing.
    let rules: Record<string, unknown>[] = [];
    try {
      rules = (await sql`
        SELECT *
        FROM public.dm_automations
        WHERE workspace_id = ${workspaceId}
        ORDER BY id DESC
      `) as Record<string, unknown>[];
    } catch (queryErr) {
      console.warn('[automations/test] rules query', queryErr);
      return NextResponse.json(
        dryRunPayload({
          workspaceId,
          commentText,
          blockers: [
            'Could not load dm_automations (table/columns may still be migrating).',
          ],
          nextSteps: ['Retry in a few seconds after schema reconcile.'],
        })
      );
    }

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
        : typeof rule.trigger_keywords === 'string'
          ? String(rule.trigger_keywords)
              .split(/[,;\n]+/)
              .map((k) => k.trim())
              .filter(Boolean)
          : [];
      const kw = findMatchingKeyword(commentText, keywords);
      if (kw) {
        const url = String(rule.cta_button_url || '').trim();
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

    let ig: Record<string, unknown> | undefined;
    let fb: Record<string, unknown> | undefined;
    try {
      const igRows = await sql`
        SELECT platform, platform_user_id, page_id, handle,
               (access_token IS NOT NULL AND access_token <> '') AS has_token,
               workspace_id
        FROM public.social_accounts
        WHERE workspace_id = ${workspaceId}
          AND platform IN ('instagram', 'facebook')
        ORDER BY CASE WHEN platform = 'instagram' THEN 0 ELSE 1 END
      `;
      ig = (Array.isArray(igRows) ? igRows : []).find(
        (r) => r.platform === 'instagram'
      ) as Record<string, unknown> | undefined;
      fb = (Array.isArray(igRows) ? igRows : []).find(
        (r) => r.platform === 'facebook'
      ) as Record<string, unknown> | undefined;
    } catch (igErr) {
      console.warn('[automations/test] social_accounts', igErr);
    }

    const verifyTokenSet = Boolean(
      (process.env.META_WEBHOOK_VERIFY_TOKEN ?? '').trim()
    );
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? '').trim();
    const webhookUrlPublic =
      appUrl && !/localhost|127\.0\.0\.1/i.test(appUrl)
        ? `${appUrl.replace(/\/$/, '')}/api/webhooks/meta/comments`
        : null;

    let parsedEvents = 0;
    try {
      if (body.webhookPayload) {
        parsedEvents = extractCommentEventsFromWebhook(
          body.webhookPayload
        ).length;
      } else {
        parsedEvents = extractCommentEventsFromWebhook({
          object: 'instagram',
          entry: [
            {
              id: String(ig?.platform_user_id || 'test_ig'),
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
    } catch {
      parsedEvents = 0;
    }

    let dmsSentTotal = 0;
    try {
      const logs = await sql`
        SELECT COUNT(*)::int AS n
        FROM public.dm_logs
        WHERE workspace_id = ${workspaceId}
          AND status = 'sent'
      `;
      dmsSentTotal = Number(logs?.[0]?.n) || 0;
    } catch {
      dmsSentTotal = 0;
    }

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

    return NextResponse.json(
      dryRunPayload({
        ok: true,
        ready,
        workspaceId,
        commentText,
        rulesTotal: Array.isArray(rules) ? rules.length : 0,
        rulesActive: activeRules.length,
        matchedRule: matched,
        instagram: ig
          ? {
              handle: ig.handle ?? null,
              platformUserId: ig.platform_user_id ?? null,
              pageId: ig.page_id || fb?.page_id || null,
              hasToken: Boolean(ig.has_token),
            }
          : null,
        webhook: {
          verifyTokenSet,
          callbackUrl: webhookUrlPublic,
          sampleEventsParsed: parsedEvents,
        },
        dmsSentTotal,
        blockers,
        nextSteps: ready
          ? [
              'In Meta Developer Console → Webhooks, subscribe Instagram field `comments` to the callback URL.',
              'Comment the keyword on a post from another Instagram account.',
              'Check Active Triggers / DMs Sent and public.dm_logs.',
            ]
          : blockers,
      })
    );
  } catch (err) {
    console.error('[automations/test]', err);
    // Always return valid JSON (200) for dry-run so the UI can show blockers.
    return NextResponse.json(
      dryRunPayload({
        ok: false,
        ready: false,
        error: err instanceof Error ? err.message : 'test_failed',
        blockers: [
          err instanceof Error ? err.message : 'Automation dry-run failed',
        ],
      })
    );
  }
}
