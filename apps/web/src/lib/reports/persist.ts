/**
 * Monthly reports + automation config persistence.
 */

import sql from '@/app/api/utils/sql';
import { randomBytes } from 'crypto';

export type AiInsights = {
  executiveSummary: string;
  wins: string[];
  improvements: string[];
  recommendations: string[];
};

export type ReportMetrics = {
  views: number;
  engagementRate: number;
  followerGrowth: number;
  totalPosts: number;
  likes: number;
  comments: number;
  shares: number;
  topPosts: Array<{
    id: string;
    platform: string;
    title: string;
    mediaUrl?: string;
    permalink?: string;
    impressions: number;
    likes: number;
    comments: number;
    engagementRate: number;
    publishedAt: string;
  }>;
  platformBreakdown: Array<{
    platform: string;
    posts: number;
    views: number;
    engagementRate: number;
    likes: number;
    comments: number;
  }>;
};

export type MonthlyReportRow = {
  id: string;
  workspace_id: string;
  user_id: string;
  workspace_name: string | null;
  title: string;
  period_start: string;
  period_end: string;
  /** Human-readable range, e.g. "2026-01-01 - 2026-01-31" (NOT NULL in some DBs). */
  date_range_label: string;
  platforms: string[];
  metrics: ReportMetrics;
  ai_insights: AiInsights | null;
  include_ai_analysis: boolean;
  hide_ai_on_public_link: boolean;
  is_automated: boolean;
  public_share_enabled: boolean;
  public_share_token: string;
  public_link_expires_at: string | null;
  created_at: string;
};

/** Safe YYYY-MM-DD (never empty). */
export function coerceDateIso(value: unknown, fallback = new Date()): string {
  const raw = String(value ?? '').trim().slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  return fallback.toISOString().slice(0, 10);
}

export function formatDateRangeLabel(
  startDate: string,
  endDate: string,
  explicit?: unknown
): string {
  const label = String(explicit ?? '').trim();
  if (label) return label;
  return `${startDate} - ${endDate}`;
}

export type AutomationConfig = {
  id: string;
  workspace_id: string;
  user_id: string;
  enabled: boolean;
  recipient_emails: string[];
  platforms: string[];
  custom_email_note: string | null;
  subject_template: string;
  hide_ai_on_public_link: boolean;
  created_at: string;
  updated_at: string;
};

let tablesReady: Promise<void> | null = null;

/** Idempotent column migrations — always run (not only on first create). */
async function migrateReportsColumns(): Promise<void> {
  // Live DBs may have an older automation table without these columns.
  await sql`
    ALTER TABLE public.report_automation_configs
      ADD COLUMN IF NOT EXISTS enabled boolean NOT NULL DEFAULT false
  `;
  await sql`
    ALTER TABLE public.report_automation_configs
      ADD COLUMN IF NOT EXISTS recipient_emails text[] NOT NULL DEFAULT '{}'::text[]
  `;
  await sql`
    ALTER TABLE public.report_automation_configs
      ADD COLUMN IF NOT EXISTS platforms text[] NOT NULL DEFAULT ARRAY['instagram', 'facebook', 'tiktok']::text[]
  `;
  await sql`
    ALTER TABLE public.report_automation_configs
      ADD COLUMN IF NOT EXISTS custom_email_note text
  `;
  await sql`
    ALTER TABLE public.report_automation_configs
      ADD COLUMN IF NOT EXISTS subject_template text NOT NULL DEFAULT 'Your {{month}} performance report — {{workspace}}'
  `;
  await sql`
    ALTER TABLE public.report_automation_configs
      ADD COLUMN IF NOT EXISTS hide_ai_on_public_link boolean NOT NULL DEFAULT false
  `;
  await sql`
    ALTER TABLE public.report_automation_configs
      ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now()
  `;
  // Compat with Supabase schemas that use start_date/end_date/date_range_label.
  await sql`ALTER TABLE public.monthly_reports ADD COLUMN IF NOT EXISTS period_start date`;
  await sql`ALTER TABLE public.monthly_reports ADD COLUMN IF NOT EXISTS period_end date`;
  await sql`ALTER TABLE public.monthly_reports ADD COLUMN IF NOT EXISTS start_date date`;
  await sql`ALTER TABLE public.monthly_reports ADD COLUMN IF NOT EXISTS end_date date`;
  await sql`
    ALTER TABLE public.monthly_reports
      ADD COLUMN IF NOT EXISTS date_range_label text NOT NULL DEFAULT ''
  `;
  await sql`
    ALTER TABLE public.monthly_reports
      ADD COLUMN IF NOT EXISTS title text NOT NULL DEFAULT 'Monthly Analytics Report'
  `;
  await sql`
    UPDATE public.monthly_reports
    SET date_range_label = COALESCE(
      NULLIF(date_range_label, ''),
      CASE
        WHEN period_start IS NOT NULL AND period_end IS NOT NULL
          THEN period_start::text || ' - ' || period_end::text
        WHEN start_date IS NOT NULL AND end_date IS NOT NULL
          THEN start_date::text || ' - ' || end_date::text
        ELSE to_char(now(), 'YYYY-MM-DD') || ' - ' || to_char(now(), 'YYYY-MM-DD')
      END
    )
    WHERE date_range_label IS NULL OR date_range_label = ''
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS monthly_reports_workspace_idx
      ON public.monthly_reports (workspace_id, created_at DESC)
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS report_automation_enabled_idx
      ON public.report_automation_configs (enabled)
      WHERE enabled = true
  `;
}

