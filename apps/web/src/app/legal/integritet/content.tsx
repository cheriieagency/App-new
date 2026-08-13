'use client';

import { LegalDoc, LegalH2 } from '@/components/legal/LegalDoc';

export default function IntegritetContent() {
  return (
    <LegalDoc doc="privacy" updated="August 10, 2026">
      <p>
        This Privacy Policy describes how clikd:, provided and operated by Cheriie AB (org. nr:
        559527-2393, VAT: SE559527239301, &quot;we&quot;, &quot;us&quot;, &quot;our&quot;),
        collects, uses, stores, and protects your personal data when you use our website (
        <a href="https://clikd.app">https://clikd.app</a>), applications, social media planning
        tools, bio storefronts, member communities, AI copilot features, custom domain services, and
        associated services (&quot;the Service&quot;).
      </p>
      <p>
        We respect your personal privacy and process all personal data in compliance with the EU
        General Data Protection Regulation (GDPR), UK GDPR, and applicable global data protection
        legislation.
      </p>

      <LegalH2 section="privacyS1" />
      <p>
        Cheriie AB is the Data Controller responsible for processing your personal data on the
        clikd: platform.
      </p>
      <ul>
        <li>
          <strong>Legal Entity:</strong> Cheriie AB
        </li>
        <li>
          <strong>Org. nr:</strong> 559527-2393
        </li>
        <li>
          <strong>VAT Registration Number:</strong> SE559527239301
        </li>
        <li>
          <strong>Registered Address:</strong> Sturegatan 18 A, 211 50 Malmö, Sweden
        </li>
        <li>
          <strong>Official Website:</strong>{' '}
          <a href="https://clikd.app">https://clikd.app</a>
        </li>
        <li>
          <strong>Privacy, Legal &amp; GDPR Contact:</strong>{' '}
          <a href="mailto:hello@clikd.app">hello@clikd.app</a>
        </li>
        <li>
          <strong>Support Inquiries:</strong>{' '}
          <a href="mailto:hello@clikd.app">hello@clikd.app</a>
        </li>
      </ul>

      <LegalH2 section="privacyS2" />
      <p>
        We collect data directly provided by you, data generated through your use of the Service,
        and data received from third-party social media and AI platforms that you choose to connect
        to your account.
      </p>

      <h3 className="font-outfit font-extrabold text-base text-slate-900 tracking-tight mt-4 mb-2">
        A. Account, Profile &amp; Custom Domain Information
      </h3>
      <p>
        Name, email address, encrypted password, profile avatar, username/handle, and preferred
        language.
      </p>
      <p>
        For PRO Users: Custom domain names (e.g., yourname.se), CNAME/A-record verification states,
        and Vercel SSL routing status.
      </p>
      <p>
        For Creators: Business details, tax registration number / personal identity number (for
        identity verification), VAT registration number, and billing address.
      </p>

      <h3 className="font-outfit font-extrabold text-base text-slate-900 tracking-tight mt-4 mb-2">
        B. AI Copilot &amp; Prompt Inputs (OpenAI API)
      </h3>
      <p>
        When you use our AI Copilot tools (such as automated social caption generation, content
        polishing, or AI member Q&amp;A), we process the text prompts, tone selections, and topic
        inputs you provide.
      </p>
      <p>
        Note: AI inputs are processed transiently via the official OpenAI API to generate response
        content and are not used by us or OpenAI to train public AI models.
      </p>

      <h3 className="font-outfit font-extrabold text-base text-slate-900 tracking-tight mt-4 mb-2">
        C. Payment &amp; Transaction Data
      </h3>
      <p>
        When purchasing subscriptions, digital products, or community memberships, we collect
        transaction history, purchase amounts, and chosen payment methods (Swish, Vipps, Card, or
        Bank Transfer).
      </p>
      <p>
        Note: All card and direct payments are securely processed by our certified payment partners
        (Stripe, Swish). clikd: and Cheriie AB never store full credit card numbers or sensitive
        banking details on our servers.
      </p>

      <h3 className="font-outfit font-extrabold text-base text-slate-900 tracking-tight mt-4 mb-2">
        D. Social Media &amp; Direct Messaging Data (APIs)
      </h3>
      <p>
        When you connect third-party platforms (Instagram, Facebook, TikTok, Pinterest, YouTube,
        LinkedIn) to our Content Planner, Social Inbox, and Analytics Suite, we collect:
      </p>
      <ul>
        <li>
          User ID, account handle, profile picture, follower counts, and valid OAuth access tokens.
        </li>
        <li>
          Scheduled media (images, videos, captions, hashtags, Pinterest Pins, TikTok drafts).
        </li>
        <li>
          Performance and analytics data (impressions, reach, clicks, video views, engagement rates).
        </li>
        <li>
          <strong>Direct Messaging Data (Instagram DMs &amp; Meta Messenger):</strong> When enabled
          for your Social Inbox or automated comment-to-DM flows, we process incoming message text,
          sender handles, and automated response triggers.
        </li>
      </ul>

      <LegalH2 section="privacyS3" />
      <p>
        To provide multi-channel scheduling, messaging, and AI generation, clikd: integrates with
        official third-party APIs. By connecting your accounts, you agree to the processing of data
        in accordance with each platform&apos;s respective terms:
      </p>

      <h3 className="font-outfit font-extrabold text-base text-slate-900 tracking-tight mt-4 mb-2">
        A. OpenAI API (AI Copilot Suite)
      </h3>
      <p>
        We utilize the OpenAI API (gpt-4o-mini / gpt-4o) for social caption generation and AI
        assistants. Data sent to OpenAI is governed by OpenAI&apos;s Business Privacy Policy.
      </p>

      <h3 className="font-outfit font-extrabold text-base text-slate-900 tracking-tight mt-4 mb-2">
        B. Pinterest API
      </h3>
      <p>
        We utilize the Pinterest Developer API (boards:read, boards:write, pins:read, pins:write) to
        publish and schedule Pins. Your interaction with Pinterest is subject to the Pinterest
        Privacy Policy.
      </p>

      <h3 className="font-outfit font-extrabold text-base text-slate-900 tracking-tight mt-4 mb-2">
        C. TikTok API (Display &amp; Content Posting API)
      </h3>
      <p>
        Data received from TikTok (account stats, video lists, Direct Post uploads) is processed in
        accordance with the TikTok Privacy Policy.
      </p>

      <h3 className="font-outfit font-extrabold text-base text-slate-900 tracking-tight mt-4 mb-2">
        D. Meta (Instagram Graph API, Facebook &amp; Messenger API)
      </h3>
      <p>
        We process Meta data strictly in compliance with Meta&apos;s Platform Terms. To request
        automated deletion of your Meta data, visit{' '}
        <a href="https://clikd.app/api/auth/data-deletion">
          https://clikd.app/api/auth/data-deletion
        </a>{' '}
        or contact <a href="mailto:hello@clikd.app">hello@clikd.app</a>.
      </p>

      <h3 className="font-outfit font-extrabold text-base text-slate-900 tracking-tight mt-4 mb-2">
        E. YouTube API Services (Google)
      </h3>
      <p>
        Our Service utilizes YouTube API Services. By using YouTube features in clikd:, you agree to
        the{' '}
        <a href="https://www.youtube.com/t/terms" target="_blank" rel="noopener noreferrer">
          YouTube Terms of Service
        </a>{' '}
        and{' '}
        <a
          href="https://policies.google.com/privacy"
          target="_blank"
          rel="noopener noreferrer"
        >
          Google Privacy Policy
        </a>
        . Manage access via{' '}
        <a
          href="https://myaccount.google.com/permissions"
          target="_blank"
          rel="noopener noreferrer"
        >
          Google Security Settings
        </a>
        .
      </p>

      <LegalH2 section="privacyS4" />
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
                Provide &amp; Operate the Service (Planner, Bio Store, Community, Custom Domains)
              </td>
              <td className="px-3 py-2.5">
                Account Details, Custom Domain Records, Usage Data
              </td>
              <td className="px-3 py-2.5">Performance of a Contract (Art. 6.1 b)</td>
            </tr>
            <tr className="border-b border-slate-100 align-top">
              <td className="px-3 py-2.5">AI Content Generation &amp; Assistance</td>
              <td className="px-3 py-2.5">Text Prompts, Topic Inputs, Tone Preferences</td>
              <td className="px-3 py-2.5">Performance of a Contract (Initiated by User)</td>
            </tr>
            <tr className="border-b border-slate-100 align-top">
              <td className="px-3 py-2.5">Process Payments, Payouts &amp; Taxes</td>
              <td className="px-3 py-2.5">Payment &amp; Transaction Data, Billing Address</td>
              <td className="px-3 py-2.5">
                Performance of a Contract &amp; Legal Obligation (Accounting Laws)
              </td>
            </tr>
            <tr className="border-b border-slate-100 align-top">
              <td className="px-3 py-2.5">Social Media &amp; Pinterest Publishing</td>
              <td className="px-3 py-2.5">API Tokens, Scheduled Pins/Posts, Captions</td>
              <td className="px-3 py-2.5">Performance of a Contract (Initiated by User)</td>
            </tr>
            <tr className="border-b border-slate-100 align-top">
              <td className="px-3 py-2.5">Social Inbox &amp; Automated Direct Messaging</td>
              <td className="px-3 py-2.5">Message Sender Handles, Message Content</td>
              <td className="px-3 py-2.5">Legitimate Interest / Contract</td>
            </tr>
            <tr className="align-top">
              <td className="px-3 py-2.5">Customer Support, Debugging &amp; Security</td>
              <td className="px-3 py-2.5">Account Data, IP Address, Technical Logs</td>
              <td className="px-3 py-2.5">Legitimate Interest (Art. 6.1 f)</td>
            </tr>
          </tbody>
        </table>
      </div>

      <LegalH2 section="privacyS5" />
      <p>
        We never sell your personal data. We share data only with trusted third-party sub-processors
        under strict Data Processing Agreements (DPA):
      </p>
      <div className="overflow-x-auto rounded-2xl border border-slate-200/80">
        <table className="w-full min-w-[560px] text-left text-sm border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-900">
              <th className="px-3 py-2.5 font-extrabold border-b border-slate-200">Sub-processor</th>
              <th className="px-3 py-2.5 font-extrabold border-b border-slate-200">Purpose</th>
              <th className="px-3 py-2.5 font-extrabold border-b border-slate-200">Location</th>
              <th className="px-3 py-2.5 font-extrabold border-b border-slate-200">
                Transfer Safeguard
              </th>
            </tr>
          </thead>
          <tbody className="text-slate-700">
            <tr className="border-b border-slate-100 align-top">
              <td className="px-3 py-2.5">Supabase Inc.</td>
              <td className="px-3 py-2.5">Relational Database, Auth &amp; Realtime</td>
              <td className="px-3 py-2.5">EU (Frankfurt)</td>
              <td className="px-3 py-2.5">GDPR DPA / EU Hosting</td>
            </tr>
            <tr className="border-b border-slate-100 align-top">
              <td className="px-3 py-2.5">Vercel Inc.</td>
              <td className="px-3 py-2.5">Web Application Hosting &amp; Custom Domain SSL</td>
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
              <td className="px-3 py-2.5">Payment Processing &amp; Subscription Billing</td>
              <td className="px-3 py-2.5">EU / USA</td>
              <td className="px-3 py-2.5">PCI-DSS Level 1 / DPA</td>
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
              <td className="px-3 py-2.5">Nordic VAT Calculation &amp; Invoice Sync</td>
              <td className="px-3 py-2.5">Sweden</td>
              <td className="px-3 py-2.5">Swedish Accounting Laws</td>
            </tr>
          </tbody>
        </table>
      </div>

      <LegalH2 section="privacyS6" />
      <p>You have the following rights regarding your personal data:</p>
      <ul>
        <li>
          <strong>Right of Access &amp; Portability:</strong> Request a copy or structured export of
          your personal data.
        </li>
        <li>
          <strong>Right to Rectification:</strong> Request correction of inaccurate information.
        </li>
        <li>
          <strong>Right to Erasure (&quot;Right to be Forgotten&quot;):</strong> Request deletion of
          your account and associated social API tokens.
        </li>
        <li>
          <strong>Right to Withdraw Consent / Disconnect:</strong> You can disconnect any social
          media account (Instagram, Pinterest, TikTok, YouTube, LinkedIn) at any time via Settings
          → Socials in your dashboard. This immediately deletes all stored OAuth tokens.
        </li>
      </ul>
      <p>
        To exercise your rights, contact{' '}
        <a href="mailto:hello@clikd.app">hello@clikd.app</a>. We respond to all requests within 30
        days.
      </p>

      <LegalH2 section="privacyS7" />
      <p>
        We may update this policy periodically to reflect platform enhancements or legal
        requirements. Material updates will be notified via email or displayed in the Service at
        least 14 days prior to taking effect.
      </p>
    </LegalDoc>
  );
}
