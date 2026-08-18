/**
 * Nested translation dictionaries for clikd:
 * Access via useLanguage().t('nav.features') — falls back to English.
 */

import {
  LEGAL_SECTIONS_DA,
  LEGAL_SECTIONS_EN,
  LEGAL_SECTIONS_FI,
  LEGAL_SECTIONS_NO,
  LEGAL_SECTIONS_SV,
  type LegalSectionKey,
} from './legal-sections';

export type LocaleCode = 'en' | 'sv' | 'no' | 'da' | 'fi';

export const SUPPORTED_LOCALES: LocaleCode[] = ['en', 'sv', 'no', 'da', 'fi'];

export const LOCALE_META: {
  code: LocaleCode;
  label: string;
  flag: string;
}[] = [
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'sv', label: 'Svenska', flag: '🇸🇪' },
  { code: 'no', label: 'Norsk', flag: '🇳🇴' },
  { code: 'da', label: 'Dansk', flag: '🇩🇰' },
  { code: 'fi', label: 'Suomi', flag: '🇫🇮' },
];

/** Nested UI dictionary shape (all locales share this structure). */
export type NestedDict = {
  nav: {
    features: string;
    pricing: string;
    exploreCommunities: string;
    platform: string;
    prices: string;
    signIn: string;
    logIn: string;
    dashboard: string;
    getStartedFree: string;
    language: string;
    /** Visible status when a session exists on the public landing header. */
    signedIn: string;
    openCreatorAdmin: string;
    openMemberDashboard: string;
  };
  hero: {
    badge: string;
    headline1: string;
    headline2: string;
    sub: string;
    ctaPrimary: string;
    ctaSecondary: string;
    calendarPlanner: string;
    kanbanProgress: string;
    visualFeedGrid: string;
    analytics: string;
    allChannels: string;
  };
  features: {
    eyebrow: string;
    headline: string;
    sub: string;
    bioTitle: string;
    bioSummary: string;
    plannerTitle: string;
    plannerSummary: string;
    analyticsTitle: string;
    analyticsSummary: string;
    communityTitle: string;
    communitySummary: string;
    crmTitle: string;
    crmSummary: string;
    dmTitle: string;
    dmSummary: string;
    buyNow: string;
    joinCommunity: string;
    oneTapCheckout: string;
    learnMore: string;
  };
  comparison: {
    eyebrow: string;
    headline: string;
    sub: string;
    mockupView: string;
    optionBento: string;
    optionTable: string;
    fragmentedTitle: string;
    winnerTitle: string;
    appsCount: string;
    stackHeadline: string;
    stackSub: string;
    toolBio: string;
    toolBioSub: string;
    toolCommunity: string;
    toolCommunitySub: string;
    toolPlanner: string;
    toolPlannerSub: string;
    toolEmail: string;
    toolEmailSub: string;
    toolAds: string;
    toolAdsSub: string;
    extraTime: string;
    totalCostLabel: string;
    winnerHeadline: string;
    winnerSub: string;
    startingFrom: string;
    usdApprox: string;
    pillarCheckout: string;
    pillarCheckoutBody: string;
    pillarPlanner: string;
    pillarPlannerBody: string;
    pillarBio: string;
    pillarBioBody: string;
    pillarCommunity: string;
    pillarCommunityBody: string;
    pillarEmail: string;
    pillarEmailBody: string;
    pillarAds: string;
    pillarAdsBody: string;
    cta: string;
    saveBanner: string;
  };
  bio: {
    links: string;
    store: string;
    free: string;
    buyNow: string;
    joinCommunity: string;
    oneTapCheckout: string;
    noLinksYet: string;
    noProductsYet: string;
    poweredBy: string;
    loading: string;
    notFound: string;
    backToClikd: string;
    publishChanges: string;
    published: string;
    preview: string;
    yourLinkLive: string;
    changesPublished: string;
    yourPublicLink: string;
    copy: string;
    copied: string;
    openLivePage: string;
    done: string;
    firstPublishBody: string;
    updatePublishBody: string;
  };
  admin: {
    home: string;
    planner: string;
    mediaLibrary: string;
    socialInbox: string;
    analytics: string;
    ads: string;
    bioBuilder: string;
    community: string;
    emailCrm: string;
    settings: string;
    export: string;
    connectedAccounts: string;
    projects: string;
    homeEyebrow: string;
    homeTitle: string;
    homeSub: string;
    focusTitle: string;
    addSticky: string;
    stickyPrompt: string;
    kanbanTitle: string;
    newTask: string;
    taskPrompt: string;
    colTodo: string;
    colDoing: string;
    colDone: string;
    activityTitle: string;
    realtime: string;
    filterAll: string;
    filterFeedback: string;
    filterPurchase: string;
    filterCommunity: string;
    filterDm: string;
    activityEmpty: string;
    shortcutPlanner: string;
    shortcutPlannerOpen: string;
    shortcutAnalytics: string;
    shortcutAnalyticsOpen: string;
    shortcutBio: string;
    shortcutBioOpen: string;
    catGeneral: string;
    stickyEmpty: string;
    kanbanEmpty: string;
    taskDeadline: string;
  };
  socials: {
    title: string;
    subtitle: string;
    demoMode: string;
    demoModeHint: string;
    connectInstagram: string;
    connectTikTok: string;
    connectYouTube: string;
    connectLinkedIn: string;
    connectFacebook: string;
    activeOauth: string;
    disconnected: string;
    grantPermission: string;
    disconnectAccount: string;
    switchAccount: string;
    cancel: string;
    oauthTitle: string;
    oauthBody: string;
    permissions: string;
    disconnectTitle: string;
    disconnectBody: string;
    confirmDisconnect: string;
    workspaceGuideTitle: string;
    workspaceGuideStep1: string;
    workspaceGuideStep2: string;
    workspaceGuideStep3: string;
    workspaceGuidePerWorkspace: string;
    workspaceGuideEditMeta: string;
  };
  legal: {
    privacyTitle: string;
    privacySummary: string;
    termsTitle: string;
    termsSummary: string;
    cookiesTitle: string;
    cookiesSummary: string;
    gdprTitle: string;
    gdprSummary: string;
    lastUpdated: string;
    backToHome: string;
  } & Record<LegalSectionKey, string>;
  common: {
    save: string;
    cancel: string;
    publish: string;
    delete: string;
    confirm: string;
    search: string;
    close: string;
    loading: string;
    error: string;
    success: string;
    continue: string;
    back: string;
    next: string;
    edit: string;
    add: string;
    remove: string;
    yes: string;
    no: string;
    or: string;
    redirecting: string;
    continueWith: string;
  };
};
export const DICT_EN: NestedDict = {
  nav: {
    features: 'Features',
    pricing: 'Pricing',
    exploreCommunities: 'Explore Communities',
    platform: 'Platform',
    prices: 'Pricing',
    signIn: 'Sign in',
    logIn: 'Log in',
    dashboard: 'Dashboard',
    getStartedFree: 'Get started free',
    language: 'Language',
    signedIn: 'Signed in',
    openCreatorAdmin: 'Open Admin',
    openMemberDashboard: 'Open Dashboard',
  },
  hero: {
    badge: 'The all-in-one platform',
    headline1: 'Content planning',
    headline2: 'built for social media.',
    sub: 'Built for creators who move at the speed of social. Plan multi-channel calendars, monetize your link-in-bio, and host gamified communities — all in one unified studio.',
    ctaPrimary: 'Get started for free →',
    ctaSecondary: 'Learn more',
    calendarPlanner: 'Calendar Planner',
    kanbanProgress: 'Kanban Progress',
    visualFeedGrid: 'Visual Feed Grid',
    analytics: 'Analytics',
    allChannels: 'All Channels',
  },
  features: {
    eyebrow: 'The Platform',
    headline: 'Everything you need to grow',
    sub: 'Bio store, planner, analytics, community, email and DM automation — one Nordic studio.',
    bioTitle: 'Link-in-Bio Builder',
    bioSummary: 'Luxury themes, custom blocks, UTM analytics, products & 1-tap checkout.',
    plannerTitle: 'Content Planner & Social Sets',
    plannerSummary: 'Calendar schedules, Kanban boards & multi-channel Social Sets.',
    analyticsTitle: 'In-depth Analytics & Revenue',
    analyticsSummary: 'Reach, impressions, audience growth & Linkin.bio performance reports.',
    communityTitle: 'Gamified Community & Hub',
    communitySummary: 'Discussion feeds, classroom courses, live events & member leaderboards.',
    crmTitle: 'Email CRM & Automation',
    crmSummary: 'Subscriber CRM, automated welcome sequences & broadcast emails.',
    dmTitle: 'DM Automation & Social Inbox',
    dmSummary:
      'Auto-reply to comments and DMs, qualify leads, and manage conversations in one inbox.',
    buyNow: 'Buy now',
    joinCommunity: 'Join community',
    oneTapCheckout: '1-Tap Checkout',
    learnMore: 'Learn more',
  },
  comparison: {
    eyebrow: '⚡ WHY CHOOSE CLIKD:',
    headline: 'Stop Juggling Multiple Subscriptions',
    sub: 'One unified studio replacing 5+ separate subscriptions, complex logins, and hidden transaction fees.',
    mockupView: 'Mockup view:',
    optionBento: 'Option A: Bento Cards',
    optionTable: 'Option B: Comparison Table',
    fragmentedTitle: 'Fragmented Tool Stack',
    winnerTitle: 'All-in-One Winner',
    appsCount: '5 Separate Subscriptions',
    stackHeadline: 'Stacking 5+ Disconnected Tools',
    stackSub:
      'Scattered customer data, double-entry administration, manual approvals, and heavy monthly subscription overhead.',
    toolBio: 'Bio Storefront & Links',
    toolBioSub: 'Dedicated bio link & store apps',
    toolCommunity: 'Community & Courses',
    toolCommunitySub: 'Separate community platforms',
    toolPlanner: 'Social Planner & Auto-Post',
    toolPlannerSub: 'Standalone scheduling apps',
    toolEmail: 'Email CRM & Broadcasts',
    toolEmailSub: 'External email marketing software',
    toolAds: 'Meta Ads & DM Bots',
    toolAdsSub: 'Third-party inbox bots & ad tools',
    extraTime: 'Extra Time',
    totalCostLabel: 'Total Estimated Cost:',
    winnerHeadline: 'One Unified Platform. Zero Friction.',
    winnerSub:
      'Publish videos directly, monetize your bio link, host gamified communities, send email broadcasts, and launch Meta Ad campaigns — all in one studio.',
    startingFrom: 'Starting from',
    usdApprox: '(~$19/mo)',
    pillarCheckout: '1-Tap Swish & Card Checkout',
    pillarCheckoutBody: 'Instant 10s mobile checkout via BankID, card, and Stripe Express.',
    pillarPlanner: 'Direct Auto-Posting & Planner',
    pillarPlannerBody:
      'Direct publishing to TikTok, IG Reels & FB with zero manual draft hassles.',
    pillarBio: 'Bio Storefront & Digital Products',
    pillarBioBody: 'Sell e-books, courses & coaching with luxury preset themes and 0% fee option.',
    pillarCommunity: 'Gamified Community & Courses',
    pillarCommunityBody: 'Discussion feeds, classroom modules, live events & XP leaderboards.',
    pillarEmail: 'Email CRM & Resend Broadcasts',
    pillarEmailBody: 'Subscriber CRM, automated email sequences, tags & 99.8% inbox rate.',
    pillarAds: 'Meta Ads Manager & ROAS',
    pillarAdsBody: 'Launch FB & IG ad campaigns directly with real-time ROAS tracking.',
    cta: 'Start Your Free Studio',
    saveBanner:
      'Save over {amount} / year and 15+ hours a week by consolidating your creator stack into Clikd.',
  },
  bio: {
    links: 'Links',
    store: 'Store',
    free: 'FREE',
    buyNow: 'Buy now',
    joinCommunity: 'Join community',
    oneTapCheckout: '1-Tap Checkout',
    noLinksYet: 'No links yet',
    noProductsYet: 'No products yet',
    poweredBy: 'Powered by clikd:',
    loading: 'Loading…',
    notFound: 'Bio not found',
    backToClikd: 'Back to clikd:',
    publishChanges: 'Publish Changes',
    published: 'Published ✓',
    preview: 'Preview',
    yourLinkLive: 'Your link is live!',
    changesPublished: 'Changes published',
    yourPublicLink: 'Your public link',
    copy: 'Copy',
    copied: 'Copied',
    openLivePage: 'Open live page',
    done: 'Done',
    firstPublishBody:
      'Your personal link-in-bio page has been created. Share this address anywhere — Instagram, TikTok, or your email signature.',
    updatePublishBody: 'Your link-in-bio updates are saved and live on your public page.',
  },
  admin: {
    home: 'Home',
    planner: 'Planner',
    mediaLibrary: 'Media Library',
    socialInbox: 'Social Inbox',
    analytics: 'Analytics',
    ads: 'Ads',
    bioBuilder: 'Bio Builder',
    community: 'Community',
    emailCrm: 'Email CRM',
    settings: 'Settings',
    export: 'Export',
    connectedAccounts: 'Connected Accounts',
    projects: 'Projects',
    homeEyebrow: 'Command Center',
    homeTitle: 'Admin Home',
    homeSub:
      'Today’s focus, shortcuts, Kanban and latest activity — all in one place.',
    focusTitle: "Today’s Focus & To-Do's",
    addSticky: 'Add sticky note',
    stickyPrompt: 'New sticky note',
    kanbanTitle: 'Kanban To-Do Board',
    newTask: 'New task',
    taskPrompt: 'New task',
    colTodo: 'To Do / Ideas',
    colDoing: 'In progress',
    colDone: 'Done / Review',
    activityTitle: 'Latest activity & alerts',
    realtime: 'Live',
    filterAll: 'All',
    filterFeedback: '💬 Feedback',
    filterPurchase: '💰 Purchases',
    filterCommunity: '👥 Community',
    filterDm: '✉️ DMs & Email',
    activityEmpty: 'No alerts in this category yet.',
    shortcutPlanner: 'Content Planner',
    shortcutPlannerOpen: 'Open planner',
    shortcutAnalytics: 'Analytics & Revenue',
    shortcutAnalyticsOpen: 'Open analytics',
    shortcutBio: 'Bio Store & Links',
    shortcutBioOpen: 'Open bio store',
    catGeneral: 'General',
    stickyEmpty: 'No focus items yet — add your first sticky note.',
    kanbanEmpty: 'No tasks yet',
    taskDeadline: 'Deadline',
  },
  socials: {
    title: 'Connected Social Accounts',
    subtitle: 'Connect Instagram, TikTok, YouTube and LinkedIn to publish from clikd:',
    demoMode: 'Demo Recording Mode',
    demoModeHint: 'Simulates OAuth without leaving the page — perfect for screen recordings.',
    connectInstagram: 'Connect Instagram',
    connectTikTok: 'Connect TikTok',
    connectYouTube: 'Connect YouTube',
    connectLinkedIn: 'Connect LinkedIn',
    connectFacebook: 'Connect Facebook',
    activeOauth: 'Active · OAuth ✓',
    disconnected: 'Disconnected',
    grantPermission: 'Grant Permission',
    disconnectAccount: 'Disconnect account',
    switchAccount: 'Switch account',
    cancel: 'Cancel',
    oauthTitle: 'Connect {platform}',
    oauthBody: 'clikd: is requesting permission to manage your {platform} account.',
    permissions: 'Permissions requested',
    disconnectTitle: 'Disconnect account?',
    disconnectBody: 'You can reconnect anytime. Scheduled posts for this channel will pause.',
    confirmDisconnect: 'Disconnect',
    workspaceGuideTitle: 'Connecting different social accounts to different workspaces?',
    workspaceGuideStep1: 'Select your active workspace from the left sidebar or top workspace switcher.',
    workspaceGuideStep2: "Click Connect for the platform you want to link to this workspace.",
    workspaceGuideStep3:
      "If Meta auto-selects a previous account, click “Edit previous settings” (Redigera tidigare inställningar) in Meta’s login popup to choose the Instagram Business account and Facebook Page for this workspace.",
    workspaceGuidePerWorkspace: 'Supports separate accounts per workspace.',
    workspaceGuideEditMeta: 'Edit previous settings',
  },
  legal: {
    privacyTitle: 'Privacy Policy',
    privacySummary: 'How clikd: collects, uses, and protects your personal data.',
    termsTitle: 'Terms of Service',
    termsSummary: 'The rules that govern your use of the clikd: platform.',
    cookiesTitle: 'Cookie Policy',
    cookiesSummary: 'How we use cookies and similar technologies.',
    gdprTitle: 'GDPR Statement & Data Processing Summary',
    gdprSummary: 'Our commitment to EU/EEA data protection rights.',
    lastUpdated: 'Last updated',
    backToHome: 'Back to home',
    ...LEGAL_SECTIONS_EN,
  },
  common: {
    save: 'Save',
    cancel: 'Cancel',
    publish: 'Publish',
    delete: 'Delete',
    confirm: 'Confirm',
    search: 'Search',
    close: 'Close',
    loading: 'Loading…',
    error: 'Something went wrong',
    success: 'Success',
    continue: 'Continue',
    back: 'Back',
    next: 'Next',
    edit: 'Edit',
    add: 'Add',
    remove: 'Remove',
    yes: 'Yes',
    no: 'No',
    or: 'or',
    redirecting: 'Redirecting…',
    continueWith: 'Continue with {provider}',
  },
};

