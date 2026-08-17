/**
 * POST /api/ads/campaigns — Create Campaign wizard (objective → audience → creative).
 * Live Meta: creates campaign + ad set via Marketing API v20.0 when connected.
 * Demo / offline: persists hierarchy locally with demo ids.
 */

import { randomUUID } from 'crypto';
import { requireApiSession } from '@/lib/auth/require-api-session';
import { DEMO_AD_ACCOUNT_ID, isDemoAdsId } from '@/lib/ads/demo-seed';
import {
  insertLocalAd,
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

    if (!process.env.DATABASE_URL?.trim()) {
      return Response.json({
        ok: true,
        demo: true,
        campaign: {
          id: `demo-${randomUUID()}`,
          name,
          objective,
          status,
          daily_budget: dailyBudget,
        },
        message: 'Demo create — set DATABASE_URL to persist campaigns.',
      });
    }

    const accounts = await listMetaAdAccounts({
      workspaceId,
      userId: session.user.id,
    });
    const liveAccount =
      accounts.find((a) => !isDemoAdsId(a.id)) || accounts[0] || null;
    const adAccountId =
      body.adAccountId?.trim() || liveAccount?.id || DEMO_AD_ACCOUNT_ID;

    const token = await loadMetaAdsAccessToken({
      userId: session.user.id,
      workspaceId,
    });

    let campaignId = `a0000000-0000-4000-8000-${randomUUID().replace(/-/g, '').slice(0, 12)}`;
    let adsetId = `a0000000-0000-4000-8000-${randomUUID().replace(/-/g, '').slice(0, 12)}`;
    let adId = `a0000000-0000-4000-8000-${randomUUID().replace(/-/g, '').slice(0, 12)}`;
    let demo = true;
    let metaNote: string | null = null;

    const canLive =
      Boolean(token) &&
      !isDemoAdsId(adAccountId) &&
      !adAccountId.includes('demo');

    if (canLive && token) {
      try {
        const created = await createMetaCampaign(token.accessToken, {
          adAccountId,
          name,
          objective: objective as Objective,
          status: 'PAUSED',
          dailyBudgetMinor: budgetMajorToMinor(dailyBudget),
        });
        campaignId = created.id;
        demo = false;
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
      } catch (error) {
        console.warn(
          '[POST /api/ads/campaigns] Meta create failed — local fallback',
          error
        );
        metaNote =
          error instanceof Error
            ? `Meta create failed (${error.message}); saved locally.`
            : 'Meta create failed; saved locally.';
        demo = true;
      }
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

    const adset = await insertLocalAdSet({
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
    });

    const ad = await insertLocalAd({
      id: adId,
      workspaceId,
      userId: session.user.id,
      adAccountId,
      campaignId,
      adsetId,
      name: body.creativeName?.trim() || `${name} — Ad`,
      status,
      creativeThumbnail: creativeUrl,
      headline,
      currency: liveAccount?.currency || 'SEK',
    });

    return Response.json({
      ok: true,
      demo,
      campaign,
      adset,
      ad,
      message: demo
        ? metaNote || 'Campaign created locally (demo / Meta not connected).'
        : metaNote || 'Campaign created on Meta and saved to clikd:.',
    });
  } catch (error) {
    console.error('[POST /api/ads/campaigns]', error);
    return Response.json(
      {
        ok: false,
        error: 'create_failed',
        message:
          error instanceof Error ? error.message : 'Failed to create campaign',
      },
      { status: 500 }
    );
  }
}
