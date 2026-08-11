import {
  buildCommunityAccessEmail,
} from '@/lib/community-access-email';
import { listManagedCommunities } from '@/lib/mock-community-admin';
import { sendCommunityAccessInvite } from '@/lib/mock-email-crm';
import { getSiteUrl } from '@/lib/site';

/**
 * Public post-purchase hook: email the buyer a direct link into the community
 * they unlocked with their purchase.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const buyerEmail = String(body.email ?? '')
      .trim()
      .toLowerCase();
    const buyerName = String(body.name ?? '').trim() || buyerEmail.split('@')[0] || 'Buyer';
    const productTitle = String(body.product_title ?? 'Your purchase').trim();
    const communityId = Number(body.community_id);

    if (!buyerEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(buyerEmail)) {
      return Response.json({ error: 'Valid email required' }, { status: 400 });
    }
    if (!Number.isFinite(communityId) || communityId <= 0) {
      return Response.json({ error: 'community_id required' }, { status: 400 });
    }

    const community =
      listManagedCommunities().find((c) => c.id === communityId) ?? null;
    const communityName =
      String(body.community_name ?? '').trim() ||
      community?.name ||
      `Community ${communityId}`;

    const origin =
      String(body.origin ?? '').trim() ||
      request.headers.get('origin') ||
      getSiteUrl();

    const result = sendCommunityAccessInvite({
      buyerName,
      buyerEmail,
      productTitle,
      communityId,
      communityName,
      origin,
    });

    // Also return composed content for clients that want to show a preview.
    const composed = buildCommunityAccessEmail({
      buyerName,
      buyerEmail,
      productTitle,
      communityId,
      communityName,
      origin,
    });

    return Response.json({
      success: true,
      demo: true,
      community_url: result.communityUrl,
      community_name: communityName,
      email: {
        to: buyerEmail,
        subject: composed.subject,
        preview: result.preview,
      },
      broadcast_id: result.broadcast.id,
    });
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Failed to send community access email' }, { status: 500 });
  }
}
