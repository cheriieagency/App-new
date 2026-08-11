import type { Metadata } from 'next';
import { LegalDoc } from '@/components/legal/LegalDoc';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'How clikd: collects, uses, stores, and protects personal data on clikd.app — GDPR, UK GDPR, and CCPA disclosures.',
  alternates: { canonical: '/legal/integritet' },
};

export default function IntegritetPage() {
  return (
    <LegalDoc titleKey="legalIntegritet" updated="August 11, 2026">
      <p>
        This Privacy Policy describes how clikd: (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;)
        collects, uses, stores, and protects your personal data when you use our website (
        <a href="https://clikd.app">https://clikd.app</a>), applications, social media planning
        tools, bio storefronts, member communities, and associated services (&quot;the Service&quot;).
      </p>
      <p>
        We respect your personal privacy and process all personal data in compliance with the EU
        General Data Protection Regulation (GDPR), UK GDPR, and applicable global data protection
        legislation.
      </p>

      <h2>1. Data Controller &amp; Contact Information</h2>
      <p>
        clikd: is the Data Controller responsible for processing your personal data on the platform.
      </p>
      <ul>
        <li>
          Official Website: <a href="https://clikd.app">https://clikd.app</a>
        </li>
        <li>
          Privacy &amp; GDPR Contact:{' '}
          <a href="mailto:privacy@clikd.app">privacy@clikd.app</a>
        </li>
        <li>
          Support &amp; Legal Inquiries:{' '}
          <a href="mailto:legal@clikd.app">legal@clikd.app</a>
        </li>
      </ul>

      <h2>2. Personal Data We Collect</h2>
      <p>
        We collect data directly provided by you, data generated through your use of the Service, and
        data received from third-party social media platforms that you choose to connect to your
        account.
      </p>

      <h3 className="font-outfit font-extrabold text-base text-slate-900 tracking-tight mt-4 mb-2">
        A. Account &amp; Profile Information
      </h3>
      <p>
        Name, email address, encrypted password, profile avatar, username/handle, and preferred
        language.
      </p>
      <p>
        For Creators: Business details, tax registration number / personal identity number (for
        identity verification), VAT registration number, and billing address.
      </p>

      <h3 className="font-outfit font-extrabold text-base text-slate-900 tracking-tight mt-4 mb-2">
        B. Payment &amp; Transaction Data
      </h3>
      <p>
        When purchasing subscriptions, digital products, or memberships, we collect transaction
        history, purchase amounts, and chosen payment methods (Mobile, Card, or Bank Transfer).
      </p>
      <p>
        Note: All card and direct payments are securely processed by our certified payment partners
        (e.g., Stripe and card processors). clikd: never stores full credit card numbers or sensitive banking
        details on our servers.
      </p>

      <h3 className="font-outfit font-extrabold text-base text-slate-900 tracking-tight mt-4 mb-2">
        C. Social Media &amp; Third-Party API Data
      </h3>
      <p>
        When you connect your social media accounts (e.g., Instagram, TikTok, LinkedIn, YouTube) to
        our Content Planner and Analytics Suite, we collect:
      </p>
      <ul>
        <li>
          User ID, account handle, profile picture, follower counts, and valid access tokens.
        </li>
        <li>
          Content and media (images, videos, captions, hashtags) uploaded or scheduled through the
          Service.
        </li>
        <li>
          Performance and analytics data for scheduled posts (e.g., impressions, reach, clicks,
          engagement metrics).
        </li>
      </ul>

      <h3 className="font-outfit font-extrabold text-base text-slate-900 tracking-tight mt-4 mb-2">
        D. Usage &amp; Technical Data
      </h3>
      <ul>
        <li>
          IP address, device specifications, browser type, operating system, login timestamps, and
          clickstream behavior.
        </li>
        <li>
          Necessary cookies and session tokens to keep you authenticated and remember your workspace
          preferences.
        </li>
      </ul>

      <h2>3. Third-Party Integrations &amp; Platform-Specific API Terms</h2>
      <p>
        To provide scheduling, cross-posting, and analytics features, clikd: integrates with official
        third-party APIs. By connecting your accounts, you agree to the processing of data in
        accordance with each platform&apos;s respective terms:
      </p>

      <h3 className="font-outfit font-extrabold text-base text-slate-900 tracking-tight mt-4 mb-2">
        A. YouTube API Services (Google)
      </h3>
      <ul>
        <li>
          Our Service utilizes YouTube API Services to enable video previewing, Short scheduling, and
          channel metrics.
        </li>
        <li>
          By using YouTube features within clikd:, you agree to be bound by the{' '}
          <a
            href="https://www.youtube.com/t/terms"
            target="_blank"
            rel="noopener noreferrer"
          >
            YouTube Terms of Service
          </a>{' '}
          and the{' '}
          <a
            href="https://policies.google.com/privacy"
            target="_blank"
            rel="noopener noreferrer"
          >
            Google Privacy Policy
          </a>
          .
        </li>
        <li>
          You can revoke clikd:&apos;s access to your Google/YouTube data at any time via{' '}
          <a
            href="https://myaccount.google.com/permissions"
            target="_blank"
            rel="noopener noreferrer"
          >
            Google Security Settings
          </a>
          .
        </li>
      </ul>

      <h3 className="font-outfit font-extrabold text-base text-slate-900 tracking-tight mt-4 mb-2">
        B. Meta (Instagram Graph API &amp; Facebook Platform)
      </h3>
      <ul>
        <li>
          We process Meta data strictly in compliance with Meta&apos;s Platform Terms and Developer
          Policies.
        </li>
        <li>
          We store only valid OAuth access tokens required to schedule posts and fetch analytics.
        </li>
        <li>
          To request the deletion of your Meta-related data from our platform, you can use our
          automated data deletion callback endpoint at{' '}
          <a href="https://clikd.app/api/auth/data-deletion">
            https://clikd.app/api/auth/data-deletion
          </a>{' '}
          or contact <a href="mailto:privacy@clikd.app">privacy@clikd.app</a>.
        </li>
      </ul>

      <h3 className="font-outfit font-extrabold text-base text-slate-900 tracking-tight mt-4 mb-2">
        C. TikTok API &amp; LinkedIn API
      </h3>
      <p>
        Data received from TikTok and LinkedIn is processed solely to perform the scheduling,
        publishing, and analytics functions requested by you within the Service.
      </p>

      <h2>4. Purpose and Legal Basis for Data Processing</h2>
      <div className="overflow-x-auto rounded-2xl border border-slate-200/80">
        <table className="w-full min-w-[560px] text-left text-sm border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-900">
              <th className="px-3 py-2.5 font-extrabold border-b border-slate-200">
                Purpose of Processing
              </th>
              <th className="px-3 py-2.5 font-extrabold border-b border-slate-200">
                Categories of Personal Data
              </th>
              <th className="px-3 py-2.5 font-extrabold border-b border-slate-200">
                Legal Basis (GDPR)
              </th>
            </tr>
          </thead>
          <tbody className="text-slate-700">
            <tr className="border-b border-slate-100 align-top">
              <td className="px-3 py-2.5">
                Provide &amp; Operate the Service (Account, Content Planner, Bio Storefront,
                Community)
              </td>
              <td className="px-3 py-2.5">Account Details, Profile Data, Usage Data</td>
              <td className="px-3 py-2.5">Performance of a Contract (Art. 6.1 b)</td>
            </tr>
            <tr className="border-b border-slate-100 align-top">
              <td className="px-3 py-2.5">Process Payments, Payouts &amp; Taxes</td>
              <td className="px-3 py-2.5">Payment &amp; Transaction Data, Billing Address</td>
              <td className="px-3 py-2.5">
                Performance of a Contract &amp; Legal Obligation (Accounting Laws)
              </td>
            </tr>
            <tr className="border-b border-slate-100 align-top">
              <td className="px-3 py-2.5">Social Media Publishing &amp; Scheduling</td>
              <td className="px-3 py-2.5">API Tokens, Scheduled Media, Captions</td>
              <td className="px-3 py-2.5">Performance of a Contract (Initiated by User)</td>
            </tr>
            <tr className="border-b border-slate-100 align-top">
              <td className="px-3 py-2.5">Customer Support, Debugging &amp; Security</td>
              <td className="px-3 py-2.5">Account Data, IP Address, Correspondence</td>
              <td className="px-3 py-2.5">Legitimate Interest (Art. 6.1 f)</td>
            </tr>
            <tr className="align-top">
              <td className="px-3 py-2.5">Direct Marketing &amp; Newsletters</td>
              <td className="px-3 py-2.5">Email Address</td>
              <td className="px-3 py-2.5">Consent (Art. 6.1 a) or Legitimate Interest</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2>5. Data Sharing &amp; Sub-processors</h2>
      <p>
        We never sell your personal data to third parties. We share data only with trusted service
        providers (sub-processors) under strict Data Processing Agreements (DPA):
      </p>
      <ul>
        <li>
          <strong>Hosting &amp; Infrastructure:</strong> Vercel Inc. and Supabase Inc. (Database and
          hosting within EU/EEA or approved safeguards).
        </li>
        <li>
          <strong>Payment Gateways:</strong> Stripe Inc. and local mobile payment partners (For
          secure payment processing).
        </li>
        <li>
          <strong>Accounting Sync:</strong> Fortnox AB (For automated Nordic VAT and invoice
          logging).
        </li>
        <li>
          <strong>Transactional Email:</strong> Infrastructure providers for password resets and
          notification delivery.
        </li>
      </ul>

      <h2>6. Data Retention &amp; Deletion</h2>
      <p>
        We store your personal data only as long as necessary to fulfill the purposes outlined in
        this policy:
      </p>
      <ul>
        <li>
          <strong>Active Account:</strong> Data is retained while your clikd: account remains active.
        </li>
        <li>
          <strong>Account Termination:</strong> Upon account deletion request, your personal profile,
          storefronts, and social API tokens are deleted or anonymized within 30 days.
        </li>
        <li>
          <strong>Accounting Requirements:</strong> Invoices and transaction records are retained for
          up to 7 years to comply with statutory accounting laws.
        </li>
      </ul>

      <h2>7. Your Rights Under GDPR (EU &amp; UK)</h2>
      <p>
        Under European and UK data protection laws, you have the following rights regarding your
        personal data:
      </p>
      <ul>
        <li>
          <strong>Right of Access (Data Portability):</strong> Request a copy of the personal data we
          hold about you.
        </li>
        <li>
          <strong>Right to Rectification:</strong> Request correction of inaccurate or incomplete
          data.
        </li>
        <li>
          <strong>Right to Erasure (&quot;Right to be Forgotten&quot;):</strong> Request deletion of
          your data when it is no longer required for its original purpose.
        </li>
        <li>
          <strong>Right to Restrict &amp; Object:</strong> Object to data processing based on
          legitimate interests or request processing restriction.
        </li>
        <li>
          <strong>Right to Withdraw Consent:</strong> Revoke marketing or processing consent at any
          time.
        </li>
      </ul>
      <p>
        To exercise your rights, email us at{' '}
        <a href="mailto:privacy@clikd.app">privacy@clikd.app</a>. We respond to all requests within
        30 days.
      </p>

      <h2>8. Managing Connected Social Accounts &amp; Revoking API Access</h2>
      <p>You retain full control over connected social media accounts at all times:</p>
      <ul>
        <li>
          <strong>In-App Management:</strong> Navigate to Settings → Connected Accounts in your
          dashboard and click &quot;Disconnect&quot; next to any platform. This immediately revokes
          and deletes our stored access tokens.
        </li>
        <li>
          <strong>Platform Security Settings:</strong> You can revoke access directly from your
          security settings on Google, Meta, TikTok, or LinkedIn.
        </li>
        <li>
          <strong>Data Deletion Endpoint:</strong> Meta users can track data deletion status at{' '}
          <a href="https://clikd.app/api/auth/data-deletion">
            https://clikd.app/api/auth/data-deletion
          </a>
          .
        </li>
      </ul>

      <h2>9. International Data Transfers</h2>
      <p>
        When personal data is transferred outside the European Economic Area (EEA) or the United
        Kingdom, we ensure appropriate safeguards are implemented in accordance with Chapter V of the
        GDPR (such as Standard Contractual Clauses (SCCs) approved by the European Commission or
        EU-U.S. Data Privacy Framework certification).
      </p>

      <h2>10. Disclosures for United States Residents (CCPA/CPRA)</h2>
      <p>
        If you reside in California or other US states with applicable privacy regulations (such as
        CCPA/CPRA), the following disclosures apply:
      </p>
      <ul>
        <li>
          <strong>No Sale or Sharing:</strong> clikd: does not sell your personal information or
          share it for cross-context behavioral advertising.
        </li>
        <li>
          <strong>Your Rights:</strong> You have the right to request access to the categories and
          specific pieces of personal information we have collected about you, request deletion of
          your information, and be free from discrimination for exercising your privacy rights.
        </li>
        <li>
          <strong>Exercising Rights:</strong> You or an authorized agent may submit a privacy request
          by emailing <a href="mailto:privacy@clikd.app">privacy@clikd.app</a>.
        </li>
      </ul>

      <h2>11. Children&apos;s Privacy (COPPA)</h2>
      <p>
        Our Service is not directed to individuals under the age of 16. We do not knowingly collect
        personal data from children. If you become aware that a child has provided us with personal
        data, please contact <a href="mailto:privacy@clikd.app">privacy@clikd.app</a> so we can take
        immediate steps to remove such information.
      </p>

      <h2>12. Complaints &amp; Supervisory Authorities</h2>
      <p>
        If you believe our processing of your personal data violates regulations, you have the right
        to lodge a complaint with your local supervisory authority:
      </p>
      <ul>
        <li>
          Sweden: Integritetsskyddsmyndigheten (IMY) —{' '}
          <a href="https://www.imy.se" target="_blank" rel="noopener noreferrer">
            www.imy.se
          </a>
        </li>
        <li>
          Norway: Datatilsynet —{' '}
          <a href="https://www.datatilsynet.no" target="_blank" rel="noopener noreferrer">
            www.datatilsynet.no
          </a>
        </li>
        <li>
          Denmark: Datatilsynet —{' '}
          <a href="https://www.datatilsynet.dk" target="_blank" rel="noopener noreferrer">
            www.datatilsynet.dk
          </a>
        </li>
        <li>
          Finland: Data Ombudsman&apos;s Office —{' '}
          <a href="https://www.tietosuoja.fi" target="_blank" rel="noopener noreferrer">
            www.tietosuoja.fi
          </a>
        </li>
        <li>
          UK: Information Commissioner&apos;s Office (ICO) —{' '}
          <a href="https://www.ico.org.uk" target="_blank" rel="noopener noreferrer">
            www.ico.org.uk
          </a>
        </li>
        <li>
          United States (Federal): Federal Trade Commission (FTC) —{' '}
          <a href="https://www.ftc.gov" target="_blank" rel="noopener noreferrer">
            www.ftc.gov
          </a>
        </li>
        <li>
          United States (California): California Privacy Protection Agency (CPPA) —{' '}
          <a href="https://cppa.ca.gov" target="_blank" rel="noopener noreferrer">
            cppa.ca.gov
          </a>{' '}
          or California Office of the Attorney General —{' '}
          <a href="https://oag.ca.gov/privacy" target="_blank" rel="noopener noreferrer">
            oag.ca.gov/privacy
          </a>
        </li>
      </ul>

      <h2>13. Updates to This Policy</h2>
      <p>
        We may update this policy periodically to reflect changes in our Service or legal
        requirements. Material updates will be notified via email or prominently announced in the
        Service at least 14 days prior to taking effect.
      </p>
    </LegalDoc>
  );
}
