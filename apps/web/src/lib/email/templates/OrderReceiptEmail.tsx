import * as React from 'react';
import { Heading, Link, Section, Text } from '@react-email/components';
import {
  ClikdEmailLayout,
  emailBrand,
  emailStyles,
} from '@/lib/email/templates/ClikdEmailLayout';

export type OrderReceiptEmailProps = {
  buyerName: string;
  productTitle: string;
  amountLabel: string;
  orderId?: string;
  workspaceName?: string;
  meetUrl?: string;
  unsubscribeUrl: string;
};

/** Storefront purchase / order receipt transactional email. */
export function OrderReceiptEmail({
  buyerName,
  productTitle,
  amountLabel,
  orderId,
  workspaceName = 'clikd:',
  meetUrl,
  unsubscribeUrl,
}: OrderReceiptEmailProps) {
  const firstName = buyerName.trim().split(/\s+/)[0] || 'there';

  return (
    <ClikdEmailLayout
      previewText={
        meetUrl
          ? `Your Google Meet link for ${productTitle}`
          : `Receipt for ${productTitle}`
      }
      footer={
        <>
          Transactional receipt from {workspaceName} via clikd:.
          <br />
          <Link href={unsubscribeUrl} style={emailStyles.link}>
            Unsubscribe from marketing
          </Link>
        </>
      }
    >
      <Text
        style={{
          ...emailStyles.label,
          color: emailBrand.mint,
          marginBottom: '8px',
        }}
      >
        Order confirmed
      </Text>
      <Heading style={emailStyles.h1}>Thanks for your purchase</Heading>
      <Text style={emailStyles.paragraph}>Hi {firstName},</Text>
      <Text style={emailStyles.paragraph}>
        Your order from {workspaceName} is confirmed. Here are the details:
      </Text>
      <Section style={emailStyles.panel}>
        <Text style={emailStyles.label}>Product</Text>
        <Text style={emailStyles.value}>{productTitle}</Text>
        <Text style={{ ...emailStyles.label, marginTop: '12px' }}>Amount</Text>
        <Text style={emailStyles.value}>{amountLabel}</Text>
        {orderId ? (
          <>
            <Text style={{ ...emailStyles.label, marginTop: '12px' }}>
              Order ID
            </Text>
            <Text style={emailStyles.value}>{orderId}</Text>
          </>
        ) : null}
        {meetUrl ? (
          <>
            <Text style={{ ...emailStyles.label, marginTop: '12px' }}>
              Google Meet
            </Text>
            <Text style={emailStyles.value}>
              <Link href={meetUrl} style={emailStyles.link}>
                Join your 1:1 call
              </Link>
            </Text>
          </>
        ) : null}
      </Section>
      <Text style={emailStyles.paragraph}>Keep this email as your receipt.</Text>
    </ClikdEmailLayout>
  );
}

export default OrderReceiptEmail;