export const DICT_SV: NestedDict = {
  nav: {
    features: 'Funktioner',
    pricing: 'Priser',
    exploreCommunities: 'Utforska Communities',
    platform: 'Plattformen',
    prices: 'Priser',
    signIn: 'Logga in',
    logIn: 'Logga in',
    dashboard: 'Dashboard',
    getStartedFree: 'Kom igång gratis',
    language: 'Språk',
    signedIn: 'Inloggad',
    openCreatorAdmin: 'Öppna Admin',
    openMemberDashboard: 'Öppna Dashboard',
  },
  hero: {
    badge: 'Allt-i-ett-plattformen',
    headline1: 'Content planning',
    headline2: 'byggd för sociala medier.',
    sub: 'Byggd för kreatörer som rör sig i social medias tempo. Planera flerkalendrar, tjäna på din link-in-bio och hosta gamifierade communities — allt i en studio.',
    ctaPrimary: 'Kom igång gratis →',
    ctaSecondary: 'Läs mer',
    calendarPlanner: 'Kalenderplanerare',
    kanbanProgress: 'Kanban-progress',
    visualFeedGrid: 'Visuell feed-grid',
    analytics: 'Analys',
    allChannels: 'Alla kanaler',
  },
  features: {
    eyebrow: 'Plattformen',
    headline: 'Allt du behöver för att växa',
    sub: 'Bio-butik, planner, analys, community, e-post och DM-automation — en nordisk studio.',
    bioTitle: 'Link-in-Bio Builder',
    bioSummary: 'Lyxiga teman, egna block, UTM-analys, produkter & 1-trycks checkout.',
    plannerTitle: 'Content Planner & Social Sets',
    plannerSummary: 'Kalenderscheman, Kanban-tavlor & flerkalender Social Sets.',
    analyticsTitle: 'Djupanalys & intäkter',
    analyticsSummary: 'Räckvidd, impressions, publiktillväxt & Linkin.bio-rapporter.',
    communityTitle: 'Gamifierad Community & Hub',
    communitySummary: 'Diskussioner, kurser, live-event & member-leaderboards.',
    crmTitle: 'E-post CRM & Automation',
    crmSummary: 'Prenumerant-CRM, välkomstsekvenser & broadcast-mail.',
    dmTitle: 'DM-automation & Social Inbox',
    dmSummary:
      'Autosvar på kommentarer och DM:ar, kvalificera leads och hantera konversationer i en inbox.',
    buyNow: 'Köp nu',
    joinCommunity: 'Gå med i community',
    oneTapCheckout: '1-trycks Checkout',
    learnMore: 'Läs mer',
  },
  comparison: {
    eyebrow: '⚡ VARFÖR CLIKD:',
    headline: 'Sluta jonglera flera abonnemang',
    sub: 'En samlad studio som ersätter 5+ separata abonnemang, krångliga inloggningar och dolda avgifter.',
    mockupView: 'Mockup-vy:',
    optionBento: 'Alternativ A: Bento-kort',
    optionTable: 'Alternativ B: Jämförelsetabell',
    fragmentedTitle: 'Fragmenterad verktygsstack',
    winnerTitle: 'Allt-i-ett-vinnaren',
    appsCount: '5 separata abonnemang',
    stackHeadline: '5+ frånkopplade verktyg',
    stackSub:
      'Utspridd kunddata, dubbel admin, manuella godkännanden och tunga månadsabonnemang.',
    toolBio: 'Bio-storefront & länkar',
    toolBioSub: 'Egna bio-länk- och butiksappar',
    toolCommunity: 'Community & kurser',
    toolCommunitySub: 'Separata community-plattformar',
    toolPlanner: 'Social planner & auto-post',
    toolPlannerSub: 'Fristående schemaläggningsappar',
    toolEmail: 'E-post CRM & utskick',
    toolEmailSub: 'Extern e-postmarknadsföring',
    toolAds: 'Meta Ads & DM-bots',
    toolAdsSub: 'Tredjeparts inbox-bots & annonsverktyg',
    extraTime: 'Extra tid',
    totalCostLabel: 'Uppskattad totalkostnad:',
    winnerHeadline: 'En plattform. Noll friktion.',
    winnerSub:
      'Publicera videor direkt, tjäna på din bio-länk, hosta gamifierade communities, skicka e-postutskick och kör Meta-kampanjer — i en studio.',
    startingFrom: 'Från',
    usdApprox: '(~$19/mån)',
    pillarCheckout: '1-trycks Swish- & kortcheckout',
    pillarCheckoutBody: 'Mobilcheckout på 10s via BankID, kort och Stripe Express.',
    pillarPlanner: 'Direkt auto-post & planner',
    pillarPlannerBody:
      'Publicera direkt till TikTok, IG Reels & FB — inga manuella utkast.',
    pillarBio: 'Bio-storefront & digitala produkter',
    pillarBioBody: 'Sälj e-böcker, kurser & coaching med lyxiga teman och 0 % avgift.',
    pillarCommunity: 'Gamifierad community & kurser',
    pillarCommunityBody: 'Diskussionsflöden, classroom, live-event och XP-leaderboards.',
    pillarEmail: 'E-post CRM & Resend-utskick',
    pillarEmailBody: 'Prenumerant-CRM, automatiska sekvenser, taggar & 99,8 % inbox.',
    pillarAds: 'Meta Ads Manager & ROAS',
    pillarAdsBody: 'Kör FB- & IG-kampanjer direkt med ROAS i realtid.',
    cta: 'Starta din gratis studio',
    saveBanner:
      'Spara över {amount} / år och 15+ timmar i veckan genom att samla din creator-stack i Clikd.',
  },
  bio: {
    links: 'Länkar',
    store: 'Butik',
    free: 'GRATIS',
    buyNow: 'Köp nu',
    joinCommunity: 'Gå med i community',
    oneTapCheckout: '1-trycks Checkout',
    noLinksYet: 'Inga länkar ännu',
    noProductsYet: 'Inga produkter ännu',
    poweredBy: 'Drivs av clikd:',
    loading: 'Laddar…',
    notFound: 'Bio hittades inte',
    backToClikd: 'Tillbaka till clikd:',
    publishChanges: 'Publicera ändringar',
    published: 'Publicerat ✓',
    preview: 'Förhandsvisa',
    yourLinkLive: 'Din länk är live!',
    changesPublished: 'Ändringar publicerade',
    yourPublicLink: 'Din publika länk',
    copy: 'Kopiera',
    copied: 'Kopierat',
    openLivePage: 'Öppna live-sida',
    done: 'Klar',
    firstPublishBody:
      'Din personliga link-in-bio har skapats. Dela adressen överallt — Instagram, TikTok eller i din e-postsignatur.',
    updatePublishBody: 'Dina link-in-bio-uppdateringar är sparade och live på din publika sida.',
  },
  admin: {
    home: 'Hem',
    planner: 'Planner',
    mediaLibrary: 'Mediabibliotek',
    socialInbox: 'Social Inbox',
    analytics: 'Analys',
    ads: 'Annonser',
    bioBuilder: 'Bio Builder',
    community: 'Community',
    emailCrm: 'E-post CRM',
    settings: 'Inställningar',
    export: 'Exportera',
    connectedAccounts: 'Anslutna konton',
    projects: 'Projekt',
    homeEyebrow: 'Command Center',
    homeTitle: 'Admin Hem',
    homeSub:
      'Dagens fokus, genvägar, Kanban och senaste aktivitet — samlat på ett ställe.',
    focusTitle: "Dagens Fokus & To-Do's",
    addSticky: 'Lägg till lapp-notering',
    stickyPrompt: 'Ny lapp-notering',
    kanbanTitle: 'Kanban To-Do Board',
    newTask: 'Ny Uppgift',
    taskPrompt: 'Ny uppgift',
    colTodo: 'Att Göra / Idéer',
    colDoing: 'Pågående',
    colDone: 'Klart / Granskas',
    activityTitle: 'Senaste Aktivitet & Notiser',
    realtime: 'Realtid',
    filterAll: 'Alla',
    filterFeedback: '💬 Feedback',
    filterPurchase: '💰 Köp',
    filterCommunity: '👥 Community',
    filterDm: '✉️ DMs & Mejl',
    activityEmpty: 'Inga notiser i den här kategorin ännu.',
    shortcutPlanner: 'Content Planner',
    shortcutPlannerOpen: 'Öppna planner',
    shortcutAnalytics: 'Analytics & Intäkter',
    shortcutAnalyticsOpen: 'Öppna analytics',
    shortcutBio: 'Bio Store & Länkar',
    shortcutBioOpen: 'Öppna bio store',
    catGeneral: 'Allmänt',
    stickyEmpty: 'Inga fokuspunkter ännu — lägg till din första lapp.',
    kanbanEmpty: 'Inga uppgifter ännu',
    taskDeadline: 'Deadline',
  },
  socials: {
    title: 'Anslutna sociala konton',
    subtitle: 'Anslut Instagram, TikTok, YouTube och LinkedIn för att publicera från clikd:',
    demoMode: 'Demo-inspelningsläge',
    demoModeHint: 'Simulerar OAuth utan att lämna sidan — perfekt för skärminspelningar.',
    connectInstagram: 'Anslut Instagram',
    connectTikTok: 'Anslut TikTok',
    connectYouTube: 'Anslut YouTube',
    connectLinkedIn: 'Anslut LinkedIn',
    connectFacebook: 'Anslut Facebook',
    activeOauth: 'Aktiv · OAuth ✓',
    disconnected: 'Frånkopplad',
    grantPermission: 'Ge behörighet',
    disconnectAccount: 'Koppla från konto',
    switchAccount: 'Byt konto',
    cancel: 'Avbryt',
    oauthTitle: 'Anslut {platform}',
    oauthBody: 'clikd: begär behörighet att hantera ditt {platform}-konto.',
    permissions: 'Begärda behörigheter',
    disconnectTitle: 'Koppla från konto?',
    disconnectBody: 'Du kan ansluta igen när som helst. Schemalagda inlägg för kanalen pausas.',
    confirmDisconnect: 'Koppla från',
    workspaceGuideTitle: 'Vill du koppla olika sociala konton till olika arbetsytor?',
    workspaceGuideStep1: 'Välj aktiv arbetsyta i vänstermenyn eller arbetsyteväljaren högst upp.',
    workspaceGuideStep2: 'Klicka på Anslut för plattformen du vill koppla till den här arbetsytan.',
    workspaceGuideStep3:
      'Om Meta automatiskt väljer ett tidigare konto: klicka på “Redigera tidigare inställningar” (Edit previous settings) i Meta-inloggningen och välj rätt Instagram Business-konto och Facebook-sida för den här arbetsytan.',
    workspaceGuidePerWorkspace: 'Stöder separata konton per arbetsyta.',
    workspaceGuideEditMeta: 'Redigera tidigare inställningar',
  },
  legal: {
    privacyTitle: 'Integritetspolicy',
    privacySummary: 'Hur clikd: samlar in, använder och skyddar dina personuppgifter.',
    termsTitle: 'Användarvillkor',
    termsSummary: 'Reglerna som styr din användning av clikd:-plattformen.',
    cookiesTitle: 'Cookiepolicy',
    cookiesSummary: 'Hur vi använder cookies och liknande tekniker.',
    gdprTitle: 'GDPR-redogörelse',
    gdprSummary: 'Vårt åtagande för EU/EES-dataskyddsrättigheter.',
    lastUpdated: 'Senast uppdaterad',
    backToHome: 'Tillbaka till startsidan',
    ...LEGAL_SECTIONS_SV,
  },
  common: {
    save: 'Spara',
    cancel: 'Avbryt',
    publish: 'Publicera',
    delete: 'Radera',
    confirm: 'Bekräfta',
    search: 'Sök',
    close: 'Stäng',
    loading: 'Laddar…',
    error: 'Något gick fel',
    success: 'Klart',
    continue: 'Fortsätt',
    back: 'Tillbaka',
    next: 'Nästa',
    edit: 'Redigera',
    add: 'Lägg till',
    remove: 'Ta bort',
    yes: 'Ja',
    no: 'Nej',
    or: 'eller',
    redirecting: 'Omdirigerar…',
    continueWith: 'Fortsätt med {provider}',
  },
};

