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
import { extractCommentEventsFromWebhook } from '@/lib/dm-automations/engine';
import {
  cleanTriggerKeywords,
  findMatchingKeyword,
} from '@/lib/dm-automations/keywords';
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
      id: string;
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
      action?: unknown;
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

    const action = String(body.action || 'test').trim();
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

    // (Re)subscribe — Page Access Token + STRICT IG/Page field split.
    // Page success covers IG webhooks; IG Error #3 is a non-fatal warning.
    const subscribeDetails: Array<{
      platform: string;
      targetId: string;
      fields?: string;
      ok: boolean;
      /** Non-fatal (e.g. IG Error #3 when Page already subscribed). */
      warning?: boolean;
      error?: string;
      usedFallback?: boolean;
    }> = [];
    try {
      const {
        subscribeWithPageTokenFallback,
        fetchPageAccessTokensFromUserToken,
      } = await import('@/lib/meta/subscribe-webhooks');

      const metaAccounts = await sql`
        SELECT platform, platform_user_id, page_id, access_token, meta
        FROM public.social_accounts
        WHERE workspace_id = ${workspaceId}
          AND platform IN ('instagram', 'facebook')
          AND access_token IS NOT NULL
          AND access_token <> ''
      `;
      const rows = Array.isArray(metaAccounts) ? metaAccounts : [];

      // Workspace primary Page Access Token (Facebook row or meta.page_access_token).
      let primaryPageToken = '';
      let primaryPageId = '';
      for (const row of rows) {
        const meta =
          row.meta && typeof row.meta === 'object'
            ? (row.meta as Record<string, unknown>)
            : {};
        const pageTok =
          (typeof meta.page_access_token === 'string' &&
            meta.page_access_token.trim()) ||
          (row.platform === 'facebook' ? String(row.access_token || '') : '');
        if (pageTok && !primaryPageToken) {
          primaryPageToken = pageTok;
          primaryPageId = String(row.page_id || row.platform_user_id || '');
        }
      }

      const maybeUserToken = String(
        rows.find((r) => {
          const meta =
            r.meta && typeof r.meta === 'object'
              ? (r.meta as Record<string, unknown>)
              : {};
          return meta.token_source === 'user_long_lived';
        })?.access_token || ''
      ).trim();

      let refreshedPages: Awaited<
        ReturnType<typeof fetchPageAccessTokensFromUserToken>
      > = [];
      if (maybeUserToken || (!primaryPageToken && rows[0]?.access_token)) {
        refreshedPages = await fetchPageAccessTokensFromUserToken(
          maybeUserToken || String(rows[0]?.access_token || '')
        );
        if (refreshedPages[0]?.pageAccessToken) {
          primaryPageToken = refreshedPages[0].pageAccessToken;
          primaryPageId = refreshedPages[0].pageId;
        }
      }

      const pageTokenByPageId = new Map<string, string>();
      const pageTokenByIgId = new Map<string, string>();
      for (const p of refreshedPages) {
        pageTokenByPageId.set(p.pageId, p.pageAccessToken);
        if (p.igUserId) pageTokenByIgId.set(p.igUserId, p.pageAccessToken);
      }
      for (const row of rows) {
        const meta =
          row.meta && typeof row.meta === 'object'
            ? (row.meta as Record<string, unknown>)
            : {};
        const pageId = String(row.page_id || '').trim();
        const pageTok =
          (typeof meta.page_access_token === 'string' &&
            meta.page_access_token.trim()) ||
          (row.platform === 'facebook'
            ? String(row.access_token || '').trim()
            : '');
        if (pageId && pageTok) pageTokenByPageId.set(pageId, pageTok);
        if (row.platform === 'instagram' && pageTok) {
          pageTokenByIgId.set(String(row.platform_user_id || ''), pageTok);
        }
      }

      // Subscribe Facebook Pages ONLY (never POST /{instagram_id}/subscribed_apps).
      // Page fields: feed,messages,messaging_postbacks — covers linked IG.
      const seenPageIds = new Set<string>();

      const subscribePage = async (
        pageId: string,
        pageAccessToken: string
      ) => {
        if (!pageId || seenPageIds.has(pageId)) return;
        seenPageIds.add(pageId);
        const pageResult = await subscribeWithPageTokenFallback({
          targetId: pageId,
          platform: 'facebook',
          pageAccessToken,
          fallbackPageAccessToken: primaryPageToken || pageAccessToken,
        });
        subscribeDetails.push({
          platform: 'facebook',
          targetId: pageResult.targetId,
          fields: pageResult.fields,
          ok: pageResult.ok,
          error: pageResult.error,
          usedFallback: pageResult.usedFallback,
        });
      };

      for (const row of rows) {
        if (String(row.platform) !== 'facebook') continue;
        const pageId = String(
          row.page_id || row.platform_user_id || ''
        ).trim();
        if (!pageId || pageId.startsWith('1784')) continue;
        const meta =
          row.meta && typeof row.meta === 'object'
            ? (row.meta as Record<string, unknown>)
            : {};
        const pageAccessToken =
          pageTokenByPageId.get(pageId) ||
          (typeof meta.page_access_token === 'string'
            ? meta.page_access_token.trim()
            : '') ||
          String(row.access_token || '').trim() ||
          primaryPageToken;
        if (!pageAccessToken) {
          subscribeDetails.push({
            platform: 'facebook',
            targetId: pageId,
            ok: false,
            error: 'missing_page_access_token',
          });
          continue;
        }
        await subscribePage(pageId, pageAccessToken);
      }

      // Instagram rows → subscribe their linked Facebook Page id (not IG id).
      for (const row of rows) {
        if (String(row.platform) !== 'instagram') continue;
        const pageId = String(row.page_id || '').trim();
        if (!pageId || pageId.startsWith('1784')) continue;
        const pageAccessToken =
          pageTokenByPageId.get(pageId) ||
          pageTokenByIgId.get(String(row.platform_user_id || '')) ||
          primaryPageToken;
        if (!pageAccessToken) {
          if (!seenPageIds.size) {
            subscribeDetails.push({
              platform: 'facebook',
              targetId: pageId,
              ok: false,
              error:
                'missing_page_access_token — reconnect Meta so /me/accounts returns page.access_token',
            });
          }
          continue;
        }
        await subscribePage(pageId, pageAccessToken);
      }

      void primaryPageId;
    } catch (subErr) {
      console.warn('[automations/test] subscribed_apps', subErr);
      subscribeDetails.push({
        platform: 'unknown',
        targetId: '',
        ok: false,
        error:
          subErr instanceof Error
            ? subErr.message
            : 'subscribed_apps_query_failed',
      });
    }

    const pageOk = subscribeDetails.some(
      (r) => r.platform === 'facebook' && r.ok
    );
    const subscribedCount = subscribeDetails.filter((r) => r.ok).length;
    const subscribeResults = subscribeDetails;
    const workspaceSubscribed = pageOk;

    if (action === 'resubscribe_webhooks') {
      const fatalErrors = subscribeDetails
        .filter((r) => !r.ok && r.error)
        .map((r) => `${r.platform}:${r.targetId} — ${r.error}`);

      return NextResponse.json({
        success: workspaceSubscribed,
        subscribedCount,
        details: subscribeDetails,
        warnings: [],
        ok: true,
        ready: workspaceSubscribed,
        workspaceId,
        action: 'resubscribe_webhooks',
        subscribeResults,
        blockers: workspaceSubscribed
          ? []
          : [
              fatalErrors[0] ||
                'Could not subscribe any Meta Page. Reconnect under Settings → Socials and grant pages_manage_metadata.',
              ...fatalErrors.slice(1, 3),
            ],
        nextSteps: workspaceSubscribed
          ? [
              'Facebook Page webhooks subscribed (feed,messages,messaging_postbacks) — covers linked Instagram.',
              'Confirm App Dashboard → Webhooks callback URL is /api/webhooks/meta/comments.',
              'Comment a trigger keyword on a post to test live Comment-to-DM.',
            ]
          : [
              'Reconnect Instagram + Facebook Page so /me/accounts returns a Page Access Token.',
              'Grant pages_manage_metadata, then retry Re-sync Meta Webhooks.',
            ],
      });
    }

    // Prefer id sort — never depend on created_at / updated_at / sent_at existing.
    let rules: Record<string, unknown>[] = [];
    try {
      const rulesRows = await sql`
        SELECT *
        FROM public.dm_automations
        WHERE workspace_id = ${workspaceId}
        ORDER BY id DESC
      `;
      rules = Array.isArray(rulesRows) ? (rulesRows as Record<string, unknown>[]) : [];
    } catch (queryErr) {
      console.warn('[automations/test] rules query', queryErr);
      try {
        const fallbackRows = await sql`
          SELECT id, workspace_id, title, trigger_keywords, dm_message_text,
                 cta_button_url, is_active
          FROM public.dm_automations
          WHERE workspace_id = ${workspaceId}
          ORDER BY id DESC
        `;
        rules = Array.isArray(fallbackRows)
          ? (fallbackRows as Record<string, unknown>[])
          : [];
      } catch (fallbackErr) {
        console.warn('[automations/test] rules fallback failed', fallbackErr);
        return NextResponse.json(
          dryRunPayload({
            workspaceId,
            commentText,
            subscribeResults,
            blockers: [
              'Could not load dm_automations (table/columns may still be migrating).',
            ],
            nextSteps: ['Retry in a few seconds after schema reconcile.'],
          })
        );
      }
    }

    const activeRules = (Array.isArray(rules) ? rules : []).filter(
      (r) => r.is_active !== false
    );

    let matched: {
      id: string;
      title: string;
      keyword: string;
      dmPreview: string;
    } | null = null;

    for (const rule of activeRules) {
      const keywords = cleanTriggerKeywords(rule.trigger_keywords);
      const kw = findMatchingKeyword(commentText, keywords);
      if (kw) {
        const url = String(rule.cta_button_url || '').trim();
        const text = String(rule.dm_message_text || '').trim();
        matched = {
          id: String(rule.id),
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
          AND status IN ('sent', 'delivered')
      `;
      const topLog = (Array.isArray(logs) ? logs : [])?.[0] || {};
      dmsSentTotal = Number((topLog as { n?: unknown })?.n) || 0;
    } catch (logsErr) {
      console.warn('[automations/test] dm_logs count failed', logsErr);
      try {
        // Fallback without status/timestamp columns if schema is mid-migration.
        const logs = await sql`
          SELECT COUNT(*)::int AS n
          FROM public.dm_logs
          WHERE workspace_id = ${workspaceId}
        `;
        const topLog = (Array.isArray(logs) ? logs : [])?.[0] || {};
        dmsSentTotal = Number((topLog as { n?: unknown })?.n) || 0;
      } catch {
        dmsSentTotal = 0;
      }
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
        subscribeResults,
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
