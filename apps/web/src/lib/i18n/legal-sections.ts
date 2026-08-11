/** H2 section headings for legal pages — merged into dictionaries.ts `legal.*`. */

export type LegalSectionKey =
  | 'eyebrow'
  | 'privacyS1'
  | 'privacyS2'
  | 'privacyS3'
  | 'privacyS4'
  | 'privacyS5'
  | 'privacyS6'
  | 'privacyS7'
  | 'privacyS8'
  | 'privacyS9'
  | 'privacyS10'
  | 'privacyS11'
  | 'privacyS12'
  | 'privacyS13'
  | 'termsS1'
  | 'termsS2'
  | 'termsS3'
  | 'termsS4'
  | 'termsS5'
  | 'termsS6'
  | 'termsS7'
  | 'termsS8'
  | 'termsS9'
  | 'termsS10'
  | 'termsS11'
  | 'termsS12'
  | 'termsS13'
  | 'cookiesS1'
  | 'cookiesS2'
  | 'cookiesS3'
  | 'cookiesS4'
  | 'cookiesS5'
  | 'cookiesS6'
  | 'cookiesS7'
  | 'cookiesS8'
  | 'gdprS1'
  | 'gdprS2'
  | 'gdprS3'
  | 'gdprS4'
  | 'gdprS5'
  | 'gdprS6'
  | 'gdprS7';

export type LegalSectionsDict = Record<LegalSectionKey, string>;

export const LEGAL_SECTIONS_EN: LegalSectionsDict = {
  eyebrow: 'Legal',
  privacyS1: '1. Data Controller & Contact Information',
  privacyS2: '2. Personal Data We Collect',
  privacyS3: '3. Third-Party Integrations & Platform-Specific API Terms',
  privacyS4: '4. Purpose and Legal Basis for Data Processing',
  privacyS5: '5. Data Sharing & Sub-processors',
  privacyS6: '6. Data Retention & Deletion',
  privacyS7: '7. Your Rights Under GDPR (EU & UK)',
  privacyS8: '8. Managing Connected Social Accounts & Revoking API Access',
  privacyS9: '9. International Data Transfers',
  privacyS10: '10. Disclosures for United States Residents (CCPA/CPRA)',
  privacyS11: "11. Children's Privacy (COPPA)",
  privacyS12: '12. Complaints & Supervisory Authorities',
  privacyS13: '13. Updates to This Policy',
  termsS1: '1. Description of Service & User Roles',
  termsS2: '2. Account Eligibility & Security',
  termsS3: '3. Connected Third-Party Platforms & API Terms',
  termsS4: '4. Creator Storefronts, Products & Community Sales',
  termsS5: '5. Fees, Payments, Payouts & Taxes',
  termsS6: '6. Content Ownership, Intellectual Property & Licenses',
  termsS7: '7. Acceptable Use & Conduct Policy',
  termsS8: '8. Disclaimer of Warranties',
  termsS9: '9. Limitation of Liability',
  termsS10: '10. Indemnification',
  termsS11: '11. Governing Law & Dispute Resolution',
  termsS12: '12. Modifications to Terms',
  termsS13: '13. Contact Information',
  cookiesS1: '1. What Are Cookies and Tracking Technologies?',
  cookiesS2: '2. How We Use Cookies',
  cookiesS3: '3. Categories of Cookies We Use',
  cookiesS4: '4. Overview of Cookies Used on clikd.app',
  cookiesS5: '5. Third-Party Social Media APIs & Embedded Features',
  cookiesS6: '6. How to Manage and Revoke Your Cookie Consent',
  cookiesS7: '7. Updates to This Cookie Policy',
  cookiesS8: '8. Contact Us',
  gdprS1: '1. Dual Data Roles: Controller vs. Processor',
  gdprS2: '2. Data Processing Agreement (DPA)',
  gdprS3: '3. Technical & Organizational Security Measures (Art. 32 GDPR)',
  gdprS4: '4. Sub-processors',
  gdprS5: '5. Fulfilling End-Customer Rights (Data Subject Requests)',
  gdprS6: '6. International Data Transfers',
  gdprS7: '7. Data Protection Contact & DPO Inquiries',
};

