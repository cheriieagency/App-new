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
  | 'feedGridTab'
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
  | 'subscribersLabel'
  | 'backToAdmin'
  | 'loadingPlanner'
  | 'loadingAccounts'
  | 'demoOAuth'
  | 'untitledPost'
  | 'checklist'
  | 'teamWorkspacesBrands'
  | 'searchBrand'
  | 'noBrandsMatch'
  | 'createTeamWorkspace'
  | 'accountSingular'
  | 'accountPlural'
  | 'draftBank'
  | 'draftBankHint'
  | 'ideasCountLabel'
  | 'noDraftsYet'
  | 'createIdeasHint'
  | 'dragTilesHint'
  | 'savingEllipsis'
  | 'gridOrderUpdated'
  | 'gridOrderFailed'
  | 'followingLabel'
  | 'likesLabel'
  | 'postsStatLabel'
  | 'shareProfileBtn'
  | 'teamMembersAria';

export type ExtraDict = Record<ExtraKey, string>;

export const EXTRA_EN: ExtraDict = {
  signIn: 'Sign In',
  emailAddress: 'Email Address',
  loginAsCreatorAdmin: 'Creator / Admin',
  rememberMe: 'Remember Me',
  loginPortalTitle: 'Sign In',
  loginPortalSub: 'Choose how you want to sign in to clikd:',
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
  landingHeroBadge: '⚡ The All-in-One Platform — clikd:',
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
  boardKanban: 'Progress',
  calendarTab: 'Calendar',
  tableTab: 'Table',
  feedGridTab: 'Feed Grid',
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
  backToAdmin: '← Admin',
  loadingPlanner: 'Loading planner…',
  loadingAccounts: 'Loading accounts…',
  demoOAuth: 'Demo OAuth',
  untitledPost: 'Untitled',
  checklist: 'Checklist',
  teamWorkspacesBrands: 'Team Workspaces / Brands',
  searchBrand: 'Search brand…',
  noBrandsMatch: 'No brands match.',
  createTeamWorkspace: 'Create New Team Workspace / Brand',
  accountSingular: 'account',
  accountPlural: 'accounts',
  draftBank: 'Draft Bank',
  draftBankHint: 'Unscheduled drafts & ideas — drag onto the feed grid to schedule.',
  ideasCountLabel: '{n} ideas',
  noDraftsYet: 'No drafts yet',
  createIdeasHint: 'Create ideas in Progress or AI Copilot.',
  dragTilesHint: 'Drag scheduled tiles to rearrange. Published posts stay locked.',
  savingEllipsis: 'Saving…',
  gridOrderUpdated: 'Grid order updated ✓',
  gridOrderFailed: 'Could not update grid order',
  followingLabel: 'Following',
  likesLabel: 'Likes',
  postsStatLabel: 'posts',
  shareProfileBtn: 'Share profile',
  teamMembersAria: 'Team members',
};

export const EXTRA_SV: ExtraDict = {
  ...EXTRA_EN,
  signIn: 'Logga in',
  emailAddress: 'E-postadress',
  loginAsCreatorAdmin: 'Kreatör / Admin',
  rememberMe: 'Kom ihåg mig',
  loginPortalTitle: 'Logga in',
  loginPortalSub: 'Välj hur du vill logga in på clikd:',
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
  boardKanban: 'Progress',
  calendarTab: 'Kalender',
  tableTab: 'Tabell',
  feedGridTab: 'Feed-rutnät',
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
  backToAdmin: '← Admin',
  loadingPlanner: 'Laddar planner…',
  loadingAccounts: 'Laddar konton…',
  demoOAuth: 'Demo OAuth',
  untitledPost: 'Utan titel',
  checklist: 'Checklista',
  teamWorkspacesBrands: 'Team-ytor / Varumärken',
  searchBrand: 'Sök varumärke…',
  noBrandsMatch: 'Inga varumärken matchar.',
  createTeamWorkspace: 'Skapa ny team-yta / varumärke',
  accountSingular: 'konto',
  accountPlural: 'konton',
  draftBank: 'Utkastbank',
  draftBankHint: 'Oplanerade utkast & idéer — dra till feed-rutnätet för att schemalägga.',
  ideasCountLabel: '{n} idéer',
  noDraftsYet: 'Inga utkast än',
  createIdeasHint: 'Skapa idéer i Progress eller AI Copilot.',
  dragTilesHint: 'Dra schemalagda rutor för att ändra ordning. Publicerade inlägg är låsta.',
  savingEllipsis: 'Sparar…',
  gridOrderUpdated: 'Grid-ordning uppdaterad ✓',
  gridOrderFailed: 'Kunde inte uppdatera grid-ordningen',
  followingLabel: 'Följer',
  likesLabel: 'Gillningar',
  postsStatLabel: 'inlägg',
  shareProfileBtn: 'Dela profil',
  teamMembersAria: 'Teammedlemmar',
};

