import type { Metadata } from 'next';
import { LegalDoc } from '@/components/legal/LegalDoc';

export const metadata: Metadata = {
  title: 'Integritetspolicy',
  description: 'Hur clikd: samlar in, använder och skyddar dina personuppgifter.',
  alternates: { canonical: '/legal/integritet' },
};

export default function IntegritetPage() {
  return (
    <LegalDoc titleKey="legalIntegritet" updated="10 augusti 2026">
      <p>
        Denna integritetspolicy beskriver hur clikd: (&quot;vi&quot;, &quot;oss&quot;) behandlar
        personuppgifter när du använder vår plattform, webbplats och tillhörande tjänster.
      </p>

      <h2>1. Personuppgiftsansvarig</h2>
      <p>
        clikd: är personuppgiftsansvarig för behandlingen av dina uppgifter. Kontakta oss via{' '}
        <a href="mailto:privacy@clikd.app">privacy@clikd.app</a> för frågor om integritet.
      </p>

      <h2>2. Vilka uppgifter vi samlar in</h2>
      <ul>
        <li>Kontouppgifter (namn, e-post, profilbild)</li>
        <li>Betalnings- och faktureringsuppgifter via Swish, Vipps och kortleverantörer</li>
        <li>Användningsdata (inloggningar, community-aktivitet, content planner)</li>
        <li>Teknisk data (IP-adress, enhet, cookies som krävs för tjänsten)</li>
      </ul>

      <h2>3. Ändamål och rättslig grund</h2>
      <p>
        Vi behandlar uppgifter för att tillhandahålla tjänsten, hantera betalningar, ge support,
        förbättra produkten och uppfylla lagkrav (t.ex. bokföring och moms). Rättslig grund kan vara
        avtal, berättigat intresse eller rättslig förpliktelse.
      </p>

      <h2>4. Delning av uppgifter</h2>
      <p>
        Vi delar endast uppgifter med leverantörer som behövs för att driva tjänsten (t.ex.
        betalningspartners, hosting, e-post) under avtalade dataskyddsvillkor. Vi säljer inte dina
        personuppgifter.
      </p>

      <h2>5. Lagring</h2>
      <p>
        Uppgifter sparas så länge ditt konto är aktivt och därefter under den tid som krävs enligt
        lag (t.ex. bokföringslagen). Du kan begära radering enligt GDPR.
      </p>

      <h2>6. Dina rättigheter</h2>
      <p>
        Du har rätt till tillgång, rättelse, radering, begränsning, dataportabilitet och att invända
        mot viss behandling. Se även vår{' '}
        <a href="/legal/gdpr">GDPR-sida</a> och{' '}
        <a href="/legal/villkor">Användarvillkor</a>.
      </p>
    </LegalDoc>
  );
}
