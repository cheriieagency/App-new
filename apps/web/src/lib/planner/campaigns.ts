/**
 * Durable Projects / campaign labels — persists across server restarts.
 * Falls back to callers using the in-memory mock when DATABASE_URL is unset.
 */

import sql from '@/app/api/utils/sql';
import type {
  CampaignGoalMetric,
  CampaignLabel,
  VisionPin,
} from '@/lib/mock-content-planner';

let schemaReady: Promise<void> | null = null;
const CAMPAIGN_SCHEMA_VERSION = 3;
let schemaVersionApplied = 0;

async function safeAlter(label: string, run: () => Promise<unknown>) {
  try {
    await run();
  } catch (error) {
    console.warn(`[planner/campaigns] schema heal skipped (${label})`, error);
  }
}

export async function ensureCampaignsSchema(): Promise<void> {
  if (!process.env.DATABASE_URL?.trim()) return;
  if (schemaReady && schemaVersionApplied >= CAMPAIGN_SCHEMA_VERSION) {
    return schemaReady;
  }

  schemaReady = (async () => {
    await sql`
      CREATE TABLE IF NOT EXISTS public.planner_campaigns (
        id            text PRIMARY KEY,
        workspace_id  text NOT NULL,
        user_id       text NOT NULL,
        name          text NOT NULL,
        color         text NOT NULL DEFAULT '#9089F0',
        description   text NOT NULL DEFAULT '',
        vision_pins   jsonb NOT NULL DEFAULT '[]'::jsonb,
        created_at    timestamptz NOT NULL DEFAULT now(),
        updated_at    timestamptz NOT NULL DEFAULT now()
      )
    `;
    await safeAlter('planner_campaigns_workspace_idx', () => sql`
      CREATE INDEX IF NOT EXISTS planner_campaigns_workspace_idx
        ON public.planner_campaigns (workspace_id, created_at DESC)
    `);
    await safeAlter('planner_campaigns_user_idx', () => sql`
      CREATE INDEX IF NOT EXISTS planner_campaigns_user_idx
        ON public.planner_campaigns (user_id, created_at DESC)
    `);
    await safeAlter('planner_campaigns.sort_order', () =>
      sql`ALTER TABLE public.planner_campaigns ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0`
    );
    await safeAlter('planner_campaigns.goal_metric', () =>
      sql`ALTER TABLE public.planner_campaigns ADD COLUMN IF NOT EXISTS goal_metric text NOT NULL DEFAULT 'views'`
    );
    await safeAlter('planner_campaigns.goal_target', () =>
      sql`ALTER TABLE public.planner_campaigns ADD COLUMN IF NOT EXISTS goal_target integer NOT NULL DEFAULT 0`
    );
    await safeAlter('planner_campaigns.goal_current', () =>
      sql`ALTER TABLE public.planner_campaigns ADD COLUMN IF NOT EXISTS goal_current integer NOT NULL DEFAULT 0`
    );

    schemaVersionApplied = CAMPAIGN_SCHEMA_VERSION;
  })().catch((error) => {
    schemaReady = null;
    schemaVersionApplied = 0;
    throw error;
  });

  return schemaReady;
}

