import sql from '@/app/api/utils/sql';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import {
  createManagedCommunity,
  getMockCommunityAdminPayload,
} from '@/lib/mock-community-admin';
import { demoPostPinOverrides } from '@/lib/demo-pin-state';

async function requireSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  return session;
}

export async function GET(request: Request) {
  const session = await requireSession();
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
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
    // Prefer the requested community (workspace-bound) so admin never falls to mock.
    let communities: Record<string, unknown>[] = [];
    if (communityId) {
      const byId = await sql`
        SELECT id, name, slug, description, category, cover_color,
               member_count, COALESCE(is_published, true) AS is_published
        FROM communities
        WHERE id = ${communityId}
        LIMIT 1
      `;
      if (Array.isArray(byId) && byId[0]) {
        communities = byId as Record<string, unknown>[];
      }
    }

    if (communities.length === 0) {
      const owned = await sql`
        SELECT id, name, slug, description, category, cover_color,
               member_count, COALESCE(is_published, true) AS is_published
        FROM communities
        WHERE creator_id = ${session.user.id}
           OR id IN (
             SELECT community_id FROM community_memberships
             WHERE user_id = ${session.user.id} AND role IN ('owner', 'moderator')
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

    const [members, posts, commentRows] = await sql.transaction([
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

    const commentsByPost = new Map<number, typeof commentRows>();
    for (const row of commentRows as Array<{ post_id: number }>) {
      const list = commentsByPost.get(row.post_id) ?? [];
      list.push(row);
      commentsByPost.set(row.post_id, list);
    }

    const postsWithComments = (posts as Array<{ id: number }>).map((p) => ({
      ...p,
      comments: commentsByPost.get(p.id) ?? [],
    }));

    const memberList = members as Array<{ role: string; joined_at: string }>;
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const joinedThisWeek = memberList.filter(
      (m) => new Date(m.joined_at).getTime() >= weekAgo
    ).length;
    const commentTotal = (commentRows as unknown[]).length;
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
      members,
      posts: postsWithComments,
      demo: false,
    });
  } catch (error) {
    console.error(error);
    // Keep UI usable but never pretend seed mock is production data.
    return Response.json({
      communities: [],
      community: null,
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
      error: 'load_failed',
    });
  }
}

export async function POST(request: Request) {
  const session = await requireSession();
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
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

      // Demo / no database — still publish into the public catalog so site users can find it.
      if (!process.env.DATABASE_URL?.trim()) {
        const community = createManagedCommunity({
          name,
          description,
          skipWorkspaceProfile: true,
        });
        return Response.json({
          success: true,
          community,
          public_url: `/communities/${community.id}`,
          demo: true,
        });
      }

      try {
        let rows: Record<string, unknown>[] = [];
        try {
          rows = (await sql`
            INSERT INTO communities (
              name, slug, description, category, creator_id, creator_name,
              creator_image, cover_color, member_count, is_featured, is_published
            ) VALUES (
              ${name},
              ${slug},
              ${description || 'Your creator community.'},
              ${'Community'},
              ${session.user.id},
              ${session.user.name || 'Creator'},
              ${session.user.image ?? null},
              ${'#2B2568'},
              ${1},
              ${false},
              ${true}
            )
            RETURNING id, name, slug, description, category, cover_color,
                      member_count, creator_name, creator_image,
                      COALESCE(is_published, true) AS is_published
          `) as Record<string, unknown>[];
        } catch (fkError) {
          // If creator_id FK fails, still publish the community for site users.
          console.warn('[create_community] retry without creator_id', fkError);
          rows = (await sql`
            INSERT INTO communities (
              name, slug, description, category, creator_name,
              creator_image, cover_color, member_count, is_featured, is_published
            ) VALUES (
              ${name},
              ${slug},
              ${description || 'Your creator community.'},
              ${'Community'},
              ${session.user.name || 'Creator'},
              ${session.user.image ?? null},
              ${'#2B2568'},
              ${1},
              ${false},
              ${true}
            )
            RETURNING id, name, slug, description, category, cover_color,
                      member_count, creator_name, creator_image,
                      COALESCE(is_published, true) AS is_published
          `) as Record<string, unknown>[];
        }

        const row = rows?.[0] as
          | {
              id: number;
              name: string;
              slug: string;
              description: string | null;
              category: string | null;
              cover_color: string | null;
              member_count: number | null;
              creator_name: string | null;
              creator_image: string | null;
              is_published: boolean;
            }
          | undefined;

        if (!row?.id) {
          return Response.json(
            {
              error: 'create_failed',
              message: 'Community insert returned no row. Check DATABASE_URL / schema.',
            },
            { status: 500 }
          );
        }

        try {
          await sql`
            INSERT INTO community_memberships (user_id, community_id, role)
            VALUES (${session.user.id}, ${row.id}, 'owner')
            ON CONFLICT (user_id, community_id) DO UPDATE SET role = 'owner'
          `;
        } catch (membershipError) {
          console.warn('[create_community] owner membership failed', membershipError);
        }

        const community = {
          id: Number(row.id),
          name: row.name,
          slug: row.slug,
          description: row.description || '',
          category: row.category || 'Community',
          cover_color: row.cover_color || '#2B2568',
          member_count: Number(row.member_count) || 1,
          is_published: Boolean(row.is_published),
          handle: `@${String(row.slug || name).replace(/-/g, '')}`,
          avatar_url: row.creator_image || null,
          channels: ['instagram', 'tiktok', 'linkedin'],
        };

        return Response.json({
          success: true,
          community,
          public_url: `/communities/${community.id}`,
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
