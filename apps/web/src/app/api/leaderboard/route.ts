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

    // Seed community members as static leaderboard entries (ensures leaderboard is never empty)
    const seedMembers = [
      {
        id: 'seed-3',
        name: 'Astrid Karlsson',
        image: null,
        joined_at: '2026-01-15',
        post_count: 24,
        likes_received: 187,
        comment_count: 63,
      },
      {
        id: 'seed-1',
        name: 'Emma Lindqvist',
        image: null,
        joined_at: '2026-01-20',
        post_count: 18,
        likes_received: 142,
        comment_count: 54,
      },
      {
        id: 'seed-2',
        name: 'Marcus Björk',
        image: null,
        joined_at: '2026-02-03',
        post_count: 15,
        likes_received: 98,
        comment_count: 41,
      },
      {
        id: 'seed-4',
        name: 'Erik Svensson',
        image: null,
        joined_at: '2026-02-14',
        post_count: 11,
        likes_received: 76,
        comment_count: 29,
      },
      {
        id: 'seed-5',
        name: 'Linn Petersson',
        image: null,
        joined_at: '2026-03-01',
        post_count: 8,
        likes_received: 54,
        comment_count: 22,
      },
      {
        id: 'seed-6',
        name: 'Johan Holm',
        image: null,
        joined_at: '2026-03-10',
        post_count: 6,
        likes_received: 39,
        comment_count: 17,
      },
      {
        id: 'seed-7',
        name: 'Sara Magnusson',
        image: null,
        joined_at: '2026-04-01',
        post_count: 4,
        likes_received: 21,
        comment_count: 9,
      },
    ];

    // Merge real + seed, dedup by id, compute points
    const allIds = new Set(realMembers.map((m: any) => m.id));
    const merged = [...realMembers, ...seedMembers.filter((s) => !allIds.has(s.id))]
      .map((m: any) => ({
        ...m,
        points: m.post_count * 10 + m.likes_received * 5 + m.comment_count * 3,
      }))
      .sort((a: any, b: any) => b.points - a.points);

    return Response.json(merged);
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
  }
}