/** Norwegian — full extras (planner + landing), based on SV with NO spelling. */
export const EXTRA_NO: ExtraDict = {
  ...EXTRA_SV,
  signIn: 'Logg inn',
  emailAddress: 'E-postadresse',
  loginAsCreatorAdmin: 'Skaper / Admin',
  rememberMe: 'Husk meg',
  loginPortalTitle: 'Logg inn',
  loginPortalSub: 'Velg hvordan du vil logge inn på clikd:',
  socialAccounts: 'Sosiale kontoer',
  chooseCommunity: 'Velg community',
  mineLabel: 'Mine',
  justNow: 'Akkurat nå',
  postsAndComments: 'Innlegg & kommentarer',
  goLive: 'Send Live',
  totalSubscribers: 'Totalt antall abonnenter',
  averageOpenRate: 'Gjennomsnittlig åpningsrate',
  broadcastsSent: 'Utsendelser sendt',
  emailCrmTitle: 'E-post & CRM',
  createEmailBroadcast: '+ Opprett e-postutsendelse',
  subscriberDirectory: 'Abonnentkatalog',
  searchNameOrEmail: 'Søk navn eller e-post...',
  allTags: 'Alle tagger',
  memberCol: 'Medlem',
  sourceCol: 'Kilde',
  subscribedDate: 'Abonnerte',
  subjectLine: 'Emnelinje',
  recipients: 'Mottakere',
  sendTestEmail: 'Send testepost',
  sendBroadcastNow: 'Send utsendelse nå',
  landingHeroBadge: 'Alt-i-ett-plattformen for nordiske skapere',
  landingHeroHeadline: 'Bygg, selg og skaler — community, bio & social i én app',
  landingHeroSub:
    'Slutt å sjonglere Later, Linktree, Skool, Zoom og Stripe. Planlegg innlegg, tagg produkter, kjør link-in-bio, bygg community, host events og ta nordiske betalinger — alt i én mobilførst-plattform.',
  landingCtaStartFree: 'Start din gratis community',
  landingCtaExplore: 'Utforsk populære communities',
  whyChooseUs: 'Hvorfor velge oss',
  whyChooseUsHeadline: 'Hvorfor velge oss i stedet for USA-verktøy?',
  whyOldWay: 'Den gamle måten',
  whyNewWay: 'Den nye måten',
  featuresEyebrow: 'Plattformen',
  featuresHeadline: 'Alt for å selge, poste & skalere',
  featuresSub:
    'Creator Admin for social, bio og analytics — pluss community, events, e-post og nordisk checkout.',
  suiteEyebrow: '⚡ Creator Admin',
  suiteHeadline: 'Ditt komplette Creator Command Center',
  suiteSub:
    'Alt du trenger etter innlogging: social planlegging, bio-lenkebutikk, innboks, avansert analytics, community og e-post-CRM — i ett samlet dashboard.',
  faqEyebrow: 'FAQ',
  faqHeadline: 'Vanlige spørsmål',
  faqSub: 'Betalinger, bio, social tagging, MVA og migrering av medlemmer.',
  searchCommunitiesHeading: 'Søk communities',
  searchCommunitiesEyebrow: 'Oppdag',
  catMarketing: 'Markedsføring',
  catHealth: 'Helse & trening',
  catFinance: 'Økonomi',
  catCoaching: 'Coaching',
  joinForPrice: 'Bli med for 199 NOK/mnd',
  activeMembersLabel: 'Aktive medlemmer',
  viewCommunity: 'Vis community',
  landingReadyHeadline: 'Klar for én plattform — ikke fem abonnement?',
  landingReadySub:
    'Social Sets, Bio Builder, post-tagging, analytics, community, Swish og AI — innebygd fra start.',
  popularCategories: 'Populære kategorier',
  popularCommunities: 'Populære communities',
  followersLabel: 'følgere',
  coursesLabel: 'kurs',
  productsLabel: 'Produkter',
  freeLabelShort: 'Gratis',
  pricing: 'Priser',
  adminEmailCrm: 'E-post CRM',
  adminSearchPlaceholder: 'Søk i admin…',
  boardKanban: 'Progress',
  calendarTab: 'Kalender',
  tableTab: 'Tabell',
  feedGridTab: 'Feed-rutenett',
  workflowIdeas: 'Ideer',
  workflowInProduction: 'I produksjon',
  workflowReview: 'Gjennomgang',
  workflowScheduled: 'Planlagt',
  workflowPublished: 'Publisert',
  statusConnected: 'Tilkoblet',
  statusNotConnected: 'Ikke tilkoblet',
  disconnect: 'Koble fra',
  createPost: 'Opprett innlegg',
  searchPosts: 'Søk innlegg…',
  accounts: 'Kontoer',
  allPlatforms: 'Alle',
  studioMedia: 'Media',
  postTitle: 'Innleggstittel',
  studioStatus: 'Status',
  teamWorkspaceBrand: 'Team-område / Merkevare',
  studioAssignees: 'Tildelte',
  studioScheduleDate: 'Publiseringsdato',
  studioCaption: 'Bildetekst',
  studioSubtasks: 'Deloppgaver',
  studioActivityLog: 'Aktivitetslogg',
  contentTab: 'Innhold',
  teamTab: 'Team',
  connectInstagramBusiness: 'Koble til Instagram Business',
  connectTikTokBusiness: 'Koble til TikTok Business',
  connectLinkedIn: 'Koble til LinkedIn',
  connectYouTube: 'Koble til YouTube',
  connectedAccounts: 'Tilkoblede kontoer',
  socialAccountsHint: 'Koble til profiler for å publisere og analysere fra ditt Social Set.',
  subscribersLabel: 'abonnenter',
  backToAdmin: '← Admin',
  loadingPlanner: 'Laster planner…',
  loadingAccounts: 'Laster kontoer…',
  untitledPost: 'Uten tittel',
  checklist: 'Sjekkliste',
  teamWorkspacesBrands: 'Team-områder / Merkevarer',
  searchBrand: 'Søk merkevare…',
  noBrandsMatch: 'Ingen merkevarer matcher.',
  createTeamWorkspace: 'Opprett nytt team-område / merkevare',
  accountSingular: 'konto',
  accountPlural: 'kontoer',
  draftBank: 'Utkastbank',
  draftBankHint: 'Uplanlagte utkast & ideer — dra til feed-rutenettet for å planlegge.',
  ideasCountLabel: '{n} ideer',
  noDraftsYet: 'Ingen utkast ennå',
  createIdeasHint: 'Opprett ideer i Progress eller AI Copilot.',
  dragTilesHint: 'Dra planlagte ruter for å endre rekkefølge. Publiserte innlegg er låst.',
  savingEllipsis: 'Lagrer…',
  gridOrderUpdated: 'Rutenett-rekkefølge oppdatert ✓',
  gridOrderFailed: 'Kunne ikke oppdatere rutenett-rekkefølgen',
  followingLabel: 'Følger',
  likesLabel: 'Likes',
  postsStatLabel: 'innlegg',
  shareProfileBtn: 'Del profil',
  teamMembersAria: 'Teammedlemmer',
};

