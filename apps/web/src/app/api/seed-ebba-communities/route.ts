import { auth } from '@/lib/auth';
import sql from '@/app/api/utils/sql';
import {
  EBBA_MEMBER_COMMUNITY_SLUGS,
  EBBA_TEST_USER,
  getMockCommunitiesForUser,
} from '@/lib/mock-communities';
import {
  MOCK_COURSES,
  MOCK_EVENTS,
  MOCK_POSTS,
  MOCK_PRODUCTS,
} from '@/lib/mock-demo-content';

function contentSummary() {
  return {
    posts: MOCK_POSTS.length,
    courses: MOCK_COURSES.length,
    lessons: MOCK_COURSES.reduce((n, c) => n + c.lessons.length, 0),
    events: MOCK_EVENTS.length,
    products: MOCK_PRODUCTS.length,
  };
}

async function seedDemoContent(userId: string) {
  // Posts
  for (const p of MOCK_POSTS) {
    const exists = await sql`SELECT id FROM posts WHERE id = ${p.id} LIMIT 1`;
    if (exists.length > 0) continue;
    await sql`
      INSERT INTO posts (id, user_id, user_name, user_image, content, tag, image_url, created_at)
      VALUES (
        ${p.id},
        ${p.user_id === 'ebba-demo' ? userId : p.user_id},
        ${p.user_name},
        ${p.user_image},
        ${p.content},
        ${p.tag},
        ${p.image_url},
        ${p.created_at}
      )
      ON CONFLICT (id) DO NOTHING
    `;
  }

  // Courses + lessons
  for (const course of MOCK_COURSES) {
    const cExists = await sql`SELECT id FROM courses WHERE id = ${course.id} LIMIT 1`;
    if (cExists.length === 0) {
      await sql`
        INSERT INTO courses (id, title, description, is_published, sort_order, creator_id)
        VALUES (
          ${course.id}, ${course.title}, ${course.description}, true, ${course.sort_order}, ${userId}
        )
        ON CONFLICT (id) DO NOTHING
      `;
    }
    for (const lesson of course.lessons) {
      const lExists = await sql`SELECT id FROM lessons WHERE id = ${lesson.id} LIMIT 1`;
      if (lExists.length > 0) continue;
      await sql`
        INSERT INTO lessons (id, course_id, title, description, video_url, "order", duration_sec, is_published)
        VALUES (
          ${lesson.id}, ${lesson.course_id}, ${lesson.title}, ${lesson.description},
          ${lesson.video_url}, ${lesson.order}, ${lesson.duration_sec}, true
        )
        ON CONFLICT (id) DO NOTHING
      `;
    }
  }

  // Events
  for (const ev of MOCK_EVENTS) {
    const eExists = await sql`SELECT id FROM events WHERE id = ${ev.id} LIMIT 1`;
    if (eExists.length > 0) continue;
    await sql`
      INSERT INTO events (
        id, title, description, start_time, end_time, stream_url, image_url,
        cover_color, speaker_name, speaker_bio, category, creator_id, is_published
      ) VALUES (
        ${ev.id}, ${ev.title}, ${ev.description}, ${ev.start_time}, ${ev.end_time},
        ${ev.stream_url}, ${ev.image_url}, ${ev.cover_color}, ${ev.speaker_name},
        ${ev.speaker_bio}, ${ev.category}, ${userId}, true
      )
      ON CONFLICT (id) DO NOTHING
    `;
  }

  // Products
  for (const prod of MOCK_PRODUCTS) {
    const pExists = await sql`SELECT id FROM products WHERE id = ${prod.id} LIMIT 1`;
    if (pExists.length > 0) continue;
    await sql`
      INSERT INTO products (
        id, name, description, price, currency, type, kind, image_url,
        community_id, creator_id, is_published
      )
      VALUES (
        ${prod.id}, ${prod.name}, ${prod.description}, ${prod.price}, ${prod.currency},
        ${prod.type}, ${(prod as { kind?: string }).kind ?? 'product'},
        ${(prod as { image_url?: string | null }).image_url ?? null},
        ${(prod as { community_id?: number | null }).community_id ?? null},
        ${userId}, true
      )
      ON CONFLICT (id) DO NOTHING
    `;
  }
}

const TEST_COMMUNITIES = [
  {
    slug: EBBA_MEMBER_COMMUNITY_SLUGS[0],
    name: 'Ebba Creator Lab',
    description:
      'Testcommunity #1 för Ebba — feed, kurser, events och medlemsfunktioner.',
    category: 'Marknadsföring',
    cover_color: '#0f766e',
    member_count: 48,
    is_featured: true,
  },
  {
    slug: EBBA_MEMBER_COMMUNITY_SLUGS[1],
    name: 'Ebba Live Studio',
    description:
      'Testcommunity #2 för Ebba — live-webbinarier, RSVP och realtidschatt.',
    category: 'Coaching',
    cover_color: '#0369a1',
    member_count: 32,
    is_featured: false,
  },
] as const;

