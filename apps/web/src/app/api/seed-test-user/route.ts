import { auth } from '@/lib/auth';
import sql from '@/app/api/utils/sql';

export async function GET() {
  try {
    // Remove existing test account so we can recreate with the correct password
    await sql`DELETE FROM "user" WHERE email = 'test@test.se'`;

    const result = await auth.api.signUpEmail({
      body: {
        email: 'test@test.se',
        password: '1234abcd',
        name: 'Test User',
      },
    });
    return Response.json({ success: true, user: result?.user ?? null });
  } catch (error: any) {
    return Response.json({ success: false, message: error?.message ?? 'Unknown error' });
  }
}