/** Danish — full extras. */
export const EXTRA_DA: ExtraDict = {
  ...EXTRA_SV,
  signIn: 'Log ind',
  emailAddress: 'E-mailadresse',
  loginAsCreatorAdmin: 'Creator / Admin',
  rememberMe: 'Husk mig',
  loginPortalTitle: 'Log ind',
  loginPortalSub: 'Vælg, hvordan du vil logge ind på clikd:',
  socialAccounts: 'Sociale konti',
  chooseCommunity: 'Vælg community',
  mineLabel: 'Mine',
  justNow: 'Lige nu',
  postsAndComments: 'Opslag & kommentarer',
  goLive: 'Gå Live',
  totalSubscribers: 'Samlet antal abonnenter',
  averageOpenRate: 'Gennemsnitlig åbningsrate',
  broadcastsSent: 'Udsendelser sendt',
  emailCrmTitle: 'E-mail & CRM',
  createEmailBroadcast: '+ Opret e-mailudsendelse',
  subscriberDirectory: 'Abonnentkatalog',
  searchNameOrEmail: 'Søg navn eller e-mail...',
  allTags: 'Alle tags',
  memberCol: 'Medlem',
  sourceCol: 'Kilde',
  subscribedDate: 'Abonnerede',
  subjectLine: 'Emnelinje',
  recipients: 'Modtagere',
  sendTestEmail: 'Send testmail',
  sendBroadcastNow: 'Send udsendelse nu',
  landingHeroBadge: 'Alt-i-én-platformen for nordiske creators',
  landingHeroHeadline: 'Byg, sælg og skaler — community, bio & social i én app',
  landingHeroSub:
    'Stop med at jonglere Later, Linktree, Skool, Zoom og Stripe. Planlæg opslag, tag produkter, kør link-in-bio, byg community, host events og tag nordiske betalinger — alt i én mobil-først platform.',
  landingCtaStartFree: 'Start dit gratis community',
  landingCtaExplore: 'Udforsk populære communities',
  whyChooseUs: 'Hvorfor vælge os',
  whyChooseUsHeadline: 'Hvorfor vælge os i stedet for USA-værktøjer?',
  whyOldWay: 'Den gamle måde',
  whyNewWay: 'Den nye måde',
  featuresEyebrow: 'Platformen',
  featuresHeadline: 'Alt til at sælge, poste & skalere',
  featuresSub:
    'Creator Admin til social, bio og analytics — plus community, events, e-mail og nordisk checkout.',
  suiteHeadline: 'Dit komplette Creator Command Center',
  suiteSub:
    'Alt du behøver efter login: social planlægning, bio-linkbutik, indbakke, avanceret analytics, community og e-mail-CRM — i ét samlet dashboard.',
  faqHeadline: 'Ofte stillede spørgsmål',
  faqSub: 'Betalinger, bio, social tagging, moms og migrering af medlemmer.',
  searchCommunitiesHeading: 'Søg communities',
  searchCommunitiesEyebrow: 'Opdag',
  catMarketing: 'Marketing',
  catHealth: 'Sundhed & træning',
  catFinance: 'Økonomi',
  joinForPrice: 'Bliv medlem for 199 DKK/md',
  activeMembersLabel: 'Aktive medlemmer',
  viewCommunity: 'Se community',
  landingReadyHeadline: 'Klar til én platform — ikke fem abonnementer?',
  landingReadySub:
    'Social Sets, Bio Builder, post-tagging, analytics, community, Swish og AI — indbygget fra start.',
  popularCategories: 'Populære kategorier',
  popularCommunities: 'Populære communities',
  followersLabel: 'følgere',
  coursesLabel: 'kurser',
  productsLabel: 'Produkter',
  freeLabelShort: 'Gratis',
  pricing: 'Priser',
  adminEmailCrm: 'E-mail CRM',
  adminSearchPlaceholder: 'Søg i admin…',
  calendarTab: 'Kalender',
  tableTab: 'Tabel',
  feedGridTab: 'Feed-gitter',
  workflowIdeas: 'Idéer',
  workflowInProduction: 'I produktion',
  workflowReview: 'Gennemgang',
  workflowScheduled: 'Planlagt',
  workflowPublished: 'Udgivet',
  statusConnected: 'Forbundet',
  statusNotConnected: 'Ikke forbundet',
  disconnect: 'Frakobl',
  createPost: 'Opret opslag',
  searchPosts: 'Søg opslag…',
  accounts: 'Konti',
  allPlatforms: 'Alle',
  postTitle: 'Opslagstitel',
  teamWorkspaceBrand: 'Team-område / Brand',
  studioAssignees: 'Tildelte',
  studioScheduleDate: 'Planlægningsdato',
  studioCaption: 'Billedtekst',
  studioSubtasks: 'Delopgaver',
  studioActivityLog: 'Aktivitetslog',
  contentTab: 'Indhold',
  connectInstagramBusiness: 'Forbind Instagram Business',
  connectTikTokBusiness: 'Forbind TikTok Business',
  connectLinkedIn: 'Forbind LinkedIn',
  connectYouTube: 'Forbind YouTube',
  connectedAccounts: 'Forbundne konti',
  socialAccountsHint: 'Forbind profiler for at publicere og analysere fra dit Social Set.',
  subscribersLabel: 'abonnenter',
  loadingPlanner: 'Indlæser planner…',
  loadingAccounts: 'Indlæser konti…',
  untitledPost: 'Uden titel',
  checklist: 'Tjekliste',
  teamWorkspacesBrands: 'Team-områder / Brands',
  searchBrand: 'Søg brand…',
  noBrandsMatch: 'Ingen brands matcher.',
  createTeamWorkspace: 'Opret nyt team-område / brand',
  accountSingular: 'konto',
  accountPlural: 'konti',
  draftBank: 'Kladdebank',
  draftBankHint: 'Uplanlagte kladder & idéer — træk til feed-gitteret for at planlægge.',
  ideasCountLabel: '{n} idéer',
  noDraftsYet: 'Ingen kladder endnu',
  createIdeasHint: 'Opret idéer i Progress eller AI Copilot.',
  dragTilesHint: 'Træk planlagte felter for at ændre rækkefølge. Udgivne opslag er låst.',
  savingEllipsis: 'Gemmer…',
  gridOrderUpdated: 'Gitterrækkefølge opdateret ✓',
  gridOrderFailed: 'Kunne ikke opdatere gitterrækkefølgen',
  followingLabel: 'Følger',
  likesLabel: 'Likes',
  postsStatLabel: 'opslag',
  shareProfileBtn: 'Del profil',
  teamMembersAria: 'Teammedlemmer',
};

