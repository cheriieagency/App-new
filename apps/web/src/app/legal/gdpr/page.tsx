import type { Metadata } from 'next';
import { LegalDoc } from '@/components/legal/LegalDoc';

export const metadata: Metadata = {
  title: 'GDPR',
  description: 'Information om hur clikd: följer GDPR och vilka rättigheter du har.',
  alternates: { canonical: '/legal/gdpr' },
};

export default function GdprPage() {
  return (
    <LegalDoc titleKey="legalGdpr" updated="10 augusti 2026">
      <p>
        clikd: följer EU:s dataskyddsförordning (GDPR). Den här sidan sammanfattar hur vi skyddar
        personuppgifter och vilka rättigheter du har som användare.
      </p>

      <h2>1. Rättigheter enligt GDPR</h2>
      <ul>
        <li>
          <strong>Tillgång</strong> — begär en kopia av de personuppgifter vi har om dig
        </li>
        <li>
          <strong>Rättelse</strong> — korrigera felaktiga eller ofullständiga uppgifter
        </li>
        <li>
          <strong>Radering</strong> — begär att uppgifter raderas när laglig grund saknas
        </li>
        <li>
          <strong>Begränsning</strong> — begränsa behandling i vissa fall
        </li>
        <li>
          <strong>Dataportabilitet</strong> — få ut uppgifter i ett strukturerat format
        </li>
        <li>
          <strong>Invändning</strong> — invända mot behandling baserad på berättigat intresse
        </li>
      </ul>

      <h2>2. Hur du utövar dina rättigheter</h2>
      <p>
        Skicka en begäran till <a href="mailto:privacy@clikd.app">privacy@clikd.app</a> från den
        e-postadress som är kopplad till ditt konto. Vi svarar normalt inom 30 dagar.
      </p>

      <h2>3. Personuppgiftsbiträden</h2>
      <p>
        När vi använder underleverantörer (t.ex. infrastruktur, betalningar, e-post) tecknas
        biträdesavtal enligt artikel 28 GDPR. Data lagras i första hand inom EU/EES.
      </p>

      <h2>4. Cookies</h2>
      <p>
        Vi använder nödvändiga cookies för inloggning och sessionshantering. Eventuella
        analyscookies kräver samtycke där tillämpligt.
      </p>

      <h2>5. Klagomål</h2>
      <p>
        Om du är missnöjd med hur vi behandlar dina uppgifter kan du vända dig till Integritetsskyddsmyndigheten
        (IMY) i Sverige, eller motsvarande tillsynsmyndighet i ditt land.
      </p>

      <h2>6. Relaterade dokument</h2>
      <p>
        Läs mer i vår <a href="/legal/integritet">Integritetspolicy</a> och{' '}
        <a href="/legal/villkor">Användarvillkor</a>.
      </p>
    </LegalDoc>
  );
}
