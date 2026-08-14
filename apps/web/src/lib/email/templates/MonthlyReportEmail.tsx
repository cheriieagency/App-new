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
  return (
    <Html>
      <Head />
      <Preview>
        {title} · {periodLabel}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={brand}>
            clikd<span style={{ color: '#F472B6' }}>:</span>
          </Text>
          <Heading style={h1}>{title}</Heading>
          <Text style={paragraph}>
            Performance snapshot for <strong>{workspaceName}</strong> ·{' '}
            {periodLabel}
          </Text>

          {customNote ? (
            <Section style={note}>
              <Text style={noteText}>{customNote}</Text>
            </Section>
          ) : null}

          <Section style={kpiRow}>
            <Text style={kpi}>
              <span style={kpiLabel}>Views</span>
              <br />
              <span style={kpiValue}>{views.toLocaleString('en-US')}</span>
            </Text>
            <Text style={kpi}>
              <span style={kpiLabel}>Eng. rate</span>
              <br />
              <span style={kpiValue}>{engagementRate}%</span>
            </Text>
            <Text style={kpi}>
              <span style={kpiLabel}>Followers</span>
              <br />
              <span style={kpiValue}>{followerGrowth.toLocaleString('en-US')}</span>
            </Text>
            <Text style={kpi}>
              <span style={kpiLabel}>Posts</span>
              <br />
              <span style={kpiValue}>{totalPosts}</span>
            </Text>
          </Section>

          <Section style={{ textAlign: 'center' as const, margin: '28px 0' }}>
            <Link href={shareUrl} style={cta}>
              Open client report / save PDF
            </Link>
          </Section>

          <Text style={paragraph}>
            This is a verified static snapshot for this workspace only. Share the
            link with clients — they don&apos;t need a clikd: login. Use Save as
            PDF in the browser print dialog if you need a file.
          </Text>
          <Hr style={hr} />
          <Text style={footer}>
            Powered by clikd.app
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
  backgroundColor: '#0F172A',
  fontFamily:
    '"Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};
const container = {
  margin: '0 auto',
  padding: '32px 24px',
  maxWidth: '560px',
};
const brand = {
  color: '#F8FAFC',
  fontSize: '18px',
  fontWeight: 800,
  letterSpacing: '-0.02em',
};
const h1 = {
  color: '#F8FAFC',
  fontSize: '24px',
  fontWeight: 800,
  margin: '16px 0 8px',
};
const paragraph = {
  color: '#CBD5E1',
  fontSize: '14px',
  lineHeight: '1.55',
};
const note = {
  backgroundColor: '#1E293B',
  borderRadius: '12px',
  padding: '12px 16px',
  margin: '16px 0',
};
const noteText = { color: '#E2E8F0', fontSize: '13px', margin: 0 };
const kpiRow = { margin: '20px 0' };
const kpi = {
  display: 'inline-block',
  width: '46%',
  backgroundColor: '#1E293B',
  borderRadius: '12px',
  padding: '12px',
  margin: '1%',
  color: '#F8FAFC',
  verticalAlign: 'top' as const,
};
const kpiLabel = {
  fontSize: '10px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.08em',
  color: '#94A3B8',
  fontWeight: 700,
};
const kpiValue = { fontSize: '20px', fontWeight: 800 };
const cta = {
  display: 'inline-block',
  backgroundColor: '#F472B6',
  color: '#0F172A',
  fontWeight: 800,
  fontSize: '13px',
  padding: '14px 22px',
  borderRadius: '12px',
  textDecoration: 'none',
};
const hr = { borderColor: '#334155', margin: '24px 0' };
const footer = { color: '#64748B', fontSize: '11px' };
const link = { color: '#F472B6' };