/** Norwegian — based on Swedish with NO spelling adjustments. */
export const DICT_NO: NestedDict = {
  ...DICT_SV,
  nav: {
    ...DICT_SV.nav,
    features: 'Funksjoner',
    pricing: 'Priser',
    exploreCommunities: 'Utforsk communities',
    platform: 'Plattformen',
    prices: 'Priser',
    signIn: 'Logg inn',
    logIn: 'Logg inn',
    getStartedFree: 'Kom i gang gratis',
    language: 'Språk',
    signedIn: 'Innlogget',
    openCreatorAdmin: 'Åpne Admin',
    openMemberDashboard: 'Åpne Dashboard',
  },
  hero: {
    ...DICT_SV.hero,
    badge: 'Alt-i-ett-plattformen',
    headline1: 'Content planning',
    headline2: 'bygget for sosiale medier.',
    sub: 'Bygget for skapere som beveger seg i sosiale mediers tempo. Planlegg flerkanal-kalendere, tjen på link-in-bio og host gamifiserte communities — alt i ett studio.',
    ctaPrimary: 'Kom i gang gratis →',
    ctaSecondary: 'Les mer',
    calendarPlanner: 'Kalenderplanlegger',
    allChannels: 'Alle kanaler',
  },
  features: {
    ...DICT_SV.features,
    eyebrow: 'Plattformen',
    headline: 'Alt du trenger for å vokse',
    buyNow: 'Kjøp nå',
    joinCommunity: 'Bli med i community',
    learnMore: 'Les mer',
  },
  comparison: {
    ...DICT_SV.comparison,
    eyebrow: '⚡ HVORFOR CLIKD:',
    headline: 'Slutt å sjonglere flere abonnementer',
    sub: 'Ett samlet studio som erstatter 5+ separate abonnementer, kronglete innlogginger og skjulte gebyrer.',
    cta: 'Kom i gang gratis',
    saveBanner:
      'Spar over {amount} / år og 15+ timer i uken ved å samle creator-stacken din i Clikd.',
  },
  bio: {
    ...DICT_SV.bio,
    links: 'Lenker',
    store: 'Butikk',
    free: 'GRATIS',
    buyNow: 'Kjøp nå',
    publishChanges: 'Publiser endringer',
    published: 'Publisert ✓',
    preview: 'Forhåndsvis',
    yourLinkLive: 'Lenken din er live!',
    changesPublished: 'Endringer publisert',
    copy: 'Kopier',
    copied: 'Kopiert',
    done: 'Ferdig',
  },
  admin: {
    ...DICT_SV.admin,
    mediaLibrary: 'Mediebibliotek',
    settings: 'Innstillinger',
    export: 'Eksporter',
    connectedAccounts: 'Tilknyttede kontoer',
    projects: 'Prosjekter',
  },
  socials: {
    ...DICT_SV.socials,
    title: 'Tilknyttede sosiale kontoer',
    connectInstagram: 'Koble til Instagram',
    connectTikTok: 'Koble til TikTok',
    connectYouTube: 'Koble til YouTube',
    connectLinkedIn: 'Koble til LinkedIn',
    connectFacebook: 'Koble til Facebook',
    activeOauth: 'Aktiv · OAuth ✓',
    disconnected: 'Frakoblet',
    grantPermission: 'Gi tillatelse',
    disconnectAccount: 'Koble fra konto',
    switchAccount: 'Bytt konto',
    cancel: 'Avbryt',
    confirmDisconnect: 'Koble fra',
  },
  legal: {
    ...DICT_SV.legal,
    privacyTitle: 'Personvernerklæring',
    termsTitle: 'Vilkår for bruk',
    cookiesTitle: 'Informasjonskapsler',
    gdprTitle: 'GDPR-erklæring',
    lastUpdated: 'Sist oppdatert',
    backToHome: 'Tilbake til forsiden',
    ...LEGAL_SECTIONS_NO,
  },
  common: {
    ...DICT_SV.common,
    save: 'Lagre',
    cancel: 'Avbryt',
    publish: 'Publiser',
    delete: 'Slett',
    confirm: 'Bekreft',
    search: 'Søk',
    close: 'Lukk',
    loading: 'Laster…',
    error: 'Noe gikk galt',
    yes: 'Ja',
    no: 'Nei',
  },
};

