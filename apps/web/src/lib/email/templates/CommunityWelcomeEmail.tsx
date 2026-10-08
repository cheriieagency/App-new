import * as React from 'react';
import { Button, Heading, Link, Text } from '@react-email/components';
import {
  ClikdEmailLayout,
  emailStyles,
} from '@/lib/email/templates/ClikdEmailLayout';

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
    <ClikdEmailLayout
      previewText={`Welcome to ${communityName}`}
      footer={
        <>
          You received this because you joined {communityName} on clikd:.
          <br />
          <Link href={unsubscribeUrl} style={emailStyles.link}>
            Unsubscribe
          </Link>
        </>
      }
    >
      <Heading style={emailStyles.h1}>Welcome to {communityName}</Heading>
      <Text style={emailStyles.paragraph}>Hi {firstName},</Text>
      <Text style={emailStyles.paragraph}>
        You&apos;re in. Open the community to meet members, join discussions, and
        explore courses &amp; events.
      </Text>
      <Button href={communityUrl} style={emailStyles.button}>
        Open community →
      </Button>
      <Text style={emailStyles.hint}>
        Or paste this link into your browser:
        <br />
        <Link href={communityUrl} style={emailStyles.link}>
          {communityUrl}
        </Link>
      </Text>
    </ClikdEmailLayout>
  );
}

export default CommunityWelcomeEmail;
