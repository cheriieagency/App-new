import * as React from 'react';
import { Heading, Link, Section, Text } from '@react-email/components';
import {
  ClikdEmailLayout,
  emailBrand,
  emailStyles,
} from '@/lib/email/templates/ClikdEmailLayout';

export type MonthlyReportEmailProps = {
  workspaceName: string;
  title: string;
  periodLabel: string;
  views: number;
  engagementRate: number;
  followerGrowth: number;
  totalPosts: number;
  shareUrl: string;
  customNote?: string | null;
  unsubscribeUrl: string;
};

export function MonthlyReportEmail({
  workspaceName,
  title,
  periodLabel,
  views,
  engagementRate,
  followerGrowth,
  totalPosts,
  shareUrl,
  customNote,
  unsubscribeUrl,
}: MonthlyReportEmailProps) {
  const kpis = [
    { label: 'Views', value: views.toLocaleString('en-US') },
    { label: 'Eng. rate', value: `${engagementRate}%` },
    { label: 'Followers', value: followerGrowth.toLocaleString('en-US') },
    { label: 'Posts', value: String(totalPosts) },
  ];

  return (
    <ClikdEmailLayout
      previewText={`${title} · ${periodLabel}`}
      footer={
        <>
          Powered by clikd.app
          <br />
          <Link href={unsubscribeUrl} style={emailStyles.link}>
            Unsubscribe from marketing
          </Link>
        </>
      }
    >
      <Heading style={emailStyles.h1}>{title}</Heading>
      <Text style={emailStyles.paragraph}>
        Performance snapshot for <strong>{workspaceName}</strong> · {periodLabel}
      </Text>

      {customNote ? (
        <Section style={emailStyles.lilacPanel}>
          <Text style={{ ...emailStyles.paragraph, margin: 0, color: emailBrand.midnight }}>
            {customNote}
          </Text>
        </Section>
      ) : null}

      <Section style={{ margin: '8px 0 4px' }}>
        {kpis.map((kpi) => (
          <Section
            key={kpi.label}
            style={{
              display: 'inline-block',
              width: '46%',
              verticalAlign: 'top' as const,
              backgroundColor: emailBrand.canvas,
              border: `1px solid ${emailBrand.border}`,
              borderRadius: '12px',
              padding: '12px 14px',
              margin: '1%',
            }}
          >
            <Text style={{ ...emailStyles.label, margin: '0 0 6px' }}>
              {kpi.label}
            </Text>
            <Text
              style={{
                margin: 0,
                fontFamily: emailBrand.fontDisplay,
                fontSize: '20px',
                fontWeight: 700 as const,
                color: emailBrand.ink,
                letterSpacing: '-0.02em',
              }}
            >
              {kpi.value}
            </Text>
          </Section>
        ))}
      </Section>

      <Section style={{ textAlign: 'center' as const, margin: '20px 0' }}>
        <Link href={shareUrl} style={emailStyles.buttonPink}>
          Open client report / save PDF
        </Link>
      </Section>

      <Text style={emailStyles.paragraph}>
        This is a verified static snapshot for this workspace only. Share the link
        with clients — they don&apos;t need a clikd: login. Use Save as PDF in the
        browser print dialog if you need a file.
      </Text>
    </ClikdEmailLayout>
  );
}

export default MonthlyReportEmail;
