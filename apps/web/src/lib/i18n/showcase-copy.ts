/**
 * Circle-style landing showcase copy (EN + SV).
 * NO/DA inherit SV · FI inherits EN.
 */

import type { Locale } from '@/lib/i18n';

export const SHOWCASE_TABS = [
  'planner',
  'biostore',
  'metaads',
  'crm',
  'inbox',
  'community',
  'analytics',
] as const;

export type ShowcaseTabId = (typeof SHOWCASE_TABS)[number];

export type ShowcaseTabCopy = {
  label: string;
  title: string;
  subtitle: string;
  bullets: string[];
  quote: string;
  quoteName: string;
  quoteRole: string;
  quoteAvatar: string;
  url: string;
  caption: string;
  previewKicker: string;
  previewTitle: string;
  previewBadge: string;
};

export type ShowcaseCopy = {
  eyebrow: string;
  headline: string;
  sub: string;
  livePreview: string;
  tryLive: string;
  weekdays: string[];
  tabs: Record<ShowcaseTabId, ShowcaseTabCopy>;
};

const EBBA =
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=96&h=96&fit=crop&q=80';
const MARCUS =
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=96&h=96&fit=crop&q=80';
const ANNA =
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=96&h=96&fit=crop&q=80';
const JOHAN =
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=96&h=96&fit=crop&q=80';
const SARA =
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=96&h=96&fit=crop&q=80';

