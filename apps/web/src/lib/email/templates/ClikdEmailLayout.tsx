/**
 * Shared clikd: shell for transactional + CRM emails.
 * Brand: light canvas, midnight periwinkle header, pink colon, Plus Jakarta body.
 */

import * as React from 'react';
import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';

/** Brand tokens (inline — email clients ignore external CSS / most custom fonts). */
export const emailBrand = {
  canvas: '#FAFAFA',
  paper: '#FFFFFF',
  ink: '#0F172A',
  muted: '#8A857D',
  body: '#334155',
  border: '#E6E3DB',
  midnight: '#2B2568',
  pink: '#F472B6',
  lilac: '#E9D5FF',
  mint: '#10B981',
  forest: '#2C3B2E',
  fontUi:
    '"Plus Jakarta Sans", "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  fontDisplay:
    '"Space Grotesk", "Plus Jakarta Sans", "Segoe UI", Helvetica, Arial, sans-serif',
} as const;

export const emailStyles = {
  main: {
    backgroundColor: emailBrand.canvas,
    fontFamily: emailBrand.fontUi,
    margin: 0,
    padding: '32px 12px',
  },
  outer: {
    margin: '0 auto',
    maxWidth: '580px',
  },
  header: {
    backgroundColor: emailBrand.midnight,
    borderRadius: '16px 16px 0 0',
    padding: '20px 28px',
  },
  wordmark: {
    margin: 0,
    fontFamily: emailBrand.fontDisplay,
    fontSize: '22px',
    fontWeight: 700 as const,
    letterSpacing: '-0.03em',
    color: '#FFFFFF',
    lineHeight: '1.2',
  },
  card: {
    backgroundColor: emailBrand.paper,
    borderRadius: '0 0 16px 16px',
    border: `1px solid ${emailBrand.border}`,
    borderTop: 'none',
    padding: '28px 28px 24px',
  },
  h1: {
    margin: '0 0 14px',
    fontFamily: emailBrand.fontDisplay,
    fontSize: '24px',
    fontWeight: 600 as const,
    letterSpacing: '-0.02em',
    color: emailBrand.ink,
    lineHeight: '1.25',
  },
  paragraph: {
    margin: '0 0 12px',
    fontSize: '15px',
    lineHeight: '1.65',
    color: emailBrand.body,
  },
  button: {
    display: 'inline-block',
    backgroundColor: emailBrand.forest,
    color: '#F9F8F6',
    fontSize: '14px',
    fontWeight: 700 as const,
    textDecoration: 'none',
    textAlign: 'center' as const,
    padding: '14px 22px',
    borderRadius: '12px',
    marginTop: '8px',
  },
  buttonPink: {
    display: 'inline-block',
    backgroundColor: emailBrand.pink,
    color: emailBrand.ink,
    fontSize: '14px',
    fontWeight: 800 as const,
    textDecoration: 'none',
    textAlign: 'center' as const,
    padding: '14px 22px',
    borderRadius: '12px',
    marginTop: '8px',
  },
  panel: {
    backgroundColor: emailBrand.canvas,
    border: `1px solid ${emailBrand.border}`,
    borderRadius: '12px',
    padding: '16px',
    margin: '16px 0 20px',
  },
  lilacPanel: {
    backgroundColor: emailBrand.lilac,
    borderRadius: '12px',
    padding: '14px 16px',
    margin: '16px 0',
  },
  label: {
    margin: '0 0 4px',
    fontSize: '10px',
    fontWeight: 700 as const,
    letterSpacing: '0.12em',
    textTransform: 'uppercase' as const,
    color: emailBrand.muted,
  },
  value: {
    margin: 0,
    fontSize: '15px',
    fontWeight: 700 as const,
    color: emailBrand.ink,
  },
  hr: {
    borderColor: emailBrand.border,
    borderTop: `1px solid ${emailBrand.border}`,
    margin: '28px 0 16px',
  },
  footer: {
    margin: 0,
    fontSize: '12px',
    lineHeight: '1.55',
    color: emailBrand.muted,
  },
  link: {
    color: emailBrand.pink,
    textDecoration: 'underline',
  },
  hint: {
    margin: '20px 0 0',
    fontSize: '12px',
    lineHeight: '1.5',
    color: emailBrand.muted,
  },
} as const;

export type ClikdEmailLayoutProps = {
  previewText: string;
  children: React.ReactNode;
  /** Optional footer lines (unsubscribe, privacy, etc.) */
  footer?: React.ReactNode;
};

/** Midnight header + paper card wrapper used by all automated emails. */
export function ClikdEmailLayout({
  previewText,
  children,
  footer,
}: ClikdEmailLayoutProps) {
  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={emailStyles.main}>
        <Container style={emailStyles.outer}>
          <Section style={emailStyles.header}>
            <Text style={emailStyles.wordmark}>
              clikd<span style={{ color: emailBrand.pink }}>:</span>
            </Text>
          </Section>
          <Section style={emailStyles.card}>
            {children}
            {footer ? (
              <>
                <Hr style={emailStyles.hr} />
                <Text style={emailStyles.footer}>{footer}</Text>
              </>
            ) : null}
          </Section>
          <Text
            style={{
              ...emailStyles.footer,
              textAlign: 'center' as const,
              marginTop: '16px',
              fontSize: '11px',
            }}
          >
            Made for Nordic creators ·{' '}
            <Link href="https://clikd.app" style={emailStyles.link}>
              clikd.app
            </Link>
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default ClikdEmailLayout;
