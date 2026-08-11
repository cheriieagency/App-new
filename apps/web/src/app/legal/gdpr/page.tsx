import type { Metadata } from 'next';
import { LegalDoc } from '@/components/legal/LegalDoc';

export const metadata: Metadata = {
  title: 'GDPR Compliance',
  description:
    'GDPR Compliance Statement & Data Processing Summary for Creators on clikd: — Controller vs Processor roles, DPA, security, and sub-processors.',
  alternates: { canonical: '/legal/gdpr' },
};

export default function GdprPage() {
  return (
    <LegalDoc titleKey="legalGdpr" updated="August 11, 2026">
      <p>
        At clikd: (<a href="https://clikd.app">https://clikd.app</a>), we are fully committed to
        protecting personal privacy, maintaining robust data security, and adhering strictly to the
        European Union General Data Protection Regulation (EU GDPR 2016/679) and UK GDPR.
      </p>
      <p>
        This GDPR Compliance Statement outlines our data protection framework, our dual roles under
        European privacy law, and how we empower creators (&quot;Sellers&quot;, &quot;Admins&quot;)
        to run compliant digital storefronts, courses, and member communities.
      </p>

      <h2>1. Dual Data Roles: Controller vs. Processor</h2>
      <p>
        Under Article 4 of the GDPR, data responsibilities depend on the relationship between
        clikd:, our Creators, and End-Customers (Members/Buyers):
      </p>

      <pre className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-slate-50 px-4 py-4 text-[11px] sm:text-xs leading-relaxed text-slate-700 font-mono whitespace-pre">
{`+---------------------------------------------------------------------------------+
|                                 clikd: PLATFORM                                 |
+---------------------------------------------------------------------------------+
          |                                                       |
          | (clikd: as DATA CONTROLLER)                           | (clikd: as DATA PROCESSOR)
          v                                                       v
+-----------------------------+                         +-----------------------------+
|   CREATOR ACCOUNT DATA      |                         |   END-CUSTOMER / MEMBER DATA|
| (Name, Billing, API Tokens) |                         | (Course progress, Purchases)|
+-----------------------------+                         +-----------------------------+`}
      </pre>

      <h3 className="font-outfit font-extrabold text-base text-slate-900 tracking-tight mt-4 mb-2">
        A. clikd: as Data Controller
      </h3>
      <p>
        We act as the Data Controller for the personal data of our registered Creators and direct
        platform users. This includes account credentials, billing details, connected social media
        API tokens, and platform analytics.
      </p>
      <p>
        <strong>Legal Basis:</strong> Performance of a Contract (Art. 6.1 b), Legal Obligations
        (Accounting Laws), and Legitimate Interest.
      </p>

      <h3 className="font-outfit font-extrabold text-base text-slate-900 tracking-tight mt-4 mb-2">
        B. clikd: as Data Processor (for Creators)
      </h3>
      <p>
        When Creators host digital storefronts, sell masterclasses, or build communities on clikd:,
        the Creator acts as the Data Controller for their End-Customers&apos; data (e.g., Member
        emails, course progress, purchase history). clikd: acts as the Data Processor, processing
        End-Customer data solely on the Creator&apos;s behalf and according to their instructions.
      </p>

      <h2>2. Data Processing Agreement (DPA)</h2>
      <p>
        By creating a Creator workspace on clikd:, Creators enter into our standard Data Processing
        Agreement (DPA) incorporated into our Terms of Service pursuant to Article 28 of the GDPR.
      </p>
      <p>Under this DPA, clikd: guarantees that we will:</p>
      <ul>
        <li>
          Process End-Customer personal data strictly to provide, maintain, and secure the
          Creator&apos;s workspace, storefront, and community.
        </li>
        <li>
          Ensure that all personnel authorized to process personal data have committed themselves to
          strict confidentiality.
        </li>
        <li>
          Implement technical and organizational security measures meeting or exceeding Article 32
          GDPR standards.
        </li>
        <li>
          Assist Creators in responding to data subjects exercising their GDPR rights (e.g., access,
          deletion, portability).
        </li>
        <li>
          Notify Creators without undue delay (and no later than 72 hours) upon becoming aware of a
          personal data breach.
        </li>
      </ul>

      <h2>3. Technical &amp; Organizational Security Measures (Art. 32 GDPR)</h2>
      <p>
        We employ bank-grade security protocols to protect all personal data stored across our
        infrastructure:
      </p>
      <ul>
        <li>
          <strong>Data Encryption in Transit:</strong> All traffic is encrypted using TLS 1.3 /
          HTTPS protocols with strict HSTS policies.
        </li>
        <li>
          <strong>Data Encryption at Rest:</strong> Database storage and automated backups are
          encrypted using AES-256 encryption.
        </li>
        <li>
          <strong>Infrastructure Location:</strong> Primary database and hosting infrastructure are
          hosted within the European Economic Area (EU/EEA) via certified sub-processors (Supabase
          and Vercel).
        </li>
        <li>
          <strong>API OAuth Token Security:</strong> Third-party access tokens (Meta Graph API,
          TikTok API, YouTube API) are encrypted using environment-isolated vault keys.
        </li>
        <li>
          <strong>Access Control &amp; Least Privilege:</strong> Multi-factor authentication (MFA)
          and strict role-based access control (RBAC) govern internal administrative access.
        </li>
      </ul>

      <h2>4. Sub-processors</h2>
      <p>
        To provide high-performance scheduling, secure mobile payments, and automated accounting,
        clikd: engages trusted third-party sub-processors. All sub-processors are vetted and bound by
        Data Processing Agreements (DPAs) with European Standard Contractual Clauses (SCCs) or
        adequacy decisions:
      </p>
      <div className="overflow-x-auto rounded-2xl border border-slate-200/80">
        <table className="w-full min-w-[640px] text-left text-sm border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-900">
              <th className="px-3 py-2.5 font-extrabold border-b border-slate-200">
                Sub-processor
              </th>
              <th className="px-3 py-2.5 font-extrabold border-b border-slate-200">Purpose</th>
              <th className="px-3 py-2.5 font-extrabold border-b border-slate-200">
                Location of Processing
              </th>
              <th className="px-3 py-2.5 font-extrabold border-b border-slate-200">
                Safeguard Mechanism
              </th>
            </tr>
          </thead>
          <tbody className="text-slate-700">
            <tr className="border-b border-slate-100 align-top">
              <td className="px-3 py-2.5">Supabase Inc.</td>
              <td className="px-3 py-2.5">Relational Database &amp; Authentication</td>
              <td className="px-3 py-2.5">EU (Frankfurt / Dublin)</td>
              <td className="px-3 py-2.5">GDPR DPA / EU Hosting</td>
            </tr>
            <tr className="border-b border-slate-100 align-top">
              <td className="px-3 py-2.5">Vercel Inc.</td>
              <td className="px-3 py-2.5">Web Application Hosting &amp; CDN</td>
              <td className="px-3 py-2.5">EU / Global Edge</td>
              <td className="px-3 py-2.5">EU-U.S. Data Privacy Framework / SCCs</td>
            </tr>
            <tr className="border-b border-slate-100 align-top">
              <td className="px-3 py-2.5">Stripe Inc.</td>
              <td className="px-3 py-2.5">Card &amp; Direct Debit Payment Processing</td>
              <td className="px-3 py-2.5">EU / US</td>
              <td className="px-3 py-2.5">PCI-DSS Level 1 / SCCs</td>
            </tr>
            <tr className="border-b border-slate-100 align-top">
              <td className="px-3 py-2.5">Swish (Hippo/Banker)</td>
              <td className="px-3 py-2.5">Mobile BankID &amp; 1-Tap Swish Payments</td>
              <td className="px-3 py-2.5">Sweden</td>
              <td className="px-3 py-2.5">Swedish Banking Standards</td>
            </tr>
            <tr className="border-b border-slate-100 align-top">
              <td className="px-3 py-2.5">Vipps MobilePay</td>
              <td className="px-3 py-2.5">Nordic Mobile Payments</td>
              <td className="px-3 py-2.5">Norway / Denmark</td>
              <td className="px-3 py-2.5">Nordic Financial Regulation</td>
            </tr>
            <tr className="align-top">
              <td className="px-3 py-2.5">Fortnox AB</td>
              <td className="px-3 py-2.5">Automated VAT Calculation &amp; Invoice Sync</td>
              <td className="px-3 py-2.5">Sweden</td>
              <td className="px-3 py-2.5">Swedish Statutory Accounting Laws</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2>5. Fulfilling End-Customer Rights (Data Subject Requests)</h2>
      <p>
        Creators hosting communities or storefronts on clikd: can easily assist their End-Customers
        in exercising their GDPR rights directly through the Creator Dashboard:
      </p>
      <ul>
        <li>
          <strong>Right of Access &amp; Portability:</strong> Creators can export member subscriber
          lists, transaction histories, and course completion records in CSV/JSON formats at any
          time.
        </li>
        <li>
          <strong>Right to Erasure (&quot;Right to be Forgotten&quot;):</strong> When an End-Customer
          requests data deletion, Creators can trigger an account erasure. Associated profile details
          and API tokens are deleted or permanently anonymized within 30 days.
        </li>
        <li>
          <strong>Meta Data Deletion Callback:</strong> End-Customers who interacted via
          Meta/Instagram can track automated data deletion at{' '}
          <a href="https://clikd.app/api/auth/data-deletion">
            https://clikd.app/api/auth/data-deletion
          </a>
          .
        </li>
      </ul>

      <h2>6. International Data Transfers</h2>
      <p>
        Whenever personal data is transferred outside the European Economic Area (EEA) or the United
        Kingdom, clikd: ensures appropriate transfer mechanisms under Chapter V of the GDPR are in
        place, including:
      </p>
      <ul>
        <li>European Commission Adequacy Decisions.</li>
        <li>Standard Contractual Clauses (SCCs) approved by the European Commission.</li>
        <li>Participation in the EU-U.S. Data Privacy Framework.</li>
      </ul>

      <h2>7. Data Protection Contact &amp; DPO Inquiries</h2>
      <p>
        For any GDPR-related inquiries, Data Processing Agreement requests, or Supervisory Authority
        communications, please contact our Data Protection Officer:
      </p>
      <ul>
        <li>
          Official Website: <a href="https://clikd.app">https://clikd.app</a>
        </li>
        <li>
          Data Protection &amp; GDPR Team:{' '}
          <a href="mailto:privacy@clikd.app">privacy@clikd.app</a>
        </li>
        <li>
          Legal &amp; Compliance: <a href="mailto:legal@clikd.app">legal@clikd.app</a>
        </li>
      </ul>
      <p>
        See also our <a href="/legal/integritet">Privacy Policy</a> and{' '}
        <a href="/legal/villkor">Terms of Service</a>.
      </p>
    </LegalDoc>
  );
}