/**
 * Seeds user ebbabrobeck@test.se + 2 communities + memberships.
 * Works with DATABASE_URL. Without DB, returns demo mock memberships.
 */
export async function GET() {
  const hasDb = Boolean(process.env.DATABASE_URL?.trim());

  if (!hasDb) {
    return Response.json({
      success: true,
      mode: 'demo-mock',
      message:
        'Demo-läge: 2 communities + posts, kurser, events och produkter är redo via mock-API. Logga in som ebbabrobeck@test.se.',
      user: {
        email: EBBA_TEST_USER.email,
        password: EBBA_TEST_USER.password,
        name: EBBA_TEST_USER.name,
      },
      communities: getMockCommunitiesForUser({ forceJoined: true }).filter((c) =>
        EBBA_MEMBER_COMMUNITY_SLUGS.includes(
          c.slug as (typeof EBBA_MEMBER_COMMUNITY_SLUGS)[number]
        )
      ),
      content: contentSummary(),
    });
  }

  try {
    // 1) Ensure test user exists
    let userId: string | null = null;
    const existing = await sql`
      SELECT id, email, name FROM "user" WHERE email = ${EBBA_TEST_USER.email} LIMIT 1
    `;

    if (existing.length > 0) {
      userId = String(existing[0].id);
    } else {
      try {
        const signedUp = await auth.api.signUpEmail({
          body: {
            email: EBBA_TEST_USER.email,
            password: EBBA_TEST_USER.password,
            name: EBBA_TEST_USER.name,
          },
        });
        userId = signedUp?.user?.id ?? null;
      } catch {
        // Race / already exists — re-read
        const again = await sql`
          SELECT id FROM "user" WHERE email = ${EBBA_TEST_USER.email} LIMIT 1
        `;
        userId = again[0] ? String(again[0].id) : null;
      }
    }

    if (!userId) {
      return Response.json(
        { success: false, message: 'Kunde inte skapa/hitta användaren ebbabrobeck' },
        { status: 500 }
      );
    }

    // Ensure profile row (schema trigger may already do this)
    await sql`
      INSERT INTO profiles (id, display_name, handle, role)
      VALUES (${userId}, ${EBBA_TEST_USER.name}, 'ebbabrobeck', 'member')
      ON CONFLICT (id) DO UPDATE
        SET display_name = EXCLUDED.display_name,
            handle = COALESCE(profiles.handle, EXCLUDED.handle)
    `;

    const seeded: Array<{ id: number; slug: string; name: string }> = [];

    for (const c of TEST_COMMUNITIES) {
      const found = await sql`
        SELECT id, slug, name FROM communities WHERE slug = ${c.slug} LIMIT 1
      `;

      let communityId: number;
      if (found.length > 0) {
        communityId = Number(found[0].id);
        await sql`
          UPDATE communities SET
            name = ${c.name},
            description = ${c.description},
            category = ${c.category},
            creator_id = ${userId},
            creator_name = ${EBBA_TEST_USER.name},
            cover_color = ${c.cover_color},
            is_featured = ${c.is_featured},
            is_published = true
          WHERE id = ${communityId}
        `;
      } else {
        const inserted = await sql`
          INSERT INTO communities (
            name, slug, description, category, creator_id, creator_name,
            cover_color, member_count, is_featured, is_published
          ) VALUES (
            ${c.name}, ${c.slug}, ${c.description}, ${c.category}, ${userId},
            ${EBBA_TEST_USER.name}, ${c.cover_color}, ${c.member_count},
            ${c.is_featured}, true
          )
          RETURNING id, slug, name
        `;
        communityId = Number(inserted[0].id);
      }

      await sql`
        INSERT INTO community_memberships (user_id, community_id, role)
        VALUES (${userId}, ${communityId}, 'member')
        ON CONFLICT (user_id, community_id) DO NOTHING
      `;

      seeded.push({
        id: communityId,
        slug: c.slug,
        name: c.name,
      });
    }

    // Posts, courses/lessons, events, products
    await seedDemoContent(userId);

    return Response.json({
      success: true,
      mode: 'database',
      message:
        'Skapade/uppdaterade 2 testcommunities, medlemskap, posts, kurser, events och produkter.',
      user: {
        id: userId,
        email: EBBA_TEST_USER.email,
        password: EBBA_TEST_USER.password,
        name: EBBA_TEST_USER.name,
      },
      communities: seeded,
      content: contentSummary(),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('seed-ebba-communities', error);
    return Response.json({ success: false, message }, { status: 500 });
  }
}
