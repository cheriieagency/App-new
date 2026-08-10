import type { Metadata } from 'next';
import { LegalDoc } from '@/components/legal/LegalDoc';

export const metadata: Metadata = {
  title: 'Användarvillkor — clikd:',
  description: 'Villkor för användning av clikd: plattformen.',
};

export default function VillkorPage() {
  return (
    <LegalDoc titleKey="legalVillkor" updated="10 augusti 2026">
      <p>
        Genom att skapa ett konto eller använda clikd: godkänner du dessa användarvillkor. Läs dem
        noggrant innan du använder tjänsten.
      </p>

      <h2>1. Tjänsten</h2>
      <p>
        clikd: är en plattform för creators att planera socialt innehåll, sälja via bio-storefront,
        driva community och hantera Nordic betalningar (Swish, Vipps m.m.).
      </p>

      <h2>2. Konto och behörighet</h2>
      <ul>
        <li>Du ansvarar för att uppgifterna i ditt konto är korrekta</li>
        <li>Du får inte dela inloggningsuppgifter eller missbruka andras konton</li>
        <li>
          Creators/admins och community-medlemmar har olika behörigheter enligt inloggningsroll
        </li>
      </ul>

      <h2>3. Innehåll och community</h2>
      <p>
        Du äger ditt eget innehåll men ger clikd: en begränsad licens att lagra och visa det för att
        leverera tjänsten. Otillåtet innehåll (olagligt, skadligt, spam) kan tas bort.
      </p>

      <h2>4. Betalningar och abonnemang</h2>
      <p>
        Priser anges i SEK om inte annat anges. Abonnemang kan sägas upp enligt planens villkor.
        Transaktionsavgifter och moms följer gällande Nordic regler och din valda plan.
      </p>

      <h2>5. Ansvarsbegränsning</h2>
      <p>
        Tjänsten tillhandahålls &quot;i befintligt skick&quot;. Vi ansvarar inte för indirekta
        skador, utebliven vinst eller förlust av data utöver vad som krävs enligt tvingande lag.
      </p>

      <h2>6. Uppsägning</h2>
      <p>
        Du kan avsluta ditt konto när som helst. Vi kan stänga av konton som bryter mot villkoren
        eller skadar plattformen/andra användare.
      </p>

      <h2>7. Ändringar</h2>
      <p>
        Vi kan uppdatera villkoren. Väsentliga ändringar meddelas via e-post eller i produkten.
        Fortsatt användning efter publicering innebär godkännande.
      </p>

      <h2>8. Kontakt</h2>
      <p>
        Frågor om villkor: <a href="mailto:legal@clikd.app">legal@clikd.app</a>. Se även{' '}
        <a href="/legal/integritet">Integritetspolicy</a> och <a href="/legal/gdpr">GDPR</a>.
      </p>
    </LegalDoc>
  );
}
