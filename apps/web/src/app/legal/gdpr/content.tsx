'use client';

import { LegalDoc, LegalH2 } from '@/components/legal/LegalDoc';

export default function GdprContent() {
  return (
    <LegalDoc doc="gdpr" updated="August 10, 2026">
      <p>
        At clikd: (<a href="https://clikd.app">https://clikd.app</a>), operated by Cheriie AB (org.
        nr: 559527-2393, VAT: SE559527239301, Sturegatan 18 A, 211 50 Malmö, Sweden), we are
        committed to protecting personal privacy, maintaining robust data security, and adhering
        strictly to the European Union General Data Protection Regulation (EU GDPR 2016/679) and UK
        GDPR.
      </p>
      <p>
        This GDPR Statement outlines our data protection framework, our roles under European privacy
        law, and how we empower Creators (&quot;Sellers&quot;, &quot;Admins&quot;) to run compliant
        digital storefronts, communities, and multi-channel social workflows.
      </p>

      <LegalH2 section="gdprS1" />
      <pre className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-slate-50 px-4 py-4 text-[11px] sm:text-xs leading-relaxed text-slate-700 font-mono whitespace-pre">
{`+---------------------------------------------------------------------------------+
|                        Cheriie AB / clikd: PLATFORM                             |
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
        Cheriie AB acts as the Data Controller for the personal data of our registered Creators and
        direct platform users (account credentials, billing details, custom domain routing, connected
        social API tokens, and AI prompt logs).
      </p>

      <h3 className="font-outfit font-extrabold text-base text-slate-900 tracking-tight mt-4 mb-2">
        B. clikd: as Data Processor (for Creators)
      </h3>
      <p>
        When Creators host digital storefronts, sell courses, or build communities on clikd:, the
        Creator acts as the Data Controller for their End-Customers&apos; data. Cheriie AB acts as
        the Data Processor, processing End-Customer data solely on the Creator&apos;s behalf pursuant
        to Article 28 GDPR.
      </p>

      <LegalH2 section="gdprS2" />
      <ul>
        <li>
          <strong>Encryption in Transit:</strong> All web and API traffic is encrypted using TLS 1.3
          / HTTPS with HSTS enforcement.
        </li>
        <li>
          <strong>Custom Domain SSL:</strong> Automated SSL certificates are provisioned for all PRO
          custom domains via Vercel Edge API.
        </li>
        <li>
          <strong>Encryption at Rest:</strong> Primary PostgreSQL databases (Supabase EU) and
          automated backups are encrypted using AES-256.
        </li>
        <li>
          <strong>API Vault Isolation:</strong> Third-party OAuth tokens (Meta, Pinterest, TikTok,
          YouTube, OpenAI) are encrypted and stored in environment-isolated vaults.
        </li>
        <li>
          <strong>AI Data Privacy:</strong> Text prompts sent to the OpenAI API are processed in
          ephemeral sessions and never used to train public LLM models.
        </li>
      </ul>

      <LegalH2 section="gdprS3" />
      <div className="overflow-x-auto rounded-2xl border border-slate-200/80">
        <table className="w-full min-w-[640px] text-left text-sm border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-900">
              <th className="px-3 py-2.5 font-extrabold border-b border-slate-200">
                Sub-processor
              </th>
              <th className="px-3 py-2.5 font-extrabold border-b border-slate-200">Purpose</th>
              <th className="px-3 py-2.5 font-extrabold border-b border-slate-200">
                Processing Location
              </th>
              <th className="px-3 py-2.5 font-extrabold border-b border-slate-200">
                Safeguard Mechanism
              </th>
            </tr>
          </thead>
          <tbody className="text-slate-700">
            <tr className="border-b border-slate-100 align-top">
              <td className="px-3 py-2.5">Supabase Inc.</td>
              <td className="px-3 py-2.5">Relational Database, Auth &amp; Realtime</td>
              <td className="px-3 py-2.5">EU (Frankfurt / Dublin)</td>
              <td className="px-3 py-2.5">GDPR DPA / EU Hosting</td>
            </tr>
            <tr className="border-b border-slate-100 align-top">
              <td className="px-3 py-2.5">Vercel Inc.</td>
              <td className="px-3 py-2.5">Web Application Hosting &amp; Custom Domain Routing</td>
              <td className="px-3 py-2.5">EU / Global Edge</td>
              <td className="px-3 py-2.5">EU-U.S. Data Privacy Framework</td>
            </tr>
            <tr className="border-b border-slate-100 align-top">
              <td className="px-3 py-2.5">OpenAI LLC</td>
              <td className="px-3 py-2.5">AI Copilot Text Generation</td>
              <td className="px-3 py-2.5">USA</td>
              <td className="px-3 py-2.5">Data Privacy Framework / DPA</td>
            </tr>
            <tr className="border-b border-slate-100 align-top">
              <td className="px-3 py-2.5">Stripe Inc.</td>
              <td className="px-3 py-2.5">Card &amp; Subscription Payment Processing</td>
              <td className="px-3 py-2.5">EU / USA</td>
              <td className="px-3 py-2.5">PCI-DSS Level 1 / DPA</td>
            </tr>
            <tr className="border-b border-slate-100 align-top">
              <td className="px-3 py-2.5">Swish (Hippo/Banker)</td>
              <td className="px-3 py-2.5">Mobile BankID &amp; 1-Tap Swish Payments</td>
              <td className="px-3 py-2.5">Sweden</td>
              <td className="px-3 py-2.5">Swedish Banking Standards</td>
            </tr>
            <tr className="border-b border-slate-100 align-top">
              <td className="px-3 py-2.5">Meta Platforms Inc.</td>
              <td className="px-3 py-2.5">Instagram, Facebook &amp; Messenger API</td>
              <td className="px-3 py-2.5">EU / USA</td>
              <td className="px-3 py-2.5">Meta Platform Terms / SCCs</td>
            </tr>
            <tr className="border-b border-slate-100 align-top">
              <td className="px-3 py-2.5">TikTok Inc.</td>
              <td className="px-3 py-2.5">TikTok Content Posting &amp; Analytics API</td>
              <td className="px-3 py-2.5">EU / USA</td>
              <td className="px-3 py-2.5">TikTok Developer DPA</td>
            </tr>
            <tr className="border-b border-slate-100 align-top">
              <td className="px-3 py-2.5">Pinterest Inc.</td>
              <td className="px-3 py-2.5">Pinterest Pin Publishing &amp; Board API</td>
              <td className="px-3 py-2.5">USA</td>
              <td className="px-3 py-2.5">Pinterest Developer Terms</td>
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

      <LegalH2 section="gdprS4" />
      <p>
        Creators can export subscriber lists, member directories, and transaction histories in CSV/JSON
        format at any time. When an End-Customer or Creator requests account erasure (&quot;Right to
        be Forgotten&quot;), associated profiles and API tokens are deleted or permanently
        anonymized within 30 days.
      </p>
      <p>
        For any GDPR inquiries, contact Cheriie AB&apos;s Data Protection Team at{' '}
        <a href="mailto:hello@clikd.app">hello@clikd.app</a>.
      </p>
      <p>
        See also our <a href="/legal/integritet">Privacy Policy</a> and{' '}
        <a href="/legal/villkor">Terms of Service</a>.
      </p>
    </LegalDoc>
  );
}
