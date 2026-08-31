/**
 * GET /api/admin/bio/handle-availability?handle=&workspaceId=
 * Returns whether a public /bio/{handle} slug is free (excluding the active workspace).
 */

import sql from '@/app/api/utils/sql';
import { requireApiSession } from '@/lib/auth/require-api-session';
import {
  normalizeBioHandle,
  validateBioHandleFormat,
  type BioHandleReason,
} from '@/lib/bio-handle';
import { ensureWorkspaceProfilesSchema } from '@/lib/workspaces/persist';

export async function GET(request: Request) {
  const session = await requireApiSession();
  if (!session.ok) return session.response;

  const url = new URL(request.url);
  const raw = url.searchParams.get('handle') || '';
  const excludeWorkspaceId = String(
    url.searchParams.get('workspaceId') || ''
  ).trim();

  const format = validateBioHandleFormat(raw);
  if (!format.ok) {
    return Response.json({
      handle: format.handle,
      available: false,
      reason: format.reason as BioHandleReason,
    });
  }

  const handle = format.handle;

  if (!process.env.DATABASE_URL?.trim()) {
    // Demo / offline — format-valid handles are treated as free.
    return Response.json({
      handle,
      available: true,
      reason: 'available' as BioHandleReason,
      demo: true,
    });
  }

  try {
    await ensureWorkspaceProfilesSchema();

    const workspaceRows = await sql`
      SELECT id, user_id::text AS user_id
      FROM public.workspaces
      WHERE lower(regexp_replace(COALESCE(handle, ''), '^@', '')) = ${handle}
         OR lower(regexp_replace(COALESCE(profile_data->>'handle', ''), '^@', '')) = ${handle}
         OR lower(regexp_replace(COALESCE(profile_data->'bio'->>'handle', ''), '^@', '')) = ${handle}
         OR lower(COALESCE(slug, '')) = ${handle}
      LIMIT 8
    `;

    const conflictWs = (workspaceRows || []).find((row) => {
      const id = String((row as { id?: string }).id || '');
      return id && id !== excludeWorkspaceId;
    });

    if (conflictWs) {
      const ownerId = String((conflictWs as { user_id?: string }).user_id || '');
      const ownOther =
        ownerId === session.user.id &&
        String((conflictWs as { id?: string }).id || '') !== excludeWorkspaceId;
      return Response.json({
        handle,
        available: false,
        reason: 'taken' as BioHandleReason,
        ownOtherWorkspace: ownOther,
      });
    }

    // Same workspace already owns this handle → available (yours).
    const ownWs = (workspaceRows || []).find(
      (row) => String((row as { id?: string }).id || '') === excludeWorkspaceId
    );
    if (ownWs) {
      return Response.json({
        handle,
        available: true,
        reason: 'own' as BioHandleReason,
      });
    }

    // Legacy user-scoped bio_blocks — only block if another account holds it.
    try {
      const bioRows = await sql`
        SELECT user_id
        FROM bio_blocks
        WHERE lower(regexp_replace(COALESCE(handle, ''), '^@', '')) = ${handle}
        LIMIT 4
      `;
      const otherOwner = (bioRows || []).find(
        (row) => String((row as { user_id?: string }).user_id || '') !== session.user.id
      );
      if (otherOwner) {
        return Response.json({
          handle,
          available: false,
          reason: 'taken' as BioHandleReason,
        });
      }
    } catch (bioErr) {
      console.warn('[handle-availability] bio_blocks check', bioErr);
    }

    return Response.json({
      handle,
      available: true,
      reason: 'available' as BioHandleReason,
    });
  } catch (error) {
    console.error('[GET /api/admin/bio/handle-availability]', error);
    return Response.json(
      {
        handle: normalizeBioHandle(raw),
        available: false,
        reason: 'invalid' as BioHandleReason,
        error: 'check_failed',
      },
      { status: 500 }
    );
  }
}
