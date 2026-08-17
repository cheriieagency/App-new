import * as React from 'react';
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';

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
    <Html>
      <Head />
      <Preview>
        {from} shared a post for review — {postTitle}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={brand}>
            clikd<span style={{ color: '#F472B6' }}>:</span>
          </Text>
          <Heading style={h1}>Post ready for your review</Heading>
          <Text style={paragraph}>
            <strong>{from}</strong> shared a draft from{' '}
            <strong>{workspaceName}</strong> so you can preview it and leave
            feedback in the public chat.
          </Text>

          {customNote ? (
            <Section style={note}>
              <Text style={noteText}>{customNote}</Text>
            </Section>
          ) : null}

          <Section style={card}>
            <Text style={cardLabel}>Post</Text>
            <Text style={cardTitle}>{postTitle}</Text>
            {captionPreview ? (
              <Text style={cardBody}>{captionPreview}</Text>
            ) : null}
          </Section>

          <Section style={{ textAlign: 'center' as const, margin: '28px 0' }}>
            <Link href={shareUrl} style={cta}>
              Open post & public chat
            </Link>
          </Section>

          <Text style={paragraph}>
            No clikd: account needed. The link only shows the public review chat —
            private team notes stay hidden.
          </Text>
          <Hr style={hr} />
          <Text style={footer}>
            Powered by clikd.app
            <br />
            <Link href={unsubscribeUrl} style={link}>
              Unsubscribe from marketing
            </Link>
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: '#FAFAFA',
  fontFamily:
    '"Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};
const container = {
  margin: '0 auto',
  padding: '32px 24px',
  maxWidth: '560px',
  backgroundColor: '#FFFFFF',
  borderRadius: '16px',
  border: '1px solid #E2E8F0',
};
const brand = {
  color: '#0F172A',
  fontSize: '18px',
  fontWeight: 800,
  letterSpacing: '-0.02em',
};
const h1 = {
  color: '#0F172A',
  fontSize: '22px',
  fontWeight: 800,
  margin: '16px 0 8px',
};
const paragraph = {
  color: '#475569',
  fontSize: '14px',
  lineHeight: '1.55',
};
const note = {
  backgroundColor: '#FDF2F8',
  borderRadius: '12px',
  padding: '12px 16px',
  margin: '16px 0',
};
const noteText = { color: '#9D174D', fontSize: '13px', margin: 0 };
const card = {
  backgroundColor: '#F8FAFC',
  borderRadius: '12px',
  padding: '14px 16px',
  margin: '16px 0',
  border: '1px solid #E2E8F0',
};
const cardLabel = {
  color: '#94A3B8',
  fontSize: '11px',
  fontWeight: 600,
  margin: '0 0 4px',
};
const cardTitle = {
  color: '#0F172A',
  fontSize: '15px',
  fontWeight: 700,
  margin: '0 0 6px',
};
const cardBody = {
  color: '#64748B',
  fontSize: '13px',
  lineHeight: '1.45',
  margin: 0,
  whiteSpace: 'pre-wrap' as const,
};
const cta = {
  display: 'inline-block',
  backgroundColor: '#F472B6',
  color: '#0F172A',
  fontWeight: 800,
  fontSize: '13px',
  padding: '14px 22px',
  borderRadius: '12px',
  textDecoration: 'none',
};
const hr = { borderColor: '#E2E8F0', margin: '24px 0' };
const footer = { color: '#94A3B8', fontSize: '11px' };
const link = { color: '#F472B6' };
