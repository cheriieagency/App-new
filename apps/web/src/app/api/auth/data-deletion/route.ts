import { NextResponse } from 'next/server';

/**
 * Meta / TikTok / Google App Review data-deletion callback.
 * Accepts disconnect notifications and returns a confirmation receipt.
 *
 * Public URL: https://clikd.app/api/auth/data-deletion
 */
export async function POST(request: Request) {
  let payload: Record<string, unknown> = {};
  try {
    payload = await request.json();
  } catch {
    payload = {};
  }

  const platform = String(payload.platform ?? 'unknown');
  const handle = String(payload.handle ?? '');
  const confirmationCode = `clikd-del-${Date.now().toString(36)}`;

  console.info('[data-deletion]', {
    platform,
    handle,
    confirmationCode,
    at: new Date().toISOString(),
  });

  return NextResponse.json({
    url: 'https://clikd.app/api/auth/data-deletion',
    confirmation_code: confirmationCode,
    status: 'success',
    platform,
    handle: handle || null,
  });
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    endpoint: 'https://clikd.app/api/auth/data-deletion',
    methods: ['POST'],
    description:
      'User data deletion callback for Meta, TikTok, YouTube and LinkedIn OAuth disconnects.',
  });
}
