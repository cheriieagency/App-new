/**
 * Send a client post-review invite via Resend.
 */

import * as React from 'react';
import { sendEmail } from '@/lib/email/send';
import { PostReviewEmail } from '@/lib/email/templates/PostReviewEmail';
import { buildUnsubscribeUrl } from '@/lib/email/unsubscribe';
import { appBaseUrl } from '@/lib/config/env';

function parseRecipients(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw
      .map((x) => String(x || '').trim().toLowerCase())
      .filter((e) => e.includes('@'));
  }
  if (typeof raw === 'string') {
    return raw
      .split(/[,;\s]+/)
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e.includes('@'));
  }
  return [];
}

export async function sendPostReviewEmails(input: {
  shareUrl: string;
  postTitle: string;
  caption: string;
  workspaceName: string;
  senderName?: string | null;
  recipients: unknown;
  customNote?: string | null;
}) {
  const recipients = parseRecipients(input.recipients);
  if (!recipients.length) {
    return { ok: false as const, error: 'recipients_required', results: [] };
  }

  const origin = appBaseUrl();
  const captionPreview = input.caption.trim().slice(0, 220);
  const subject = `${input.senderName?.trim() || 'Your creator'} shared a post for review — ${input.postTitle}`;
  const results: Array<{ email: string; ok: boolean; error?: string; id?: string }> =
    [];

  for (const email of recipients) {
    const result = await sendEmail({
      to: email,
      subject,
      unsubscribeEmail: email,
      tags: [
        { name: 'category', value: 'post_review' },
        { name: 'workspace', value: input.workspaceName.slice(0, 40) },
      ],
      react: React.createElement(PostReviewEmail, {
        workspaceName: input.workspaceName || 'Workspace',
        postTitle: input.postTitle || 'New post',
        captionPreview,
        shareUrl: input.shareUrl.startsWith('http')
          ? input.shareUrl
          : `${origin}${input.shareUrl.startsWith('/') ? '' : '/'}${input.shareUrl}`,
        senderName: input.senderName,
        customNote: input.customNote,
        unsubscribeUrl: buildUnsubscribeUrl(email, origin),
      }),
    });
    results.push({
      email,
      ok: result.ok,
      ...(result.ok
        ? { id: result.id }
        : { error: result.error }),
    });
  }

  const anyOk = results.some((r) => r.ok);
  const missingEnv = results.find(
    (r) => !r.ok && r.error === 'missing_env'
  );
  if (!anyOk && missingEnv) {
    return { ok: false as const, error: 'missing_env', results };
  }
  if (!anyOk) {
    return {
      ok: false as const,
      error: results[0]?.error || 'send_failed',
      results,
    };
  }
  return { ok: true as const, results };
}
