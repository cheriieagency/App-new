import * as React from 'react';
import { Heading, Link, Text } from '@react-email/components';
import {
  ClikdEmailLayout,
  emailStyles,
} from '@/lib/email/templates/ClikdEmailLayout';

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
    <ClikdEmailLayout previewText={previewText || heading}>
      <Heading style={emailStyles.h1}>{heading}</Heading>
      <Text style={emailStyles.paragraph}>{body}</Text>
      <Link href={actionUrl} style={emailStyles.button}>
        {actionLabel}
      </Link>
      <Text style={emailStyles.hint}>
        If the button does not work, copy this link into your browser:
        <br />
        <Link href={actionUrl} style={emailStyles.link}>
          {actionUrl}
        </Link>
      </Text>
    </ClikdEmailLayout>
  );
}

export default AuthEmail;
