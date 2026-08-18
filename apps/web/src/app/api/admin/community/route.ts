import sql from '@/app/api/utils/sql';
import { auth } from '@/lib/auth';
import { cookies, headers } from 'next/headers';
import {
  createManagedCommunity,
  getMockCommunityAdminPayload,
  type ManagedCommunity,
} from '@/lib/mock-community-admin';
import { demoPostPinOverrides } from '@/lib/demo-pin-state';
import { ensureCommunitiesSchema } from '@/lib/communities/schema';
import { persistCommunityToDatabase } from '@/lib/communities/persist';
import {
  ACTIVE_WORKSPACE_COOKIE,
  ACTIVE_WORKSPACE_COOKIE_ALIAS,
} from '@/lib/social/oauth-workspace';
import { resolveStrictUserWorkspace } from '@/lib/social/resolve-user-workspace';
import {
  managedToSearchable,
  publishCommunityToPublicCatalog,
} from '@/lib/public-communities-store';

async function requireSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  return session;
}

export async function GET(request: Request) {
  const session = await requireSession();
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(request.url);
  const { searchParams } = url;
  const requestedId = searchParams.get('community_id');
  const communityId = requestedId ? Number(requestedId) : undefined;

  // Demo / no DB — rich mock payload for local QA.
  if (!process.env.DATABASE_URL?.trim()) {
    return Response.json(getMockCommunityAdminPayload(communityId));
  }

  const emptyPayload = (selected: Record<string, unknown> | null = null) => ({
    communities: selected ? [selected] : [],
    community: selected,
    overview: {
      member_count: 0,
      post_count: 0,
      comment_count: 0,
      joined_this_week: 0,
      moderator_count: 0,
      like_count: 0,
    },
    members: [],
    posts: [],
    demo: false,
  });

  try {
    await ensureCommunitiesSchema();
    const jar = await cookies();
    const hdrs = await headers();
    const preferred =
      url.searchParams.get('workspaceId')?.trim() ||
      hdrs.get('x-workspace-id')?.trim() ||
      hdrs.get('x-active-workspace-id')?.trim() ||
      jar.get(ACTIVE_WORKSPACE_COOKIE)?.value ||
      jar.get(ACTIVE_WORKSPACE_COOKIE_ALIAS)?.value ||
      null;

    const access = await resolveStrictUserWorkspace({
      userId: session.user.id,
      preferredWorkspaceId: preferred,
      email: session.user.email,
    });
    if (!access.ok) {
      return Response.json(
        { error: access.error || 'workspace_forbidden' },
        { status: access.status === 400 ? 400 : 403 }
      );
    }
    const workspaceId = access.workspaceId;

    // Prefer the requested community (workspace-bound) so admin never falls to mock.
    let communities: Record<string, unknown>[] = [];
    if (communityId) {
      const byId = await sql`
        SELECT id, name, slug, description, category, cover_color,
               member_count, COALESCE(is_published, true) AS is_published,
               workspace_id, avatar_url, cover_url, is_free, monthly_price_sek
        FROM communities
        WHERE id = ${communityId}
          AND workspace_id = ${workspaceId}
          AND (
            workspace_id IN (
              SELECT id FROM public.workspaces WHERE user_id::text = ${session.user.id}
            )
            OR creator_id::text = ${session.user.id}
            OR user_id::text = ${session.user.id}
            OR EXISTS (
              SELECT 1 FROM community_memberships cm
              WHERE cm.community_id = communities.id
                AND cm.user_id::text = ${session.user.id}
                AND cm.role IN ('owner', 'moderator')
            )
          )
        LIMIT 1
      `;
      if (Array.isArray(byId) && byId[0]) {
        communities = byId as Record<string, unknown>[];
      }
    }

    if (communities.length === 0) {
      const owned = await sql`
        SELECT id, name, slug, description, category, cover_color,
               member_count, COALESCE(is_published, true) AS is_published,
               workspace_id, avatar_url, cover_url, is_free, monthly_price_sek
        FROM communities
        WHERE workspace_id = ${workspaceId}
          AND (
            workspace_id IN (
              SELECT id FROM public.workspaces WHERE user_id::text = ${session.user.id}
            )
            OR creator_id::text = ${session.user.id}
            OR user_id::text = ${session.user.id}
            OR id IN (
              SELECT community_id FROM community_memberships
              WHERE user_id::text = ${session.user.id} AND role IN ('owner', 'moderator')
            )
          )
        ORDER BY name ASC
      `;
      communities = (Array.isArray(owned) ? owned : []) as Record<string, unknown>[];
    }

    if (communities.length === 0) {
      return Response.json(emptyPayload(null));
    }

    const selected =
      communities.find((c) => Number(c.id) === communityId) ?? communities[0];
    const cid = Number((selected as { id: number }).id);

    let members: unknown[] = [];
    let posts: unknown[] = [];
    let commentRows: unknown[] = [];
    try {
      // Parallel reads (avoid broken sql.transaction Promise handling for UI load).
      const [memberRows, postRows, commentList] = await Promise.all([
        sql`
          SELECT u.id, u.name, u.email, u.image,
                 cm.role, cm.joined_at
          FROM community_memberships cm
          JOIN "user" u ON u.id = cm.user_id
          WHERE cm.community_id = ${cid}
          ORDER BY
            CASE cm.role
              WHEN 'owner' THEN 0
              WHEN 'moderator' THEN 1
              ELSE 2
            END,
            cm.joined_at DESC
        `,
        sql`
          SELECT p.*,
                 (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id)::int AS like_count,
                 (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id)::int AS comment_count
          FROM posts p
          WHERE p.community_id = ${cid}
          ORDER BY p.is_pinned DESC, p.created_at DESC
          LIMIT 50
        `,
        sql`
          SELECT c.id, c.post_id, c.user_id, c.user_name, c.content,
                 c.parent_id, c.media_url, c.media_type,
                 c.is_pinned, c.pinned_at, c.created_at
          FROM comments c
          JOIN posts p ON p.id = c.post_id
          WHERE p.community_id = ${cid}
          ORDER BY c.is_pinned DESC, c.created_at ASC
        `,
      ]);
      members = memberRows as unknown[];
      posts = postRows as unknown[];
      commentRows = commentList as unknown[];
    } catch (feedError) {
      // Degrade gracefully — still return community shell + members if feed schema lags.
      console.warn('[GET /api/admin/community] feed query failed', feedError);
      try {
        members = (await sql`
          SELECT u.id, u.name, u.email, u.image,
                 cm.role, cm.joined_at
          FROM community_memberships cm
          JOIN "user" u ON u.id = cm.user_id
          WHERE cm.community_id = ${cid}
          ORDER BY cm.joined_at DESC
        `) as unknown[];
      } catch (memberError) {
        console.warn('[GET /api/admin/community] members query failed', memberError);
      }
    }

    const commentsByPost = new Map<number, unknown[]>();
    for (const row of (Array.isArray(commentRows) ? commentRows : []) as Array<{
      post_id: number;
    }>) {
      const list = commentsByPost.get(row.post_id) ?? [];
      list.push(row);
      commentsByPost.set(row.post_id, list);
    }

    const postsWithComments = (
      Array.isArray(posts) ? (posts as Array<{ id: number }>) : []
    ).map((p) => ({
      ...p,
      comments: commentsByPost.get(p.id) ?? [],
    }));

    const memberList = (
      Array.isArray(members) ? members : []
    ) as Array<{ role: string; joined_at: string }>;
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const joinedThisWeek = memberList.filter(
      (m) => new Date(m.joined_at).getTime() >= weekAgo
    ).length;
    const commentTotal = Array.isArray(commentRows) ? commentRows.length : 0;
    const likeTotal = postsWithComments.reduce(
      (n, p) => n + Number((p as { like_count?: number }).like_count ?? 0),
      0
    );

    return Response.json({
      communities,
      community: selected,
      overview: {
        member_count: memberList.length,
        post_count: postsWithComments.length,
        comment_count: commentTotal,
        joined_this_week: joinedThisWeek,
        moderator_count: memberList.filter((m) => m.role === 'moderator').length,
        like_count: likeTotal,
      },
      members: memberList,
      posts: postsWithComments,
      demo: false,
    });
  } catch (error) {
    console.error('[GET /api/admin/community]', error);
    return Response.json(
      {
        ...emptyPayload(null),
        error: 'load_failed',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const session = await requireSession();
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    if (process.env.DATABASE_URL?.trim()) {
      await ensureCommunitiesSchema();
    }

    const body = await request.json();
    const { action } = body as { action?: string };

    if (!action) {
      return Response.json({ error: 'action required' }, { status: 400 });
    }

    if (action === 'create_community') {
      const name = String(body.name ?? '').trim() || 'New community';
      const description = String(body.description ?? '').trim();
      const slugBase =
        name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '') || `community-${Date.now()}`;
      const slug = `${slugBase}-${Date.now().toString(36).slice(-5)}`;

      const jar = await cookies();
      const hdrs = await headers();
      const preferred =
        (typeof body.workspaceId === 'string' && body.workspaceId.trim()) ||
        (typeof body.workspace_id === 'string' && body.workspace_id.trim()) ||
        hdrs.get('x-workspace-id')?.trim() ||
        hdrs.get('x-active-workspace-id')?.trim() ||
        jar.get(ACTIVE_WORKSPACE_COOKIE)?.value ||
        jar.get(ACTIVE_WORKSPACE_COOKIE_ALIAS)?.value ||
        null;

      const access = await resolveStrictUserWorkspace({
        userId: session.user.id,
        preferredWorkspaceId: preferred,
        email: session.user.email,
      });
      if (!access.ok) {
        return Response.json(
          { error: access.error || 'workspace_forbidden' },
          { status: access.status === 400 ? 400 : 403 }
        );
      }
      const workspaceId = access.workspaceId;

      const isFree =
        typeof body.is_free === 'boolean'
          ? body.is_free
          : typeof body.isFree === 'boolean'
            ? body.isFree
            : Number(body.monthly_price_sek ?? body.monthlyPriceSek ?? 0) <= 0;
      const monthlyPriceSek = isFree
        ? 0
        : Math.max(0, Math.round(Number(body.monthly_price_sek ?? body.monthlyPriceSek ?? 0)));
      const coverUrl =
        (typeof body.cover_url === 'string' && body.cover_url.trim()) ||
        (typeof body.coverUrl === 'string' && body.coverUrl.trim()) ||
        null;
      const avatarUrl =
        (typeof body.avatar_url === 'string' && body.avatar_url.trim()) ||
        (typeof body.avatarUrl === 'string' && body.avatarUrl.trim()) ||
        null;
      const category = String(body.category ?? 'Community').trim() || 'Community';

      // Demo / no database — still publish into the public catalog so site users can find it.
      if (!process.env.DATABASE_URL?.trim()) {
        const community = createManagedCommunity({
          name,
          description,
          workspaceId,
          skipWorkspaceProfile: false,
        });
        (community as { workspace_id?: string; creator_id?: string }).workspace_id =
          workspaceId;
        (community as { creator_id?: string }).creator_id = session.user.id;
        publishCommunityToPublicCatalog(
          managedToSearchable(community, {
            creatorName: session.user.name,
            creatorImage: session.user.image,
            isJoined: true,
          })
        );
        return Response.json({
          success: true,
          community,
          public_url: `/communities/${community.slug || community.id}`,
          workspace_id: workspaceId,
          demo: true,
        });
      }

      try {
        const saved = await persistCommunityToDatabase({
          name,
          slug,
          description: description || 'Your creator community.',
          category,
          coverColor: '#2B2568',
          avatarUrl,
          coverUrl,
          isFree,
          monthlyPriceSek,
          isPublished: true,
          userId: session.user.id,
          userName: session.user.name,
          userImage: session.user.image,
          workspaceId,
        });

        if (!saved.ok) {
          return Response.json(
            {
              error: 'create_failed',
              message: saved.error,
              hint: 'Community was not published. Fix DB schema/credentials and retry.',
            },
            { status: saved.status }
          );
        }

        const row = saved.community;
        const community: ManagedCommunity & {
          workspace_id: string;
          is_free: boolean;
          monthly_price_sek: number;
        } = {
          id: Number(row.id),
          name: String(row.name ?? name),
          slug: String(row.slug ?? slug),
          description: String(row.description ?? ''),
          category: String(row.category ?? category),
          cover_color: String(row.cover_color ?? '#2B2568'),
          member_count: Number(row.member_count) || 1,
          is_published: row.is_published !== false,
          handle: `@${String(row.slug || name).replace(/-/g, '')}`,
          avatar_url: (row.avatar_url as string | null) || (row.creator_image as string | null) || null,
          channels: ['instagram', 'tiktok', 'linkedin'],
          workspace_id: workspaceId,
          is_free: Boolean(isFree),
          monthly_price_sek: monthlyPriceSek,
        };

        publishCommunityToPublicCatalog(
          managedToSearchable(community, {
            creatorName: session.user.name,
            creatorImage: session.user.image,
            isJoined: true,
          })
        );

        return Response.json({
          success: true,
          community,
          public_url: `/communities/${community.slug || community.id}`,
          workspace_id: workspaceId,
          demo: false,
        });
      } catch (error) {
        console.error('[create_community] DB insert failed', error);
        const message =
          error instanceof Error ? error.message : 'Failed to create community in database';
        return Response.json(
          {
            error: 'create_failed',
            message,
            hint: 'Community was not published for site users. Fix DB schema/credentials and retry.',
          },
          { status: 500 }
        );
      }
    }

    // Demo mode: acknowledge mutations so the client can update optimistically.
    if (!process.env.DATABASE_URL?.trim()) {
      return Response.json({ success: true, demo: true, action });
    }

    if (action === 'remove_member') {
      const { community_id, user_id } = body;
      if (!community_id || !user_id) {
        return Response.json({ error: 'Missing fields' }, { status: 400 });
      }
      // Never remove the community owner via this endpoint.
      await sql`
        DELETE FROM community_memberships
        WHERE community_id = ${Number(community_id)}
          AND user_id = ${user_id}
          AND role <> 'owner'
      `;
      await sql`
        DELETE FROM moderator_assignments
        WHERE community_id = ${Number(community_id)} AND user_id = ${user_id}
      `;
      await sql`
        UPDATE communities
        SET member_count = GREATEST(COALESCE(member_count, 1) - 1, 0)
        WHERE id = ${Number(community_id)}
      `;
      return Response.json({ success: true });
    }

    if (action === 'set_role') {
      const { community_id, user_id, role } = body;
      if (!community_id || !user_id || !role) {
        return Response.json({ error: 'Missing fields' }, { status: 400 });
      }
      if (!['member', 'moderator'].includes(role)) {
        return Response.json({ error: 'Invalid role' }, { status: 400 });
      }
      await sql`
        UPDATE community_memberships
        SET role = ${role}
        WHERE community_id = ${Number(community_id)}
          AND user_id = ${user_id}
          AND role <> 'owner'
      `;
      if (role === 'moderator') {
        await sql`
          INSERT INTO moderator_assignments (user_id, community_id, assigned_by)
          VALUES (${user_id}, ${Number(community_id)}, ${session.user.id})
          ON CONFLICT (community_id, user_id) DO NOTHING
        `;
      } else {
        await sql`
          DELETE FROM moderator_assignments
          WHERE community_id = ${Number(community_id)} AND user_id = ${user_id}
        `;
      }
      return Response.json({ success: true });
    }

    if (action === 'delete_post') {
      const { post_id } = body;
      if (!post_id) return Response.json({ error: 'post_id required' }, { status: 400 });
      await sql`DELETE FROM likes WHERE post_id = ${Number(post_id)}`;
      await sql`DELETE FROM comments WHERE post_id = ${Number(post_id)}`;
      await sql`DELETE FROM posts WHERE id = ${Number(post_id)}`;
      return Response.json({ success: true });
    }

    if (action === 'pin_post' || action === 'unpin_post') {
      const { post_id } = body;
      if (!post_id) return Response.json({ error: 'post_id required' }, { status: 400 });
      const pinned = action === 'pin_post';

      if (!process.env.DATABASE_URL?.trim()) {
        demoPostPinOverrides.set(Number(post_id), pinned);
        return Response.json({
          success: true,
          id: Number(post_id),
          is_pinned: pinned,
          pinned_at: pinned ? new Date().toISOString() : null,
          demo: true,
        });
      }

      const rows = await sql`
        UPDATE posts
        SET is_pinned = ${pinned},
            pinned_at = ${pinned ? new Date().toISOString() : null},
            updated_at = now()
        WHERE id = ${Number(post_id)}
        RETURNING id, is_pinned, pinned_at
      `;
      if (!rows[0]) {
        return Response.json({ error: 'Post not found' }, { status: 404 });
      }
      return Response.json({ success: true, ...rows[0] });
    }

    if (action === 'delete_comment') {
      const { comment_id } = body;
      if (!comment_id) {
        return Response.json({ error: 'comment_id required' }, { status: 400 });
      }
      await sql`DELETE FROM comments WHERE parent_id = ${Number(comment_id)}`;
      await sql`DELETE FROM comments WHERE id = ${Number(comment_id)}`;
      return Response.json({ success: true });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error(error);
    // Soft-succeed in degraded environments so the UI stays usable.
    if (!process.env.DATABASE_URL?.trim()) {
      return Response.json({ success: true, demo: true });
    }
    return Response.json({ error: 'Failed to update community' }, { status: 500 });
  }
}
