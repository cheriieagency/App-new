/**
 * Resend helpers for better-auth verification + password reset links.
 */

import * as React from 'react';
import { sendEmail } from '@/lib/email/send';
import { AuthEmail } from '@/lib/email/templates/AuthEmail';

export async function sendAuthLinkEmail(input: {
  to: string;
  heading: string;
  body: string;
  actionUrl: string;
  actionLabel: string;
  tag: 'verify' | 'reset';
}): Promise<void> {
  const result = await sendEmail({
    to: input.to,
    subject: input.heading,
    unsubscribeEmail: input.to,
    tags: [
      { name: 'category', value: 'auth' },
      { name: 'kind', value: input.tag },
    ],
    react: React.createElement(AuthEmail, {
      heading: input.heading,
      previewText: input.heading,
      body: input.body,
      actionUrl: input.actionUrl,
      actionLabel: input.actionLabel,
    }),
  });
  if (!result.ok) {
    console.warn('[auth-email] send failed', result.error);
  }
}