/** Finnish — full extras. */
export const EXTRA_FI: ExtraDict = {
  ...EXTRA_EN,
  signIn: 'Kirjaudu',
  emailAddress: 'Sähköpostiosoite',
  loginAsCreatorAdmin: 'Creator / Admin',
  rememberMe: 'Muista minut',
  loginPortalTitle: 'Kirjaudu',
  loginPortalSub: 'Valitse, miten haluat kirjautua clikd:iin.',
  socialAccounts: 'Some-tilit',
  adminContentPlanner: 'Sisältösuunnittelija',
  chooseCommunity: 'Valitse yhteisö',
  mineLabel: 'Omat',
  justNow: 'Juuri nyt',
  postsAndComments: 'Julkaisut & kommentit',
  goLive: 'Lähetä livenä',
  totalSubscribers: 'Tilaajia yhteensä',
  averageOpenRate: 'Keskimääräinen avausprosentti',
  broadcastsSent: 'Lähetyksiä lähetetty',
  emailCrmTitle: 'Sähköposti & CRM',
  workspaceScopedData: 'työtilakohtainen data',
  createEmailBroadcast: '+ Luo sähköpostilähetys',
  subscriberDirectory: 'Tilaajahakemisto',
  searchNameOrEmail: 'Hae nimeä tai sähköpostia...',
  allTags: 'Kaikki tagit',
  memberCol: 'Jäsen',
  sourceCol: 'Lähde',
  subscribedDate: 'Tilattu',
  subjectLine: 'Aihe',
  recipients: 'Vastaanottajat',
  sendTestEmail: 'Lähetä testisähköposti',
  sendBroadcastNow: 'Lähetä nyt',
  landingHeroBadge: 'Kaikki yhdessä -alusta pohjoismaisille luojille',
  landingHeroHeadline: 'Rakenna, myy & skaalaa — yhteisö, bio ja some yhdessä',
  landingHeroSub:
    'Lopeta Laterin, Linktreen, Skoolin, Zoomin ja Stripen jongleeraus. Suunnittele julkaisuja, tagaa tuotteita, käytä link-in-biota, rakenna yhteisö, järjestä eventtejä ja ota pohjoismaiset maksut — kaikki yhdessä mobiili ensin -alustassa.',
  landingCtaStartFree: 'Aloita ilmainen yhteisö',
  landingCtaExplore: 'Tutustu suosittuihin yhteisöihin',
  trustPillSwish: '⚡ Sisäänrakennettu Swish & Vipps',
  trustPillVat: '🧾 Automaattinen Fortnox & ALV',
  trustPillAi: '🤖 3× AI Copilot mukana',
  trustPillSocial: '📅 Planner, Bio & Social Sets',
  whyChooseUs: 'Miksi valita meidät',
  whyChooseUsHeadline: 'Miksi valita meidät USA-työkalujen sijaan?',
  whyOldWay: 'Vanha tapa',
  whyNewWay: 'Uusi tapa',
  whyOldWayStack: 'Later + Linktree + Skool + Zoom',
  whyNewWayStack: 'Kaikki yhdessä creator-admin + mobiilisovellus',
  metricMonthlyCost: 'Kuukausimaksu',
  metricPaymentMethods: 'Maksutavat',
  metricNordicVat: 'Pohjoismainen ALV & kirjanpito',
  metricSocialStack: 'Some- & bio-työkalut',
  metricSocialStackNew: 'Planner · Bio · Tagging sisäänrakennettuna',
  featureStoreTitle: 'Link-in-Bio Builder',
  featureStoreSummary:
    'Välilehdet: Blocks, Design, Analytics & Settings. Teemat, UTM-seuranta, tuotteet ja 1-napin checkout.',
  featurePlannerTitle: 'Content Planner & Social Sets',
  featurePlannerSummary:
    'Kalenteri, Kanban ja multi-brand Social Sets Instagramille, TikTokille ym.',
  featureAnalyticsTitle: 'Later-tyylinen Advanced Analytics',
  featureAnalyticsSummary:
    'Overview, Audience, Posts, Reels, Stories, Hashtags ja Linkin.bio-raportit.',
  featureTaggingTitle: 'Post Link-Tagging',
  featureTaggingSummary:
    'Tagaa tuotelinkkejä Instagram- & TikTok-esikatseluihin ja Track Every Sale.',
  featureCommunityTitle: 'Pelillistetty yhteisö & jäsenet',
  featureCommunitySummary: 'Feed, XP, tasot, classroom, store, events ja live — yksi jäsenkeskus.',
  featureEventsTitle: 'Live-webinaarit & eventit',
  featureEventsSummary: 'Aikataulu, RSVP, countdown, kalenterisync & livechat.',
  featureEmailTitle: 'Sähköposti-CRM & lähetykset',
  featureEmailSummary: 'Tilaajahakemisto, kampanjat, avaus-/klikkausdata per työtila.',
  featureAiTitle: 'AI Copilot Suite',
  featureAiSummary: 'Creator AI sisällölle, Member AI Q&A:lle, Business Manager kasvulle.',
  featureFinanceTitle: 'Pohjoismainen kirjanpito & vero',
  featureFinanceSummary: 'Oikea 6%/25% ALV, Fortnox-kuitit & BankID.',
  featuresEyebrow: 'Alusta',
  featuresHeadline: 'Kaikki myyntiin, julkaisuun & skaalaamiseen',
  featuresSub:
    'Creator Admin somelle, biolle ja analytiikalle — plus yhteisö, eventit, sähköposti ja pohjoismainen checkout.',
  suiteEyebrow: '⚡ Creator Admin',
  suiteHeadline: 'Täydellinen Creator Command Center',
  suiteSub:
    'Kaikki tarvitsemasi kirjautumisen jälkeen: some-suunnittelu, bio-linkkikauppa, inbox, analytics, yhteisö ja sähköposti-CRM — yhdessä dashboardissa.',
  suitePlannerTitle: 'Kalenteri & Planner',
  suitePlannerSummary:
    'Aikatauluta ja auto-julkaise sisältöä Social Set -profiileihisi Kanban- ja kalenterinäkymällä.',
  suiteBioTitle: 'Bio Link Builder',
  suiteBioSummary:
    'Omat teemat, UTM-seuranta, digituotteet ja 1-napin Swish & Vipps -checkout.',
  suiteAnalyticsTitle: 'Syvä Analytics',
  suiteAnalyticsSummary:
    'Kasvukäyrät, post/reel/story-tilastot, demografia ja bio-linkkimyynti.',
  suiteTaggingTitle: 'Post Link-Tagging',
  suiteTaggingSummary:
    'Lisää tuotelinkkejä suoraan some-esikatseluihin ja seuraa jokaista myyntiä.',
  suiteMediaTitle: 'Keskitetty Media Hub',
  suiteMediaSummary:
    'Tallenna, järjestä ja hallitse creativet ja tagatut esikatselut yhdessä paikassa.',
  suiteInboxTitle: 'Yhtenäinen Social Inbox',
  suiteInboxSummary:
    'Hallitse DM:itä ja kommentteja Instagramissa ja TikTokissa yhdestä työtilasta.',
  suiteCommunityTitle: 'Yhteisö & jäsenet',
  suiteCommunitySummary:
    'Jäsenfeed, moderointi, kurssit, storefront, live-event ja XP-leaderboardit.',
  suiteEmailTitle: 'Sähköposti-CRM & Broadcasts',
  suiteEmailSummary:
    'Tilaajahakemisto, automaattiset lähetykset, tagit ja engagement-analytiikka per brändi.',
  roiEyebrow: 'ROI-laskuri',
  roiHeadline: 'Arvioi kuukausitulosi',
  roiSub: 'Säädä liukusäätimiä. 1–3 % konversio on realistinen sitoutuneelle yleisölle.',
  roiFollowers: 'Valitse seuraajien määrä',
  roiMonthlyPrice: 'Jäsenyyden kuukausihinta',
  roiConversion: 'Konversio',
  roiEstimatedRevenue: 'Arvioitu kuukausitulo',
  roiEarnLine: 'Vain {pct} % konversiolla tienaat ${amount} / kk',
  roiPayingMembers: 'Noin {count} maksavaa jäsentä à {price} SEK',
  faqEyebrow: 'UKK',
  faqHeadline: 'Usein kysytyt kysymykset',
  faqSub: 'Maksut, bio, social tagging, ALV ja jäsenten migrointi.',
  faqSwishQ: 'Miten Swish-maksut toimivat?',
  faqSwishA:
    'Jäsenet maksavat Swishillä tai Vippillä kassalla — usein alle 10 sekunnissa. Rahat yhdistetään creator-tiliisi.',
  faqVatQ: 'Miten ALV ja kirjanpito hoidetaan?',
  faqVatA:
    'Alusta laskee oikean pohjoismaisen ALV:n (esim. 6 % tai 25 %) ja voi luoda Fortnox-kuitit automaattisesti.',
  faqBioQ: 'Mitä Bio Builder sisältää?',
  faqBioA:
    'Neljä välilehteä — Blocks, Design, Analytics ja Settings. Lisää linkkejä ja tuotteita, valitse teemoja, seuraa UTM-klikkauksia.',
  faqTaggingQ: 'Miten post link-tagging toimii?',
  faqTaggingA:
    'Media / Post Taggingissa avaat Instagram- tai TikTok-esikatselun, lisäät tuotelinkkejä ja näet Track Every Sale -tiedot.',
  faqSocialQ: 'Voinko käyttää useita brändejä / Social Sets?',
  faqSocialA:
    'Kyllä. Vaihda Active Social Set Creator Adminissa. Suunnitelmat skaalautuvat Starterista Growthiin ja Scaleen.',
  faqImportQ: 'Voinko tuoda jäseniä Facebookista tai Skoolista?',
  faqImportA:
    'Kyllä. Tuo sähköpostilistoilla ja kutsu heidät uuteen yhteisöön. He kirjautuvat sähköpostilla tai BankID:llä.',
  faqPayoutQ: 'Milloin saan maksun?',
  faqPayoutA:
    'Tulot näkyvät Analyticsissa ja maksetaan payout-aikataulun mukaan.',
  faqTrialQ: 'Onko ilmainen suunnitelma?',
  faqTrialA: 'Starter on ilmainen ikuisesti. Creator ja Pro voi aloittaa kun olet valmis.',
  searchCommunitiesHeading: 'Hae yhteisöjä',
  searchCommunitiesEyebrow: 'Tutustu',
  catMarketing: 'Markkinointi',
  catHealth: 'Terveys & treeni',
  catFinance: 'Talous',
  catCoaching: 'Valmennus',
  joinForPrice: 'Liity 199 SEK/kk',
  activeMembersLabel: 'Aktiiviset jäsenet',
  viewCommunity: 'Näytä yhteisö',
  landingReadyHeadline: 'Valmis yhdelle alustalle — etkä viidelle tilaukselle?',
  landingReadySub:
    'Social Sets, Bio Builder, post-tagging, analytics, yhteisö, Swish ja AI — sisäänrakennettuna alusta alkaen.',
  popularCategories: 'Suositut kategoriat',
  popularCommunities: 'Suositut yhteisöt',
  followersLabel: 'seuraajaa',
  coursesLabel: 'kursseja',
  productsLabel: 'Tuotteet',
  freeLabelShort: 'Ilmainen',
  pricing: 'Hinnat',
  adminEmailCrm: 'Sähköposti-CRM',
  adminBioBuilder: 'Bio Builder',
  adminSearchPlaceholder: 'Hae administa…',
  boardKanban: 'Progress',
  calendarTab: 'Kalenteri',
  tableTab: 'Taulukko',
  feedGridTab: 'Feed-ruudukko',
  workflowIdeas: 'Ideat',
  workflowInProduction: 'Tuotannossa',
  workflowReview: 'Tarkistus',
  workflowScheduled: 'Ajastettu',
  workflowPublished: 'Julkaistu',
  statusConnected: 'Yhdistetty',
  statusNotConnected: 'Ei yhdistetty',
  disconnect: 'Katkaise',
  createPost: 'Luo julkaisu',
  searchPosts: 'Hae julkaisuja…',
  accounts: 'Tilit',
  allPlatforms: 'Kaikki',
  studioMedia: 'Media',
  postTitle: 'Julkaisun otsikko',
  studioStatus: 'Tila',
  teamWorkspaceBrand: 'Tiimin työtila / Brändi',
  studioAssignees: 'Vastuuhenkilöt',
  studioScheduleDate: 'Julkaisupäivä',
  studioCaption: 'Kuvateksti',
  studioSubtasks: 'Alitehtävät',
  studioActivityLog: 'Aktiviteettiloki',
  contentTab: 'Sisältö',
  teamTab: 'Tiimi',
  connectInstagramBusiness: 'Yhdistä Instagram Business',
  connectTikTokBusiness: 'Yhdistä TikTok Business',
  connectLinkedIn: 'Yhdistä LinkedIn',
  connectYouTube: 'Yhdistä YouTube',
  connectedAccounts: 'Yhdistetyt tilit',
  socialAccountsHint: 'Yhdistä profiilit julkaistaksesi ja analysoidaksesi Social Setistäsi.',
  subscribersLabel: 'tilaajaa',
  backToAdmin: '← Admin',
  loadingPlanner: 'Ladataan planneria…',
  loadingAccounts: 'Ladataan tilejä…',
  demoOAuth: 'Demo OAuth',
  untitledPost: 'Nimetön',
  checklist: 'Tarkistuslista',
  teamWorkspacesBrands: 'Tiimin työtilat / Brändit',
  searchBrand: 'Hae brändiä…',
  noBrandsMatch: 'Ei vastaavia brändejä.',
  createTeamWorkspace: 'Luo uusi tiimin työtila / brändi',
  accountSingular: 'tili',
  accountPlural: 'tiliä',
  draftBank: 'Luonnospankki',
  draftBankHint: 'Ajastamattomat luonnokset & ideat — vedä feed-ruudukkoon ajastaaksesi.',
  ideasCountLabel: '{n} ideaa',
  noDraftsYet: 'Ei luonnoksia vielä',
  createIdeasHint: 'Luo ideoita Progressissa tai AI Copilotissa.',
  dragTilesHint: 'Vedä ajastettuja ruutuja järjestääksesi uudelleen. Julkaistut on lukittu.',
  savingEllipsis: 'Tallennetaan…',
  gridOrderUpdated: 'Ruudukon järjestys päivitetty ✓',
  gridOrderFailed: 'Ruudukon järjestystä ei voitu päivittää',
  followingLabel: 'Seurataan',
  likesLabel: 'Tykkäykset',
  postsStatLabel: 'julkaisua',
  shareProfileBtn: 'Jaa profiili',
  teamMembersAria: 'Tiimin jäsenet',
};

export const EXTRA_BY_LOCALE: Record<ExtraLocale, ExtraDict> = {
  en: EXTRA_EN,
  sv: EXTRA_SV,
  no: EXTRA_NO,
  da: EXTRA_DA,
  fi: EXTRA_FI,
};
