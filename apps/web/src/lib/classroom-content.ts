/** Skool-style classroom courses with modules, rich lesson content, and covers. */

export type ClassroomResource = {
  label: string;
  url: string;
  icon?: string;
};

export type ContentBlock =
  | { type: 'heading'; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'bullets'; items: string[] }
  | { type: 'callout'; text: string; tone?: 'quote' | 'tip' | 'warn' }
  | { type: 'image'; url: string; alt?: string };

export type ClassroomLesson = {
  id: number;
  course_id: number;
  module_id: string;
  title: string;
  description?: string | null;
  video_url?: string | null;
  pdf_url?: string | null;
  banner_url?: string | null;
  order: number;
  duration_sec?: number | null;
  content_blocks?: ContentBlock[];
  resources?: ClassroomResource[];
};

export type ClassroomModule = {
  id: string;
  title: string;
  emoji: string;
  order: number;
  lessons: ClassroomLesson[];
};

export type ClassroomCourse = {
  id: number;
  title: string;
  description: string;
  category?: string;
  community_id?: number | null;
  cover_image: string | null;
  video_url?: string | null;
  pdf_url?: string | null;
  is_published: boolean;
  sort_order: number;
  modules: ClassroomModule[];
  /** Flat list for APIs/dashboard that still expect lessons[] */
  lessons: ClassroomLesson[];
};

/** Demo community → course ownership for dashboard filtering. */
export const COURSE_COMMUNITY_MAP: Record<number, number> = {
  701: 101, // Start Here → Ebba Creator Lab
  702: 101, // Quote Page Lab
  703: 101, // Digital Product Starter
  501: 101, // Creator Bootcamp
  704: 102, // Viral Reels → Ebba Live Studio
  502: 102, // Live Studio Mastery
};

const covers = {
  start:
    'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1200&q=80',
  quotes:
    'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=1200&q=80',
  product:
    'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&q=80',
  reels:
    'https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=1200&q=80',
  bootcamp:
    'https://images.unsplash.com/photo-1552664730-d307ca884978?w=1200&q=80',
  live:
    'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=1200&q=80',
};

function flattenLessons(modules: ClassroomModule[]): ClassroomLesson[] {
  return modules
    .slice()
    .sort((a, b) => a.order - b.order)
    .flatMap((m) => m.lessons.slice().sort((a, b) => a.order - b.order));
}

function withFlat(course: Omit<ClassroomCourse, 'lessons'>): ClassroomCourse {
  const lessons = flattenLessons(course.modules);
  const community_id =
    course.community_id ?? COURSE_COMMUNITY_MAP[course.id] ?? null;
  return { ...course, community_id, lessons };
}

/** Filter courses for a dashboard community (by id or slug). */
export function filterCoursesForCommunity(
  courses: ClassroomCourse[],
  opts?: { communityId?: number | null; slug?: string | null }
): ClassroomCourse[] {
  const id = opts?.communityId != null ? Number(opts.communityId) : null;
  const slug = (opts?.slug ?? '').toLowerCase();

  // Platform hub sees the full classroom catalog.
  if (slug === 'nordic-creator' || id === 1) {
    return courses;
  }

  if (id == null && !slug) return courses;

  const filtered = courses.filter((c) => {
    const cid = c.community_id ?? COURSE_COMMUNITY_MAP[c.id] ?? null;
    if (id != null && cid === id) return true;
    // Slug fallbacks for demo communities.
    if (slug === 'ebba-creator-lab' && (cid === 101 || [701, 702, 703, 501].includes(c.id)))
      return true;
    if (slug === 'ebba-live-studio' && (cid === 102 || [704, 502].includes(c.id)))
      return true;
    return false;
  });

  // Never leave a community classroom empty in demo — show Start Here + matching set.
  if (!filtered.length) {
    return courses.filter((c) => [701, 703].includes(c.id));
  }
  return filtered;
}

