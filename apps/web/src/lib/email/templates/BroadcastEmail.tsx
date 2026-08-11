import * as React from 'react';
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';

export type BroadcastEmailProps = {
  subject: string;
  previewText?: string;
  bodyContent: string;
  firstName?: string;
  imageUrl?: string | null;
  unsubscribeUrl: string;
  workspaceName?: string;
};

/** CRM broadcast / newsletter template with mandatory unsubscribe footer. */
export function BroadcastEmail({
  subject,
  previewText,
  bodyContent,
  firstName = 'there',
  imageUrl,
  unsubscribeUrl,
  workspaceName = 'clikd:',
}: BroadcastEmailProps) {
  const personalized = bodyContent.replace(/\{first_name\}/gi, firstName);

  return (
    <Html>
      <Head />
      <Preview>{previewText || subject}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={brand}>
            clikd<span style={{ color: '#F472B6' }}>:</span>
          </Text>
          <Heading style={h1}>{subject}</Heading>
          {imageUrl ? (
            <Section style={{ marginBottom: '24px' }}>
              <Img
                src={imageUrl}
                alt=""
                width="100%"
                style={{ borderRadius: '12px', display: 'block' }}
              />
            </Section>
          ) : null}
          <Text style={paragraph}>{personalized}</Text>
          <Hr style={hr} />
          <Text style={footer}>
            You received this email because you subscribe to {workspaceName} on clikd:.
            <br />
            <Link href={unsubscribeUrl} style={link}>
              Unsubscribe
            </Link>
            {' · '}
            <Link href="https://clikd.app/legal/integritet" style={link}>
              Privacy
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
  margin: '0 0 20px',
  lineHeight: '1.3',
};

const paragraph = {
  fontSize: '15px',
  lineHeight: '1.65',
  color: '#334155',
  whiteSpace: 'pre-wrap' as const,
  margin: '0 0 8px',
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

export default BroadcastEmail;
