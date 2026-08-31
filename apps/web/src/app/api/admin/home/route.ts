/**
 * GET/POST/PATCH/DELETE /api/admin/home — Command Center stickies + kanban.
 */

import { cookies } from 'next/headers';
import { requireApiSession } from '@/lib/auth/require-api-session';
import {
  ACTIVE_WORKSPACE_COOKIE,
  ACTIVE_WORKSPACE_COOKIE_ALIAS,
} from '@/lib/social/persist';
import {
  createHomeKanbanTask,
  createHomeSticky,
  deleteHomeKanbanTask,
  deleteHomeSticky,
  listAdminHomeBoard,
  saveHomeShortcuts,
  saveHomeStickyColor,
  updateHomeKanbanTask,
  updateHomeSticky,
  type HomeKanbanColumn,
} from '@/lib/admin-home/persist';
import {
  DEFAULT_HOME_SHORTCUTS,
} from '@/lib/admin-home/shortcuts';
import { DEFAULT_STICKY_COLOR } from '@/lib/admin-home/sticky-colors';

async function resolveWorkspaceId(request: Request): Promise<string | null> {
  const url = new URL(request.url);
  const jar = await cookies();
  return (
    url.searchParams.get('workspaceId')?.trim() ||
    request.headers.get('x-workspace-id')?.trim() ||
    request.headers.get('x-active-workspace-id')?.trim() ||
    jar.get(ACTIVE_WORKSPACE_COOKIE)?.value ||
    jar.get(ACTIVE_WORKSPACE_COOKIE_ALIAS)?.value ||
    null
  );
}

function emptyBoard(workspaceId: string | null) {
  return {
    ok: true,
    demo: !process.env.DATABASE_URL?.trim(),
    workspaceId,
    stickies: [] as unknown[],
    kanban: [] as unknown[],
    shortcuts: [...DEFAULT_HOME_SHORTCUTS],
    stickyColor: DEFAULT_STICKY_COLOR,
  };
}

