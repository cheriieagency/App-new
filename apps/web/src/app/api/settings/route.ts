/**
 * GET/PATCH /api/settings — durable timezone, notifications, org branding.
 */

import { requireApiSession } from '@/lib/auth/require-api-session';
import {
  getUserSettings,
  getWorkspaceBranding,
  getWorkspaceInvites,
  upsertUserSettings,
  upsertWorkspaceBranding,
  upsertWorkspaceInvites,
} from '@/lib/settings/persist';
import type { NotificationPrefs } from '@/lib/notification-prefs';
import type { OrgBranding, PendingInvite } from '@/lib/settings-prefs';

export async function GET(request: Request) {
  const session = await requireApiSession();
  if (!session.ok) return session.response;

  if (!process.env.DATABASE_URL?.trim()) {
    return Response.json({
      demo: true,
      timezone: 'Europe/Stockholm',
      notification_prefs: null,
      branding: null,
      invites: [],
    });
  }

  try {
    const url = new URL(request.url);
    const workspaceId = url.searchParams.get('workspaceId')?.trim() || null;
    // User prefs + workspace branding/invites are independent — fetch in parallel.
    const [user, branding, invites] = await Promise.all([
      getUserSettings(session.user.id),
      workspaceId
        ? getWorkspaceBranding(workspaceId, session.user.id)
        : Promise.resolve(null as OrgBranding | null),
      workspaceId
        ? getWorkspaceInvites(workspaceId, session.user.id)
        : Promise.resolve([] as PendingInvite[]),
    ]);
    return Response.json({
      demo: false,
      timezone: user.timezone,
      notification_prefs: user.notification_prefs,
      branding,
      invites,
      workspace_id: workspaceId,
    });
  } catch (error) {
    console.error('[GET /api/settings]', error);
    return Response.json(
      {
        error: 'load_failed',
        message: error instanceof Error ? error.message : 'Failed to load settings',
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  const session = await requireApiSession();
  if (!session.ok) return session.response;

  if (!process.env.DATABASE_URL?.trim()) {
    return Response.json(
      { error: 'database_required', message: 'DATABASE_URL is required to save settings.' },
      { status: 503 }
    );
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const workspaceId =
      (typeof body.workspaceId === 'string' && body.workspaceId.trim()) ||
      (typeof body.workspace_id === 'string' && body.workspace_id.trim()) ||
      null;

    let timezone: string | undefined;
    let notification_prefs: NotificationPrefs | undefined;
    let branding: OrgBranding | undefined;
    let invites: PendingInvite[] | undefined;

    if (typeof body.timezone === 'string') {
      const saved = await upsertUserSettings({
        userId: session.user.id,
        timezone: body.timezone,
      });
      timezone = saved.timezone;
    }

    if (body.notification_prefs && typeof body.notification_prefs === 'object') {
      const saved = await upsertUserSettings({
        userId: session.user.id,
        notification_prefs: body.notification_prefs as NotificationPrefs,
      });
      notification_prefs = saved.notification_prefs;
    }

    if (body.branding && typeof body.branding === 'object') {
      if (!workspaceId) {
        return Response.json(
          { error: 'workspace_required', message: 'workspaceId required for branding' },
          { status: 400 }
        );
      }
      branding = await upsertWorkspaceBranding({
        workspaceId,
        userId: session.user.id,
        branding: body.branding as OrgBranding,
      });
    }

    if (Array.isArray(body.invites)) {
      if (!workspaceId) {
        return Response.json(
          { error: 'workspace_required', message: 'workspaceId required for invites' },
          { status: 400 }
        );
      }
      invites = await upsertWorkspaceInvites({
        workspaceId,
        userId: session.user.id,
        invites: body.invites as PendingInvite[],
      });
    }

    return Response.json({
      success: true,
      demo: false,
      timezone,
      notification_prefs,
      branding,
      invites,
      workspace_id: workspaceId,
    });
  } catch (error) {
    console.error('[PATCH /api/settings]', error);
    return Response.json(
      {
        error: 'save_failed',
        message: error instanceof Error ? error.message : 'Failed to save settings',
      },
      { status: 500 }
    );
  }
}