export const SKOOL_CLASSROOM_COURSES: ClassroomCourse[] = [
  withFlat({
    id: 701,
    title: 'Start Here',
    description: 'Welcome path — setup, community rules, and your first win in 24 hours.',
    category: 'Onboarding',
    community_id: 101,
    cover_image: covers.start,
    is_published: true,
    sort_order: 1,
    modules: [
      {
        id: '701-welcome',
        title: 'Welcome',
        emoji: '👋',
        order: 1,
        lessons: [
          {
            id: 7101,
            course_id: 701,
            module_id: '701-welcome',
            title: 'How this classroom works',
            description: 'Orientation for new members.',
            banner_url: covers.start,
            order: 1,
            duration_sec: 420,
            video_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
            content_blocks: [
              {
                type: 'heading',
                text: 'You’re in the right place',
              },
              {
                type: 'paragraph',
                text: 'This classroom is built like Skool: pick a course, move through modules, and mark lessons done as you go.',
              },
              {
                type: 'callout',
                tone: 'tip',
                text: 'Tip: finish Start Here before diving into the other courses — it unlocks the workflow everyone else uses.',
              },
              {
                type: 'bullets',
                items: [
                  'Open a course card from Classroom',
                  'Work left → right through modules',
                  'Hit Mark as complete when you’re done',
                ],
              },
            ],
            resources: [
              {
                label: 'Community guidelines PDF',
                url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
                icon: '📄',
              },
            ],
          },
          {
            id: 7102,
            course_id: 701,
            module_id: '701-welcome',
            title: 'Introduce yourself',
            order: 2,
            duration_sec: 300,
            content_blocks: [
              {
                type: 'paragraph',
                text: 'Drop a short intro in the feed: your niche, where you create from, and what you’re building this month.',
              },
              {
                type: 'callout',
                tone: 'quote',
                text: 'Clarity compounds. One sentence about who you help beats a long bio every time.',
              },
            ],
          },
        ],
      },
      {
        id: '701-setup',
        title: 'Quick setup',
        emoji: '⚡',
        order: 2,
        lessons: [
          {
            id: 7103,
            course_id: 701,
            module_id: '701-setup',
            title: 'Your first 24-hour win',
            order: 1,
            duration_sec: 600,
            video_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
            content_blocks: [
              {
                type: 'heading',
                text: 'Ship something tiny today',
              },
              {
                type: 'bullets',
                items: [
                  'Pick one offer idea',
                  'Write a 3-line sales note',
                  'Post it in the Wins channel',
                ],
              },
            ],
          },
        ],
      },
    ],
  }),
  withFlat({
    id: 702,
    title: 'Quote Page Lab',
    description: 'Build quote pages that convert — prompts, bots, and done-for-you packs.',
    category: 'Content',
    community_id: 101,
    cover_image: covers.quotes,
    is_published: true,
    sort_order: 2,
    modules: [
      {
        id: '702-prompts',
        title: 'Prompts',
        emoji: '🧠',
        order: 1,
        lessons: [
          {
            id: 7201,
            course_id: 702,
            module_id: '702-prompts',
            title: 'Therapy-in-a-text prompts',
            banner_url: covers.quotes,
            order: 1,
            duration_sec: 720,
            video_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
            content_blocks: [
              {
                type: 'heading',
                text: 'Prompts that feel human',
              },
              {
                type: 'paragraph',
                text: 'Great quote pages don’t sound like a generator. They sound like something you’d screenshot at 1am.',
              },
              {
                type: 'callout',
                tone: 'quote',
                text: 'Use these to get quotes that hit like therapy in a text.',
              },
              {
                type: 'bullets',
                items: [
                  'Start with a feeling, not a keyword',
                  'Keep lines under 14 words',
                  'End with a soft CTA (save / share / join)',
                ],
              },
            ],
            resources: [
              {
                label: '🔗 Access DFY Quotes',
                url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
                icon: '🔗',
              },
            ],
          },
          {
            id: 7202,
            course_id: 702,
            module_id: '702-prompts',
            title: 'Niche prompt stacks',
            order: 2,
            duration_sec: 540,
            content_blocks: [
              {
                type: 'paragraph',
                text: 'Stack 5 prompts per niche: healing, ambition, soft life, business, and late-night thoughts.',
              },
            ],
          },
        ],
      },
      {
        id: '702-bot',
        title: 'Quote Babe Bot',
        emoji: '🤖',
        order: 2,
        lessons: [
          {
            id: 7203,
            course_id: 702,
            module_id: '702-bot',
            title: 'Train your quote bot',
            order: 1,
            duration_sec: 780,
            video_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
            content_blocks: [
              {
                type: 'heading',
                text: 'Custom instructions that stick',
              },
              {
                type: 'callout',
                tone: 'tip',
                text: 'Paste your brand voice once — then batch 30 quotes in one sitting.',
              },
            ],
            resources: [
              {
                label: 'Bot instruction template',
                url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
                icon: '📄',
              },
            ],
          },
        ],
      },
      {
        id: '702-dfy',
        title: 'Done-For-You Quotes',
        emoji: '✨',
        order: 3,
        lessons: [
          {
            id: 7204,
            course_id: 702,
            module_id: '702-dfy',
            title: 'DFY pack walkthrough',
            order: 1,
            duration_sec: 480,
            pdf_url:
              'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
            content_blocks: [
              {
                type: 'paragraph',
                text: 'Download the pack, drop quotes into CapCut or Canva, and publish three posts this week.',
              },
              {
                type: 'image',
                url: covers.quotes,
                alt: 'Quote page example',
              },
            ],
            resources: [
              {
                label: '🔗 Access DFY Quotes',
                url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
                icon: '🔗',
              },
            ],
          },
        ],
      },
    ],
  }),
  withFlat({
    id: 703,
    title: 'Digital Product Starter Course',
    description: 'From idea to Swish checkout — price, package, and launch a simple digital offer.',
    category: 'Produkt',
    community_id: 101,
    cover_image: covers.product,
    is_published: true,
    sort_order: 3,
    modules: [
      {
        id: '703-idea',
        title: 'Offer foundations',
        emoji: '💡',
        order: 1,
        lessons: [
          {
            id: 7301,
            course_id: 703,
            module_id: '703-idea',
            title: 'Pick a product people already want',
            banner_url: covers.product,
            order: 1,
            video_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
            content_blocks: [
              {
                type: 'heading',
                text: 'Don’t invent demand',
              },
              {
                type: 'paragraph',
                text: 'Look at DMs, comments, and what people already pay for in your niche.',
              },
              {
                type: 'callout',
                tone: 'quote',
                text: 'Your first product should feel obvious — almost boring — to your audience.',
              },
            ],
          },
          {
            id: 7302,
            course_id: 703,
            module_id: '703-idea',
            title: 'Name + price in 20 minutes',
            order: 2,
            content_blocks: [
              {
                type: 'bullets',
                items: ['Outcome-first title', 'One clear deliverable', 'Price between 199–499 SEK'],
              },
            ],
          },
        ],
      },
      {
        id: '703-launch',
        title: 'Launch',
        emoji: '🚀',
        order: 2,
        lessons: [
          {
            id: 7303,
            course_id: 703,
            module_id: '703-launch',
            title: 'Swish checkout setup',
            order: 1,
            video_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
            content_blocks: [
              {
                type: 'paragraph',
                text: 'Wire a simple checkout, test with a friend, then post your launch note.',
              },
            ],
            resources: [
              {
                label: 'Checkout checklist PDF',
                url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
                icon: '📄',
              },
            ],
          },
        ],
      },
    ],
  }),
  withFlat({
    id: 704,
    title: 'Viral Reels Mastery',
    description: 'Hooks, CapCut templates, and a weekly posting system that compounds.',
    category: 'Content',
    community_id: 102,
    cover_image: covers.reels,
    is_published: true,
    sort_order: 4,
    modules: [
      {
        id: '704-hooks',
        title: 'Hooks that stop the scroll',
        emoji: '🎣',
        order: 1,
        lessons: [
          {
            id: 7401,
            course_id: 704,
            module_id: '704-hooks',
            title: 'The 3-second open',
            banner_url: covers.reels,
            order: 1,
            video_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
            content_blocks: [
              {
                type: 'heading',
                text: 'Open with tension',
              },
              {
                type: 'callout',
                tone: 'quote',
                text: 'If the first line could belong to anyone, rewrite it until it could only be you.',
              },
              {
                type: 'bullets',
                items: ['Pattern interrupt', 'Specific promise', 'Visual motion in frame 1'],
              },
            ],
          },
        ],
      },
      {
        id: '704-system',
        title: 'Weekly system',
        emoji: '📅',
        order: 2,
        lessons: [
          {
            id: 7402,
            course_id: 704,
            module_id: '704-system',
            title: 'Batch 7 Reels in one sitting',
            order: 1,
            content_blocks: [
              {
                type: 'paragraph',
                text: 'Script → film → CapCut → schedule. Protect one deep-work block each week.',
              },
            ],
            resources: [
              {
                label: 'CapCut template pack',
                url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
                icon: '🎬',
              },
            ],
          },
          {
            id: 7403,
            course_id: 704,
            module_id: '704-system',
            title: 'Analyze & iterate',
            order: 2,
            content_blocks: [
              {
                type: 'paragraph',
                text: 'Track saves and shares — not vanity views — and double down on what resonates.',
              },
            ],
          },
        ],
      },
    ],
  }),
  // Keep legacy demo courses so admin/seed content still shows in classroom.
  withFlat({
    id: 501,
    title: 'Creator Bootcamp — Från idé till första krona',
    description: '6 lektioner: nisch, erbjudande, Swish-checkout och launch.',
    category: 'Marknadsföring',
    community_id: 101,
    cover_image: covers.bootcamp,
    is_published: true,
    sort_order: 5,
    modules: [
      {
        id: '501-core',
        title: 'Bootcamp modules',
        emoji: '🎓',
        order: 1,
        lessons: [
          {
            id: 601,
            course_id: 501,
            module_id: '501-core',
            title: 'Hitta din nisch på 48 timmar',
            description: 'Positionering och målgrupp för nordiska kreatörer.',
            video_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
            order: 1,
            duration_sec: 720,
            content_blocks: [
              {
                type: 'paragraph',
                text: 'Positionering och målgrupp för nordiska kreatörer.',
              },
            ],
          },
          {
            id: 602,
            course_id: 501,
            module_id: '501-core',
            title: 'Bygg ditt erbjudande',
            description: 'Prispaket, order bumps och 1-click upsells.',
            video_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
            order: 2,
            duration_sec: 840,
            content_blocks: [
              {
                type: 'paragraph',
                text: 'Prispaket, order bumps och 1-click upsells.',
              },
            ],
          },
          {
            id: 603,
            course_id: 501,
            module_id: '501-core',
            title: 'Swish-checkout på 10 sekunder',
            video_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
            order: 3,
            duration_sec: 600,
            content_blocks: [
              {
                type: 'paragraph',
                text: 'Sätt upp betalning utan Stripe-krångel.',
              },
            ],
          },
          {
            id: 604,
            course_id: 501,
            module_id: '501-core',
            title: 'Launch-plan & contentkalender',
            video_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
            order: 4,
            duration_sec: 900,
            content_blocks: [
              {
                type: 'paragraph',
                text: '7-dagars plan för att fylla communityt.',
              },
            ],
          },
        ],
      },
    ],
  }),
  withFlat({
    id: 502,
    title: 'Live Studio Mastery',
    description: 'Hur du kör engagerande lives, OSA och replay-funnels.',
    category: 'Live & Events',
    community_id: 102,
    cover_image: covers.live,
    is_published: true,
    sort_order: 6,
    modules: [
      {
        id: '502-live',
        title: 'Live sessions',
        emoji: '📡',
        order: 1,
        lessons: [
          {
            id: 611,
            course_id: 502,
            module_id: '502-live',
            title: 'Förbered din live på 30 min',
            video_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
            order: 1,
            duration_sec: 540,
            content_blocks: [
              { type: 'paragraph', text: 'Manus, tech-check och CTA.' },
            ],
          },
          {
            id: 612,
            course_id: 502,
            module_id: '502-live',
            title: 'Håll chatten het',
            video_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
            order: 2,
            duration_sec: 660,
            content_blocks: [
              { type: 'paragraph', text: 'Engagemangs-hack under sändning.' },
            ],
          },
          {
            id: 613,
            course_id: 502,
            module_id: '502-live',
            title: 'Efter live: replay & upsell',
            video_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
            order: 3,
            duration_sec: 780,
            content_blocks: [
              { type: 'paragraph', text: 'Konvertera tittare till medlemmar.' },
            ],
          },
        ],
      },
    ],
  }),
];