export const LEGAL_SECTIONS_SV: LegalSectionsDict = {
  eyebrow: 'Juridiskt',
  privacyS1: '1. Personuppgiftsansvarig & kontaktuppgifter',
  privacyS2: '2. Personuppgifter vi samlar in',
  privacyS3: '3. Tredjepartsintegrationer & plattformsspecifika API-villkor',
  privacyS4: '4. Syfte och rättslig grund för behandling',
  privacyS5: '5. Delning av data & underbiträden',
  privacyS6: '6. Lagring & radering av data',
  privacyS7: '7. Dina rättigheter enligt GDPR (EU & UK)',
  privacyS8: '8. Hantera anslutna sociala konton & återkalla API-åtkomst',
  privacyS9: '9. Internationella dataöverföringar',
  privacyS10: '10. Upplysningar för US-invånare (CCPA/CPRA)',
  privacyS11: '11. Barns integritet (COPPA)',
  privacyS12: '12. Klagomål & tillsynsmyndigheter',
  privacyS13: '13. Uppdateringar av denna policy',
  termsS1: '1. Beskrivning av tjänsten & användarroller',
  termsS2: '2. Kontobehörighet & säkerhet',
  termsS3: '3. Anslutna tredjepartsplattformar & API-villkor',
  termsS4: '4. Creator-butiker, produkter & community-försäljning',
  termsS5: '5. Avgifter, betalningar, utbetalningar & skatter',
  termsS6: '6. Innehållsägande, immateriella rättigheter & licenser',
  termsS7: '7. Policy för acceptabel användning & uppförande',
  termsS8: '8. Ansvarsfriskrivning',
  termsS9: '9. Begränsning av ansvar',
  termsS10: '10. Skadeslöshållande',
  termsS11: '11. Tillämplig lag & tvistlösning',
  termsS12: '12. Ändringar av villkoren',
  termsS13: '13. Kontaktuppgifter',
  cookiesS1: '1. Vad är cookies och spårningstekniker?',
  cookiesS2: '2. Hur vi använder cookies',
  cookiesS3: '3. Kategorier av cookies vi använder',
  cookiesS4: '4. Översikt av cookies på clikd.app',
  cookiesS5: '5. Tredjeparts sociala medier-API:er & inbäddade funktioner',
  cookiesS6: '6. Hantera och återkalla ditt cookie-samtycke',
  cookiesS7: '7. Uppdateringar av denna cookiepolicy',
  cookiesS8: '8. Kontakta oss',
  gdprS1: '1. Dubbla dataroller: personuppgiftsansvarig vs. personuppgiftsbiträde',
  gdprS2: '2. Personuppgiftsbiträdesavtal (DPA)',
  gdprS3: '3. Tekniska & organisatoriska säkerhetsåtgärder (Art. 32 GDPR)',
  gdprS4: '4. Underbiträden',
  gdprS5: '5. Uppfylla slutkunders rättigheter (begäranden från registrerade)',
  gdprS6: '6. Internationella dataöverföringar',
  gdprS7: '7. Dataskyddskontakt & DPO-förfrågningar',
};

export const LEGAL_SECTIONS_NO: LegalSectionsDict = {
  ...LEGAL_SECTIONS_SV,
  eyebrow: 'Juridisk',
  privacyS1: '1. Behandlingsansvarlig & kontaktinformasjon',
  privacyS2: '2. Personopplysninger vi samler inn',
  privacyS7: '7. Dine rettigheter etter GDPR (EU & UK)',
  privacyS13: '13. Oppdateringer av denne policyen',
  termsS12: '12. Endringer i vilkårene',
  cookiesS7: '7. Oppdateringer av denne informasjonskapselpolicyen',
  cookiesS8: '8. Kontakt oss',
  gdprS7: '7. Personvernontakt & DPO-henvendelser',
};

