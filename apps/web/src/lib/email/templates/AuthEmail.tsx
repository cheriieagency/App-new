import * as React from 'react';
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
} from '@react-email/components';

export type AuthEmailProps = {
  heading: string;
  previewText?: string;
  body: string;
  actionUrl: string;
  actionLabel: string;
};

/** Transactional auth email (reset password / verify signup). */
export function AuthEmail({
  heading,
  previewText,
  body,
  actionUrl,
  actionLabel,
}: AuthEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>{previewText || heading}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={brand}>
            clikd<span style={{ color: '#F472B6' }}>:</span>
          </Text>
          <Heading style={h1}>{heading}</Heading>
          <Text style={paragraph}>{body}</Text>
          <Link href={actionUrl} style={button}>
            {actionLabel}
          </Link>
          <Text style={hint}>
            If the button does not work, copy this link into your browser:
            <br />
            <Link href={actionUrl} style={link}>
              {actionUrl}
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
  maxWidth: '520px',
  backgroundColor: '#ffffff',
  borderRadius: '16px',
  border: '1px solid #e2e8f0',
};

const brand = {
  fontSize: '18px',
  fontWeight: 800 as const,
  color: '#0F172A',
  margin: '0 0 16px',
};

const h1 = {
  fontSize: '22px',
  fontWeight: 800 as const,
  color: '#2B2568',
  margin: '0 0 16px',
};

const paragraph = {
  fontSize: '15px',
  lineHeight: '1.65',
  color: '#334155',
  margin: '0 0 20px',
};

const button = {
  display: 'inline-block',
  backgroundColor: '#F472B6',
  color: '#ffffff',
  fontWeight: 800 as const,
  fontSize: '14px',
  textDecoration: 'none',
  padding: '12px 20px',
  borderRadius: '999px',
};

const hint = {
  fontSize: '12px',
  lineHeight: '1.5',
  color: '#94a3b8',
  margin: '24px 0 0',
};

const link = {
  color: '#F472B6',
  wordBreak: 'break-all' as const,
};

export default AuthEmail;