/** Danish. */
export const DICT_DA: NestedDict = {
  ...DICT_SV,
  nav: {
    ...DICT_SV.nav,
    features: 'Funktioner',
    pricing: 'Priser',
    exploreCommunities: 'Udforsk communities',
    platform: 'Platformen',
    signIn: 'Log ind',
    logIn: 'Log ind',
    getStartedFree: 'Kom i gang gratis',
    language: 'Sprog',
    signedIn: 'Logget ind',
    openCreatorAdmin: 'Åbn Admin',
    openMemberDashboard: 'Åbn Dashboard',
  },
  hero: {
    ...DICT_SV.hero,
    badge: 'Alt-i-én platformen',
    headline2: 'bygget til sociale medier.',
    sub: 'Bygget til creators der bevæger sig i sociale mediers tempo. Planlæg flerkanalskalendere, tjen på din link-in-bio og host gamificerede communities — alt i ét studio.',
    ctaPrimary: 'Kom i gang gratis →',
    ctaSecondary: 'Læs mere',
    calendarPlanner: 'Kalenderplanlægger',
    allChannels: 'Alle kanaler',
  },
  features: {
    ...DICT_SV.features,
    headline: 'Alt du behøver for at vokse',
    buyNow: 'Køb nu',
    joinCommunity: 'Deltag i community',
    learnMore: 'Læs mere',
  },
  comparison: {
    ...DICT_SV.comparison,
    eyebrow: '⚡ HVORFOR CLIKD:',
    headline: 'Stop med at jonglere flere abonnementer',
    sub: 'Ét samlet studio der erstatter 5+ separate abonnementer, komplekse logins og skjulte gebyrer.',
    cta: 'Kom i gang gratis',
    saveBanner:
      'Spar over {amount} / år og 15+ timer om ugen ved at samle din creator-stack i Clikd.',
  },
  bio: {
    ...DICT_SV.bio,
    links: 'Links',
    store: 'Butik',
    free: 'GRATIS',
    buyNow: 'Køb nu',
    publishChanges: 'Publicér ændringer',
    published: 'Publiceret ✓',
    preview: 'Forhåndsvis',
    yourLinkLive: 'Dit link er live!',
    changesPublished: 'Ændringer publiceret',
    copy: 'Kopiér',
    copied: 'Kopieret',
    done: 'Færdig',
  },
  admin: {
    ...DICT_SV.admin,
    mediaLibrary: 'Mediebibliotek',
    settings: 'Indstillinger',
    export: 'Eksportér',
    connectedAccounts: 'Forbundne konti',
    projects: 'Projekter',
  },
  socials: {
    ...DICT_SV.socials,
    title: 'Forbundne sociale konti',
    connectInstagram: 'Forbind Instagram',
    connectTikTok: 'Forbind TikTok',
    connectYouTube: 'Forbind YouTube',
    connectLinkedIn: 'Forbind LinkedIn',
    connectFacebook: 'Forbind Facebook',
    activeOauth: 'Aktiv · OAuth ✓',
    disconnected: 'Afbrudt',
    grantPermission: 'Giv tilladelse',
    disconnectAccount: 'Afbryd konto',
    switchAccount: 'Skift konto',
    cancel: 'Annuller',
    confirmDisconnect: 'Afbryd',
  },
  legal: {
    ...DICT_SV.legal,
    privacyTitle: 'Privatlivspolitik',
    termsTitle: 'Vilkår for brug',
    cookiesTitle: 'Cookiepolitik',
    gdprTitle: 'GDPR-erklæring',
    lastUpdated: 'Sidst opdateret',
    backToHome: 'Tilbage til forsiden',
    ...LEGAL_SECTIONS_DA,
  },
  common: {
    ...DICT_SV.common,
    save: 'Gem',
    cancel: 'Annuller',
    publish: 'Publicér',
    delete: 'Slet',
    confirm: 'Bekræft',
    search: 'Søg',
    close: 'Luk',
    loading: 'Indlæser…',
    error: 'Noget gik galt',
    yes: 'Ja',
    no: 'Nej',
  },
};

