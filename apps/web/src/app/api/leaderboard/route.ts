import sql from '@/app/api/utils/sql';

export async function GET() {
  try {
    // Real members from users table joined with their activity
    const realMembers = await sql`
      SELECT
        u.id,
        u.name,
        u.image,
        u."createdAt" AS joined_at,
        COALESCE(p.post_count,  0)::int AS post_count,
        COALESCE(l.like_count,  0)::int AS likes_received,
        COALESCE(c.reply_count, 0)::int AS comment_count
      FROM "user" u
      LEFT JOIN (
        SELECT user_id, COUNT(*)::int AS post_count FROM posts GROUP BY user_id
      ) p ON p.user_id = u.id
      LEFT JOIN (
        SELECT p2.user_id, COUNT(l.post_id)::int AS like_count
        FROM likes l JOIN posts p2 ON l.post_id = p2.id
        GROUP BY p2.user_id
      ) l ON l.user_id = u.id
      LEFT JOIN (
        SELECT user_id, COUNT(*)::int AS reply_count FROM comments GROUP BY user_id
      ) c ON c.user_id = u.id
      ORDER BY (COALESCE(p.post_count,0)*10 + COALESCE(l.like_count,0)*5 + COALESCE(c.reply_count,0)*3) DESC
      LIMIT 20
    `;

    // Real members only — no seeded leaderboard rows.
    const merged = (realMembers as Array<Record<string, unknown>>)
      .map((m) => ({
        ...m,
        points:
          Number(m.post_count || 0) * 10 +
          Number(m.likes_received || 0) * 5 +
          Number(m.comment_count || 0) * 3,
      }))
      .sort((a, b) => Number(b.points) - Number(a.points));

    return Response.json(merged);
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
  }
}