export async function ensureReportsSchema(): Promise<void> {
  if (!process.env.DATABASE_URL?.trim()) return;

  if (!tablesReady) {
    tablesReady = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS public.report_automation_configs (
          id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          workspace_id            text NOT NULL,
          user_id                 text NOT NULL,
          enabled                 boolean NOT NULL DEFAULT false,
          recipient_emails        text[] NOT NULL DEFAULT '{}',
          platforms               text[] NOT NULL DEFAULT ARRAY['instagram', 'facebook', 'tiktok']::text[],
          custom_email_note       text,
          subject_template        text NOT NULL DEFAULT 'Your {{month}} performance report — {{workspace}}',
          hide_ai_on_public_link  boolean NOT NULL DEFAULT false,
          created_at              timestamptz NOT NULL DEFAULT now(),
          updated_at              timestamptz NOT NULL DEFAULT now(),
          UNIQUE (user_id, workspace_id)
        )
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS public.monthly_reports (
          id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          workspace_id            text NOT NULL,
          user_id                 text NOT NULL,
          workspace_name          text,
          title                   text NOT NULL,
          period_start            date NOT NULL,
          period_end              date NOT NULL,
          start_date              date,
          end_date                date,
          date_range_label        text NOT NULL DEFAULT '',
          platforms               text[] NOT NULL DEFAULT '{}',
          metrics                 jsonb NOT NULL DEFAULT '{}'::jsonb,
          ai_insights             jsonb,
          include_ai_analysis     boolean NOT NULL DEFAULT true,
          hide_ai_on_public_link  boolean NOT NULL DEFAULT false,
          is_automated            boolean NOT NULL DEFAULT false,
          public_share_enabled    boolean NOT NULL DEFAULT true,
          public_share_token      text NOT NULL UNIQUE,
          public_link_expires_at  timestamptz,
          created_at              timestamptz NOT NULL DEFAULT now()
        )
      `;
    })().catch((error) => {
      tablesReady = null;
      throw error;
    });
  }

  await tablesReady;
  await migrateReportsColumns();
}

function newShareToken() {
  return randomBytes(24).toString('hex');
}

function mapReport(row: Record<string, unknown>): MonthlyReportRow {
  const platforms = Array.isArray(row.platforms)
    ? row.platforms.map(String)
    : typeof row.platforms === 'string'
      ? [row.platforms]
      : [];
  const start = coerceDateIso(row.period_start ?? row.start_date);
  const end = coerceDateIso(row.period_end ?? row.end_date, new Date(start));
  const dateRangeLabel = formatDateRangeLabel(
    start,
    end,
    row.date_range_label
  );
  return {
    id: String(row.id),
    workspace_id: String(row.workspace_id),
    user_id: String(row.user_id),
    workspace_name: row.workspace_name != null ? String(row.workspace_name) : null,
    title: String(row.title || 'Monthly Analytics Report'),
    period_start: start,
    period_end: end,
    date_range_label: dateRangeLabel,
    platforms,
    metrics: (row.metrics || {}) as ReportMetrics,
    ai_insights: (row.ai_insights as AiInsights | null) ?? null,
    include_ai_analysis: Boolean(row.include_ai_analysis),
    hide_ai_on_public_link: Boolean(row.hide_ai_on_public_link),
    is_automated: Boolean(row.is_automated),
    public_share_enabled: row.public_share_enabled !== false,
    public_share_token: String(row.public_share_token),
    public_link_expires_at: row.public_link_expires_at
      ? new Date(String(row.public_link_expires_at)).toISOString()
      : null,
    created_at: new Date(String(row.created_at)).toISOString(),
  };
}

function mapAutomation(row: Record<string, unknown>): AutomationConfig {
  return {
    id: String(row.id),
    workspace_id: String(row.workspace_id),
    user_id: String(row.user_id),
    enabled: Boolean(row.enabled),
    recipient_emails: Array.isArray(row.recipient_emails)
      ? row.recipient_emails.map(String)
      : [],
    platforms: Array.isArray(row.platforms) ? row.platforms.map(String) : [],
    custom_email_note:
      row.custom_email_note != null ? String(row.custom_email_note) : null,
    subject_template: String(
      row.subject_template ||
        'Your {{month}} performance report — {{workspace}}'
    ),
    hide_ai_on_public_link: Boolean(row.hide_ai_on_public_link),
    created_at: new Date(String(row.created_at)).toISOString(),
    updated_at: new Date(String(row.updated_at)).toISOString(),
  };
}

export async function listMonthlyReports(
  workspaceId: string
): Promise<MonthlyReportRow[]> {
  if (!process.env.DATABASE_URL?.trim()) return [];
  await ensureReportsSchema();
  const rows = await sql`
    SELECT *
    FROM public.monthly_reports
    WHERE workspace_id = ${workspaceId}
    ORDER BY created_at DESC
    LIMIT 100
  `;
  return (rows || []).map((r) => mapReport(r as Record<string, unknown>));
}

export async function insertMonthlyReport(input: {
  workspaceId: string;
  userId: string;
  workspaceName?: string | null;
  title?: string | null;
  periodStart?: string | null;
  periodEnd?: string | null;
  dateRangeLabel?: string | null;
  platforms?: string[];
  metrics: ReportMetrics;
  aiInsights?: AiInsights | null;
  includeAiAnalysis?: boolean;
  hideAiOnPublicLink?: boolean;
  isAutomated?: boolean;
  publicLinkExpiresAt?: string | null;
}): Promise<MonthlyReportRow | null> {
  if (!process.env.DATABASE_URL?.trim()) return null;
  await ensureReportsSchema();
  const token = newShareToken();

  const startDate = coerceDateIso(input.periodStart);
  const endDate = coerceDateIso(input.periodEnd, new Date(startDate));
  const dateRangeLabel = formatDateRangeLabel(
    startDate,
    endDate,
    input.dateRangeLabel
  );
  const title =
    String(input.title ?? '').trim() || 'Monthly Analytics Report';
  const workspaceId = String(input.workspaceId || '').trim();
  if (!workspaceId) {
    throw new Error('workspace_id is required');
  }

  const rows = await sql`
    INSERT INTO public.monthly_reports (
      workspace_id, user_id, workspace_name, title,
      period_start, period_end, start_date, end_date, date_range_label,
      platforms, metrics, ai_insights,
      include_ai_analysis, hide_ai_on_public_link, is_automated,
      public_share_enabled, public_share_token, public_link_expires_at
    )
    VALUES (
      ${workspaceId},
      ${input.userId},
      ${input.workspaceName ?? null},
      ${title},
      ${startDate},
      ${endDate},
      ${startDate},
      ${endDate},
      ${dateRangeLabel},
      ${input.platforms?.length ? input.platforms : ['instagram', 'facebook', 'tiktok']},
      ${JSON.stringify(input.metrics || {})},
      ${input.aiInsights ? JSON.stringify(input.aiInsights) : null},
      ${input.includeAiAnalysis !== false},
      ${Boolean(input.hideAiOnPublicLink)},
      ${Boolean(input.isAutomated)},
      true,
      ${token},
      ${input.publicLinkExpiresAt ?? null}
    )
    RETURNING *
  `;
  const row = rows?.[0] as Record<string, unknown> | undefined;
  return row ? mapReport(row) : null;
}

export async function getReportByShareToken(
  token: string
): Promise<MonthlyReportRow | null> {
  if (!process.env.DATABASE_URL?.trim()) return null;
  await ensureReportsSchema();
  const rows = await sql`
    SELECT *
    FROM public.monthly_reports
    WHERE public_share_token = ${token}
      AND public_share_enabled = true
    LIMIT 1
  `;
  const row = rows?.[0] as Record<string, unknown> | undefined;
  return row ? mapReport(row) : null;
}

export async function getAutomationConfig(input: {
  userId: string;
  workspaceId: string;
}): Promise<AutomationConfig | null> {
  if (!process.env.DATABASE_URL?.trim()) return null;
  await ensureReportsSchema();
  const rows = await sql`
    SELECT *
    FROM public.report_automation_configs
    WHERE user_id = ${input.userId}
      AND workspace_id = ${input.workspaceId}
    LIMIT 1
  `;
  const row = rows?.[0] as Record<string, unknown> | undefined;
  return row ? mapAutomation(row) : null;
}

export async function upsertAutomationConfig(input: {
  userId: string;
  workspaceId: string;
  enabled?: boolean;
  recipientEmails?: string[];
  platforms?: string[];
  customEmailNote?: string | null;
  subjectTemplate?: string;
  hideAiOnPublicLink?: boolean;
}): Promise<AutomationConfig | null> {
  if (!process.env.DATABASE_URL?.trim()) return null;
  await ensureReportsSchema();

  const existing = await getAutomationConfig(input);
  const enabled = input.enabled ?? existing?.enabled ?? false;
  const recipientEmails =
    input.recipientEmails ?? existing?.recipient_emails ?? [];
  const platforms =
    input.platforms ??
    existing?.platforms ?? ['instagram', 'facebook', 'tiktok'];
  const customEmailNote =
    input.customEmailNote !== undefined
      ? input.customEmailNote
      : existing?.custom_email_note ?? null;
  const subjectTemplate =
    input.subjectTemplate ||
    existing?.subject_template ||
    'Your {{month}} performance report — {{workspace}}';
  const hideAi =
    input.hideAiOnPublicLink ?? existing?.hide_ai_on_public_link ?? false;

  const rows = await sql`
    INSERT INTO public.report_automation_configs (
      workspace_id, user_id, enabled, recipient_emails, platforms,
      custom_email_note, subject_template, hide_ai_on_public_link, updated_at
    )
    VALUES (
      ${input.workspaceId},
      ${input.userId},
      ${enabled},
      ${recipientEmails},
      ${platforms},
      ${customEmailNote},
      ${subjectTemplate},
      ${hideAi},
      now()
    )
    ON CONFLICT (user_id, workspace_id) DO UPDATE SET
      enabled = EXCLUDED.enabled,
      recipient_emails = EXCLUDED.recipient_emails,
      platforms = EXCLUDED.platforms,
      custom_email_note = EXCLUDED.custom_email_note,
      subject_template = EXCLUDED.subject_template,
      hide_ai_on_public_link = EXCLUDED.hide_ai_on_public_link,
      updated_at = now()
    RETURNING *
  `;
  const row = rows?.[0] as Record<string, unknown> | undefined;
  return row ? mapAutomation(row) : null;
}

export async function listEnabledAutomations(): Promise<AutomationConfig[]> {
  if (!process.env.DATABASE_URL?.trim()) return [];
  await ensureReportsSchema();
  const rows = await sql`
    SELECT *
    FROM public.report_automation_configs
    WHERE enabled = true
      AND cardinality(recipient_emails) > 0
  `;
  return (rows || []).map((r) => mapAutomation(r as Record<string, unknown>));
}