export async function GET(request: Request) {
  const session = await requireApiSession();
  if (!session.ok) return session.response;

  const workspaceId = await resolveWorkspaceId(request);
  if (!workspaceId) {
    return Response.json({
      ...emptyBoard(null),
      message: 'Select a workspace to load your Command Center.',
    });
  }

  if (!process.env.DATABASE_URL?.trim()) {
    return Response.json(emptyBoard(workspaceId));
  }

  try {
    const board = await listAdminHomeBoard({
      workspaceId,
      userId: session.user.id,
    });
    return Response.json({
      ok: true,
      demo: false,
      workspaceId,
      stickies: board.stickies,
      kanban: board.kanban,
      shortcuts: board.shortcuts,
      stickyColor: board.stickyColor,
    });
  } catch (error) {
    console.error('[GET /api/admin/home]', error);
    return Response.json(
      {
        error: 'load_failed',
        message:
          error instanceof Error ? error.message : 'Failed to load home board',
        ...emptyBoard(workspaceId),
        ok: false,
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const session = await requireApiSession();
  if (!session.ok) return session.response;

  if (!process.env.DATABASE_URL?.trim()) {
    return Response.json(
      {
        error: 'database_required',
        message: 'DATABASE_URL is required to save Command Center items.',
      },
      { status: 503 }
    );
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const workspaceId =
      (typeof body.workspaceId === 'string' && body.workspaceId.trim()) ||
      (await resolveWorkspaceId(request));
    if (!workspaceId) {
      return Response.json(
        { error: 'workspace_required', message: 'workspaceId required' },
        { status: 400 }
      );
    }

    const kind = String(body.kind || body.type || '').toLowerCase();
    if (kind === 'sticky') {
      const text = typeof body.text === 'string' ? body.text : '';
      const sticky = await createHomeSticky({
        workspaceId,
        userId: session.user.id,
        text,
      });
      return Response.json({ ok: true, sticky });
    }

    if (kind === 'kanban' || kind === 'task') {
      const title = typeof body.title === 'string' ? body.title : '';
      const assignee =
        (typeof body.assignee === 'string' && body.assignee.trim()) ||
        (session.user.name || session.user.email || 'U').trim().charAt(0) ||
        'U';
      const dueRaw =
        typeof body.dueDate === 'string'
          ? body.dueDate
          : typeof body.due_date === 'string'
            ? body.due_date
            : null;
      const task = await createHomeKanbanTask({
        workspaceId,
        userId: session.user.id,
        title,
        assignee,
        category:
          typeof body.category === 'string' ? body.category : 'admin.catGeneral',
        column:
          body.column === 'doing' || body.column === 'done'
            ? (body.column as HomeKanbanColumn)
            : 'todo',
        dueDate: dueRaw,
      });
      return Response.json({ ok: true, task });
    }

    return Response.json(
      { error: 'invalid_kind', message: 'kind must be sticky or kanban' },
      { status: 400 }
    );
  } catch (error) {
    console.error('[POST /api/admin/home]', error);
    const message = error instanceof Error ? error.message : 'create_failed';
    const status =
      message === 'text_required' || message === 'title_required' ? 400 : 500;
    return Response.json({ error: 'create_failed', message }, { status });
  }
}

export async function PATCH(request: Request) {
  const session = await requireApiSession();
  if (!session.ok) return session.response;

  if (!process.env.DATABASE_URL?.trim()) {
    return Response.json(
      { error: 'database_required', message: 'DATABASE_URL is required.' },
      { status: 503 }
    );
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const workspaceId =
      (typeof body.workspaceId === 'string' && body.workspaceId.trim()) ||
      (await resolveWorkspaceId(request));
    const id = typeof body.id === 'string' ? body.id.trim() : '';
    const kind = String(body.kind || body.type || '').toLowerCase();
    if (!workspaceId) {
      return Response.json(
        { error: 'invalid_request', message: 'workspaceId required' },
        { status: 400 }
      );
    }

    if (kind === 'shortcuts') {
      const shortcuts = await saveHomeShortcuts({
        workspaceId,
        userId: session.user.id,
        shortcuts: Array.isArray(body.shortcuts) ? body.shortcuts.map(String) : [],
      });
      return Response.json({ ok: true, shortcuts });
    }

    if (kind === 'sticky_color' || kind === 'stickyColor') {
      const stickyColor = await saveHomeStickyColor({
        workspaceId,
        userId: session.user.id,
        stickyColor:
          typeof body.stickyColor === 'string'
            ? body.stickyColor
            : typeof body.sticky_color === 'string'
              ? body.sticky_color
              : typeof body.color === 'string'
                ? body.color
                : '',
      });
      return Response.json({ ok: true, stickyColor });
    }

    if (!id) {
      return Response.json(
        { error: 'invalid_request', message: 'workspaceId and id required' },
        { status: 400 }
      );
    }

    if (kind === 'sticky') {
      const sticky = await updateHomeSticky({
        workspaceId,
        userId: session.user.id,
        id,
        done: typeof body.done === 'boolean' ? body.done : undefined,
        text: typeof body.text === 'string' ? body.text : undefined,
      });
      if (!sticky) {
        return Response.json({ error: 'not_found' }, { status: 404 });
      }
      return Response.json({ ok: true, sticky });
    }

    if (kind === 'kanban' || kind === 'task') {
      const hasDue =
        Object.prototype.hasOwnProperty.call(body, 'dueDate') ||
        Object.prototype.hasOwnProperty.call(body, 'due_date');
      const dueRaw = hasDue
        ? typeof body.dueDate === 'string'
          ? body.dueDate
          : typeof body.due_date === 'string'
            ? body.due_date
            : null
        : undefined;
      const task = await updateHomeKanbanTask({
        workspaceId,
        userId: session.user.id,
        id,
        title: typeof body.title === 'string' ? body.title : undefined,
        column:
          body.column === 'todo' ||
          body.column === 'doing' ||
          body.column === 'done'
            ? (body.column as HomeKanbanColumn)
            : undefined,
        dueDate: dueRaw,
      });
      if (!task) {
        return Response.json({ error: 'not_found' }, { status: 404 });
      }
      return Response.json({ ok: true, task });
    }

    return Response.json(
      {
        error: 'invalid_kind',
        message: 'kind must be sticky, kanban, shortcuts, or sticky_color',
      },
      { status: 400 }
    );
  } catch (error) {
    console.error('[PATCH /api/admin/home]', error);
    return Response.json(
      {
        error: 'update_failed',
        message: error instanceof Error ? error.message : 'update_failed',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const session = await requireApiSession();
  if (!session.ok) return session.response;

  if (!process.env.DATABASE_URL?.trim()) {
    return Response.json(
      { error: 'database_required', message: 'DATABASE_URL is required.' },
      { status: 503 }
    );
  }

  const url = new URL(request.url);
  const workspaceId =
    url.searchParams.get('workspaceId')?.trim() ||
    (await resolveWorkspaceId(request));
  const id = url.searchParams.get('id')?.trim() || '';
  const kind = (url.searchParams.get('kind') || url.searchParams.get('type') || '')
    .trim()
    .toLowerCase();

  if (!workspaceId || !id || !kind) {
    return Response.json(
      { error: 'invalid_request', message: 'workspaceId, id, and kind required' },
      { status: 400 }
    );
  }

  try {
    const deleted =
      kind === 'sticky'
        ? await deleteHomeSticky({
            workspaceId,
            userId: session.user.id,
            id,
          })
        : kind === 'kanban' || kind === 'task'
          ? await deleteHomeKanbanTask({
              workspaceId,
              userId: session.user.id,
              id,
            })
          : false;
    if (!deleted) {
      return Response.json({ error: 'not_found' }, { status: 404 });
    }
    return Response.json({ ok: true });
  } catch (error) {
    console.error('[DELETE /api/admin/home]', error);
    return Response.json(
      {
        error: 'delete_failed',
        message: error instanceof Error ? error.message : 'delete_failed',
      },
      { status: 500 }
    );
  }
}