/** Finnish. */
export const DICT_FI: NestedDict = {
  nav: {
    features: 'Ominaisuudet',
    pricing: 'Hinnat',
    exploreCommunities: 'Tutustu yhteisöihin',
    platform: 'Alusta',
    prices: 'Hinnat',
    signIn: 'Kirjaudu',
    logIn: 'Kirjaudu',
    dashboard: 'Hallinta',
    getStartedFree: 'Aloita ilmaiseksi',
    language: 'Kieli',
    signedIn: 'Kirjautunut',
    openCreatorAdmin: 'Avaa Admin',
    openMemberDashboard: 'Avaa Dashboard',
  },
  hero: {
    badge: 'Kaikki yhdessä -alusta',
    headline1: 'Sisällön suunnittelu',
    headline2: 'rakennettu someen.',
    sub: 'Rakennettu tekijöille, jotka liikkuvat somen tahdissa. Suunnittele monikanavakalentereita, myy link-in-biolla ja isännöi pelillistettyjä yhteisöjä — kaikki yhdessä studiossa.',
    ctaPrimary: 'Aloita ilmaiseksi →',
    ctaSecondary: 'Lue lisää',
    calendarPlanner: 'Kalenterisuunnittelija',
    kanbanProgress: 'Kanban-eteneminen',
    visualFeedGrid: 'Visuaalinen feed-ruudukko',
    analytics: 'Analytiikka',
    allChannels: 'Kaikki kanavat',
  },
  features: {
    eyebrow: 'Alusta',
    headline: 'Kaikki mitä tarvitset kasvuun',
    sub: 'Bio-kauppa, planner, analytiikka, yhteisö, sähköposti ja DM-automaatio — yksi pohjoismainen studio.',
    bioTitle: 'Link-in-Bio Builder',
    bioSummary: 'Luksus-teemat, omat lohkot, UTM-analytiikka, tuotteet & 1-napin checkout.',
    plannerTitle: 'Content Planner & Social Sets',
    plannerSummary: 'Kalenteriaikataulut, Kanban-taulut & monikanavaiset Social Sets.',
    analyticsTitle: 'Syväanalytiikka & tulot',
    analyticsSummary: 'Reach, impressiot, yleisön kasvu & Linkin.bio-raportit.',
    communityTitle: 'Pelillistetty yhteisö & hub',
    communitySummary: 'Keskustelut, kurssit, live-tapahtumat & jäsen-leaderboardit.',
    crmTitle: 'Sähköposti-CRM & automaatio',
    crmSummary: 'Tilaaja-CRM, tervetulosekvenssit & broadcast-sähköpostit.',
    dmTitle: 'DM-automaatio & Social Inbox',
    dmSummary:
      'Autovastaukset kommentteihin ja DM:iin, liidien karsinta ja keskustelut yhdessä inboxissa.',
    buyNow: 'Osta nyt',
    joinCommunity: 'Liity yhteisöön',
    oneTapCheckout: '1-napin Checkout',
    learnMore: 'Lue lisää',
  },
  comparison: {
    eyebrow: '⚡ MIKSI CLIKD:',
    headline: 'Lopeta useiden tilausten jongleeraaminen',
    sub: 'Yksi yhtenäinen studio, joka korvaa 5+ erillistä tilausta, monimutkaiset kirjautumiset ja piilotetut maksut.',
    mockupView: 'Mockup-näkymä:',
    optionBento: 'Vaihtoehto A: Bento-kortit',
    optionTable: 'Vaihtoehto B: Vertailutaulukko',
    fragmentedTitle: 'Hajanainen työkalupino',
    winnerTitle: 'Kaikki yhdessä -voittaja',
    appsCount: '5 erillistä tilausta',
    stackHeadline: '5+ irrallista työkalua',
    stackSub:
      'Hajanainen asiakasdata, kaksinkertainen hallinta, manuaaliset hyväksynnät ja kallis kuukausipino.',
    toolBio: 'Bio-storefront & linkit',
    toolBioSub: 'Erilliset bio-linkki- ja kauppatoiminnot',
    toolCommunity: 'Yhteisö & kurssit',
    toolCommunitySub: 'Erilliset yhteisöalustat',
    toolPlanner: 'Some-planner & auto-post',
    toolPlannerSub: 'Erilliset aikataulutussovellukset',
    toolEmail: 'Sähköposti-CRM & lähetykset',
    toolEmailSub: 'Ulkoinen sähköpostimarkkinointi',
    toolAds: 'Meta Ads & DM-botit',
    toolAdsSub: 'Kolmannen osapuolen inbox-botit & mainostyökalut',
    extraTime: 'Lisäaikaa',
    totalCostLabel: 'Arvioitu kokonaiskustannus:',
    winnerHeadline: 'Yksi alusta. Nolla kitkaa.',
    winnerSub:
      'Julkaise videot suoraan, myy bio-linkillä, hostaa gamified-yhteisöjä, lähetä sähköposteja ja aja Meta-kampanjoita — yhdessä studiossa.',
    startingFrom: 'Alkaen',
    usdApprox: '(~$19/kk)',
    pillarCheckout: '1-napin Swish- & korttimaksu',
    pillarCheckoutBody: 'Mobiilimaksu 10s:ssä BankID:llä, kortilla ja Stripe Expressillä.',
    pillarPlanner: 'Suora auto-post & planner',
    pillarPlannerBody: 'Julkaise suoraan TikTokiin, IG Reelisiin & FB:hen ilman luonnoksia.',
    pillarBio: 'Bio-storefront & digituotteet',
    pillarBioBody: 'Myy e-kirjoja, kursseja & coachingia luksusteemoilla ja 0 % kululla.',
    pillarCommunity: 'Gamified-yhteisö & kurssit',
    pillarCommunityBody: 'Keskustelufeed, classroom, live-eventit ja XP-leaderboardit.',
    pillarEmail: 'Sähköposti-CRM & Resend',
    pillarEmailBody: 'Tilaaja-CRM, automaatiot, tagit & 99,8 % inbox-osuus.',
    pillarAds: 'Meta Ads Manager & ROAS',
    pillarAdsBody: 'Aja FB- & IG-kampanjoita suoraan reaaliaikaisella ROAS:lla.',
    cta: 'Aloita ilmainen studio',
    saveBanner:
      'Säästä yli {amount} / vuodessa ja 15+ tuntia viikossa yhdistämällä creator-stackisi Clikdiin.',
  },
  bio: {
    links: 'Linkit',
    store: 'Kauppa',
    free: 'ILMAINEN',
    buyNow: 'Osta nyt',
    joinCommunity: 'Liity yhteisöön',
    oneTapCheckout: '1-napin Checkout',
    noLinksYet: 'Ei linkkejä vielä',
    noProductsYet: 'Ei tuotteita vielä',
    poweredBy: 'Palvelun tarjoaa clikd:',
    loading: 'Ladataan…',
    notFound: 'Bioa ei löytynyt',
    backToClikd: 'Takaisin clikd:-iin',
    publishChanges: 'Julkaise muutokset',
    published: 'Julkaistu ✓',
    preview: 'Esikatselu',
    yourLinkLive: 'Linkkisi on live!',
    changesPublished: 'Muutokset julkaistu',
    yourPublicLink: 'Julkinen linkkisi',
    copy: 'Kopioi',
    copied: 'Kopioitu',
    openLivePage: 'Avaa live-sivu',
    done: 'Valmis',
    firstPublishBody:
      'Henkilökohtainen link-in-bio-sivusi on luotu. Jaa osoite missä tahansa — Instagramissa, TikTokissa tai sähköpostiallekirjoituksessa.',
    updatePublishBody: 'Link-in-bio-päivityksesi on tallennettu ja live julkisella sivullasi.',
  },
  admin: {
    home: 'Koti',
    planner: 'Planner',
    mediaLibrary: 'Mediakirjasto',
    socialInbox: 'Social Inbox',
    analytics: 'Analytiikka',
    ads: 'Mainokset',
    bioBuilder: 'Bio Builder',
    community: 'Yhteisö',
    emailCrm: 'Sähköposti-CRM',
    settings: 'Asetukset',
    export: 'Vie',
    connectedAccounts: 'Yhdistetyt tilit',
    projects: 'Projektit',
    homeEyebrow: 'Command Center',
    homeTitle: 'Admin-koti',
    homeSub:
      'Päivän fokus, oikotiet, Kanban ja viimeisin aktiviteetti — kaikki yhdessä paikassa.',
    focusTitle: "Päivän fokus & tehtävät",
    addSticky: 'Lisää muistilappu',
    stickyPrompt: 'Uusi muistilappu',
    kanbanTitle: 'Kanban-tehtävätaulu',
    newTask: 'Uusi tehtävä',
    taskPrompt: 'Uusi tehtävä',
    colTodo: 'Tehtävät / ideat',
    colDoing: 'Käynnissä',
    colDone: 'Valmis / tarkistus',
    activityTitle: 'Viimeisin aktiviteetti & ilmoitukset',
    realtime: 'Reaaliaika',
    filterAll: 'Kaikki',
    filterFeedback: '💬 Palaute',
    filterPurchase: '💰 Ostot',
    filterCommunity: '👥 Yhteisö',
    filterDm: '✉️ DM:t & sähköposti',
    activityEmpty: 'Ei ilmoituksia tässä kategoriassa vielä.',
    shortcutPlanner: 'Content Planner',
    shortcutPlannerOpen: 'Avaa planner',
    shortcutAnalytics: 'Analytiikka & tulot',
    shortcutAnalyticsOpen: 'Avaa analytiikka',
    shortcutBio: 'Bio Store & linkit',
    shortcutBioOpen: 'Avaa bio-kauppa',
    catGeneral: 'Yleinen',
    stickyEmpty: 'Ei fokuskohtia vielä — lisää ensimmäinen muistilappu.',
    kanbanEmpty: 'Ei tehtäviä vielä',
    taskDeadline: 'Määräaika',
  },
  socials: {
    title: 'Yhdistetyt some-tilit',
    subtitle: 'Yhdistä Instagram, TikTok, YouTube ja LinkedIn julkaistaksesi clikd:stä',
    demoMode: 'Demo-tallennustila',
    demoModeHint: 'Simuloi OAuthia poistumatta sivulta — täydellinen näytön tallennuksiin.',
    connectInstagram: 'Yhdistä Instagram',
    connectTikTok: 'Yhdistä TikTok',
    connectYouTube: 'Yhdistä YouTube',
    connectLinkedIn: 'Yhdistä LinkedIn',
    connectFacebook: 'Yhdistä Facebook',
    activeOauth: 'Aktiivinen · OAuth ✓',
    disconnected: 'Irrotettu',
    grantPermission: 'Myönnä oikeus',
    disconnectAccount: 'Irrota tili',
    switchAccount: 'Vaihda tiliä',
    cancel: 'Peruuta',
    oauthTitle: 'Yhdistä {platform}',
    oauthBody: 'clikd: pyytää lupaa hallita {platform}-tiliäsi.',
    permissions: 'Pyydetyt oikeudet',
    disconnectTitle: 'Irrota tili?',
    disconnectBody: 'Voit yhdistää uudelleen milloin tahansa. Kanavan ajastetut julkaisut keskeytetään.',
    confirmDisconnect: 'Irrota',
    workspaceGuideTitle: 'Haluatko yhdistää eri some-tilejä eri työtiloihin?',
    workspaceGuideStep1: 'Valitse aktiivinen työtila vasemmasta sivupalkista tai yläreunan työtilavalitsimesta.',
    workspaceGuideStep2: 'Napsauta Yhdistä sille alustalle, jonka haluat linkittää tähän työtilaan.',
    workspaceGuideStep3:
      'Jos Meta valitsee automaattisesti aiemman tilin, napsauta “Muokkaa aiempia asetuksia” (Edit previous settings / Redigera tidigare inställningar) Meta-kirjautumisessa ja valitse tämän työtilan Instagram Business -tili sekä Facebook-sivu.',
    workspaceGuidePerWorkspace: 'Tukee erillisiä tilejä työtilaa kohti.',
    workspaceGuideEditMeta: 'Muokkaa aiempia asetuksia',
  },
  legal: {
    privacyTitle: 'Tietosuojakäytäntö',
    privacySummary: 'Miten clikd: kerää, käyttää ja suojaa henkilötietojasi.',
    termsTitle: 'Käyttöehdot',
    termsSummary: 'Säännöt, jotka koskevat clikd:-alustan käyttöä.',
    cookiesTitle: 'Evästekäytäntö',
    cookiesSummary: 'Miten käytämme evästeitä ja vastaavia teknologioita.',
    gdprTitle: 'GDPR-lausunto',
    gdprSummary: 'Sitoumuksemme EU/ETA-tietosuojaoikeuksiin.',
    lastUpdated: 'Päivitetty viimeksi',
    backToHome: 'Takaisin etusivulle',
    ...LEGAL_SECTIONS_FI,
  },
  common: {
    save: 'Tallenna',
    cancel: 'Peruuta',
    publish: 'Julkaise',
    delete: 'Poista',
    confirm: 'Vahvista',
    search: 'Haku',
    close: 'Sulje',
    loading: 'Ladataan…',
    error: 'Jokin meni pieleen',
    success: 'Onnistui',
    continue: 'Jatka',
    back: 'Takaisin',
    next: 'Seuraava',
    edit: 'Muokkaa',
    add: 'Lisää',
    remove: 'Poista',
    yes: 'Kyllä',
    no: 'Ei',
    or: 'tai',
    redirecting: 'Ohjataan…',
    continueWith: 'Jatka palvelulla {provider}',
  },
};

export const DICTIONARIES: Record<LocaleCode, NestedDict> = {
  en: DICT_EN,
  sv: DICT_SV,
  no: DICT_NO,
  da: DICT_DA,
  fi: DICT_FI,
};

/** Dot-path keys into NestedDict, e.g. "nav.features". */
export type NestedKey = {
  [C in keyof NestedDict]: {
    [K in keyof NestedDict[C]]: `${C & string}.${K & string}`;
  }[keyof NestedDict[C]];
}[keyof NestedDict];

/** Resolve a nested key; falls back to English, then the key itself. */
export function tNested(
  key: NestedKey | string,
  locale: LocaleCode,
  vars?: Record<string, string | number>
): string {
  const parts = key.split('.');
  const read = (dict: NestedDict): string | undefined => {
    let cur: unknown = dict;
    for (const p of parts) {
      if (cur && typeof cur === 'object' && p in (cur as object)) {
        cur = (cur as Record<string, unknown>)[p];
      } else {
        return undefined;
      }
    }
    return typeof cur === 'string' ? cur : undefined;
  };

  let value =
    read(DICTIONARIES[locale]) ?? read(DICTIONARIES.en) ?? key;

  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      value = value.replaceAll(`{${k}}`, String(v));
    }
  }
  return value;
}
