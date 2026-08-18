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
import { splitBodyAroundImage } from '@/lib/email/image-token';

export type BroadcastImagePlacement = 'top' | 'middle' | 'bottom' | 'inline';

export type BroadcastEmailProps = {
  subject: string;
  previewText?: string;
  /** Already personalized body (merge tags applied server-side). */
  bodyContent: string;
  imageUrl?: string | null;
  imagePlacement?: BroadcastImagePlacement;
  unsubscribeUrl: string;
  workspaceName?: string;
};

function splitBodyForMiddle(text: string): [string, string] {
  const parts = text.split(/\n\n+/);
  if (parts.length <= 1) return [text, ''];
  return [parts[0], parts.slice(1).join('\n\n')];
}

/** CRM broadcast / newsletter template with mandatory unsubscribe footer. */
export function BroadcastEmail({
  subject,
  previewText,
  bodyContent,
  imageUrl,
  imagePlacement = 'top',
  unsubscribeUrl,
  workspaceName = 'clikd:',
}: BroadcastEmailProps) {
  const marker = splitBodyAroundImage(bodyContent);
  const [beforeMiddle, afterMiddle] = splitBodyForMiddle(bodyContent);
  const imageBlock = imageUrl ? (
    <Section style={{ margin: '16px 0' }}>
      <Img
        src={imageUrl}
        alt=""
        width="100%"
        style={{ borderRadius: '12px', display: 'block', maxHeight: '320px' }}
      />
    </Section>
  ) : null;

  const bodyBlocks =
    imageUrl && marker.hasMarker ? (
      <>
        {marker.before.trim() ? (
          <Text style={paragraph}>{marker.before}</Text>
        ) : null}
        {imageBlock}
        {marker.after.trim() ? (
          <Text style={paragraph}>{marker.after}</Text>
        ) : null}
      </>
    ) : imagePlacement === 'middle' || imagePlacement === 'inline' ? (
      <>
        {beforeMiddle ? <Text style={paragraph}>{beforeMiddle}</Text> : null}
        {imageBlock}
        {afterMiddle ? <Text style={paragraph}>{afterMiddle}</Text> : null}
      </>
    ) : (
      <>
        {imagePlacement === 'top' && imageBlock}
        <Text style={paragraph}>{bodyContent}</Text>
        {imagePlacement === 'bottom' && imageBlock}
      </>
    );

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
          {bodyBlocks}
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
