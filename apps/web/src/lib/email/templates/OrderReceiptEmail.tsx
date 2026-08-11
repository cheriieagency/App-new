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

export type OrderReceiptEmailProps = {
  buyerName: string;
  productTitle: string;
  amountLabel: string;
  orderId?: string;
  workspaceName?: string;
  unsubscribeUrl: string;
};

/** Storefront purchase / order receipt transactional email. */
export function OrderReceiptEmail({
  buyerName,
  productTitle,
  amountLabel,
  orderId,
  workspaceName = 'clikd:',
  unsubscribeUrl,
}: OrderReceiptEmailProps) {
  const firstName = buyerName.trim().split(/\s+/)[0] || 'there';

  return (
    <Html>
      <Head />
      <Preview>Receipt for {productTitle}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={brand}>
            clikd<span style={{ color: '#F472B6' }}>:</span>
          </Text>
          <Heading style={h1}>Thanks for your purchase</Heading>
          <Text style={paragraph}>Hi {firstName},</Text>
          <Text style={paragraph}>
            Your order from {workspaceName} is confirmed. Here are the details:
          </Text>
          <Section style={card}>
            <Text style={cardLabel}>Product</Text>
            <Text style={cardValue}>{productTitle}</Text>
            <Text style={{ ...cardLabel, marginTop: '12px' }}>Amount</Text>
            <Text style={cardValue}>{amountLabel}</Text>
            {orderId ? (
              <>
                <Text style={{ ...cardLabel, marginTop: '12px' }}>Order ID</Text>
                <Text style={cardValue}>{orderId}</Text>
              </>
            ) : null}
          </Section>
          <Text style={paragraph}>Keep this email as your receipt.</Text>
          <Hr style={hr} />
          <Text style={footer}>
            Transactional receipt from {workspaceName} via clikd:.
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
  margin: '0 0 12px',
};

const card = {
  backgroundColor: '#F8FAFC',
  borderRadius: '12px',
  border: '1px solid #e2e8f0',
  padding: '16px',
  margin: '16px 0 20px',
};

const cardLabel = {
  fontSize: '11px',
  fontWeight: 700 as const,
  color: '#94a3b8',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.06em',
  margin: '0 0 4px',
};

const cardValue = {
  fontSize: '15px',
  fontWeight: 700 as const,
  color: '#0F172A',
  margin: 0,
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

export default OrderReceiptEmail;