const EN: ShowcaseCopy = {
  eyebrow: 'The platform',
  headline: 'Made by social media managers, for social media managers.',
  sub: 'The only tool you need. All-in-one studio to power your content, storefront, community, and ads.',
  livePreview: 'Live Studio Preview',
  tryLive: 'Try feature live',
  weekdays: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
  tabs: {
    planner: {
      label: 'Auto-Posting & Planner',
      title: 'Publish videos everywhere without push notification hassles.',
      subtitle:
        'Schedule once and publish directly to TikTok, Instagram Reels, and Facebook using official OAuth scopes.',
      bullets: [
        'Direct publishing to TikTok, IG Reels & Facebook',
        '100% OAuth API status — zero push draft approvals',
        'Visual calendar & drag-and-drop Kanban board',
        'Auto-tag products & bio storefront links in captions',
        'Multi-account workspace sets for creators & agencies',
      ],
      quote:
        'Clikd replaced 5 separate subscriptions for my studio. The direct TikTok auto-posting and 1-tap Swish checkout saved me over 15 hours every single week.',
      quoteName: 'Ebba Brobeck',
      quoteRole: 'Founder, Ebba Creator Lab',
      quoteAvatar: EBBA,
      url: 'https://admin.clikd.app/planner/ebbacreator',
      caption:
        'Schedule and publish videos directly to TikTok, Instagram Reels, and Facebook.',
      previewKicker: 'Direct API publishing · August 2026',
      previewTitle: 'Automated Multi-Platform Auto-Posting',
      previewBadge: '100% Direct API Active',
    },
    biostore: {
      label: 'Bio Link Storefront',
      title: 'High-converting bio storefront with 1-tap mobile checkout.',
      subtitle:
        'Sell e-books, masterclasses, coaching, and subscriptions with luxury theme presets and BankID Swish checkout.',
      bullets: [
        '1-Tap Swish, card & Apple Pay checkout',
        'Luxury theme presets (Aurora Glow, Midnight Glass, etc.)',
        'Digital downloads, courses, and coaching calendar slots',
        'UTM analytics & link click attribution',
        '0% platform fee option on Pro plan',
      ],
      quote:
        "Our masterclass sales increased by 42% in the first month after switching to Clikd's 1-tap Swish mobile checkout flow.",
      quoteName: 'Marcus Lindqvist',
      quoteRole: 'Digital Educator @ GrowthNordic',
      quoteAvatar: MARCUS,
      url: 'https://admin.clikd.app/bio-store/ebbabrobeck',
      caption:
        'Luxury themes, custom blocks, UTM analytics, products & 1-tap checkout.',
      previewKicker: 'Bio Builder · @ebbabrobeck',
      previewTitle: 'Link in Bio Studio',
      previewBadge: 'Publish Changes',
    },
    metaads: {
      label: 'Meta Ads & ROAS',
      title: 'Launch FB & IG ad campaigns with real-time ROAS tracking.',
      subtitle:
        'Run Meta Ad campaigns directly from your studio without logging into complex Business Manager dashboards.',
      bullets: [
        'Direct Meta Ads Manager integration',
        'Real-time ROAS tracking and conversion attribution',
        'One-click retargeting for storefront visitors',
        'Automated daily budget management & notifications',
        'Unified analytics report for organic & paid reach',
      ],
      quote:
        'Launching Meta retargeting ads directly from Clikd gave us a 4.2x ROAS on our latest course release without touching Meta Ads Manager.',
      quoteName: 'Anna Ståhl',
      quoteRole: 'Performance Lead @ Cherii Agency',
      quoteAvatar: ANNA,
      url: 'https://admin.clikd.app/meta-ads/ebbacreator',
      caption:
        'Launch Facebook & Instagram ads directly with real-time ROAS tracking.',
      previewKicker: 'Meta Ads Manager & ROAS',
      previewTitle: 'Campaign Performance',
      previewBadge: '4.2x ROAS Active',
    },
    crm: {
      label: 'Email CRM',
      title: 'Subscriber directory & broadcast emails via Resend.',
      subtitle:
        'Build your email list, segment members, and dispatch broadcast campaigns with 99.8% inbox delivery.',
      bullets: [
        'Subscriber directory automatically synced with members',
        'Resend infrastructure with 99.8% deliverability',
        'Automated welcome & post-purchase email sequences',
        'Tagging and audience segmentation',
        'Broadcast analytics (opens, clicks, unsubscribes)',
      ],
      quote:
        'Having our email broadcasts directly integrated with our member directory eliminated the need for separate email tools like ConvertKit.',
      quoteName: 'Johan Holm',
      quoteRole: 'Creator @ TechSpark',
      quoteAvatar: JOHAN,
      url: 'https://admin.clikd.app/email-crm/ebbacreator',
      caption:
        'Subscriber CRM, automated welcome sequences & broadcast emails.',
      previewKicker: 'Email CRM & broadcasts',
      previewTitle: 'Resend Campaigns',
      previewBadge: '99.8% Inbox',
    },
    inbox: {
      label: 'Unified Inbox',
      title: 'Unified Social Inbox & Comment-to-DM automations.',
      subtitle:
        'Auto-reply to Instagram & TikTok comments, send instant private DMs with lead links, and manage all chats in one inbox.',
      bullets: [
        'Comment-to-DM triggers (e.g. comment #MASTERCLASS)',
        'Unified inbox for Instagram DMs and TikTok comments',
        'Automatic lead qualification & link delivery',
        'Private replies to post comments',
        'Live Graph API connection status indicator',
      ],
      quote:
        'The comment-to-DM trigger generated over 80 qualified course leads in under 24 hours on my latest Reel.',
      quoteName: 'Ebba Brobeck',
      quoteRole: 'Founder, Ebba Creator Lab',
      quoteAvatar: EBBA,
      url: 'https://admin.clikd.app/inbox/ebbacreator',
      caption:
        'Auto-reply to comments and DMs, qualify leads, and manage conversations in one inbox.',
      previewKicker: 'DM automation & inbox',
      previewTitle: 'Social DM Hub',
      previewBadge: '4 Active Triggers',
    },
    community: {
      label: 'Gamified Community',
      title: 'Gamified community, classroom courses & live events.',
      subtitle:
        'Give your members a space they actually want to be in with member feeds, classroom courses, and XP leaderboards.',
      bullets: [
        'Discussion feeds with rich media & automated moderation',
        'Classroom course modules with video hosting & downloads',
        'Gamified XP levels, badges, and top member leaderboards',
        'Live event scheduling with Google/iCal calendar sync',
        'White-glove 1:1 member migration support',
      ],
      quote:
        'Moving our community from Skool to Clikd gave us native Swish checkout and saved us over $100/month per community.',
      quoteName: 'Sara Berg',
      quoteRole: 'Community Host @ NordicMind',
      quoteAvatar: SARA,
      url: 'https://admin.clikd.app/community/ebbacreator',
      caption:
        'Discussion feeds, classroom courses, live events & member leaderboards.',
      previewKicker: 'Community & courses',
      previewTitle: 'Member Leaderboard',
      previewBadge: '1,340 Members',
    },
    analytics: {
      label: 'Command Center',
      title: "Today's focus, shortcuts, Kanban and latest activity — all in one place.",
      subtitle:
        'Admin Home keeps stickies, shortcuts, your Kanban board, and live alerts together.',
      bullets: [
        "Today's focus and sticky to-dos",
        'One-tap shortcuts to Planner, Analytics, and Bio',
        'Kanban board for ideas, in progress, and review',
        'Live activity across purchases, community, and DMs',
        'Workspace-scoped search with ⌘K',
      ],
      quote:
        'Starting every morning in Command Center means I see tasks, Kanban, and alerts before I open five other tools.',
      quoteName: 'Ebba Brobeck',
      quoteRole: 'Founder, Ebba Creator Lab',
      quoteAvatar: EBBA,
      url: 'https://admin.clikd.app/home/ebbacreator',
      caption: 'Admin Home — focus, shortcuts, Kanban, and latest activity.',
      previewKicker: 'Command Center',
      previewTitle: 'Admin Home',
      previewBadge: 'Live',
    },
  },
};

