import * as React from 'react';
import { Heading, Link, Section, Text } from '@react-email/components';
import {
  ClikdEmailLayout,
  emailStyles,
} from '@/lib/email/templates/ClikdEmailLayout';

export type PostReviewEmailProps = {
  workspaceName: string;
  postTitle: string;
  captionPreview: string;
  shareUrl: string;
  senderName?: string | null;
  customNote?: string | null;
  unsubscribeUrl: string;
};

/** Client invite to review a planner post + public chat. */
export function PostReviewEmail({
  workspaceName,
  postTitle,
  captionPreview,
  shareUrl,
  senderName,
  customNote,
  unsubscribeUrl,
}: PostReviewEmailProps) {
  const from = senderName?.trim() || 'Your creator';
  return (
    <ClikdEmailLayout
      previewText={`${from} shared a post for review — ${postTitle}`}
      footer={
        <>
          Powered by clikd.app
          <br />
          <Link href={unsubscribeUrl} style={emailStyles.link}>
            Unsubscribe from marketing
          </Link>
        </>
      }
    >
      <Heading style={emailStyles.h1}>Post ready for your review</Heading>
      <Text style={emailStyles.paragraph}>
        <strong>{from}</strong> shared a draft from{' '}
        <strong>{workspaceName}</strong> so you can preview it and leave feedback
        in the public chat.
      </Text>

      {customNote ? (
        <Section style={emailStyles.lilacPanel}>
          <Text style={{ ...emailStyles.paragraph, margin: 0, color: '#2B2568' }}>
            {customNote}
          </Text>
        </Section>
      ) : null}

      <Section style={emailStyles.panel}>
        <Text style={emailStyles.label}>Post</Text>
        <Text style={emailStyles.value}>{postTitle}</Text>
        {captionPreview ? (
          <Text
            style={{
              ...emailStyles.paragraph,
              margin: '8px 0 0',
              fontSize: '13px',
              color: '#64748B',
              whiteSpace: 'pre-wrap' as const,
            }}
          >
            {captionPreview}
          </Text>
        ) : null}
      </Section>

      <Section style={{ textAlign: 'center' as const, margin: '8px 0 20px' }}>
        <Link href={shareUrl} style={emailStyles.buttonPink}>
          Open post & public chat
        </Link>
      </Section>

      <Text style={emailStyles.paragraph}>
        No clikd: account needed. The link only shows the public review chat —
        private team notes stay hidden.
      </Text>
    </ClikdEmailLayout>
  );
}

export default PostReviewEmail;
