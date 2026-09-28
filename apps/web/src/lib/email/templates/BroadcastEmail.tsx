import * as React from 'react';
import { Heading, Img, Link, Section, Text } from '@react-email/components';
import { splitBodyAroundImage } from '@/lib/email/image-token';
import {
  ClikdEmailLayout,
  emailStyles,
} from '@/lib/email/templates/ClikdEmailLayout';

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
          <Text style={emailStyles.paragraph}>{marker.before}</Text>
        ) : null}
        {imageBlock}
        {marker.after.trim() ? (
          <Text style={emailStyles.paragraph}>{marker.after}</Text>
        ) : null}
      </>
    ) : imagePlacement === 'middle' || imagePlacement === 'inline' ? (
      <>
        {beforeMiddle ? (
          <Text style={emailStyles.paragraph}>{beforeMiddle}</Text>
        ) : null}
        {imageBlock}
        {afterMiddle ? (
          <Text style={emailStyles.paragraph}>{afterMiddle}</Text>
        ) : null}
      </>
    ) : (
      <>
        {imagePlacement === 'top' && imageBlock}
        <Text style={emailStyles.paragraph}>{bodyContent}</Text>
        {imagePlacement === 'bottom' && imageBlock}
      </>
    );

  return (
    <ClikdEmailLayout
      previewText={previewText || subject}
      footer={
        <>
          You received this email because you subscribe to {workspaceName} on
          clikd:.
          <br />
          <Link href={unsubscribeUrl} style={emailStyles.link}>
            Unsubscribe
          </Link>
          {' · '}
          <Link href="https://clikd.app/legal/integritet" style={emailStyles.link}>
            Privacy
          </Link>
        </>
      }
    >
      <Heading style={emailStyles.h1}>{subject}</Heading>
      {bodyBlocks}
    </ClikdEmailLayout>
  );
}

export default BroadcastEmail;
