/**
 * Durable planner team roster — scoped to owning user.
 */

import sql from '@/app/api/utils/sql';
import type {
  PlannerTeamMember,
  TeamRole,
  WorkspacePlan,
} from '@/lib/mock-content-planner';
import { PLAN_LIMITS } from '@/lib/config/plans';

let schemaReady: Promise<void> | null = null;

export async function ensurePlannerTeamSchema(): Promise<void> {
  if (!process.env.DATABASE_URL?.trim()) return;
  if (schemaReady) return schemaReady;

  schemaReady = (async () => {
    await sql`
      CREATE TABLE IF NOT EXISTS public.planner_team_members (
        id              text PRIMARY KEY,
        owner_user_id   text NOT NULL,
        name            text NOT NULL,
        email           text NOT NULL,
        role            text NOT NULL DEFAULT 'editor',
        project         text NOT NULL DEFAULT '',
        avatar_url      text NOT NULL DEFAULT '',
        planner_access  boolean NOT NULL DEFAULT false,
        status          text NOT NULL DEFAULT 'pending',
        invited_at      timestamptz NOT NULL DEFAULT now(),
        created_at      timestamptz NOT NULL DEFAULT now(),
        updated_at      timestamptz NOT NULL DEFAULT now(),
        UNIQUE (owner_user_id, email)
      )
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS planner_team_owner_idx
        ON public.planner_team_members (owner_user_id, invited_at DESC)
    `;
  })().catch((error) => {
    schemaReady = null;
    throw error;
  });

  return schemaReady;
}

function rowToMember(row: Record<string, unknown>): PlannerTeamMember {
  const role = String(row.role || 'editor') as TeamRole;
  const status = row.status === 'active' ? 'active' : 'pending';
  return {
    id: String(row.id),
    name: String(row.name ?? ''),
    email: String(row.email ?? ''),
    role,
    project: String(row.project ?? ''),
    avatar_url: String(row.avatar_url ?? ''),
    planner_access: Boolean(row.planner_access),
    status,
    invited_at: String(row.invited_at ?? new Date().toISOString()),
  };
}

export async function listDurableTeamMembers(input: {
  ownerUserId: string;
  project?: string;
}): Promise<PlannerTeamMember[]> {
  if (!process.env.DATABASE_URL?.trim()) return [];
  await ensurePlannerTeamSchema();
  const project = input.project?.trim();
  const rows = project
    ? await sql`
        SELECT * FROM public.planner_team_members
        WHERE owner_user_id = ${input.ownerUserId}
          AND project = ${project}
        ORDER BY name ASC
      `
    : await sql`
        SELECT * FROM public.planner_team_members
        WHERE owner_user_id = ${input.ownerUserId}
        ORDER BY name ASC
      `;
  return (rows || []).map((r) => rowToMember(r as Record<string, unknown>));
}

export async function ensureOwnerTeamSeat(input: {
  ownerUserId: string;
  name: string;
  email: string;
  project?: string;
}): Promise<void> {
  await ensurePlannerTeamSchema();
  const email = input.email.trim().toLowerCase();
  if (!email.includes('@')) return;
  const existing = await sql`
    SELECT id FROM public.planner_team_members
    WHERE owner_user_id = ${input.ownerUserId}
      AND role = 'owner'
    LIMIT 1
  `;
  if (existing?.[0]) return;

  const id = `owner-${input.ownerUserId.slice(0, 12)}`;
  await sql`
    INSERT INTO public.planner_team_members (
      id, owner_user_id, name, email, role, project, avatar_url,
      planner_access, status, invited_at
    ) VALUES (
      ${id},
      ${input.ownerUserId},
      ${input.name.trim() || email.split('@')[0]},
      ${email},
      ${'owner'},
      ${input.project?.trim() || ''},
      ${`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(email)}`},
      ${true},
      ${'active'},
      now()
    )
    ON CONFLICT (owner_user_id, email) DO UPDATE SET
      role = 'owner',
      planner_access = true,
      status = 'active',
      updated_at = now()
  `;
}

