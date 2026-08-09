type ExtraLocale = 'en' | 'sv' | 'no' | 'da' | 'fi';

/** Extra platform + landing keys layered onto the base i18n dictionaries. */
export type ExtraKey =
  | 'signIn'
  | 'emailAddress'
  | 'loginAsCreatorAdmin'
  | 'rememberMe'
  | 'loginPortalTitle'
  | 'loginPortalSub'
  | 'socialAccounts'
  | 'adminContentPlanner'
  | 'chooseCommunity'
  | 'mineLabel'
  | 'justNow'
  | 'postsAndComments'
  | 'goLive'
  | 'totalSubscribers'
  | 'averageOpenRate'
  | 'broadcastsSent'
  | 'emailCrmTitle'
  | 'workspaceScopedData'
  | 'createEmailBroadcast'
  | 'subscriberDirectory'
  | 'searchNameOrEmail'
  | 'allTags'
  | 'memberCol'
  | 'sourceCol'
  | 'subscribedDate'
  | 'subjectLine'
  | 'recipients'
  | 'sendTestEmail'
  | 'sendBroadcastNow'
  | 'landingHeroBadge'
  | 'landingHeroHeadline'
  | 'landingHeroSub'
  | 'landingCtaStartFree'
  | 'landingCtaExplore'
  | 'trustPillSwish'
  | 'trustPillVat'
  | 'trustPillAi'
  | 'trustPillSocial'
  | 'whyChooseUs'
  | 'whyChooseUsHeadline'
  | 'whyOldWay'
  | 'whyNewWay'
  | 'whyOldWayStack'
  | 'whyNewWayStack'
  | 'metricMonthlyCost'
  | 'metricPaymentMethods'
  | 'metricNordicVat'
  | 'metricSocialStack'
  | 'metricSocialStackNew'
  | 'featureStoreTitle'
  | 'featureStoreSummary'
  | 'featurePlannerTitle'
  | 'featurePlannerSummary'
  | 'featureAnalyticsTitle'
  | 'featureAnalyticsSummary'
  | 'featureTaggingTitle'
  | 'featureTaggingSummary'
  | 'featureCommunityTitle'
  | 'featureCommunitySummary'
  | 'featureEventsTitle'
  | 'featureEventsSummary'
  | 'featureEmailTitle'
  | 'featureEmailSummary'
  | 'featureAiTitle'
  | 'featureAiSummary'
  | 'featureFinanceTitle'
  | 'featureFinanceSummary'
  | 'featuresEyebrow'
  | 'featuresHeadline'
  | 'featuresSub'
  | 'suiteEyebrow'
  | 'suiteHeadline'
  | 'suiteSub'
  | 'suitePlannerTitle'
  | 'suitePlannerSummary'
  | 'suiteBioTitle'
  | 'suiteBioSummary'
  | 'suiteAnalyticsTitle'
  | 'suiteAnalyticsSummary'
  | 'suiteTaggingTitle'
  | 'suiteTaggingSummary'
  | 'suiteMediaTitle'
  | 'suiteMediaSummary'
  | 'suiteInboxTitle'
  | 'suiteInboxSummary'
  | 'suiteCommunityTitle'
  | 'suiteCommunitySummary'
  | 'suiteEmailTitle'
  | 'suiteEmailSummary'
  | 'roiEyebrow'
  | 'roiHeadline'
  | 'roiSub'
  | 'roiFollowers'
  | 'roiMonthlyPrice'
  | 'roiConversion'
  | 'roiEstimatedRevenue'
  | 'roiEarnLine'
  | 'roiPayingMembers'
  | 'faqEyebrow'
  | 'faqHeadline'
  | 'faqSub'
  | 'faqSwishQ'
  | 'faqSwishA'
  | 'faqVatQ'
  | 'faqVatA'
  | 'faqBioQ'
  | 'faqBioA'
  | 'faqTaggingQ'
  | 'faqTaggingA'
  | 'faqSocialQ'
  | 'faqSocialA'
  | 'faqImportQ'
  | 'faqImportA'
  | 'faqPayoutQ'
  | 'faqPayoutA'
  | 'faqTrialQ'
  | 'faqTrialA'
  | 'searchCommunitiesHeading'
  | 'searchCommunitiesEyebrow'
  | 'catMarketing'
  | 'catHealth'
  | 'catFinance'
  | 'catCoaching'
  | 'joinForPrice'
  | 'activeMembersLabel'
  | 'viewCommunity'
  | 'landingReadyHeadline'
  | 'landingReadySub'
  | 'popularCategories'
  | 'popularCommunities'
  | 'followersLabel'
  | 'coursesLabel'
  | 'productsLabel'
  | 'freeLabelShort'
  | 'pricing'
  | 'adminEmailCrm'
  | 'adminBioBuilder'
  | 'adminSearchPlaceholder'
  | 'boardKanban'
  | 'calendarTab'
  | 'tableTab'
  | 'workflowIdeas'
  | 'workflowInProduction'
  | 'workflowReview'
  | 'workflowScheduled'
  | 'workflowPublished'
  | 'statusConnected'
  | 'statusNotConnected'
  | 'disconnect'
  | 'createPost'
  | 'searchPosts'
  | 'accounts'
  | 'allPlatforms'
  | 'studioMedia'
  | 'postTitle'
  | 'studioStatus'
  | 'teamWorkspaceBrand'
  | 'studioAssignees'
  | 'studioScheduleDate'
  | 'studioCaption'
  | 'studioSubtasks'
  | 'studioActivityLog'
  | 'contentTab'
  | 'teamTab'
  | 'connectInstagramBusiness'
  | 'connectTikTokBusiness'
  | 'connectLinkedIn'
  | 'connectYouTube'
  | 'connectedAccounts'
  | 'socialAccountsHint'
  | 'subscribersLabel';

