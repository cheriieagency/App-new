'use client';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const FAQ_ITEMS = [
  {
    id: 'swish',
    question: 'Hur fungerar Swish-betalningar?',
    answer:
      'Medlemmar betalar direkt med Swish eller Vipps i kassan – ofta på under 10 sekunder. Pengarna kopplas till ditt konto och du slipper bygga om checkouten själv. Perfekt för nordiska köpare som redan använder Swish varje dag.',
  },
  {
    id: 'moms',
    question: 'Hur hanteras moms och Fortnox-bokföring?',
    answer:
      'Plattformen räknar rätt svensk moms (t.ex. 6% eller 25% beroende på produkt) och kan generera Fortnox-kvitton automatiskt. Du slipper manuell Stripe-moms och dubbelbokföring – ekonomin är byggd för svenska och nordiska regler från start.',
  },
  {
    id: 'migrate',
    question: 'Kan jag flytta över mina medlemmar från Facebook/Skool?',
    answer:
      'Ja. Du kan importera medlemmar via e-postlistor och bjuda in dem till ditt nya community. De loggar in med e-post eller BankID, behåller tillgång till dina kurser och events, och du sparar tid jämfört med att bygga allt från noll igen.',
  },
];

export function FaqSection() {
  return (
    <section className="relative py-20 sm:py-28 overflow-hidden">
      <div
        className="nc-blob w-72 h-72 top-10 right-10 opacity-50"
        style={{ background: 'var(--nc-blush)' }}
      />

      <div className="relative max-w-3xl mx-auto px-4 sm:px-6">
        <div className="mb-10">
          <p
            className="text-xs font-extrabold uppercase tracking-[0.16em] mb-3"
            style={{ color: 'var(--nc-coral)' }}
          >
            FAQ
          </p>
          <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-[#2c3340] tracking-tight">
            Vanliga frågor
          </h2>
          <p className="mt-3 text-[#5b6472] font-medium">
            Kort om betalningar, bokföring och migration.
          </p>
        </div>

        <div className="nc-glass rounded-[1.75rem] px-4 sm:px-6">
          <Accordion type="single" collapsible>
            {FAQ_ITEMS.map((item) => (
              <AccordionItem key={item.id} value={item.id} className="border-[#e8ecf2]/60">
                <AccordionTrigger className="min-h-14 text-left text-sm sm:text-base font-display font-bold text-[#2c3340] hover:no-underline py-5">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-[#5b6472] font-medium leading-relaxed pb-5">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}