export async function addDurableTeamMember(input: {
  ownerUserId: string;
  name: string;
  email: string;
  role: TeamRole;
  project: string;
  plan: WorkspacePlan;
}): Promise<{
  member: PlannerTeamMember;
  plan: WorkspacePlan;
  granted_access: boolean;
  error?: 'SEAT_LIMIT';
  seat_limit?: number;
}> {
  await ensurePlannerTeamSchema();
  const email = input.email.trim().toLowerCase();
  const members = await listDurableTeamMembers({ ownerUserId: input.ownerUserId });
  const existing = members.find((m) => m.email === email);
  if (existing) {
    return {
      member: existing,
      plan: input.plan,
      granted_access: existing.planner_access,
    };
  }

  const seatLimit = PLAN_LIMITS[input.plan].maxTeammateSeats;
  if (members.length >= seatLimit) {
    return {
      member: members[0],
      plan: input.plan,
      granted_access: false,
      error: 'SEAT_LIMIT',
      seat_limit: seatLimit,
    };
  }

  const isPro = input.plan === 'pro';
  const role: TeamRole = input.role === 'owner' ? 'editor' : input.role;
  const id = `u-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const member: PlannerTeamMember = {
    id,
    name: input.name.trim() || email.split('@')[0],
    email,
    role,
    project: input.project || '',
    avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(email)}`,
    planner_access: isPro,
    status: isPro ? 'active' : 'pending',
    invited_at: new Date().toISOString(),
  };

  await sql`
    INSERT INTO public.planner_team_members (
      id, owner_user_id, name, email, role, project, avatar_url,
      planner_access, status, invited_at
    ) VALUES (
      ${member.id},
      ${input.ownerUserId},
      ${member.name},
      ${member.email},
      ${member.role},
      ${member.project},
      ${member.avatar_url},
      ${member.planner_access},
      ${member.status},
      ${member.invited_at}
    )
  `;

  return { member, plan: input.plan, granted_access: isPro };
}

export async function updateDurableTeamMember(input: {
  ownerUserId: string;
  id: string;
  patch: Partial<
    Pick<PlannerTeamMember, 'name' | 'email' | 'role' | 'project' | 'status'>
  >;
  plan: WorkspacePlan;
}): Promise<PlannerTeamMember | null> {
  await ensurePlannerTeamSchema();
  const members = await listDurableTeamMembers({ ownerUserId: input.ownerUserId });
  const member = members.find((m) => m.id === input.id);
  if (!member) return null;

  if (input.patch.name !== undefined) {
    member.name = input.patch.name.trim() || member.name;
  }
  if (input.patch.email !== undefined) {
    member.email = input.patch.email.trim().toLowerCase();
  }
  if (input.patch.role !== undefined && member.role !== 'owner') {
    member.role =
      input.patch.role === 'owner' ? member.role : input.patch.role;
  }
  if (input.patch.project !== undefined) member.project = input.patch.project;
  if (input.patch.status !== undefined && member.role !== 'owner') {
    member.status = input.patch.status;
  }
  if (input.plan === 'pro' && member.role !== 'owner') member.planner_access = true;
  if (input.plan !== 'pro' && member.role !== 'owner') member.planner_access = false;

  await sql`
    UPDATE public.planner_team_members SET
      name = ${member.name},
      email = ${member.email},
      role = ${member.role},
      project = ${member.project},
      planner_access = ${member.planner_access},
      status = ${member.status},
      updated_at = now()
    WHERE id = ${member.id} AND owner_user_id = ${input.ownerUserId}
  `;

  return member;
}

export async function removeDurableTeamMember(input: {
  ownerUserId: string;
  id: string;
}): Promise<boolean> {
  await ensurePlannerTeamSchema();
  const rows = await sql`
    DELETE FROM public.planner_team_members
    WHERE id = ${input.id}
      AND owner_user_id = ${input.ownerUserId}
      AND role <> 'owner'
    RETURNING id
  `;
  return Array.isArray(rows) && rows.length > 0;
}

export async function syncTeamPlannerAccess(input: {
  ownerUserId: string;
  plan: WorkspacePlan;
}): Promise<void> {
  await ensurePlannerTeamSchema();
  const isPro = input.plan === 'pro';
  await sql`
    UPDATE public.planner_team_members
    SET
      planner_access = CASE WHEN role = 'owner' THEN true ELSE ${isPro} END,
      status = CASE
        WHEN role = 'owner' THEN 'active'
        WHEN ${isPro} AND status = 'pending' THEN 'active'
        ELSE status
      END,
      updated_at = now()
    WHERE owner_user_id = ${input.ownerUserId}
  `;
}