const SV: ShowcaseCopy = {
  eyebrow: 'Plattformen',
  headline: 'Gjort av social media managers, för social media managers.',
  sub: 'Det enda verktyget du behöver. En all-in-one studio för content, storefront, community och ads.',
  livePreview: 'Live Studio Preview',
  tryLive: 'Testa funktionen live',
  weekdays: ['M', 'T', 'O', 'T', 'F', 'L', 'S'],
  tabs: {
    planner: {
      label: 'Auto-posting & Planner',
      title: 'Publicera videor överallt — utan push-godkännanden.',
      subtitle:
        'Schemalägg en gång och publicera direkt till TikTok, Instagram Reels och Facebook med officiella OAuth-scopes.',
      bullets: [
        'Direktpublicering till TikTok, IG Reels & Facebook',
        '100 % OAuth API — inga utkast via push-notiser',
        'Visuell kalender & dra-och-släpp Kanban',
        'Auto-tagga produkter och bio-länkar i captions',
        'Flera konton och workspaces för creators & byråer',
      ],
      quote:
        'Clikd ersatte 5 separata abonnemang för min studio. Direkt TikTok-autoposting och 1-trycks Swish-checkout sparade mig över 15 timmar varje vecka.',
      quoteName: 'Ebba Brobeck',
      quoteRole: 'Founder, Ebba Creator Lab',
      quoteAvatar: EBBA,
      url: 'https://admin.clikd.app/planner/ebbacreator',
      caption:
        'Schemalägg och publicera videor direkt till TikTok, Instagram Reels och Facebook.',
      previewKicker: 'Direct API publishing · augusti 2026',
      previewTitle: 'Automatisk publicering på flera plattformar',
      previewBadge: '100 % Direct API aktiv',
    },
    biostore: {
      label: 'Bio-länk & storefront',
      title: 'Konverterande bio-storefront med 1-trycks mobilcheckout.',
      subtitle:
        'Sälj e-böcker, masterclass, coaching och prenumerationer med lyxiga teman och BankID Swish-checkout.',
      bullets: [
        '1-trycks Swish, kort & Apple Pay',
        'Lyxiga teman (Aurora Glow, Midnight Glass m.fl.)',
        'Nedladdningar, kurser och coaching-tider',
        'UTM-analytics och klickattribution',
        '0 % plattformsavgift på Pro',
      ],
      quote:
        'Vår masterclass-försäljning ökade 42 % första månaden efter bytet till Clikds 1-trycks Swish-checkout.',
      quoteName: 'Marcus Lindqvist',
      quoteRole: 'Digital Educator @ GrowthNordic',
      quoteAvatar: MARCUS,
      url: 'https://admin.clikd.app/bio-store/ebbabrobeck',
      caption:
        'Lyxiga teman, egna block, UTM-analytics, produkter och 1-trycks checkout.',
      previewKicker: 'Bio Builder · @ebbabrobeck',
      previewTitle: 'Link in Bio Studio',
      previewBadge: 'Publicera ändringar',
    },
    metaads: {
      label: 'Meta Ads & ROAS',
      title: 'Lansera FB- & IG-kampanjer med ROAS i realtid.',
      subtitle:
        'Kör Meta-kampanjer direkt från studion — utan att logga in i krångliga Business Manager-dashboards.',
      bullets: [
        'Direkt integration mot Meta Ads Manager',
        'ROAS och konverteringsattribution i realtid',
        '1-klicks retargeting av storefront-besökare',
        'Automatisk dagsbudget och notiser',
        'Samlad rapport för organisk och betald räckvidd',
      ],
      quote:
        'Att lansera Meta-retargeting direkt från Clikd gav oss 4,2x ROAS på senaste kursreleasen — utan att öppna Ads Manager.',
      quoteName: 'Anna Ståhl',
      quoteRole: 'Performance Lead @ Cherii Agency',
      quoteAvatar: ANNA,
      url: 'https://admin.clikd.app/meta-ads/ebbacreator',
      caption:
        'Lansera Facebook- och Instagram-annonser direkt med ROAS i realtid.',
      previewKicker: 'Meta Ads Manager & ROAS',
      previewTitle: 'Kampanjprestanda',
      previewBadge: '4,2x ROAS aktiv',
    },
    crm: {
      label: 'E-post CRM',
      title: 'Prenumerantkatalog och utskick via Resend.',
      subtitle:
        'Bygg listan, segmentera medlemmar och skicka broadcasts med 99,8 % inbox-leverans.',
      bullets: [
        'Prenumeranter synkas automatiskt med medlemmar',
        'Resend-infrastruktur med 99,8 % leverans',
        'Automatiska välkomst- och köpmail',
        'Taggar och segments',
        'Broadcast-analytics (öppningar, klick, avregistrering)',
      ],
      quote:
        'Att ha utskicken kopplade till medlemskatalogen gjorde att vi slapp extra e-postverktyg som ConvertKit.',
      quoteName: 'Johan Holm',
      quoteRole: 'Creator @ TechSpark',
      quoteAvatar: JOHAN,
      url: 'https://admin.clikd.app/email-crm/ebbacreator',
      caption: 'Prenumerant-CRM, välkomstsekvenser och broadcasts.',
      previewKicker: 'E-post CRM & broadcasts',
      previewTitle: 'Resend-kampanjer',
      previewBadge: '99,8 % inbox',
    },
    inbox: {
      label: 'Unified Inbox',
      title: 'Samlad social inbox och kommentar-till-DM.',
      subtitle:
        'Svara automatiskt på Instagram- och TikTok-kommentarer, skicka privata DM:ar med lead-länkar och hantera alla chattar i en inbox.',
      bullets: [
        'Kommentar-till-DM (t.ex. kommentera #MASTERCLASS)',
        'En inbox för Instagram-DM och TikTok-kommentarer',
        'Automatisk lead-kvalificering och länkar',
        'Privata svar på inläggskommentarer',
        'Live Graph API-status',
      ],
      quote:
        'Kommentar-till-DM gav över 80 kvalificerade kursleads på under 24 timmar från min senaste Reel.',
      quoteName: 'Ebba Brobeck',
      quoteRole: 'Founder, Ebba Creator Lab',
      quoteAvatar: EBBA,
      url: 'https://admin.clikd.app/inbox/ebbacreator',
      caption:
        'Autosvar på kommentarer och DM:ar, kvalificera leads och hantera konversationer i en inbox.',
      previewKicker: 'DM-automation & inbox',
      previewTitle: 'Social DM Hub',
      previewBadge: '4 aktiva triggers',
    },
    community: {
      label: 'Gamifierad community',
      title: 'Gamifierad community, kurser och live-event.',
      subtitle:
        'Ge medlemmarna en plats de faktiskt vill vara i — med flöden, classroom-kurser och XP-leaderboards.',
      bullets: [
        'Diskussionsflöden med media och automatisk moderation',
        'Kursmoduler med video och nedladdningar',
        'XP-nivåer, badges och member leaderboards',
        'Live-event med Google/iCal-synk',
        'White-glove 1:1-migrering av medlemmar',
      ],
      quote:
        'Att flytta communityn från Skool till Clikd gav native Swish-checkout och sparade oss över 100 $/månad per community.',
      quoteName: 'Sara Berg',
      quoteRole: 'Community Host @ NordicMind',
      quoteAvatar: SARA,
      url: 'https://admin.clikd.app/community/ebbacreator',
      caption:
        'Diskussionsflöden, kurser, live-event och member leaderboards.',
      previewKicker: 'Community & kurser',
      previewTitle: 'Member Leaderboard',
      previewBadge: '1 340 medlemmar',
    },
    analytics: {
      label: 'Command Center',
      title: 'Dagens fokus, genvägar, Kanban och senaste aktiviteten — på ett ställe.',
      subtitle:
        'Admin Home samlar stickies, genvägar, Kanban och live-notiser.',
      bullets: [
        'Dagens fokus och sticky to-dos',
        'Genvägar till Planner, Analytics och Bio',
        'Kanban för idéer, pågående och review',
        'Live-aktivitet för köp, community och DM:ar',
        'Workspace-sök med ⌘K',
      ],
      quote:
        'Att börja morgonen i Command Center gör att jag ser tasks, Kanban och alerts innan jag öppnar fem andra verktyg.',
      quoteName: 'Ebba Brobeck',
      quoteRole: 'Founder, Ebba Creator Lab',
      quoteAvatar: EBBA,
      url: 'https://admin.clikd.app/home/ebbacreator',
      caption: 'Admin Home — fokus, genvägar, Kanban och senaste aktivitet.',
      previewKicker: 'Command Center',
      previewTitle: 'Admin Home',
      previewBadge: 'Live',
    },
  },
};

export function getShowcaseCopy(locale: Locale): ShowcaseCopy {
  if (locale === 'sv' || locale === 'no' || locale === 'da') return SV;
  return EN;
}