/** Normalize API/DB courses (flat lessons) into modular classroom courses. */
export function normalizeClassroomCourses(raw: unknown): ClassroomCourse[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return SKOOL_CLASSROOM_COURSES;
  }

  const skoolById = new Map(SKOOL_CLASSROOM_COURSES.map((c) => [c.id, c]));

  return raw.map((item, index) => {
    const c = item as Record<string, unknown>;
    const id = Number(c.id ?? index + 1);
    const rich = skoolById.get(id);
    if (rich) {
      return {
        ...rich,
        cover_image: (c.cover_image as string) || rich.cover_image,
        description: String(c.description ?? rich.description),
        title: String(c.title ?? rich.title),
      };
    }

    const lessonsRaw = Array.isArray(c.lessons) ? c.lessons : [];
    const lessons: ClassroomLesson[] = lessonsRaw.map((l, i) => {
      const lesson = l as Record<string, unknown>;
      return {
        id: Number(lesson.id ?? i + 1),
        course_id: id,
        module_id: `${id}-main`,
        title: String(lesson.title ?? `Lesson ${i + 1}`),
        description: (lesson.description as string) ?? null,
        video_url: (lesson.video_url as string) ?? null,
        pdf_url: (lesson.pdf_url as string) ?? null,
        banner_url: null,
        order: Number(lesson.order ?? i + 1),
        duration_sec: (lesson.duration_sec as number) ?? null,
        content_blocks: lesson.description
          ? [{ type: 'paragraph' as const, text: String(lesson.description) }]
          : [{ type: 'paragraph' as const, text: 'Open this lesson to continue.' }],
        resources: lesson.pdf_url
          ? [
              {
                label: 'Lesson PDF',
                url: String(lesson.pdf_url),
                icon: '📄',
              },
            ]
          : [],
      };
    });

    const modules: ClassroomModule[] = [
      {
        id: `${id}-main`,
        title: 'Lessons',
        emoji: '📚',
        order: 1,
        lessons,
      },
    ];

    return {
      id,
      title: String(c.title ?? 'Course'),
      description: String(c.description ?? ''),
      category: (c.category as string) || 'Allmänt',
      community_id:
        c.community_id != null
          ? Number(c.community_id)
          : (COURSE_COMMUNITY_MAP[id] ?? null),
      cover_image: (c.cover_image as string) || covers.bootcamp,
      video_url: (c.video_url as string) ?? null,
      pdf_url: (c.pdf_url as string) ?? null,
      is_published: c.is_published !== false,
      sort_order: Number(c.sort_order ?? index + 1),
      modules,
      lessons,
    };
  });
}

export function courseProgressPct(
  course: ClassroomCourse,
  completed: Set<number>
): number {
  const total = course.lessons?.length ?? 0;
  if (!total) return 0;
  const done = course.lessons.filter((l) => completed.has(l.id)).length;
  return Math.round((done / total) * 100);
}