export type ExtraDict = Record<ExtraKey, string>;

export const EXTRA_EN: ExtraDict = {
  signIn: 'Sign In',
  emailAddress: 'Email Address',
  loginAsCreatorAdmin: 'Log in as Creator / Admin',
  rememberMe: 'Remember Me',
  loginPortalTitle: 'Sign In',
  loginPortalSub: 'Choose how you want to sign in to Nordic Creator.',
  socialAccounts: 'Social Accounts',
  adminContentPlanner: 'Content Planner',
  chooseCommunity: 'Choose community',
  mineLabel: 'Mine',
  justNow: 'Just now',
  postsAndComments: 'Posts & comments',
  goLive: 'Go Live',
  totalSubscribers: 'Total Subscribers',
  averageOpenRate: 'Average Open Rate',
  broadcastsSent: 'Broadcasts Sent',
  emailCrmTitle: 'Email & CRM',
  workspaceScopedData: 'workspace-specific data',
  createEmailBroadcast: '+ Create email broadcast',
  subscriberDirectory: 'Subscriber directory',
  searchNameOrEmail: 'Search name or email...',
  allTags: 'All tags',
  memberCol: 'Member',
  sourceCol: 'Source',
  subscribedDate: 'Subscribed',
  subjectLine: 'Subject',
  recipients: 'Recipients',
  sendTestEmail: 'Send test email',
  sendBroadcastNow: 'Send broadcast now',
  landingHeroBadge: '⚡ The All-in-One Platform for Nordic Creators',
  landingHeroHeadline: 'Build, Sell & Scale — Community, Bio & Socials in One App',
  landingHeroSub:
    'Stop juggling Later, Linktree, Skool and Stripe. Sell digital products, host courses, plan social media content, and take instant Swish & Vipps payments — all in one app.',
  landingCtaStartFree: 'Start Your Free Community →',
  landingCtaExplore: 'Explore Popular Communities',
  trustPillSwish: '⚡ Built-in Swish & Vipps',
  trustPillVat: '🧾 Automatic Fortnox & VAT',
  trustPillAi: '🤖 3x AI Copilots Included',
  trustPillSocial: '📅 Planner, Bio & Social Sets',
  whyChooseUs: 'Why Choose Us',
  whyChooseUsHeadline: 'Why Choose Us Instead of US Tools?',
  whyOldWay: 'The Old Way',
  whyNewWay: 'The New Way',
  whyOldWayStack: 'Later + Linktree + Skool + Zoom',
  whyNewWayStack: 'All-in-one creator admin + mobile app',
  metricMonthlyCost: 'Monthly Cost',
  metricPaymentMethods: 'Payment Methods',
  metricNordicVat: 'Nordic VAT & Accounting',
  metricSocialStack: 'Social & Bio tools',
  metricSocialStackNew: 'Planner · Bio · Tagging built-in',
  featureStoreTitle: 'Link-in-Bio Builder',
  featureStoreSummary:
    'Blocks, Design, Analytics & Settings tabs. Themes, UTM tracking, products and 1-tap checkout.',
  featurePlannerTitle: 'Content Planner & Social Sets',
  featurePlannerSummary:
    'Calendar, Kanban and multi-brand Social Sets for Instagram, TikTok and more.',
  featureAnalyticsTitle: 'Later-style Advanced Analytics',
  featureAnalyticsSummary:
    'Overview, Audience, Posts, Reels, Stories, Hashtags and Linkin.bio performance reports.',
  featureTaggingTitle: 'Post Link-Tagging',
  featureTaggingSummary: 'Tag product links on Instagram & TikTok previews and Track Every Sale.',
  featureCommunityTitle: 'Gamified Community & Members',
  featureCommunitySummary: 'Feed, XP, levels, classroom, store, events and live — one member hub.',
  featureEventsTitle: 'Live Webinars & Events',
  featureEventsSummary: 'Schedule, RSVP, countdown timers, calendar sync & live chat.',
  featureEmailTitle: 'Email CRM & Broadcasts',
  featureEmailSummary: 'Subscriber directory, campaigns, open/click stats and workspace-scoped lists.',
  featureAiTitle: 'AI Copilot Suite',
  featureAiSummary: 'Creator AI for content, Member AI for Q&A, Business Manager for growth.',
  featureFinanceTitle: 'Nordic Accounting & Tax',
  featureFinanceSummary: 'Proper 6%/25% VAT, Fortnox receipts & BankID authentication.',
  featuresEyebrow: 'The Platform',
  featuresHeadline: 'Everything to sell, post & scale',
  featuresSub:
    'Creator Admin for social, bio and analytics — plus community, events, email and Nordic checkout for your members.',
  suiteEyebrow: '⚡ Creator Admin',
  suiteHeadline: 'Your Complete Creator Command Center',
  suiteSub:
    'Everything you need after login: social planning, bio link storefront, inbox, advanced analytics, community, and email CRM — in one unified dashboard.',
  suitePlannerTitle: 'Calendar & Planner',
  suitePlannerSummary:
    'Schedule and auto-post content across your multi-brand Social Set profiles with Kanban & Calendar views.',
  suiteBioTitle: 'Bio Link Builder',
  suiteBioSummary:
    'Custom themes, UTM tracking, digital products, and 1-tap Swish & Vipps checkout flow.',
  suiteAnalyticsTitle: 'In-depth Analytics',
  suiteAnalyticsSummary:
    'Growth charts, post/reel/story stats, audience demographics, and bio link sales metrics.',
  suiteTaggingTitle: 'Post Link-Tagging',
  suiteTaggingSummary:
    'Overlay product links directly on social previews and track every sale generated from content.',
  suiteMediaTitle: 'Central Media Hub',
  suiteMediaSummary:
    'Store, organize, and manage all your creative assets and tagged content previews in one place.',
  suiteInboxTitle: 'Unified Social Inbox',
  suiteInboxSummary:
    'Manage DMs and comments across Instagram and TikTok profiles seamlessly from a single workspace.',
  suiteCommunityTitle: 'Community & Members',
  suiteCommunitySummary:
    'Member feeds, moderation tools, classroom courses, storefront, live events, and XP leaderboards.',
  suiteEmailTitle: 'Email CRM & Broadcasts',
  suiteEmailSummary:
    'Subscriber directory, automated email broadcasts, tags, and engagement analytics for every brand workspace.',
  roiEyebrow: 'ROI Calculator',
  roiHeadline: 'Estimate your monthly revenue',
  roiSub: 'Adjust the sliders. 1–3% conversion is realistic for an engaged creator audience.',
  roiFollowers: 'Select Follower Count',
  roiMonthlyPrice: 'Monthly Membership Price',
  roiConversion: 'Conversion Rate',
  roiEstimatedRevenue: 'Estimated Monthly Revenue',
  roiEarnLine: 'With just {pct}% conversion, you earn ${amount} / month',
  roiPayingMembers: 'Approx. {count} paying members at {price} SEK',
  faqEyebrow: 'FAQ',
  faqHeadline: 'Frequently asked questions',
  faqSub: 'Payments, bio, social tagging, VAT and migrating members.',
  faqSwishQ: 'How do Swish payments work?',
  faqSwishA:
    'Members pay with Swish or Vipps in checkout — often in under 10 seconds. Funds link to your creator account so you never rebuild checkout yourself.',
  faqVatQ: 'How is VAT and accounting handled?',
  faqVatA:
    'The platform applies correct Nordic VAT (e.g. 6% or 25%) and can generate Fortnox receipts automatically — built for Swedish and Nordic rules from day one.',
  faqBioQ: 'What is included in Bio Builder?',
  faqBioA:
    'Four tabs — Blocks, Design, Analytics and Settings. Add links and products, pick Later-style themes, track UTM clicks, and manage Google Analytics parameters.',
  faqTaggingQ: 'How does post link-tagging work?',
  faqTaggingA:
    'In Media / Post Tagging, open an Instagram or TikTok preview, add product links (e.g. Eye cream, Cleanser), and show a Track Every Sale badge on tagged posts.',
  faqSocialQ: 'Can I run multiple brands or Social Sets?',
  faqSocialA:
    'Yes. Switch Active Social Sets in Creator Admin. Plans scale from Starter (1 set / 8 profiles) to Growth and Scale for more brands and profiles.',
  faqImportQ: 'Can I import my members from Facebook or Skool?',
  faqImportA:
    'Yes. Import members via email lists and invite them into your new community. They sign in with email or BankID and keep access to your courses and events.',
  faqPayoutQ: 'When do I get paid out?',
  faqPayoutA:
    'Revenue appears in Analytics and pays out to your bank account on the platform payout schedule. Track status, amounts, and history without chasing Stripe reports.',
  faqTrialQ: 'Is there a free plan?',
  faqTrialA:
    'Starter is free forever. Creator and Pro can be started when you are ready — no long lock-in. Yearly billing saves 17%.',
  searchCommunitiesHeading: 'Search communities',
  searchCommunitiesEyebrow: 'Discover',
  catMarketing: 'Marketing',
  catHealth: 'Health & Fitness',
  catFinance: 'Finance',
  catCoaching: 'Coaching',
  joinForPrice: 'Join for 199 SEK/mo',
  activeMembersLabel: 'Active Members',
  viewCommunity: 'View Community',
  landingReadyHeadline: 'Ready for one platform — not five subscriptions?',
  landingReadySub:
    'Social Sets, Bio Builder, post tagging, analytics, community, Swish and AI — built in from day one.',
  popularCategories: 'Popular categories',
  popularCommunities: 'Popular communities',
  followersLabel: 'followers',
  coursesLabel: 'courses',
  productsLabel: 'Products',
  freeLabelShort: 'Free',
  pricing: 'Pricing',
  adminEmailCrm: 'Email CRM',
  adminBioBuilder: 'Bio Builder',
  adminSearchPlaceholder: 'Search admin…',
  boardKanban: 'Board (Kanban)',
  calendarTab: 'Calendar',
  tableTab: 'Table',
  workflowIdeas: 'Ideas',
  workflowInProduction: 'In production',
  workflowReview: 'Review',
  workflowScheduled: 'Scheduled',
  workflowPublished: 'Published',
  statusConnected: 'Connected',
  statusNotConnected: 'Not connected',
  disconnect: 'Disconnect',
  createPost: 'Create post',
  searchPosts: 'Search posts…',
  accounts: 'Accounts',
  allPlatforms: 'All',
  studioMedia: 'Media',
  postTitle: 'Post title',
  studioStatus: 'Status',
  teamWorkspaceBrand: 'Team workspace / Brand',
  studioAssignees: 'Assignees',
  studioScheduleDate: 'Schedule date',
  studioCaption: 'Caption',
  studioSubtasks: 'Subtasks',
  studioActivityLog: 'Activity log',
  contentTab: 'Content',
  teamTab: 'Team',
  connectInstagramBusiness: 'Connect Instagram Business',
  connectTikTokBusiness: 'Connect TikTok Business',
  connectLinkedIn: 'Connect LinkedIn',
  connectYouTube: 'Connect YouTube',
  connectedAccounts: 'Connected accounts',
  socialAccountsHint: 'Connect profiles to publish and analyze from your Social Set.',
  subscribersLabel: 'subscribers',
};

