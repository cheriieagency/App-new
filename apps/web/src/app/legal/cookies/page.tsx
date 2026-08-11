import type { Metadata } from 'next';
import { LegalDoc } from '@/components/legal/LegalDoc';

export const metadata: Metadata = {
  title: 'Cookie Policy',
  description:
    'Cookie Policy for clikd: (clikd.app) — how we use cookies, local storage, analytics, and third-party tracking technologies.',
  alternates: { canonical: '/legal/cookies' },
};

export default function CookiesPage() {
  return (
    <LegalDoc titleKey="legalCookies" updated="August 11, 2026">
      <p>
        This Cookie Policy explains how clikd: (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) uses
        cookies and similar tracking technologies when you visit or use our website (
        <a href="https://clikd.app">https://clikd.app</a>), mobile applications, social media
        planning tools, bio storefronts, member communities, and associated services (collectively,
        the &quot;Service&quot;).
      </p>
      <p>
        This policy should be read alongside our{' '}
        <a href="/legal/integritet">Privacy Policy</a> and{' '}
        <a href="/legal/villkor">Terms of Service</a>.
      </p>

      <h2>1. What Are Cookies and Tracking Technologies?</h2>
      <p>
        Cookies are small text files that are placed on your computer, smartphone, or other device
        when you visit a website. They are widely used to make websites work efficiently, improve
        user experience, remember preferences, and provide analytical information to website owners.
      </p>
      <p>In addition to cookies, we may use similar technologies such as:</p>
      <ul>
        <li>
          <strong>Local Storage / Session Storage:</strong> Web storage used to keep you
          authenticated and store workspace UI states without sending data back to the server on
          every request.
        </li>
        <li>
          <strong>Pixels / Web Beacons:</strong> Tiny transparent graphic images used to measure
          email open rates or campaign interactions.
        </li>
        <li>
          <strong>OAuth Tokens:</strong> Encrypted session keys used to maintain authorized
          connections to third-party social media APIs (e.g., Meta, TikTok, YouTube, LinkedIn).
        </li>
      </ul>

      <h2>2. How We Use Cookies</h2>
      <p>We use cookies and related technologies for the following core purposes:</p>
      <ul>
        <li>
          <strong>Authentication &amp; Security:</strong> Keeping you securely logged into your
          clikd: workspace and protecting your account against unauthorized access or cross-site
          request forgery (CSRF).
        </li>
        <li>
          <strong>Preference &amp; Workspace Management:</strong> Remembering your language settings
          (e.g., Swedish/English), selected active workspace, theme preferences, and UI states.
        </li>
        <li>
          <strong>Performance &amp; Infrastructure:</strong> Load balancing and monitoring the
          stability and speed of our platform through our EU-based hosting infrastructure.
        </li>
        <li>
          <strong>Analytics &amp; Platform Improvement:</strong> Understanding how users interact
          with our content planner, bio storefronts, and member communities to optimize platform
          features.
        </li>
      </ul>

      <h2>3. Categories of Cookies We Use</h2>

      <h3 className="font-outfit font-extrabold text-base text-slate-900 tracking-tight mt-4 mb-2">
        A. Strictly Necessary Cookies (Essential)
      </h3>
      <p>
        These cookies are essential for you to browse the website and use its features, such as
        accessing secure account dashboards, operating bio storefront checkouts, and navigating
        member portals. Without these cookies, the Service cannot function properly.
      </p>
      <ul>
        <li>
          <strong>Legal Basis:</strong> Performance of a Contract (Art. 6.1 b GDPR) / Legitimate
          Interest.
        </li>
        <li>
          <strong>Consent Required?</strong> No (exempt under EU ePrivacy Directive).
        </li>
      </ul>

      <h3 className="font-outfit font-extrabold text-base text-slate-900 tracking-tight mt-4 mb-2">
        B. Functional &amp; Preference Cookies
      </h3>
      <p>
        These cookies allow the Service to remember choices you make (such as your preferred
        language, active brand workspace, or customized bio link preview settings) to provide a more
        personalized experience.
      </p>
      <ul>
        <li>
          <strong>Legal Basis:</strong> Legitimate Interest / User Consent.
        </li>
        <li>
          <strong>Consent Required?</strong> Yes (managed via Cookie Banner).
        </li>
      </ul>

      <h3 className="font-outfit font-extrabold text-base text-slate-900 tracking-tight mt-4 mb-2">
        C. Performance &amp; Analytics Cookies
      </h3>
      <p>
        These cookies collect aggregated, anonymized information about how visitors use our
        platform—such as which pages are visited most often or if error messages occur. We use this
        data strictly to improve platform performance and page load speeds.
      </p>
      <ul>
        <li>
          <strong>Legal Basis:</strong> Consent (Art. 6.1 a GDPR).
        </li>
        <li>
          <strong>Consent Required?</strong> Yes.
        </li>
      </ul>

      <h3 className="font-outfit font-extrabold text-base text-slate-900 tracking-tight mt-4 mb-2">
        D. Third-Party API &amp; Payment Processing Cookies
      </h3>
      <p>
        When you interact with integrated features—such as scheduling posts to connected social media
        platforms or purchasing via payment gateways (Stripe and local mobile payments)—third-party partners may
        place necessary session tokens to execute the request securely.
      </p>

      <h2>4. Overview of Cookies Used on clikd.app</h2>
      <div className="overflow-x-auto rounded-2xl border border-slate-200/80">
        <table className="w-full min-w-[720px] text-left text-sm border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-900">
              <th className="px-3 py-2.5 font-extrabold border-b border-slate-200">
                Cookie / Token Name
              </th>
              <th className="px-3 py-2.5 font-extrabold border-b border-slate-200">
                Provider / Domain
              </th>
              <th className="px-3 py-2.5 font-extrabold border-b border-slate-200">
                Purpose &amp; Function
              </th>
              <th className="px-3 py-2.5 font-extrabold border-b border-slate-200">
                Type &amp; Duration
              </th>
            </tr>
          </thead>
          <tbody className="text-slate-700">
            <tr className="border-b border-slate-100 align-top">
              <td className="px-3 py-2.5 font-mono text-xs">sb-access-token</td>
              <td className="px-3 py-2.5">clikd.app (Supabase)</td>
              <td className="px-3 py-2.5">Maintains encrypted user authentication session</td>
              <td className="px-3 py-2.5">Essential / Session</td>
            </tr>
            <tr className="border-b border-slate-100 align-top">
              <td className="px-3 py-2.5 font-mono text-xs">sb-refresh-token</td>
              <td className="px-3 py-2.5">clikd.app (Supabase)</td>
              <td className="px-3 py-2.5">Refreshes user login session securely</td>
              <td className="px-3 py-2.5">Essential / 30 Days</td>
            </tr>
            <tr className="border-b border-slate-100 align-top">
              <td className="px-3 py-2.5 font-mono text-xs">clikd_workspace_id</td>
              <td className="px-3 py-2.5">clikd.app</td>
              <td className="px-3 py-2.5">Remembers your active selected brand workspace</td>
              <td className="px-3 py-2.5">Functional / 1 Year</td>
            </tr>
            <tr className="border-b border-slate-100 align-top">
              <td className="px-3 py-2.5 font-mono text-xs">clikd_lang</td>
              <td className="px-3 py-2.5">clikd.app</td>
              <td className="px-3 py-2.5">
                Stores preferred interface language (SV/EN/NO/DA)
              </td>
              <td className="px-3 py-2.5">Functional / 1 Year</td>
            </tr>
            <tr className="border-b border-slate-100 align-top">
              <td className="px-3 py-2.5 font-mono text-xs">
                __stripe_mid / __stripe_sid
              </td>
              <td className="px-3 py-2.5">stripe.com</td>
              <td className="px-3 py-2.5">
                Fraud prevention and secure payment processing for Storefronts
              </td>
              <td className="px-3 py-2.5">Essential / 1 Year</td>
            </tr>
            <tr className="border-b border-slate-100 align-top">
              <td className="px-3 py-2.5 font-mono text-xs">checkout_session_token</td>
              <td className="px-3 py-2.5">payment partner</td>
              <td className="px-3 py-2.5">
                Validates active 1-tap Mobile BankID transaction sessions
              </td>
              <td className="px-3 py-2.5">Essential / Session</td>
            </tr>
            <tr className="align-top">
              <td className="px-3 py-2.5 font-mono text-xs">vercel_analytics</td>
              <td className="px-3 py-2.5">vercel.com</td>
              <td className="px-3 py-2.5">
                Anonymized performance and page load latency monitoring
              </td>
              <td className="px-3 py-2.5">Analytics / Session</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2>5. Third-Party Social Media APIs &amp; Embedded Features</h2>
      <p>
        When you connect your social media accounts to our Content Planner or host live webinars,
        third-party platforms may place cookies or access session tokens subject to their own
        policies:
      </p>
      <ul>
        <li>
          <strong>Google / YouTube API Services:</strong> Used for channel metrics and Shorts
          publishing. Review the{' '}
          <a
            href="https://policies.google.com/privacy"
            target="_blank"
            rel="noopener noreferrer"
          >
            Google Privacy Policy
          </a>{' '}
          and manage access via{' '}
          <a
            href="https://myaccount.google.com/permissions"
            target="_blank"
            rel="noopener noreferrer"
          >
            Google Security Settings
          </a>
          .
        </li>
        <li>
          <strong>Meta (Instagram &amp; Facebook):</strong> Used for graph API connections and post
          scheduling under Meta Platform Terms.
        </li>
        <li>
          <strong>TikTok API &amp; LinkedIn API:</strong> Used for authorized publishing and
          cross-posting.
        </li>
      </ul>

      <h2>6. How to Manage and Revoke Your Cookie Consent</h2>
      <p>You have full control over how cookies are placed on your device:</p>
      <ul>
        <li>
          <strong>In-App Cookie Banner:</strong> When you first visit{' '}
          <a href="https://clikd.app">https://clikd.app</a>, you can choose to accept all cookies,
          customize preferences, or reject non-essential cookies.
        </li>
        <li>
          <strong>Browser Settings:</strong> Most web browsers allow you to block, delete, or manage
          cookies through their settings menu:
          <ul className="mt-2">
            <li>
              <strong>Google Chrome:</strong> Settings → Privacy and security → Cookies and other
              site data
            </li>
            <li>
              <strong>Apple Safari:</strong> Preferences → Privacy → Manage Website Data
            </li>
            <li>
              <strong>Mozilla Firefox:</strong> Options → Privacy &amp; Security → Cookies and Site
              Data
            </li>
            <li>
              <strong>Microsoft Edge:</strong> Settings → Cookies and site permissions
            </li>
          </ul>
        </li>
        <li>
          <strong>Disconnecting Social Accounts:</strong> You can disconnect any connected social
          account at any time via Settings → Connected Accounts in your clikd: dashboard. This
          immediately revokes and deletes all associated OAuth tokens.
        </li>
      </ul>

      <h2>7. Updates to This Cookie Policy</h2>
      <p>
        We may update this Cookie Policy from time to time to reflect changes in technologies, legal
        requirements, or platform updates. Any material updates will be announced via email or
        prominently displayed within the Service at least 14 days prior to taking effect.
      </p>

      <h2>8. Contact Us</h2>
      <p>
        If you have any questions regarding our use of cookies or tracking technologies, please
        contact our Data Protection Team at:
      </p>
      <ul>
        <li>
          Official Website: <a href="https://clikd.app">https://clikd.app</a>
        </li>
        <li>
          Privacy &amp; Cookie Inquiries:{' '}
          <a href="mailto:privacy@clikd.app">privacy@clikd.app</a>
        </li>
        <li>
          Legal Department: <a href="mailto:legal@clikd.app">legal@clikd.app</a>
        </li>
      </ul>
    </LegalDoc>
  );
}
