'use client';

import { LegalDoc, LegalH2 } from '@/components/legal/LegalDoc';

export default function VillkorContent() {
  return (
    <LegalDoc doc="terms" updated="August 11, 2026">
      <p>
        Welcome to clikd: (<a href="https://clikd.app">https://clikd.app</a>). These Terms of Service
        (&quot;Terms&quot;, &quot;Agreement&quot;) govern your access to and use of the website,
        mobile applications, social media planning tools, bio storefronts, member communities, AI
        copilot features, and associated services (collectively, the &quot;Service&quot;) provided by
        clikd: (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;).
      </p>
      <p>
        By creating an account, accessing, or using the Service, you agree to be bound by this
        Agreement. If you do not agree to these Terms, you must not use the Service.
      </p>

      <LegalH2 section="termsS1" />
      <p>
        clikd: is an all-in-one creator engine and workspace platform that enables creators to plan
        and schedule social media content, host link-in-bio storefronts, sell digital products and
        courses, host member communities and events, and accept mobile payments.
      </p>

      <h3 className="font-outfit font-extrabold text-base text-slate-900 tracking-tight mt-4 mb-2">
        A. User Roles
      </h3>
      <ul>
        <li>
          <strong>Creators (&quot;Sellers&quot;, &quot;Admins&quot;):</strong> Users who establish a
          workspace on clikd: to publish social content, sell digital products, host communities, or
          conduct live webinars.
        </li>
        <li>
          <strong>Members (&quot;End-Customers&quot;, &quot;Buyers&quot;):</strong> Users who join a
          Creator&apos;s community, purchase digital products, or interact with a Creator&apos;s bio
          storefront.
        </li>
      </ul>

      <LegalH2 section="termsS2" />
      <ul>
        <li>
          <strong>Age Requirement:</strong> You must be at least 18 years old (or the legal age of
          majority in your jurisdiction) to create a Creator account or purchase paid subscriptions.
        </li>
        <li>
          <strong>Account Accuracy:</strong> You agree to provide accurate, complete, and up-to-date
          information during registration and keep your account details updated.
        </li>
        <li>
          <strong>Account Security:</strong> You are responsible for safeguarding your login
          credentials and for all activities that occur under your account. You must notify us
          immediately at <a href="mailto:legal@clikd.app">legal@clikd.app</a> if you suspect
          unauthorized access.
        </li>
        <li>
          <strong>Identity Verification:</strong> Creators selling products or accepting payouts may
          be required to verify their identity via Mobile BankID, personal identity number, VAT
          registration, or government-issued ID in accordance with Anti-Money Laundering (AML) and
          Know Your Customer (KYC) regulations.
        </li>
      </ul>

      <LegalH2 section="termsS3" />
      <p>
        To enable social media planning, cross-posting, previewing, and analytics, clikd: integrates
        with official third-party platform APIs. By connecting your social media accounts to the
        Service, you acknowledge and agree to comply with the terms of each respective platform:
      </p>

      <h3 className="font-outfit font-extrabold text-base text-slate-900 tracking-tight mt-4 mb-2">
        A. YouTube API Services (Google)
      </h3>
      <ul>
        <li>
          The Service utilizes YouTube API Services for short scheduling, video previews, and channel
          metrics.
        </li>
        <li>
          By using YouTube features in clikd:, you agree to be bound by the{' '}
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
          You can manage or revoke clikd:&apos;s access to your Google/YouTube data at any time via{' '}
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
      <p>
        By connecting Meta accounts, you agree to comply with Meta&apos;s Platform Terms and
        Developer Policies. You may request data deletion at any time via our automated callback at{' '}
        <a href="https://clikd.app/api/auth/data-deletion">
          https://clikd.app/api/auth/data-deletion
        </a>
        .
      </p>

      <h3 className="font-outfit font-extrabold text-base text-slate-900 tracking-tight mt-4 mb-2">
        C. TikTok API &amp; LinkedIn API
      </h3>
      <p>
        Data received from TikTok and LinkedIn is processed solely to perform scheduled publishing,
        post previews, and analytics as authorized by you.
      </p>

      <LegalH2 section="termsS4" />

      <h3 className="font-outfit font-extrabold text-base text-slate-900 tracking-tight mt-4 mb-2">
        A. Creator as Seller of Record
      </h3>
      <p>
        Creators who sell digital products, masterclasses, memberships, or coaching slots through
        clikd: act as the Seller of Record for those products to their Members/End-Customers. clikd:
        provides the software infrastructure and payment gateway integrations but is not the seller
        or publisher of Creator products.
      </p>

      <h3 className="font-outfit font-extrabold text-base text-slate-900 tracking-tight mt-4 mb-2">
        B. Creator Responsibilities to End-Customers
      </h3>
      <p>Creators are solely responsible for:</p>
      <ul>
        <li>
          The quality, accuracy, legality, and fulfillment of their digital products, courses, and
          community content.
        </li>
        <li>
          Providing customer support, handling refund requests, and communicating clear terms to
          their End-Customers.
        </li>
        <li>
          Complying with consumer protection laws, mandatory withdrawal rights (e.g., EU 14-day right
          of withdrawal for digital goods), and marketing regulations.
        </li>
      </ul>

      <h3 className="font-outfit font-extrabold text-base text-slate-900 tracking-tight mt-4 mb-2">
        C. Refunds &amp; Disputed Charges
      </h3>
      <ul>
        <li>
          <strong>End-Customer Refunds:</strong> End-Customers seeking refunds for Creator products
          must contact the Creator directly. clikd: reserves the right to issue refunds on behalf of
          Creators in cases of fraud, unauthorized transactions, or gross violation of these Terms.
        </li>
        <li>
          <strong>Chargebacks:</strong> Creators are responsible for chargebacks, dispute fees, or
          failed transactions associated with their storefronts.
        </li>
      </ul>

      <LegalH2 section="termsS5" />

      <h3 className="font-outfit font-extrabold text-base text-slate-900 tracking-tight mt-4 mb-2">
        A. Subscription Plans for Creators
      </h3>
      <p>
        clikd: offers Free, Creator, and Pro subscription tiers. Fees are billed in advance on a
        recurring monthly or annual basis via card or direct payment.
      </p>
      <p>
        <strong>Cancellation:</strong> You may cancel your Creator subscription at any time via
        Settings → Billing. Your access remains active until the end of the current billing cycle.
      </p>

      <h3 className="font-outfit font-extrabold text-base text-slate-900 tracking-tight mt-4 mb-2">
        B. Transaction Fees
      </h3>
      <p>
        Depending on your subscription plan, clikd: may deduct a platform transaction fee (e.g.,
        0%–8%) on sales generated through your storefront or community, in addition to third-party
        payment processing fees (Stripe, Checkout, Mobile).
      </p>

      <h3 className="font-outfit font-extrabold text-base text-slate-900 tracking-tight mt-4 mb-2">
        C. Payouts (Outpayments)
      </h3>
      <ul>
        <li>
          Accumulated earnings from product sales and community subscriptions are held in your clikd:
          creator wallet balance.
        </li>
        <li>
          Payouts are transferred to your connected bank account (via IBAN/Clearing) upon request or
          according to automated payout schedules, subject to minimum payout thresholds and identity
          verification.
        </li>
      </ul>

      <h3 className="font-outfit font-extrabold text-base text-slate-900 tracking-tight mt-4 mb-2">
        D. Taxes &amp; Nordic VAT
      </h3>
      <ul>
        <li>
          Creators are solely responsible for calculating, reporting, and remitting applicable income
          tax, local sales tax, and Value Added Tax (VAT) on their earnings.
        </li>
        <li>
          clikd: provides automated VAT calculation tools (e.g., 6% for e-books/publications, 25% for
          digital services/courses) and accounting sync integrations (e.g., Fortnox) to assist
          Creators with compliance.
        </li>
      </ul>

      <LegalH2 section="termsS6" />

      <h3 className="font-outfit font-extrabold text-base text-slate-900 tracking-tight mt-4 mb-2">
        A. Creator Content Ownership
      </h3>
      <p>
        You retain full ownership of all text, images, videos, audio, courses, captions, and brand
        assets (&quot;User Content&quot;) that you upload, schedule, or publish through the Service.
        clikd: does not claim ownership over your User Content.
      </p>

      <h3 className="font-outfit font-extrabold text-base text-slate-900 tracking-tight mt-4 mb-2">
        B. License Grant to clikd:
      </h3>
      <p>
        You grant clikd: a worldwide, non-exclusive, royalty-free, limited license to host, store,
        display, reformat, and transmit your User Content solely as necessary to provide, operate,
        and maintain the Service (including scheduling posts to connected social platforms).
      </p>

      <h3 className="font-outfit font-extrabold text-base text-slate-900 tracking-tight mt-4 mb-2">
        C. Content Warranties
      </h3>
      <p>You represent and warrant that:</p>
      <ul>
        <li>
          You own or possess all necessary licenses, rights, consents, and permissions (including
          music, image, and trademark rights) for all content you upload or schedule.
        </li>
        <li>
          Your content does not infringe upon any third-party intellectual property, privacy, or
          publicity rights.
        </li>
      </ul>

      <h3 className="font-outfit font-extrabold text-base text-slate-900 tracking-tight mt-4 mb-2">
        D. clikd: Intellectual Property
      </h3>
      <p>
        The Service, brand name, wordmark (clikd:), software code, visual design system, trademarks,
        and logos are the exclusive property of clikd:. You may not copy, modify, reverse engineer,
        or use our brand assets without prior written consent.
      </p>

      <LegalH2 section="termsS7" />
      <p>You agree not to use the Service to:</p>
      <ul>
        <li>
          Upload, schedule, or sell illegal, fraudulent, defamatory, hateful, harassing, or sexually
          explicit content.
        </li>
        <li>Infringe on copyright, trademark, or proprietary rights of others.</li>
        <li>
          Transmit unsolicited commercial communications, spam, or malicious code (viruses, malware).
        </li>
        <li>
          Interfere with or compromise the security, integrity, or performance of the Service.
        </li>
        <li>
          Attempt to gain unauthorized access to other accounts or system infrastructure.
        </li>
      </ul>
      <p>
        We reserve the right to suspend or terminate accounts that violate this Acceptable Use Policy
        without prior notice.
      </p>

      <LegalH2 section="termsS8" />
      <p className="uppercase tracking-wide text-[13px] sm:text-sm leading-relaxed">
        The Service is provided on an &quot;as is&quot; and &quot;as available&quot; basis, without
        warranties of any kind, express or implied, including but not limited to warranties of
        merchantability, fitness for a particular purpose, non-infringement, or uninterrupted
        availability.
      </p>
      <p className="uppercase tracking-wide text-[13px] sm:text-sm leading-relaxed">
        We do not guarantee that third-party social media platforms (Instagram, TikTok, YouTube,
        LinkedIn) will accept or publish all scheduled posts without API interruptions.
      </p>

      <LegalH2 section="termsS9" />
      <p className="uppercase tracking-wide text-[13px] sm:text-sm leading-relaxed">
        To the maximum extent permitted by applicable law, clikd:, its directors, employees, and
        partners shall not be liable for any indirect, incidental, consequential, special, or
        punishable damages, including loss of profits, data, goodwill, or business interruption
        arising from:
      </p>
      <ul className="uppercase tracking-wide text-[13px] sm:text-sm">
        <li>Your use or inability to use the Service.</li>
        <li>Unauthorized access to or alteration of your content or data.</li>
        <li>Products or services sold by Creators to End-Customers.</li>
        <li>
          Third-party API changes, outages, or account suspensions by social media platforms.
        </li>
      </ul>
      <p className="uppercase tracking-wide text-[13px] sm:text-sm leading-relaxed">
        In no event shall our total liability exceed the greater of 1,000 SEK or the total fees paid
        by you to clikd: in the twelve (12) months preceding the claim.
      </p>

      <LegalH2 section="termsS10" />
      <p>
        You agree to defend, indemnify, and hold harmless clikd: and its officers, directors,
        employees, and agents from any claims, liabilities, damages, losses, or expenses (including
        reasonable legal fees) arising out of or in connection with:
      </p>
      <ul>
        <li>Your breach of these Terms or applicable laws.</li>
        <li>Your User Content or products sold through your bio storefront/community.</li>
        <li>
          Disputes between you and your End-Customers or third-party social media platforms.
        </li>
      </ul>

      <LegalH2 section="termsS11" />

      <h3 className="font-outfit font-extrabold text-base text-slate-900 tracking-tight mt-4 mb-2">
        A. Governing Law
      </h3>
      <p>
        These Terms shall be governed by and construed in accordance with the laws of Sweden, without
        regard to its conflict of law principles.
      </p>

      <h3 className="font-outfit font-extrabold text-base text-slate-900 tracking-tight mt-4 mb-2">
        B. Dispute Resolution
      </h3>
      <ul>
        <li>
          <strong>Friendly Resolution:</strong> In the event of any controversy or claim, the parties
          shall first attempt in good faith to resolve the dispute informally by contacting{' '}
          <a href="mailto:legal@clikd.app">legal@clikd.app</a>.
        </li>
        <li>
          <strong>Jurisdiction:</strong> If a dispute cannot be resolved informally, it shall be
          submitted to the exclusive jurisdiction of the general courts of Sweden, with the District
          Court of Stockholm (Stockholms tingsrätt) as the court of first instance.
        </li>
        <li>
          <strong>EU Consumer Online Dispute Resolution:</strong> EU consumers may also submit
          complaints via the European Commission&apos;s ODR platform at{' '}
          <a
            href="https://ec.europa.eu/consumers/odr"
            target="_blank"
            rel="noopener noreferrer"
          >
            ec.europa.eu/consumers/odr
          </a>
          .
        </li>
      </ul>

      <LegalH2 section="termsS12" />
      <p>
        We may update these Terms periodically to reflect changes in our Service, legal requirements,
        or platform API policies. We will notify you of material changes by sending an email or by
        displaying a prominent notice within the Service at least 14 days before the updates take
        effect. Continued use of the Service after changes become effective constitutes acceptance of
        the revised Terms.
      </p>

      <LegalH2 section="termsS13" />
      <p>
        If you have any questions or legal inquiries regarding these Terms, please contact us at:
      </p>
      <ul>
        <li>
          Official Website: <a href="https://clikd.app">https://clikd.app</a>
        </li>
        <li>
          Legal &amp; Terms Inquiries:{' '}
          <a href="mailto:legal@clikd.app">legal@clikd.app</a>
        </li>
        <li>
          Privacy &amp; GDPR Inquiries:{' '}
          <a href="mailto:privacy@clikd.app">privacy@clikd.app</a>
        </li>
      </ul>
      <p>
        See also our <a href="/legal/integritet">Privacy Policy</a> and{' '}
        <a href="/legal/gdpr">GDPR</a> pages.
      </p>
    
    </LegalDoc>
  );
}
