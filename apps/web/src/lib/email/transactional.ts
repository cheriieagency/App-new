/**
 * Transactional email helpers — order receipts + community welcome.
 */

import * as React from 'react';
import { sendEmail, type SendEmailResult } from '@/lib/email/send';
import { buildUnsubscribeUrl } from '@/lib/email/unsubscribe';
import { OrderReceiptEmail } from '@/lib/email/templates/OrderReceiptEmail';
import { CommunityWelcomeEmail } from '@/lib/email/templates/CommunityWelcomeEmail';
import { buildCommunityAccessUrl } from '@/lib/community-access-email';
import { getSiteUrl } from '@/lib/site';

export type OrderReceiptInput = {
  to: string;
  buyerName: string;
  productTitle: string;
  amountSek: number;
  orderId?: string;
  workspaceName?: string;
};

/** Send a storefront purchase receipt. */
export async function sendOrderReceiptEmail(
  input: OrderReceiptInput
): Promise<SendEmailResult> {
  const unsubscribeUrl = buildUnsubscribeUrl(input.to, getSiteUrl());
  const amountLabel = `${Math.round(input.amountSek).toLocaleString('sv-SE')} SEK`;

  return sendEmail({
    to: input.to,
    subject: `Receipt — ${input.productTitle}`,
    unsubscribeEmail: input.to,
    tags: [
      { name: 'category', value: 'order_receipt' },
      { name: 'product', value: input.productTitle.slice(0, 40) },
    ],
    react: React.createElement(OrderReceiptEmail, {
      buyerName: input.buyerName,
      productTitle: input.productTitle,
      amountLabel,
      orderId: input.orderId,
      workspaceName: input.workspaceName,
      unsubscribeUrl,
    }),
  });
}

export type CommunityWelcomeInput = {
  to: string;
  memberName: string;
  communityId: number;
  communityName: string;
  origin?: string;
};

/** Send a community welcome / access unlock email. */
export async function sendCommunityWelcomeEmail(
  input: CommunityWelcomeInput
): Promise<SendEmailResult> {
  const origin = input.origin || getSiteUrl();
  const communityUrl = buildCommunityAccessUrl(input.communityId, origin);
  const unsubscribeUrl = buildUnsubscribeUrl(input.to, origin);

  return sendEmail({
    to: input.to,
    subject: `Welcome to ${input.communityName}`,
    unsubscribeEmail: input.to,
    tags: [
      { name: 'category', value: 'community_welcome' },
      { name: 'community_id', value: String(input.communityId) },
    ],
    react: React.createElement(CommunityWelcomeEmail, {
      memberName: input.memberName,
      communityName: input.communityName,
      communityUrl,
      unsubscribeUrl,
    }),
  });
}
