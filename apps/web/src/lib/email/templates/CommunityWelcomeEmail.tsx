import * as React from 'react';
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Text,
} from '@react-email/components';

export type CommunityWelcomeEmailProps = {
  memberName: string;
  communityName: string;
  communityUrl: string;
  unsubscribeUrl: string;
};

/** Welcome email after joining / unlocking a community. */
export function CommunityWelcomeEmail({
  memberName,
  communityName,
  communityUrl,
  unsubscribeUrl,
}: CommunityWelcomeEmailProps) {
  const firstName = memberName.trim().split(/\s+/)[0] || 'there';

  return (
    <Html>
      <Head />
      <Preview>Welcome to {communityName}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={brand}>
            clikd<span style={{ color: '#F472B6' }}>:</span>
          </Text>
          <Heading style={h1}>Welcome to {communityName}</Heading>
          <Text style={paragraph}>Hi {firstName},</Text>
          <Text style={paragraph}>
            You&apos;re in. Open the community to meet members, join discussions, and explore
            courses &amp; events.
          </Text>
          <Button href={communityUrl} style={button}>
            Open community →
          </Button>
          <Text style={{ ...paragraph, marginTop: '24px', fontSize: '13px', color: '#64748b' }}>
            Or paste this link: {communityUrl}
          </Text>
          <Hr style={hr} />
          <Text style={footer}>
            You received this because you joined {communityName} on clikd:.
            <br />
            <Link href={unsubscribeUrl} style={link}>
              Unsubscribe
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
  lineHeight: '1.3',
};

const paragraph = {
  fontSize: '15px',
  lineHeight: '1.65',
  color: '#334155',
  margin: '0 0 12px',
};

const button = {
  backgroundColor: '#F472B6',
  borderRadius: '12px',
  color: '#0F172A',
  fontSize: '14px',
  fontWeight: 800 as const,
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '14px 22px',
  marginTop: '8px',
};

const hr = {
  borderColor: '#e2e8f0',
  margin: '28px 0 16px',
};

const footer = {
  fontSize: '12px',
  lineHeight: '1.5',
  color: '#94a3b8',
  margin: 0,
};

const link = {
  color: '#F472B6',
  textDecoration: 'underline',
};

export default CommunityWelcomeEmail;
