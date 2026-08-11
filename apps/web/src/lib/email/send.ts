/**
 * Resend email client + shared send helpers for CRM + transactional mail.
 */

import { Resend } from 'resend';
import type { ReactElement } from 'react';
import { missingEnvKeys, missingEnvResponse, resendEnv } from '@/lib/config/env';
import { buildUnsubscribeUrl } from '@/lib/email/unsubscribe';

let client: Resend | null = null;

/** Lazily initialize Resend from RESEND_API_KEY. */
export function getResendClient(): Resend | null {
  const apiKey = resendEnv.apiKey();
  if (!apiKey) return null;
  if (!client) client = new Resend(apiKey);
  return client;
}

export type SendEmailInput = {
  to: string | string[];
  subject: string;
  /** React Email element rendered by Resend */
  react: ReactElement;
  /** Recipient email used for unsubscribe token (defaults to first `to`) */
  unsubscribeEmail?: string;
  replyTo?: string;
  tags?: { name: string; value: string }[];
};

export type SendEmailResult =
  | { ok: true; id: string }
  | { ok: false; error: string; missingEnv?: string[] };

/**
 * Send one email via Resend with mandatory List-Unsubscribe headers.
 */
export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const missing = missingEnvKeys(...resendEnv.requiredKeys);
  if (missing.length) {
    console.warn(
      `[email] Resend not configured. Missing: ${missing.join(', ')}. Add to apps/web/.env.local.`
    );
    return { ok: false, error: 'missing_env', missingEnv: missing };
  }

  const resend = getResendClient();
  if (!resend) {
    return { ok: false, error: 'missing_env', missingEnv: [...resendEnv.requiredKeys] };
  }

  const toList = Array.isArray(input.to) ? input.to : [input.to];
  const primary = (input.unsubscribeEmail || toList[0] || '').toLowerCase().trim();
  const unsubscribeUrl = buildUnsubscribeUrl(primary);

  try {
    const { data, error } = await resend.emails.send({
      from: resendEnv.from(),
      to: toList,
      subject: input.subject,
      react: input.react,
      replyTo: input.replyTo,
      tags: input.tags,
      headers: {
        'List-Unsubscribe': `<${unsubscribeUrl}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
    });

    if (error) {
      console.error('[email] Resend error', error);
      return { ok: false, error: error.message || 'resend_error' };
    }

    return { ok: true, id: data?.id ?? 'sent' };
  } catch (err) {
    console.error('[email] send failed', err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'send_failed',
    };
  }
}

/** HTTP 503 helper when Resend is not configured. */
export function resendMissingResponse(): Response {
  return missingEnvResponse([...resendEnv.requiredKeys], 'Resend');
}