export const EXTRA_SV: ExtraDict = {
  ...EXTRA_EN,
  signIn: 'Logga in',
  emailAddress: 'E-postadress',
  loginAsCreatorAdmin: 'Logga in som Kreatör / Admin',
  rememberMe: 'Kom ihåg mig',
  loginPortalTitle: 'Logga in',
  loginPortalSub: 'Välj hur du vill logga in på Nordic Creator.',
  socialAccounts: 'Sociala konton',
  adminContentPlanner: 'Content Planner',
  chooseCommunity: 'Välj community',
  mineLabel: 'Mina',
  justNow: 'Just nu',
  postsAndComments: 'Inlägg & kommentarer',
  goLive: 'Sänd Live',
  totalSubscribers: 'Totalt antal prenumeranter',
  averageOpenRate: 'Genomsnittlig öppningsfrekvens',
  broadcastsSent: 'Utskick skickade',
  emailCrmTitle: 'E-post & CRM',
  workspaceScopedData: 'workspace-specifik data',
  createEmailBroadcast: '+ Skapa e-postutskick',
  subscriberDirectory: 'Prenumerantkatalog',
  searchNameOrEmail: 'Sök namn eller e-post...',
  allTags: 'Alla taggar',
  memberCol: 'Medlem',
  sourceCol: 'Källa',
  subscribedDate: 'Prenumererade',
  subjectLine: 'Ämnesrad',
  recipients: 'Mottagare',
  sendTestEmail: 'Skicka testmejl',
  sendBroadcastNow: 'Skicka utskick nu',
  landingHeroBadge: 'Allt-i-ett-plattformen för nordiska kreatörer',
  landingHeroHeadline: 'Bygg, sälj & skala — community, bio & social i en app',
  landingHeroSub:
    'Sluta jonglera Later, Linktree, Skool, Zoom och Stripe. Planera inlägg, tagga produkter, kör link-in-bio, bygg community, hosta events och ta nordiska betalningar — allt i en mobilförst-plattform.',
  landingCtaStartFree: 'Starta din gratis community',
  landingCtaExplore: 'Utforska populära communities',
  trustPillSwish: '⚡ Inbyggd Swish & Vipps',
  trustPillVat: '🧾 Automatisk Fortnox & moms',
  trustPillAi: '🤖 3× AI Copilots ingår',
  trustPillSocial: '📅 Planner, Bio & Social Sets',
  whyChooseUs: 'Varför välja oss',
  whyChooseUsHeadline: 'Varför välja oss istället för USA-verktyg?',
  whyOldWay: 'Det gamla sättet',
  whyNewWay: 'Det nya sättet',
  whyOldWayStack: 'Later + Linktree + Skool + Zoom',
  whyNewWayStack: 'Allt-i-ett creator admin + mobilapp',
  metricMonthlyCost: 'Månadskostnad',
  metricPaymentMethods: 'Betalsätt',
  metricNordicVat: 'Nordisk moms & bokföring',
  metricSocialStack: 'Social- & bioverktyg',
  metricSocialStackNew: 'Planner · Bio · Tagging inbyggt',
  featureStoreTitle: 'Link-in-Bio Builder',
  featureStoreSummary:
    'Flikar för Blocks, Design, Analytics & Settings. Teman, UTM-spårning, produkter och 1-taps checkout.',
  featurePlannerTitle: 'Content Planner & Social Sets',
  featurePlannerSummary:
    'Kalender, Kanban och multi-brand Social Sets för Instagram, TikTok med mera.',
  featureAnalyticsTitle: 'Later-inspirerad Advanced Analytics',
  featureAnalyticsSummary:
    'Overview, Audience, Posts, Reels, Stories, Hashtags och Linkin.bio-rapporter.',
  featureTaggingTitle: 'Post Link-Tagging',
  featureTaggingSummary:
    'Tagga produktlänkar på Instagram- & TikTok-förhandsvisningar och Track Every Sale.',
  featureCommunityTitle: 'Gamified Community & Members',
  featureCommunitySummary: 'Feed, XP, nivåer, classroom, store, events och live — ett medlemsnav.',
  featureEventsTitle: 'Live-webbinarier & events',
  featureEventsSummary: 'Schema, OSA, nedräkning, kalendersynk & livechatt.',
  featureEmailTitle: 'E-post CRM & utskick',
  featureEmailSummary: 'Prenumerantkatalog, kampanjer, öppnings-/klickstatistik per workspace.',
  featureAiTitle: 'AI Copilot Suite',
  featureAiSummary: 'Creator AI för innehåll, Member AI för Q&A, Business Manager för tillväxt.',
  featureFinanceTitle: 'Nordisk bokföring & skatt',
  featureFinanceSummary: 'Korrekt 6%/25% moms, Fortnox-kvitton & BankID.',
  featuresEyebrow: 'Plattformen',
  featuresHeadline: 'Allt för att sälja, posta & skala',
  featuresSub:
    'Creator Admin för social, bio och analytics — plus community, events, e-post och nordisk checkout.',
  suiteEyebrow: '⚡ Creator Admin',
  suiteHeadline: 'Din kompletta Creator Command Center',
  suiteSub:
    'Allt du behöver efter inloggning: social planering, bio-länkbutik, inbox, avancerad analytics, community och e-post-CRM — i en samlad dashboard.',
  suitePlannerTitle: 'Kalender & Planner',
  suitePlannerSummary:
    'Schemalägg och auto-posta innehåll över dina Social Set-profiler med Kanban- och kalendervy.',
  suiteBioTitle: 'Bio Link Builder',
  suiteBioSummary:
    'Egna teman, UTM-spårning, digitala produkter och 1-trycks Swish & Vipps-checkout.',
  suiteAnalyticsTitle: 'Djupgående Analytics',
  suiteAnalyticsSummary:
    'Tillväxtgrafer, post/reel/story-statistik, demografi och bio-länkförsäljning.',
  suiteTaggingTitle: 'Post Link-Tagging',
  suiteTaggingSummary:
    'Lägg produktlänkar direkt på sociala previews och spåra varje försäljning från content.',
  suiteMediaTitle: 'Central Media Hub',
  suiteMediaSummary:
    'Lagra, organisera och hantera alla creatives och taggade content-previews på ett ställe.',
  suiteInboxTitle: 'Unified Social Inbox',
  suiteInboxSummary:
    'Hantera DM:ar och kommentarer över Instagram och TikTok från ett enda workspace.',
  suiteCommunityTitle: 'Community & Members',
  suiteCommunitySummary:
    'Medlemsflöden, moderation, kurser, storefront, live-event och XP-leaderboards.',
  suiteEmailTitle: 'E-post CRM & Broadcasts',
  suiteEmailSummary:
    'Prenumerantdirectory, automatiska utskick, taggar och engagemangsanalytics per varumärke.',
  roiEyebrow: 'ROI-kalkylator',
  roiHeadline: 'Uppskatta din månadsintäkt',
  roiSub: 'Justera reglagen. 1–3% konvertering är realistiskt för en engagerad publik.',
  roiFollowers: 'Välj antal följare',
  roiMonthlyPrice: 'Månadspris för medlemskap',
  roiConversion: 'Konvertering',
  roiEstimatedRevenue: 'Uppskattad månadsintäkt',
  roiEarnLine: 'Med bara {pct}% konvertering tjänar du ${amount} / månad',
  roiPayingMembers: 'Ca {count} betalande medlemmar à {price} SEK',
  faqEyebrow: 'FAQ',
  faqHeadline: 'Vanliga frågor',
  faqSub: 'Betalningar, bio, social tagging, moms och migrering av medlemmar.',
  faqSwishQ: 'Hur fungerar Swish-betalningar?',
  faqSwishA:
    'Medlemmar betalar med Swish eller Vipps i kassan — ofta under 10 sekunder. Pengarna kopplas till ditt creator-konto.',
  faqVatQ: 'Hur hanteras moms och bokföring?',
  faqVatA:
    'Plattformen räknar rätt nordisk moms (t.ex. 6% eller 25%) och kan generera Fortnox-kvitton automatiskt.',
  faqBioQ: 'Vad ingår i Bio Builder?',
  faqBioA:
    'Fyra flikar — Blocks, Design, Analytics och Settings. Lägg till länkar och produkter, välj teman, spåra UTM-klick och hantera Google Analytics-parametrar.',
  faqTaggingQ: 'Hur fungerar post link-tagging?',
  faqTaggingA:
    'I Media / Post Tagging öppnar du en Instagram- eller TikTok-förhandsvisning, lägger till produktlänkar och visar Track Every Sale på taggade inlägg.',
  faqSocialQ: 'Kan jag köra flera varumärken / Social Sets?',
  faqSocialA:
    'Ja. Byt Active Social Set i Creator Admin. Planer skalar från Starter (1 set / 8 profiler) till Growth och Scale.',
  faqImportQ: 'Kan jag importera medlemmar från Facebook eller Skool?',
  faqImportA:
    'Ja. Importera via e-postlistor och bjud in dem till din nya community. De loggar in med e-post eller BankID.',
  faqPayoutQ: 'När får jag utbetalning?',
  faqPayoutA:
    'Intäkter syns i Analytics och betalas ut enligt payout-schemat. Följ status utan att jaga Stripe-rapporter.',
  faqTrialQ: 'Finns det en gratisplan?',
  faqTrialA: 'Starter är gratis för alltid. Creator och Pro kan startas när du är redo — ingen lång bindningstid.',
  searchCommunitiesHeading: 'Sök communities',
  searchCommunitiesEyebrow: 'Upptäck',
  catMarketing: 'Marknadsföring',
  catHealth: 'Hälsa & träning',
  catFinance: 'Ekonomi',
  catCoaching: 'Coaching',
  joinForPrice: 'Gå med för 199 SEK/mån',
  activeMembersLabel: 'Aktiva medlemmar',
  viewCommunity: 'Visa community',
  landingReadyHeadline: 'Redo för en plattform — inte fem abonnemang?',
  landingReadySub:
    'Social Sets, Bio Builder, post-tagging, analytics, community, Swish och AI — inbyggt från start.',
  popularCategories: 'Populära kategorier',
  popularCommunities: 'Populära communities',
  followersLabel: 'följare',
  coursesLabel: 'kurser',
  productsLabel: 'Produkter',
  freeLabelShort: 'Gratis',
  pricing: 'Priser',
  adminEmailCrm: 'E-post CRM',
  adminBioBuilder: 'Bio Builder',
  adminSearchPlaceholder: 'Sök i admin…',
  boardKanban: 'Board (Kanban)',
  calendarTab: 'Kalender',
  tableTab: 'Tabell',
  workflowIdeas: 'Ideer',
  workflowInProduction: 'I produktion',
  workflowReview: 'Granskning',
  workflowScheduled: 'Schemalagt',
  workflowPublished: 'Publicerat',
  statusConnected: 'Ansluten',
  statusNotConnected: 'Ej ansluten',
  disconnect: 'Koppla från',
  createPost: 'Skapa inlägg',
  searchPosts: 'Sök inlägg…',
  accounts: 'Konton',
  allPlatforms: 'Alla',
  studioMedia: 'Media',
  postTitle: 'Inläggstitel',
  studioStatus: 'Status',
  teamWorkspaceBrand: 'Team-yta / Varumärke',
  studioAssignees: 'Tilldelade',
  studioScheduleDate: 'Publiceringsdatum',
  studioCaption: 'Bildtext',
  studioSubtasks: 'Deluppgifter',
  studioActivityLog: 'Aktivitetslogg',
  contentTab: 'Innehåll',
  teamTab: 'Team',
  connectInstagramBusiness: 'Anslut Instagram Business',
  connectTikTokBusiness: 'Anslut TikTok Business',
  connectLinkedIn: 'Anslut LinkedIn',
  connectYouTube: 'Anslut YouTube',
  connectedAccounts: 'Anslutna konton',
  socialAccountsHint: 'Anslut profiler för att publicera och analysera från ditt Social Set.',
  subscribersLabel: 'prenumeranter',
};

