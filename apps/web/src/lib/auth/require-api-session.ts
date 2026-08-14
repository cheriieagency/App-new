/**
 * Shared session gate for admin / planner mutation & read APIs.
 * Always binds work to session.user.id — never trust client-supplied user ids.
 */

import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { resolveStrictUserWorkspace } from '@/lib/social/resolve-user-workspace';

export type ApiSessionUser = {
  id: string;
  email: string | null;
  name: string | null;
  image: string | null;
};

export type RequireSessionOk = {
  ok: true;
  user: ApiSessionUser;
};

export type RequireSessionFail = {
  ok: false;
  response: Response;
};

export async function requireApiSession(): Promise<
  RequireSessionOk | RequireSessionFail
> {
  let session: Awaited<ReturnType<typeof auth.api.getSession>> = null;
  try {
    session = await auth.api.getSession({ headers: await headers() });
  } catch (error) {
    console.warn('[requireApiSession] session read failed', error);
  }

  const id = session?.user?.id?.trim();
  if (!id) {
    return {
      ok: false,
      response: Response.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  return {
    ok: true,
    user: {
      id,
      email: session?.user?.email ?? null,
      name: session?.user?.name ?? null,
      image: session?.user?.image ?? null,
    },
  };
}

/**
 * Session + owned workspace (preferred cookie/header → primary → auto-create).
 */
export async function requireApiSessionWithWorkspace(input?: {
  preferredWorkspaceId?: string | null;
}): Promise<
  | (RequireSessionOk & { workspaceId: string })
  | RequireSessionFail
> {
  const session = await requireApiSession();
  if (!session.ok) return session;

  const access = await resolveStrictUserWorkspace({
    userId: session.user.id,
    preferredWorkspaceId: input?.preferredWorkspaceId ?? null,
    email: session.user.email,
  });

  if (!access.ok) {
    return {
      ok: false,
      response: Response.json(
        { error: access.error || 'workspace_forbidden' },
        { status: access.status === 400 ? 400 : 403 }
      ),
    };
  }

  return { ...session, workspaceId: access.workspaceId };
}
