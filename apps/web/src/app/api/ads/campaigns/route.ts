/**
 * POST /api/ads/campaigns — Create Campaign wizard (objective → audience → creative).
 * Live Meta only when DATABASE_URL + connected token + real ad account.
 */

import { requireApiSession } from '@/lib/auth/require-api-session';
import { isDemoAdsId } from '@/lib/ads/demo-seed';
import {
  insertLocalAdSet,
  insertLocalCampaign,
  listMetaAdAccounts,
} from '@/lib/ads/persist';
import {
  loadMetaAdsAccessToken,
  resolveAdsWorkspaceId,
} from '@/lib/ads/sync';
import {
  budgetMajorToMinor,
  createMetaAdSet,
  createMetaCampaign,
} from '@/lib/meta/marketing-api';

const OBJECTIVES = [
  'OUTCOME_SALES',
  'OUTCOME_LEADS',
  'OUTCOME_TRAFFIC',
  'OUTCOME_ENGAGEMENT',
] as const;

type Objective = (typeof OBJECTIVES)[number];

export async function POST(request: Request) {
  const session = await requireApiSession();
  if (!session.ok) return session.response;

  if (!process.env.DATABASE_URL?.trim()) {
    return Response.json(
      {
        ok: false,
        demo: false,
        error: 'database_required',
        message: 'DATABASE_URL is required to create Meta campaigns.',
      },
      { status: 503 }
    );
  }

  try {
    const body = (await request.json()) as {
      workspaceId?: string;
      name?: string;
      objective?: string;
      dailyBudget?: number;
      countries?: string[];
      ageMin?: number;
      ageMax?: number;
      retargeting?: string | null;
      headline?: string;
      creativeUrl?: string | null;
      creativeName?: string | null;
      status?: string;
      adAccountId?: string;
    };

    const workspaceId = await resolveAdsWorkspaceId(
      request,
      body.workspaceId ?? null
    );
    if (!workspaceId) {
      return Response.json(
        { error: 'workspace_required', message: 'workspaceId required' },
        { status: 400 }
      );
    }

    const name = String(body.name || '').trim();
    if (!name) {
      return Response.json(
        { error: 'name_required', message: 'Campaign name is required' },
        { status: 400 }
      );
    }

    const objectiveRaw = String(body.objective || '')
      .trim()
      .toUpperCase()
      .replace(/^OUTCOME_/, 'OUTCOME_');
    const objective = (
      OBJECTIVES.includes(objectiveRaw as Objective)
        ? objectiveRaw
        : `OUTCOME_${objectiveRaw.replace(/^OUTCOME_/, '')}`
    ) as string;
    if (!OBJECTIVES.includes(objective as Objective)) {
      return Response.json(
        {
          error: 'invalid_objective',
          message: `objective must be one of: ${OBJECTIVES.join(', ')}`,
        },
        { status: 400 }
      );
    }

    const dailyBudget = Math.max(0, Number(body.dailyBudget) || 200);
    const countries = Array.isArray(body.countries)
      ? body.countries.map((c) => String(c).toUpperCase()).filter(Boolean)
      : ['SE'];
    const ageMin = Math.min(65, Math.max(13, Number(body.ageMin) || 18));
    const ageMax = Math.min(65, Math.max(ageMin, Number(body.ageMax) || 44));
    const retargeting = body.retargeting ? String(body.retargeting) : null;
    const headline = body.headline ? String(body.headline).trim() : null;
    const creativeUrl = body.creativeUrl
      ? String(body.creativeUrl).trim()
      : null;
    const status =
      String(body.status || 'PAUSED').toUpperCase() === 'ACTIVE'
        ? 'ACTIVE'
        : 'PAUSED';

    const targetingParts = [
      countries.join(', '),
      `Ages ${ageMin}–${ageMax}`,
      retargeting || null,
    ].filter(Boolean);
    const targetingSummary = targetingParts.join(' · ');

    const token = await loadMetaAdsAccessToken({
      userId: session.user.id,
      workspaceId,
    });
    if (!token) {
      return Response.json(
        {
          ok: false,
          demo: false,
          error: 'meta_not_connected',
          message:
            'Connect Facebook under Settings → Socials with ads_read / ads_management before creating campaigns.',
          cta: { label: 'Connect Facebook', href: '/admin/settings/socials' },
        },
        { status: 403 }
      );
    }

    const accounts = await listMetaAdAccounts({
      workspaceId,
      userId: session.user.id,
    });
    const liveAccount =
      accounts.find((a) => !isDemoAdsId(a.id)) || accounts[0] || null;
    const adAccountId = (
      body.adAccountId?.trim() ||
      liveAccount?.id ||
      ''
    ).trim();

    if (!adAccountId || isDemoAdsId(adAccountId)) {
      return Response.json(
        {
          ok: false,
          demo: false,
          error: 'ad_account_required',
          message:
            'Sync Meta Ads first to load your ad account, then create a campaign.',
        },
        { status: 400 }
      );
    }

    let campaignId = '';
    let adsetId = '';
    let metaNote: string | null = null;

    try {
      const created = await createMetaCampaign(token.accessToken, {
        adAccountId,
        name,
        objective: objective as Objective,
        status: 'PAUSED',
        dailyBudgetMinor: budgetMajorToMinor(dailyBudget),
      });
      campaignId = created.id;
    } catch (error) {
      console.error('[POST /api/ads/campaigns] Meta campaign create', error);
      return Response.json(
        {
          ok: false,
          demo: false,
          error: 'meta_create_failed',
          message:
            error instanceof Error
              ? error.message
              : 'Failed to create campaign on Meta',
        },
        { status: 502 }
      );
    }

    try {
      const adset = await createMetaAdSet(token.accessToken, {
        adAccountId,
        campaignId,
        name: `${name} — Ad set`,
        dailyBudgetMinor: budgetMajorToMinor(dailyBudget),
        countries: countries.length ? countries : ['SE'],
        ageMin,
        ageMax,
        status: 'PAUSED',
      });
      adsetId = adset.id;
    } catch (error) {
      metaNote =
        error instanceof Error
          ? `Campaign created on Meta; ad set failed: ${error.message}`
          : 'Campaign created on Meta; ad set create failed.';
      console.warn('[POST /api/ads/campaigns] adset', error);
    }

    const campaign = await insertLocalCampaign({
      id: campaignId,
      workspaceId,
      userId: session.user.id,
      adAccountId,
      name,
      status,
      objective,
      dailyBudget,
      currency: liveAccount?.currency || 'SEK',
    });

    const adset = adsetId
      ? await insertLocalAdSet({
          id: adsetId,
          workspaceId,
          userId: session.user.id,
          adAccountId,
          campaignId,
          name: `${name} — Ad set`,
          status,
          dailyBudget,
          targetingSummary,
          currency: liveAccount?.currency || 'SEK',
        })
      : null;

    // Creative/ad object is created on Meta in a later step — persist name/url on adset only for now.
    void creativeUrl;
    void headline;

    return Response.json({
      ok: true,
      demo: false,
      campaign,
      adset,
      ad: null,
      message: metaNote || 'Campaign created on Meta and saved to clikd:.',
    });
  } catch (error) {
    console.error('[POST /api/ads/campaigns]', error);
    return Response.json(
      {
        ok: false,
        demo: false,
        error: 'create_failed',
        message:
          error instanceof Error ? error.message : 'Failed to create campaign',
      },
      { status: 500 }
    );
  }
}