/** NO/DA/FI inherit English extras, with Nordic overrides for high-visibility landing strings. */
export const EXTRA_BY_LOCALE: Record<ExtraLocale, ExtraDict> = {
  en: EXTRA_EN,
  sv: EXTRA_SV,
  no: {
    ...EXTRA_EN,
    landingHeroHeadline: 'Bygg, selg og skaler — community, bio & social i én app',
    landingCtaStartFree: 'Start din gratis community',
    landingCtaExplore: 'Utforsk populære communities',
    suiteHeadline: 'Ditt komplette Creator Command Center',
    featuresHeadline: 'Alt for å selge, poste & skalere',
    pricing: 'Priser',
    signIn: 'Logg inn',
  },
  da: {
    ...EXTRA_EN,
    landingHeroHeadline: 'Byg, sælg og skaler — community, bio & social i én app',
    landingCtaStartFree: 'Start dit gratis community',
    landingCtaExplore: 'Udforsk populære communities',
    suiteHeadline: 'Dit komplette Creator Command Center',
    featuresHeadline: 'Alt til at sælge, poste & skalere',
    pricing: 'Priser',
    signIn: 'Log ind',
  },
  fi: {
    ...EXTRA_EN,
    landingHeroHeadline: 'Rakenna, myy & skaalaa — yhteisö, bio ja some yhdessä',
    landingCtaStartFree: 'Aloita ilmainen yhteisö',
    landingCtaExplore: 'Tutustu suosittuihin yhteisöihin',
    suiteHeadline: 'Täydellinen Creator Command Center',
    featuresHeadline: 'Kaikki myyntiin, julkaisuun & skaalaamiseen',
    pricing: 'Hinnat',
    signIn: 'Kirjaudu',
  },
};