export const LEGAL_SECTIONS_DA: LegalSectionsDict = {
  ...LEGAL_SECTIONS_SV,
  eyebrow: 'Juridisk',
  privacyS1: '1. Dataansvarlig & kontaktoplysninger',
  privacyS2: '2. Personoplysninger vi indsamler',
  privacyS7: '7. Dine rettigheder under GDPR (EU & UK)',
  privacyS13: '13. Opdateringer af denne politik',
  termsS12: '12. Ændringer af vilkårene',
  cookiesS7: '7. Opdateringer af denne cookiepolitik',
  cookiesS8: '8. Kontakt os',
  gdprS7: '7. Databeskyttelseskontakt & DPO-henvendelser',
};

export const LEGAL_SECTIONS_FI: LegalSectionsDict = {
  eyebrow: 'Juridiikka',
  privacyS1: '1. Rekisterinpitäjä & yhteystiedot',
  privacyS2: '2. Keräämämme henkilötiedot',
  privacyS3: '3. Kolmannen osapuolen integraatiot & alustakohtaiset API-ehdot',
  privacyS4: '4. Käsittelyn tarkoitus ja oikeusperusta',
  privacyS5: '5. Tietojen jakaminen & alikäsittelijät',
  privacyS6: '6. Tietojen säilytys & poistaminen',
  privacyS7: '7. Oikeutesi GDPR:n mukaisesti (EU & UK)',
  privacyS8: '8. Yhdistettyjen some-tilien hallinta & API-käytön peruutus',
  privacyS9: '9. Kansainväliset tiedonsiirrot',
  privacyS10: '10. Tiedonannot Yhdysvaltain asukkaille (CCPA/CPRA)',
  privacyS11: '11. Lasten yksityisyys (COPPA)',
  privacyS12: '12. Valitukset & valvontaviranomaiset',
  privacyS13: '13. Päivitykset tähän käytäntöön',
  termsS1: '1. Palvelun kuvaus & käyttäjäroolit',
  termsS2: '2. Tilin kelpoisuus & turvallisuus',
  termsS3: '3. Yhdistetyt kolmannen osapuolen alustat & API-ehdot',
  termsS4: '4. Creator-kaupat, tuotteet & community-myynti',
  termsS5: '5. Maksut, maksutapahtumat, nostot & verot',
  termsS6: '6. Sisällön omistus, immateriaalioikeudet & lisenssit',
  termsS7: '7. Hyväksyttävän käytön & käyttäytymisen politiikka',
  termsS8: '8. Takuuvastuuvapaus',
  termsS9: '9. Vastuun rajoitus',
  termsS10: '10. Vahingonkorvausvelvollisuus',
  termsS11: '11. Sovellettava laki & riitojen ratkaisu',
  termsS12: '12. Ehtojen muutokset',
  termsS13: '13. Yhteystiedot',
  cookiesS1: '1. Mitä evästeet ja seurantateknologiat ovat?',
  cookiesS2: '2. Miten käytämme evästeitä',
  cookiesS3: '3. Käyttämämme evästeiden kategoriat',
  cookiesS4: '4. Yleiskatsaus clikd.app-evästeisiin',
  cookiesS5: '5. Kolmannen osapuolen some-API:t & upotetut ominaisuudet',
  cookiesS6: '6. Evästesuostumuksen hallinta ja peruutus',
  cookiesS7: '7. Päivitykset tähän evästekäytäntöön',
  cookiesS8: '8. Ota yhteyttä',
  gdprS1: '1. Kaksinkertaiset dataroolit: rekisterinpitäjä vs. käsittelijä',
  gdprS2: '2. Henkilötietojen käsittelysopimus (DPA)',
  gdprS3: '3. Tekniset & organisatoriset turvatoimet (GDPR art. 32)',
  gdprS4: '4. Alikäsittelijät',
  gdprS5: '5. Loppuasiakkaiden oikeuksien täyttäminen',
  gdprS6: '6. Kansainväliset tiedonsiirrot',
  gdprS7: '7. Tietosuojayhteys & DPO-kyselyt',
};
