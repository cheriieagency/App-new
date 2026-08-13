/**
 * Demo seed endpoint — disabled in production cleanup.
 * Real communities/products are created via Admin UI only.
 */

export async function GET() {
  return Response.json(
    {
      success: false,
      error: 'seed_disabled',
      message:
        'Demo seeding is disabled. Create communities and products from Admin instead.',
    },
    { status: 410 }
  );
}

export async function POST() {
  return GET();
}