function parseVisionPins(raw: unknown): VisionPin[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const row = item as Record<string, unknown>;
      const url = typeof row.url === 'string' ? row.url.trim() : '';
      if (!url) return null;
      return {
        id:
          typeof row.id === 'string' && row.id.trim()
            ? row.id.trim()
            : `pin-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        url,
        title: typeof row.title === 'string' ? row.title.trim() : '',
        note: typeof row.note === 'string' ? row.note.trim() : '',
        created_at:
          typeof row.created_at === 'string' && row.created_at
            ? row.created_at
            : new Date().toISOString(),
      } satisfies VisionPin;
    })
    .filter((p): p is VisionPin => !!p);
}

function parseGoalMetric(raw: unknown): CampaignGoalMetric {
  return raw === 'engagement' ? 'engagement' : 'views';
}

function rowToCampaign(row: Record<string, unknown>): CampaignLabel {
  return {
    id: String(row.id),
    name: String(row.name ?? 'Untitled project'),
    color: String(row.color ?? '#9089F0'),
    description: String(row.description ?? ''),
    created_at: String(row.created_at ?? new Date().toISOString()),
    owner_user_id: String(row.user_id ?? ''),
    vision_pins: parseVisionPins(row.vision_pins),
    sort_order: Number(row.sort_order) || 0,
    goal_metric: parseGoalMetric(row.goal_metric),
    goal_target: Math.max(0, Number(row.goal_target) || 0),
    goal_current: Math.max(0, Number(row.goal_current) || 0),
  };
}

export async function listDurableCampaigns(input: {
  workspaceId: string;
  userId: string;
}): Promise<CampaignLabel[]> {
  if (!process.env.DATABASE_URL?.trim()) return [];
  await ensureCampaignsSchema();
  const rows = await sql`
    SELECT id, name, color, description, vision_pins, created_at, user_id, sort_order,
           goal_metric, goal_target, goal_current
    FROM public.planner_campaigns
    WHERE workspace_id = ${input.workspaceId}
      AND user_id = ${input.userId}
    ORDER BY sort_order ASC, created_at DESC
  `;
  return (rows || []).map((row) => rowToCampaign(row as Record<string, unknown>));
}

export async function getDurableCampaign(input: {
  workspaceId: string;
  userId: string;
  id: string;
}): Promise<CampaignLabel | null> {
  if (!process.env.DATABASE_URL?.trim()) return null;
  await ensureCampaignsSchema();
  const rows = await sql`
    SELECT id, name, color, description, vision_pins, created_at, user_id, sort_order,
           goal_metric, goal_target, goal_current
    FROM public.planner_campaigns
    WHERE id = ${input.id}
      AND workspace_id = ${input.workspaceId}
      AND user_id = ${input.userId}
    LIMIT 1
  `;
  const row = rows?.[0] as Record<string, unknown> | undefined;
  return row ? rowToCampaign(row) : null;
}

export async function createDurableCampaign(input: {
  workspaceId: string;
  userId: string;
  name: string;
  color?: string;
  description?: string;
}): Promise<CampaignLabel> {
  if (!process.env.DATABASE_URL?.trim()) {
    return {
      id: `camp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: input.name.trim() || 'Untitled project',
      color: input.color || '#9089F0',
      description: (input.description ?? '').trim(),
      created_at: new Date().toISOString(),
      owner_user_id: input.userId,
      vision_pins: [],
      sort_order: 0,
      goal_metric: 'views',
      goal_target: 0,
      goal_current: 0,
    };
  }
  await ensureCampaignsSchema();
  const maxRows = await sql`
    SELECT COALESCE(MAX(sort_order), -1) AS max_order
    FROM public.planner_campaigns
    WHERE workspace_id = ${input.workspaceId}
      AND user_id = ${input.userId}
  `;
  const nextOrder = Number(maxRows?.[0]?.max_order ?? -1) + 1;
  const campaign: CampaignLabel = {
    id: `camp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: input.name.trim() || 'Untitled project',
    color: input.color || '#9089F0',
    description: (input.description ?? '').trim(),
    created_at: new Date().toISOString(),
    owner_user_id: input.userId,
    vision_pins: [],
    sort_order: nextOrder,
    goal_metric: 'views',
    goal_target: 0,
    goal_current: 0,
  };
  await sql`
    INSERT INTO public.planner_campaigns (
      id, workspace_id, user_id, name, color, description, vision_pins, sort_order,
      goal_metric, goal_target, goal_current
    ) VALUES (
      ${campaign.id},
      ${input.workspaceId},
      ${input.userId},
      ${campaign.name},
      ${campaign.color},
      ${campaign.description},
      ${JSON.stringify(campaign.vision_pins || [])},
      ${nextOrder},
      ${campaign.goal_metric},
      ${campaign.goal_target},
      ${campaign.goal_current}
    )
  `;
  return campaign;
}

export async function updateDurableCampaign(input: {
  workspaceId: string;
  userId: string;
  id: string;
  name?: string;
  color?: string;
  description?: string;
  vision_pins?: VisionPin[];
  goal_metric?: CampaignGoalMetric;
  goal_target?: number;
  goal_current?: number;
}): Promise<CampaignLabel | null> {
  if (!process.env.DATABASE_URL?.trim()) return null;
  await ensureCampaignsSchema();

  const existing = await getDurableCampaign({
    workspaceId: input.workspaceId,
    userId: input.userId,
    id: input.id,
  });
  if (!existing) return null;

  const nextName =
    typeof input.name === 'string'
      ? input.name.trim() || existing.name
      : existing.name;
  const nextColor =
    typeof input.color === 'string' && input.color.trim()
      ? input.color.trim()
      : existing.color;
  const nextDescription =
    typeof input.description === 'string'
      ? input.description.trim()
      : existing.description;
  const nextPins =
    input.vision_pins !== undefined ? input.vision_pins : existing.vision_pins || [];
  const nextMetric =
    input.goal_metric !== undefined
      ? input.goal_metric
      : existing.goal_metric || 'views';
  const nextTarget =
    input.goal_target !== undefined
      ? Math.max(0, Math.floor(Number(input.goal_target) || 0))
      : existing.goal_target || 0;
  const nextCurrent =
    input.goal_current !== undefined
      ? Math.max(0, Math.floor(Number(input.goal_current) || 0))
      : existing.goal_current || 0;

  const rows = await sql`
    UPDATE public.planner_campaigns
    SET
      name = ${nextName},
      color = ${nextColor},
      description = ${nextDescription},
      vision_pins = ${JSON.stringify(nextPins)},
      goal_metric = ${nextMetric},
      goal_target = ${nextTarget},
      goal_current = ${nextCurrent},
      updated_at = now()
    WHERE id = ${input.id}
      AND workspace_id = ${input.workspaceId}
      AND user_id = ${input.userId}
    RETURNING id, name, color, description, vision_pins, created_at, user_id, sort_order,
              goal_metric, goal_target, goal_current
  `;
  const row = rows?.[0] as Record<string, unknown> | undefined;
  return row ? rowToCampaign(row) : null;
}

export async function deleteDurableCampaign(input: {
  workspaceId: string;
  userId: string;
  id: string;
}): Promise<boolean> {
  if (!process.env.DATABASE_URL?.trim()) return false;
  await ensureCampaignsSchema();

  const rows = await sql`
    DELETE FROM public.planner_campaigns
    WHERE id = ${input.id}
      AND workspace_id = ${input.workspaceId}
      AND user_id = ${input.userId}
    RETURNING id
  `;
  const ok = Array.isArray(rows) && rows.length > 0;
  if (ok) {
    // Soft-clear media folder links so orphaned project ids don't linger.
    try {
      await sql`
        UPDATE public.media_folders
        SET campaign_id = NULL
        WHERE workspace_id = ${input.workspaceId}
          AND campaign_id = ${input.id}
      `;
    } catch (error) {
      console.warn('[planner/campaigns] clear media folder links failed', error);
    }
  }
  return ok;
}

/** Persist sidebar drag-and-drop order for projects. */
export async function reorderDurableCampaigns(input: {
  workspaceId: string;
  userId: string;
  orderedIds: string[];
}): Promise<CampaignLabel[]> {
  if (!process.env.DATABASE_URL?.trim()) return [];
  await ensureCampaignsSchema();

  const existing = await listDurableCampaigns({
    workspaceId: input.workspaceId,
    userId: input.userId,
  });
  const allowed = new Set(existing.map((c) => c.id));
  const ordered = input.orderedIds.filter(
    (id, index, arr) => allowed.has(id) && arr.indexOf(id) === index
  );
  for (const c of existing) {
    if (!ordered.includes(c.id)) ordered.push(c.id);
  }

  for (let i = 0; i < ordered.length; i += 1) {
    await sql`
      UPDATE public.planner_campaigns
      SET sort_order = ${i}, updated_at = now()
      WHERE id = ${ordered[i]}
        AND workspace_id = ${input.workspaceId}
        AND user_id = ${input.userId}
    `;
  }

  return listDurableCampaigns({
    workspaceId: input.workspaceId,
    userId: input.userId,
  });
}
