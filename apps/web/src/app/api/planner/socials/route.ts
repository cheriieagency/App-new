import {
  listSocialAccounts,
  setSocialConnection,
  type SocialPlatform,
} from '@/lib/mock-content-planner';

export async function GET() {
  return Response.json({ accounts: listSocialAccounts(), demo: true });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const platform = body.platform as SocialPlatform;
    const connect = Boolean(body.connect);
    if (!platform) {
      return Response.json({ error: 'platform required' }, { status: 400 });
    }
    // Demo OAuth: instantly toggles connection state.
    const account = setSocialConnection(platform, connect);
    return Response.json({ account, accounts: listSocialAccounts() });
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Failed' }, { status: 500 });
  }
}
