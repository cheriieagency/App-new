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
  | 'trustPillCheckout'
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
  | 'suiteTrustCreators'
  | 'suiteTrustBankId'
  | 'suiteTrustOwnership'
  | 'suiteTrustPayouts'
  | 'suiteTrustApis'
  | 'suitePublishTitle'
  | 'suitePublishSummary'
  | 'suitePublishBadge'
  | 'suiteTikTokDirect'
  | 'suiteInstagramReel'
  | 'suiteDirectApiStatus'
  | 'suiteEmailFooterVerified'
  | 'suiteEmailInboxRate'
  | 'suiteInboxTrigger'
  | 'suiteBioCheckout'
  | 'suiteCommunityXp'
  | 'suiteAdsNew'
  | 'suiteAdsTitle'
  | 'suiteAdsSummary'
  | 'suiteAdsFooter'
  | 'suiteReportsTitle'
  | 'suiteReportsSummary'
  | 'suiteReportsReach'
  | 'suiteReportsViews'
  | 'suiteReportsFollowers'
  | 'suiteReportsFooter'
  | 'suiteOwnershipBadge'
  | 'suiteOwnershipHeadline'
  | 'suiteOwnershipSub'
  | 'suiteCtaStudio'
  | 'suiteGuaranteeExportTitle'
  | 'suiteGuaranteeExportBody'
  | 'suiteGuaranteeStripeTitle'
  | 'suiteGuaranteeStripeBody'
  | 'suiteGuaranteeMigrationTitle'
  | 'suiteGuaranteeMigrationBody'
  | 'suiteGuaranteePricingTitle'
  | 'suiteGuaranteePricingBody'
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
  | 'faqPaymentsQ'
  | 'faqPaymentsA'
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
  | 'notesTab'
  | 'notesTitle'
  | 'notesHint'
  | 'notesNew'
  | 'notesUntitled'
  | 'notesEmpty'
  | 'notesPlaceholder'
  | 'notesTitlePlaceholder'
  | 'notesDelete'
  | 'notesAutosaved'
  | 'workflowIdeas'
  | 'workflowInProduction'
  | 'workflowReview'
  | 'workflowScheduled'
  | 'workflowPublished'
  | 'workflowFailed'
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
  | 'connectFacebook'
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
| 'landingHeroLine1'
  | 'landingHeroLine2'
  | 'landingHeroLine3'
  | 'navFeatures'
  | 'navPricing'
  | 'navCommunities'
  | 'logInShort'
  | 'getStartedShort'
  | 'pillarsEyebrow'
  | 'pillarsHeadline'
  | 'pillarsSub'
  | 'pillarPlanTitle'
  | 'pillarPlanSub'
  | 'pillarPlanP1'
  | 'pillarPlanP2'
  | 'pillarPlanP3'
  | 'pillarSellTitle'
  | 'pillarSellSub'
  | 'pillarSellP1'
  | 'pillarSellP2'
  | 'pillarSellP3'
  | 'pillarEngageTitle'
  | 'pillarEngageSub'
  | 'pillarEngageP1'
  | 'pillarEngageP2'
  | 'pillarEngageP3'
  | 'mostPopular'
  | 'whyChooseUsSub'
  | 'fragmentedStack'
  | 'fragmentedStackSub'
  | 'allInOneWinner'
  | 'metricPaymentOptions'
  | 'metricCreatorTools'
  | 'compareOldCost'
  | 'compareNewCost'
  | 'compareOldPay'
  | 'compareNewPay'
  | 'compareOldVat'
  | 'compareNewVat'
  | 'compareOldTools'
  | 'compareNewTools'
  | 'compareFooter'
  | 'featureLabel'
  | 'pricingEyebrow'
  | 'pricingHeadline'
  | 'pricingHeadlineAccent'
  | 'pricingSub'
  | 'pricingSaveHours'
  | 'pricingSaveMoney'
  | 'pricingZeroFee'
  | 'pricingMonthly'
  | 'pricingYearly'
  | 'pricingSave17'
  | 'planStarter'
  | 'planStarterSub'
  | 'planFreeForever'
  | 'planBilledMonthly'
  | 'planStarterCta'
  | 'planCreator'
  | 'planCreatorSub'
  | 'planCreatorSubYearly'
  | 'planCreatorCta'
  | 'planPro'
  | 'planProSub'
  | 'planProSubYearly'
  | 'planProCta'
  | 'planProBadge'
  | 'sekPerMo'
  | 'pricingTrustCancel'
  | 'pricingTrustSecurity'
  | 'pricingTrustMigration'
  | 'planF0'
  | 'planF1'
  | 'planF2'
  | 'planF3'
  | 'planF4'
  | 'planF5'
  | 'planF6'
  | 'planC1'
  | 'planC2'
  | 'planC3'
  | 'planC4'
  | 'planC5'
  | 'planC6'
  | 'planC7'
  | 'planC8'
  | 'planC0'
  | 'planP1'
  | 'planP2'
  | 'planP3'
  | 'planP4'
  | 'planP5'
  | 'planP6'
  | 'planP7'
  | 'planP0'
  | 'discoverExplore'
  | 'findNordicCommunity'
  | 'findNordicCommunityAccent'
  | 'discoverSub'
  | 'allCategoriesPill'
  | 'communityOfWeek'
  | 'trendingCommunities'
  | 'membershipFee'
  | 'cancelAnytimeReady'
  | 'instantAccessBadge'
  | 'coursesIncluded'
  | 'reviewsLabel'
  | 'joinArrow'
  | 'clearFilterShort'
  | 'noCommunitiesMatch'
  | 'showAllShort'
  | 'faqFilterAll'
  | 'faqFilterPayments'
  | 'faqFilterCommunity'
  | 'faqFilterVat'
  | 'faqFilterWorkspace'
  | 'faqStillQuestion'
  | 'faqStillSub'
  | 'faqContactSupport'
  | 'faqDomainQ'
  | 'faqDomainA'
  | 'faqBusinessQ'
  | 'faqBusinessA'
  | 'featuresTryAdmin'
  | 'featuresLivePreview'
  | 'getStartedEyebrow'
  | 'footerProduct'
  | 'footerAccount'
  | 'footerLegal'
  | 'footerSupport'
  | 'footerBlurb'
  | 'footerBuiltFor'
  | 'footerRights'
  | 'footerBanking'
  | 'legalIntegritet'
  | 'legalGdpr'
  | 'legalVillkor'
  | 'legalCookies'
  | 'backToHomeShort'
  | 'adminNavPlanner'
  | 'adminNavMedia'
  | 'adminNavInbox'
  | 'adminNavAnalytics'
  | 'adminNavBio'
  | 'adminNavCommunity'
  | 'adminNavEmail'
  | 'adminNavSettings'
  | 'peekIn'
  | 'openArrow'
  | 'pinnedBadge'
  | 'writeCommentPlaceholder'
  | 'loadingFeed'
  | 'pointsLabel'
  | 'communitiesStat'
  | 'refAndEarn'
  | 'invitedCount'
  | 'earnedSek'
  | 'bonusXp'
  | 'accountEyebrow'
  | 'authenticating'
  | 'liveStreamBadge'
  | 'aiCourseAssistant'
  | 'aiCourseAssistantSub'
  | 'ruleBeRespectful'
  | 'ruleNoSpam'
  | 'ruleLanguages'
  | 'ruleHelpEachOther'
  | 'tagQuestions'
  | 'tagInspiration'
  | 'tagResults'
  | 'tagTips'
  | 'tagMilestone'
  | 'classShort'
  | 'adminShort'
  | 'primaryMobileNav'
  | 'lastUpdated'
  | 'legalEyebrow'
  | 'signingOut'
  | 'eventsHeroHeadline'
  | 'eventsHeroSub'
  | 'totalRegistered'
  | 'comeBackSoon'
  | 'mins'
  | 'eventChat'
  | 'streamStartsSoon'
  | 'updatesEvery3s'
  | 'currencySek'
  | 'coursesInCommunity'
  | 'pickCourseHint'
  | 'loadingCommunity'
  | 'communityNotFound'
  | 'teamMembersAria'
  // Admin / planner UI chrome
  | 'editPost'
  | 'createSchedulePost'
  | 'crossPostDesc'
  | 'crossPosting'
  | 'youtubeSettings'
  | 'videoTitleLabel'
  | 'youtubeTitlePlaceholder'
  | 'privacyStatus'
  | 'publishAsShorts'
  | 'videoCategory'
  | 'tagsLabel'
  | 'tagsPlaceholder'
  | 'separateWithCommas'
  | 'emojiBtn'
  | 'polishWithAi'
  | 'captionPlaceholder'
  | 'dateAndTime'
  | 'saveDraft'
  | 'publishNow'
  | 'schedulePost'
  | 'captionPreviewPlaceholder'
  | 'newPostDefault'
  | 'analyticsAndRevenue'
  | 'analyticsOverview'
  | 'analyticsAudience'
  | 'analyticsPosts'
  | 'analyticsReels'
  | 'analyticsStories'
  | 'analyticsHashtags'
  | 'analyticsLinkinBio'
  | 'analyticsMonthlyReports'
  | 'postDetailTitle'
  | 'postDetailClose'
  | 'postDetailOpenOriginal'
  | 'postDetailEngagementMix'
  | 'postDetailNoImage'
  | 'exportLabel'
  | 'last7Days'
  | 'kpiRevenueCheckout'
  | 'kpiFollowers'
  | 'totalFollowersAll'
  | 'followersPerAccount'
  | 'shareOfAudience'
  | 'kpiBioStoreCvr'
  | 'kpiPlannedPosts'
  | 'performanceCheckoutTitle'
  | 'performanceCheckoutSub'
  | 'chartRevenue'
  | 'chartVisitors'
  | 'topBioProductsTitle'
  | 'topBioProductsSub'
  | 'newProduct'
  | 'colProduct'
  | 'colCategory'
  | 'colClicks'
  | 'colConversion'
  | 'colRevenue'
  | 'colStatus'
  | 'reach7d'
  | 'postPerformance'
  | 'reelPerformance'
  | 'storyPerformance'
  | 'hashtagAnalysis'
  | 'linkinBioAnalyticsTitle'
  | 'clicksTotalBioUtm'
  | 'addProductsForLinkPerf'
  | 'uniqueCol'
  | 'statusLive'
  | 'statusPaused'
  | 'performanceChartAria'
  | 'bioTabDesign'
  | 'bioTabBlocks'
  | 'bioTabAnalytics'
  | 'bioTabSettings'
  | 'liveStudioPreview'
  | 'presetsCount'
  | 'themeMidnight'
  | 'themeMidnightBlurb'
  | 'themeChampagne'
  | 'themeChampagneBlurb'
  | 'themeAurora'
  | 'themeAuroraBlurb'
  | 'themeNordic'
  | 'themeNordicBlurb'
  | 'mockLinkWelcomeSub'
  | 'mockLinkStudioTitle'
  | 'mockLinkStudioSub'
  | 'mockLinkCoaching'
  | 'mockLinkCoachingSub'
  | 'yourInfo'
  | 'fieldRequired'
  | 'validEmail'
  | 'validPhone'
  | 'selectOption'
  | 'cardApplePay'
  | 'chooseImageType'
  | 'maxFileSize5mb'
  | 'uploadFailedRetry'
  | 'variantHintFrosted'
  | 'variantHintSolid'
  | 'variantHintLuxe'
  | 'variantHintMinimal'
  | 'fontHintJakarta'
  | 'fontHintPlayfair'
  | 'fontHintSpace'
  | 'fontHintDefault'
  | 'linkInBio'
  | 'publishChanges'
  | 'publishedCheck'
  | 'openPublicBioTitle'
  | 'exclusiveThemes'
  | 'exclusiveThemesSub'
  | 'headerCoverBanner'
  | 'hdCoverPhoto'
  | 'optionalBannerAbove'
  | 'coverImage'
  | 'uploadBannerHint'
  | 'avatarShape'
  | 'shapeCircle'
  | 'shapeSquircle'
  | 'verifiedBadge'
  | 'verifiedBadgeHint'
  | 'socialIconsLayout'
  | 'socialLayoutHeader'
  | 'socialLayoutDock'
  | 'canvasBackground'
  | 'backgroundType'
  | 'bgSolidMesh'
  | 'bgHdImage'
  | 'bgLiquid'
  | 'meshGradient'
  | 'meshGradientHint'
  | 'primaryTintColor'
  | 'backgroundImage'
  | 'uploadCanvasBgHint'
  | 'textIconColor'
  | 'mutedTextColor'
  | 'typographyLabel'
  | 'exclusiveBlockDesigns'
  | 'blockVariant'
  | 'variantFrosted'
  | 'variantSolid'
  | 'variantLuxe'
  | 'variantMinimal'
  | 'blockBackground'
  | 'blockTextColor'
  | 'cornerCurvature'
  | 'radiusCurved'
  | 'radiusSharp'
  | 'radiusPill'
  | 'hoverEffect'
  | 'hoverLift'
  | 'hoverShimmer'
  | 'hoverScale'
  | 'replaceImage'
  | 'uploadFromDevice'
  | 'noImageYet'
  | 'imageFormatHint'
  | 'titleAndMedia'
  | 'platformsCol'
  | 'quickEdit'
  | 'noPostsMatchFilter'
  | 'today'
  | 'previous'
  | 'postItNote'
  | 'addPostIt'
  | 'moreNotes'
  | 'morePosts'
  | 'editReminder'
  | 'newReminder'
  | 'colorLabel'
  | 'saveNote'
  | 'notePlaceholder'
  | 'dayMon'
  | 'dayTue'
  | 'dayWed'
  | 'dayThu'
  | 'dayFri'
  | 'daySat'
  | 'daySun'
  // Checkout / live / planner chrome
  | 'oneTapCheckout'
  | 'secureCheckout'
  | 'closeCheckout'
  | 'paymentConfirmed'
  | 'redirectingTo'
  | 'continueNow'
  | 'payInstantly'
  | 'waitingForLive'
  | 'yourNamePlaceholder'
  | 'loadingCalendar'
  | 'statScheduled'
  | 'statDrafts'
  | 'statPublished'
  | 'createSchedulePostBtn'
  | 'copilotIdeas'
  | 'copilotCaption'
  | 'copilotHashtags'
  | 'copilotHooks'
  | 'copilotSaved'
  | 'copilotIdeasHint'
  | 'copilotCaptionHint'
  | 'copilotHashtagsHint'
  | 'copilotHooksHint'
  | 'copilotSavedHint'
  | 'writeCaptionShort'
  | 'courseContentHint'
  | 'yourPurchaseHint'
  | 'liveEventHint'
  | 'publishOrSave'
  | 'allTeamWorkspaces'
  | 'emailBodyPlaceholder'
  | 'socialSpaces'
  | 'linkGoogleCalendar'
  | 'calendarFilter'
  | 'eventsCount'
  | 'viewMonth'
  | 'viewWeek'
  | 'viewDay'
  | 'viewList'
  | 'noContentTasksHappening'
  | 'adminNavProjects'
  | 'projectsTitle'
  | 'projectsSub'
  | 'createProject'
  | 'newProject'
  | 'projectNamePlaceholder'
  | 'projectDescPlaceholder'
  | 'noProjectsYet'
  | 'selectProjectHint'
  | 'projectsFoldersHint'
  | 'visionboardEyebrow'
  | 'visionboardTitle'
  | 'visionboardSub'
  | 'visionboardUpload'
  | 'visionboardFromLibrary'
  | 'visionboardEmpty'
  | 'visionboardNotePlaceholder'
  | 'visionboardUntitled'
  | 'visionboardSaveFailed'
  | 'visionboardImagesOnly'
  | 'visionboardLibraryEmpty'
  | 'linkedPosts'
  | 'noPostsInProject'
  | 'deleteProjectConfirm'
  | 'deleteProjectTitle'
  | 'deleteProjectPermanentCheckbox'
  | 'campaignLabels'
  | 'campaignLabelsHint'
  | 'createMediaFolder'
  | 'newMediaFolder'
  | 'mediaFolderNamePlaceholder'
  | 'mediaFolderDescPlaceholder'
  | 'noMediaFoldersYet'
  | 'selectMediaFolderHint'
  | 'mediaFolderSub'
  | 'noMediaInFolder'
  | 'deleteMediaFolderTitle'
  | 'deleteMediaFolderConfirm'
  | 'deleteMediaFolderPermanentCheckbox'
  | 'mediaLibraryRoot'
  | 'mediaLibraryRootDesc'
  | 'audienceGender'
  | 'audienceAge'
  | 'audienceDemographics'
  | 'audienceActiveTimes'
  | 'audienceGenderWomen'
  | 'audienceGenderMen'
  | 'audienceGenderOther'
  | 'audienceTopCountries'
  | 'audienceTopCities'
  | 'audienceActiveTimesHint'
  | 'audienceLocation'
  | 'demographicsUnavailable'
  | 'demographicsFromViewers'
  | 'demographicsFromFollowers'
  | 'demographicsAllPlatforms'
  | 'demographicsPlatformStatus'
  | 'audienceLessActive'
  | 'audienceMoreActive'
  | 'analyticsTab'
  | 'metricReach'
  | 'metricViews'
  | 'metricLikes'
  | 'metricComments'
  | 'metricShares'
  | 'metricSaves'
  | 'metricEngagementRate'
  | 'engagementSummaryTitle'
  | 'engagementSummarySub'
  | 'totalEngagement'
  | 'engagementRateHint'
  | 'engagementRateTrend'
  | 'engagementRateFormula'
  | 'pctOfEngagement'
  | 'dateRange1Week'
  | 'dateRange1Month'
  | 'dateRange3Months'
  | 'dateRange1Year'
  | 'dateRange2Years'
  | 'dateRangeCustom'
  | 'dateRangeFrom'
  | 'dateRangeTo'
  | 'dateRangeApply'
  | 'dateRangePresets'
  | 'bestPerformingPosts'
  | 'mostViewedPosts'
  | 'bestPerformingSub'
  | 'mostViewedSub'
  | 'postsPerformanceCompare'
  | 'reelsPerformanceCompare'
  | 'storiesPerformanceCompare'
  | 'metricImpressions'
  | 'metricPlays'
  | 'hashtagsUsedTitle'
  | 'hashtagsUsedSub'
  | 'hashtagUses'
  | 'hashtagReach'
  | 'hashtagTrend'
  | 'hashtagsUnique'
  | 'hashtagsAvgLift'
  | 'hashtagsTaggedPosts'
  | 'aiHashtagIdeasTitle'
  | 'aiHashtagIdeasSub'
  | 'aiHashtagGenerate'
  | 'aiHashtagGenerating'
  | 'aiHashtagCopySet'
  | 'aiHashtagCopied'
  | 'aiHashtagSetFor'
  | 'hashtagColTag'
  | 'hashtagColPosts'
  | 'linkInBioSub'
  | 'linkInBioTopLink'
  | 'linkInBioClickShare'
  | 'linkInBioConversionHint'
  | 'linkInBioUniqueRate'
  | 'copyCommunityLink'
  | 'communityLinkCopied'
  | 'communityAccessEmailSent'
  | 'communityAccessEmailNote'
  | 'emailAutomations'
  | 'emailAutomationsSub'
  | 'automationActive'
  | 'automationPaused'
  | 'automationTrigger'
  | 'automationSent'
  | 'automationLastSent'
  | 'automationPause'
  | 'automationResume'
  | 'noAutomationsYet'
  | 'communityEmailsRecent'
  | 'communityEmailsEmpty'
  | 'purchaseAccessEmail'
  | 'memberAutoEmail'
  | 'automationRules'
  | 'addAutomation'
  | 'editAutomation'
  | 'saveAutomation'
  | 'automationName'
  | 'automationSubject'
  | 'automationBody'
  | 'automationDescription'
  | 'automationSaved'
  | 'deleteAutomation'
  | 'deleteAutomationConfirm'
  | 'automationDeleted'
  // Admin settings shell + account menu + bio chrome
  | 'settingsNavProfile'
  | 'settingsNavNotifications'
  | 'settingsNavIntegrations'
  | 'settingsOrg'
  | 'settingsNavGeneral'
  | 'settingsNavMembers'
  | 'settingsNavSpaces'
  | 'settingsNavTags'
  | 'settingsNavBranding'
  | 'settingsNavWorkflows'
  | 'settingsNavBilling'
  | 'settingsNavAi'
  | 'settingsWorkspaces'
  | 'settingsSearchWorkspaces'
  | 'settingsNewWorkspace'
  | 'settingsUpdateProfile'
  | 'settingsCalendar'
  | 'settingsCalendarSub'
  | 'settingsWeekStart'
  | 'settingsMonday'
  | 'settingsSunday'
  | 'settingsSecurity'
  | 'settingsNewPassword'
  | 'settingsNewPasswordHint'
  | 'settingsReset'
  | 'settingsEnable2fa'
  | 'settingsEnable2faSub'
  | 'settingsManage2fa'
  | 'settings2faOn'
  | 'settingsContact'
  | 'settingsNewEmail'
  | 'settingsNewEmailHint'
  | 'settingsLogOut'
  | 'settingsDeleteAccount'
  | 'settingsNotificationsSub'
  | 'settingsComingSoon'
  | 'settingsBillingSub'
  | 'settingsPlanActive'
  | 'settingsSocialSetsTitle'
  | 'settingsSocialSetsHint'
  | 'settingsManageSocials'
  | 'settingsClose'
  | 'flashDisplayNameSaved'
  | 'flashPasswordUpdated'
  | 'flash2faEnabled'
  | 'flash2faDisabled'
  | 'flashEmailConfirm'
  | 'flashDeleteConfirm'
  | 'notifNewMembers'
  | 'notifPurchases'
  | 'notifAutomations'
  | 'notifLiveReminders'
  | 'notifWeeklyDigest'
  | 'notifWeeklyDigestHint'
  | 'notifInAppHint'
  | 'notifSampleNewMembers'
  | 'notifSamplePurchase'
  | 'notifSampleAutomation'
  | 'notifSampleLive'
  | 'notifEmpty'
  | 'notifPrefsSaved'
  | 'settingsIntegrationsSub'
  | 'settingsIntegrationsOverview'
  | 'settingsApiAuthorized'
  | 'settingsApiNotConnected'
  | 'settingsConnectedAt'
  | 'settingsNoSocialsYet'
  | 'settingsWorkspacesSub'
  | 'settingsWorkspaceMembers'
  | 'settingsWorkspaceRole'
  | 'settingsWorkspaceChannels'
  | 'settingsAddWorkspace'
  | 'settingsNoMembers'
  | 'settingsWorkflowsSub'
  | 'settingsWorkflowActive'
  | 'settingsWorkflowPaused'
  | 'settingsWorkflowSent'
  | 'settingsWorkflowLastSent'
  | 'settingsNoWorkflows'
  | 'settingsOpenEmailCrm'
  | 'settingsPaymentMethod'
  | 'settingsPaymentStripe'
  | 'settingsCardOnFile'
  | 'settingsRenewalDate'
  | 'settingsRenewalHint'
  | 'settingsBillingPortal'
  | 'settingsSubscriptions'
  | 'settingsSubscriptionsSub'
  | 'settingsManageSubscriptions'
  | 'settingsPlanSince'
  | 'settingsTrialEnds'
  | 'settingsBillingMembers'
  | 'settingsUnitPrice'
  | 'settingsBillingInterval'
  | 'settingsNextInvoice'
  | 'settingsFirstCharge'
  | 'settingsBillingDetails'
  | 'settingsBillingDetailsSub'
  | 'settingsEdit'
  | 'settingsPaymentMethodLabel'
  | 'settingsCardMastercard'
  | 'settingsNoTaxId'
  | 'settingsAddTaxId'
  | 'settingsInvoiceHistory'
  | 'settingsInvoiceHistorySub'
  | 'settingsInvoiceTrial'
  | 'settingsIntervalYear'
  | 'settingsIntervalMonth'
  | 'settingsAvailablePlans'
  | 'settingsMembersSub'
  | 'settingsInviteMember'
  | 'settingsAllSpaces'
  | 'settingsRoleAdmin'
  | 'settingsRoleEditor'
  | 'settingsRoleApprover'
  | 'settingsRoleViewer'
  | 'settingsInviteTitle'
  | 'settingsInviteHint'
  | 'settingsInviteSend'
  | 'settingsInviteSent'
  | 'settingsMemberPending'
  | 'settingsOrgTitle'
  | 'settingsOrgSub'
  | 'settingsSpaceAccess'
  | 'accountMenuTitle'
  | 'accountMenuWorkspace'
  | 'accountMenuRole'
  | 'accountMenuCreator'
  | 'accountMenuSettingsBilling'
  | 'accountMenuProfileBio'
  | 'paymentsActive'
  | 'notificationsTitle'
  | 'aiCopilotTitle'
  | 'activeBlocksTitle'
  | 'activeBlocksSub'
  | 'addLinkOrProduct'
  | 'linksAndLeadMagnets'
  | 'noLinksYet'
  | 'storeProductsTitle'
  | 'noStoreProductsYet'
  | 'sentBroadcastsTitle'
  | 'sentBroadcastsSub'
  | 'noBroadcastsYet'
  | 'communityAccessLabel'
  | 'communityAccessHint'
  | 'whichCommunity'
  | 'yesLabel'
  | 'noLabel'
  | 'unlocksLabel'
  | 'statusLabel'
  | 'optionalLabel'
  | 'mergeTagsHint'
  | 'socialInboxEyebrow'
  | 'socialInboxTitle'
  | 'socialInboxSub'
  | 'inboxZero'
  | 'instagramDmsTitle'
  | 'instagramDmsHint'
  | 'instagramDmReplyPlaceholder'
  | 'instagramDmSend'
  | 'instagramNotConnected'
  // Settings / profile / branding (2026-08 audit)
  | 'toastChooseImage'
  | 'toastChooseImageFile'
  | 'toastUploadFailed'
  | 'toastLogoUpdated'
  | 'toastFaviconUpdated'
  | 'toastBrandingSaveFailed'
  | 'toastProfilePhotoUpdated'
  | 'toastProfilePhotoUploadFailed'
  | 'toastTimezoneSaveFailed'
  | 'toastNotifPrefsSaveFailed'
  | 'toastDeleteAccountFailed'
  | 'orgBrandingTitle'
  | 'orgBrandingSub'
  | 'orgNameLabel'
  | 'orgLogoLabel'
  | 'orgLogoHint'
  | 'orgFaviconLabel'
  | 'uploadLogo'
  | 'uploadFavicon'
  | 'profilePhotoLabel'
  | 'uploadingEllipsis'
  | 'timezoneLabel'
  | 'timezoneHint'
  | 'notifInAppTitle'
  | 'notifInAppBellHint'
  | 'notifEmailTitle'
  | 'deleteAccountTitle'
  | 'deleteAccountBody'
  | 'deleteAccountConfirmPlaceholder'
  | 'deleteAccountConfirm'
  | 'closeAria'
  | 'aiUsageThisMonth'
  | 'aiUsageWordsUsed'
  | 'aiUsageGateTitle'
  | 'aiUsageGateBody'
  // Social accounts
  | 'toastSelectWorkspaceBeforeConnect'
  | 'toastSocialConnected'
  | 'toastPopupBlocked'
  | 'toastConnectionFailed'
  | 'toastCouldNotConnect'
  | 'toastAccountDisconnected'
  | 'toastDisconnectNetworkError'
  | 'toastTikTokSessionExpired'
  | 'toastTikTokSwitchFailed'
  | 'connectMetaAccountsTitle'
  | 'connectMetaAccountsSub'
  | 'resyncMetaWebhooks'
  | 'connectTikTokTitle'
  | 'connectTikTokSub'
  | 'demoModeSimulatedTitle'
  | 'demoModeSimulatedSub'
  // Planner / workspace create
  | 'toastPickScheduleFirst'
  | 'toastConnectIgFbSettings'
  | 'toastConnectSocialSettings'
  | 'toastCaptionRequired'
  | 'toastTikTokNeedsMedia'
  | 'toastPostedSuccess'
  | 'toastSavedScheduled'
  | 'studioActions'
  | 'studioPublish'
  | 'studioSaveOptions'
  | 'createBrandWorkspaceTitle'
  | 'createBrandWorkspaceSub'
  | 'brandWorkspaceNameLabel'
  | 'brandWorkspaceNamePlaceholder'
  | 'socialHandleLabel'
  | 'socialHandlePlaceholder'
  | 'connectedChannelsLabel'
  | 'toastWorkspaceActivated'
  | 'toastWorkspaceCreateFailed'
  | 'toastWorkspaceSaveFailed'
  | 'toastWorkspaceDeleteFailed'
  | 'toastBioSaveFailed'
  // Classroom
  | 'toastLessonProgressFailed'
  | 'pickLessonHint'
  | 'toastCourseSaved'
  | 'toastCommunityRequired'
  | 'classroomEmptyAdminTitle'
  | 'classroomEmptyAdminBody'
  // Store / email / sidebar
  | 'toastOfferTitleRequired'
  | 'toastOfferPriceRequired'
  | 'toastOfferCommunityRequired'
  | 'toastCsvImportSuccess'
  | 'toastCsvImportFailed'
  | 'toastFolderRenamed'
  | 'toastFolderRenameFailed'
  | 'toastFolderCreated'
  | 'toastFolderCreateFailed'
  | 'toastFolderDeleted'
  | 'toastFolderDeleteFailed'
  | 'toastReorderProjectsFailed'
  | 'toastReorderFoldersFailed'
  | 'toastSelectWorkspaceBeforeConnectShort'
  | 'toastAllowPopupsConnect'
  | 'toastCreateProjectFailed'
  | 'toastHashtagsAdded'
  | 'toastAddHashtagsFirst'
  | 'toastSavedToFavourites'
  | 'toastUpdatePlanFailed'
  | 'toastPostedToCommunity'
  | 'toastCommentFailed'
  | 'toastPostDeleted'
  | 'toastPostUpdated'
  | 'toastOfferAddTitle'
  | 'toastOfferEnterPriceSek'
  | 'toastOfferNeedCommunity'
  | 'toastAddEmailAddress'
  | 'toastUploadCsvFirst'
  | 'toastUploadCsvOnly'
  | 'toastNoValidEmailsCsv'
  | 'toastCsvReadFailed'
  | 'toastCommunityUnlocked'
  | 'toastCourseNeedCommunity'
  | 'toastFileUploaded'
  | 'toastFileDeleted'
  | 'toastFileDeleteFailed'
  | 'toastGoogleDisconnected'
  | 'toastGoogleDisconnectFailed'
  | 'toastSelectWorkspaceFirst'
  | 'toastProjectUpdated'
  | 'toastProjectUpdateFailed'
  | 'toastProjectGoalSaved'
  | 'toastProjectGoalSaveFailed'
  | 'toastStripeConnectUpdated'
  | 'toastStripeFinishOnboarding'
  | 'toastBankAlreadyConnected'
  | 'toastFrozenReportCreated'
  | 'toastAutomationSaved'
  | 'toastReportDeleted'
  | 'toastShareLinkCopied'
  | 'toastSelectFileFirst'
  | 'toastDriveImportNoFile'
  | 'toastAutomationDeleted'
  | 'toastLiveDiagnosticPassed'
  | 'toastSaveFailed'
  | 'toastPublishFailed'
  | 'toastPlanSwitched'
  | 'toastCouldNotPost'
  | 'toastCouldNotSaveOffer'
  | 'toastCsvContactsFound'
  | 'toastCouldNotSaveCourse'
  | 'toastLinkMediaFolderFailed'
  | 'toastCreateMediaFolderFailed'
  | 'toastLinkedMediaFolder'
  | 'toastCreatedLinkedFolder'
  | 'toastRevenueLoadFailed'
  | 'toastStripeConnectStartFailed'
  | 'toastConnectFailed'
  | 'toastBuildFailed'
  | 'toastDeleteFailed'
  | 'toastMaxFilesPerPost'
  | 'toastExtraFilesSkipped'
  | 'toastRuleUpdated'
  | 'toastCommentToDmCreated'
  | 'toastToggleFailed'
  | 'toastDeleteAutomationFailed'
  | 'toastNoRecentIgComments'
  | 'toastFetchedIgComments'
  | 'toastFetchCommentsFailed'
  | 'inboxTabAutomations'
  | 'inboxSync'
  | 'inboxSyncIssue'
  | 'inboxDmNeedPerms'
  | 'inboxReconnectIg'
  | 'inboxAll'
  | 'inboxTikTokDemo'
  | 'inboxAllMessages'
  | 'inboxDms'
  | 'inboxComments'
  | 'inboxSearchConversations'
  | 'inboxSyncing'
  | 'inboxNoMatches'
  | 'inboxNoDms'
  | 'inboxNoComments'
  | 'inboxEmpty'
  | 'inboxTryAnotherSearch'
  | 'inboxTapSync'
  | 'inboxComment'
  | 'inboxProfile'
  | 'inboxNoMessagesInThread'
  | 'inboxMediaSoon'
  | 'inboxAttachMedia'
  | 'inboxAiQuickReply'
  | 'inboxReplyTikTok'
  | 'inboxWriteReply'
  | 'inboxReplyComment'
  | 'inboxSelectConversation'
  | 'dmKpiActiveTriggers'
  | 'dmKpiRules'
  | 'dmKpiDmsSent'
  | 'dmKpiDms'
  | 'dmKpiStorefrontClicks'
  | 'dmKpiClicks'
  | 'dmKpiConversion'
  | 'dmTitle'
  | 'dmSub'
  | 'dmResyncWebhooks'
  | 'dmCreateRule'
  | 'dmDevTools'
  | 'dmRunLiveDebug'
  | 'dmTestAutomation'
  | 'dmFetchComments'
  | 'dmSelectRecentComment'
  | 'dmFetchCommentsFirst'
  | 'dmPickComment'
  | 'dmCommentIdLabel'
  | 'dmCommentIdPlaceholder'
  | 'dmRunLiveTestDm'
  | 'dmDiagnosticTitle'
  | 'dmAllChecksPassed'
  | 'dmIssuesFound'
  | 'dmDismiss'
  | 'dmCheckToken'
  | 'dmCheckWebhooks'
  | 'dmCheckRules'
  | 'dmCheckPayload'
  | 'dmFixPrefix'
  | 'dmLiveReplyResult'
  | 'dmEmptyHeadline'
  | 'dmEmptyDesc'
  | 'dmEmptyCta'
  | 'dmActive'
  | 'dmPaused'
  | 'dmPauseAria'
  | 'dmActivateAria'
  | 'dmEdit'
  | 'dmDelete'
  | 'dmDeleteConfirm'
  | 'dmDmsSentClicks'
  | 'dmRetry'
  | 'dmLoadFailed'
  | 'dmUnknownError'
  | 'dmClose'
  | 'dmModalEyebrow'
  | 'dmEditRule'
  | 'dmCreateRuleTitle'
  | 'dmFieldTitle'
  | 'dmTitlePlaceholder'
  | 'dmFieldKeywords'
  | 'dmFieldDm'
  | 'dmFieldButton'
  | 'dmFieldStorefront'
  | 'dmPublicReplyToggle'
  | 'dmSaveChanges'
  | 'dmCreateRuleBtn'
  | 'dmJustNow'
  | 'dmMinsAgo'
  | 'dmHoursAgo'
  | 'dmDaysAgo'
  | 'dmUnknownUser'
  | 'dmEmptyComment'
  | 'dmInvalidCommentId'
  | 'dmDefaultMessage'
  | 'dmDefaultCta'
  | 'dmDefaultPublicReply'
  | 'toastUpdateProjectLinkFailed'
  | 'toastUploadedFromDevice'
  | 'toastMovedToFolder'
  | 'toastMoveFileFailed'
  | 'toastDeletedFromLibrary'
  | 'toastUploadedToFolder'
  | 'toastImportedFile'
  | 'toastInviteResent'
  | 'toastConnectionFailedDetail'
  // Meta Ads Manager
  | 'adsEyebrow'
  | 'adsManagerTitle'
  | 'adsManagerSub'
  | 'adsCreateCampaign'
  | 'adsSyncMeta'
  | 'adsDemoData'
  | 'adsPerformance'
  | 'adsPerformanceSub'
  | 'adsLast7Days'
  | 'adsLast30Days'
  | 'adsSpend'
  | 'adsConversions'
  | 'adsRoas'
  | 'adsCpc'
  | 'adsTrend'
  | 'adsNoInsightData'
  | 'adsCampaigns'
  | 'adsAdSets'
  | 'adsAds'
  | 'adsClearFilter'
  | 'adsStatus'
  | 'adsCampaign'
  | 'adsAdSet'
  | 'adsAd'
  | 'adsDailyBudget'
  | 'adsImpressions'
  | 'adsClicks'
  | 'adsActive'
  | 'adsPaused'
  | 'adsNoCampaigns'
  | 'adsNoAdSets'
  | 'adsNoAds'
  | 'adsLoading'
  | 'adsSave'
  | 'adsDelivery'
  | 'adsDeliveryActiveHint'
  | 'adsDeliveryPausedHint'
  | 'adsPerformanceSection'
  | 'adsSettings'
  | 'adsObjective'
  | 'adsTargeting'
  | 'adsHeadline'
  | 'adsCreative'
  | 'adsNoCreative'
  | 'adsParentCampaign'
  | 'adsParentAdSet'
  | 'adsAdAccount'
  | 'adsViewAdSets'
  | 'adsViewAds'
  | 'adsSaveBudget'
  | 'adsDetailsCampaign'
  | 'adsDetailsAdSet'
  | 'adsDetailsAd'
  | 'adsMetaSyncNote'
  | 'adsToastActive'
  | 'adsToastPaused'
  | 'adsToastBudget'
  | 'adsBudgetHint'
  | 'adsFromDate'
  | 'adsCreateTitle'
  | 'adsStepObjective'
  | 'adsStepAudience'
  | 'adsStepCreative'
  | 'adsCampaignName'
  | 'adsDailyBudgetLabel'
  | 'adsContinue'
  | 'adsCancel'
  | 'adsBack'
  | 'adsCreateSubmit'
  | 'adsAiCopywriter'
  | 'adsCreativeSources'
  | 'adsFromDevice'
  | 'adsMediaLibrary'
  | 'adsDropCreative'
  | 'adsOrChooseSource'
  | 'adsRemove'
  | 'adsSelected'
  | 'adsObjSales'
  | 'adsObjLeads'
  | 'adsObjTraffic'
  | 'adsObjEngagement'
  | 'adsObjSalesBlurb'
  | 'adsObjLeadsBlurb'
  | 'adsObjTrafficBlurb'
  | 'adsObjEngagementBlurb'

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
  landingHeroBadge: 'The all-in-one platform — clikd:',
  landingHeroHeadline: 'The All-in-One Creator Engine',
  landingHeroSub:
    'Stop juggling Later, Linktree, Skool and Stripe. Sell digital products, host courses, plan social media content, and take instant mobile payments — all in one app.',
  landingCtaStartFree: 'Start Your Free Community →',
  landingCtaExplore: 'Explore Popular Communities',
  trustPillCheckout: '⚡ Built-in Instant Checkout',
  trustPillVat: '🧾 Automatic Fortnox & VAT',
  trustPillAi: '🤖 3x AI Copilots Included',
  trustPillSocial: '📅 Planner, Bio & Social Sets',
  whyChooseUs: 'Why Choose Us',
  whyChooseUsHeadline: 'Stop Juggling Multiple Platforms',
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
  suiteEyebrow: 'Creator Admin',
  suiteHeadline: 'Your complete creator command center',
  suiteSub:
    'Replace 5 fragmented subscriptions with one unified studio. Direct publishing APIs, bio storefronts, community, and email CRM — backed by 100% data ownership.',
  suitePlannerTitle: 'Calendar & Planner',
  suitePlannerSummary:
    'Schedule and auto-post content across your multi-brand Social Set profiles with Kanban & Calendar views.',
  suiteBioTitle: 'Bio Link Storefront',
  suiteBioSummary:
    'Custom themes, UTM tracking, digital products, and 1-tap mobile checkout flow.',
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
  suiteCommunityTitle: 'Community & Courses',
  suiteCommunitySummary:
    'Member feeds, moderation tools, classroom courses, storefront, live events, and XP leaderboards.',
  suiteEmailTitle: 'Email CRM & Broadcasts',
  suiteEmailSummary:
    'Subscriber directory, automated email broadcasts, tags, and engagement tracking built on custom Resend infrastructure.',
  suiteTrustCreators: 'Trusted by 500+ Nordic Creators & Agencies',
  suiteTrustBankId: 'BankID & Stripe Verified',
  suiteTrustOwnership: '100% Data Ownership',
  suiteTrustPayouts: 'Instant Bank Payouts',
  suiteTrustApis: 'Official Meta & TikTok APIs',
  suitePublishTitle: 'Automated Multi-Platform Auto-Posting',
  suitePublishSummary:
    'Schedule and publish videos directly to TikTok, Instagram Reels, and Facebook in seconds. Integrated OAuth scopes ensure zero manual draft approvals or push notification hassles.',
  suitePublishBadge: 'Direct Publishing API',
  suiteTikTokDirect: 'TikTok Direct Post Active',
  suiteInstagramReel: 'Instagram Auto-Reel',
  suiteDirectApiStatus: '100% Direct API Status ✓',
  suiteEmailFooterVerified: 'Resend Verified',
  suiteEmailInboxRate: '99.8% Inbox Guarantee',
  suiteInboxTrigger: 'Auto Comment-to-DM Trigger',
  suiteBioCheckout: '1-Tap Swish & Card Checkout',
  suiteCommunityXp: 'Gamified Member Hub & XP',
  suiteAdsNew: 'NEW',
  suiteAdsTitle: 'Meta Ads Manager & ROAS',
  suiteAdsSummary:
    'Launch Facebook & Instagram ad campaigns directly from your studio with real-time ROAS tracking and conversion attribution.',
  suiteAdsFooter: 'Real-time Campaign ROAS',
  suiteReportsTitle: 'In-depth Analytics & Revenue Reports',
  suiteReportsSummary:
    'Reach, video views, impressions, audience growth, Linkin.bio performance, and total Swish & card sales reports unified in one view.',
  suiteReportsReach: 'Reach: 94.2K',
  suiteReportsViews: 'Views: 186.4K',
  suiteReportsFollowers: '+842 Followers',
  suiteReportsFooter: 'Full Cross-Platform Reports',
  suiteOwnershipBadge: '100% DATA OWNERSHIP & ZERO LOCK-IN GUARANTEE',
  suiteOwnershipHeadline:
    'You own your business. Export your members, courses, and sales anytime.',
  suiteOwnershipSub:
    'Never worry about platform lock-in. 1-click CSV/JSON downloads for all member directories, transaction logs, and email contact lists.',
  suiteCtaStudio: 'Start Your Free Studio →',
  suiteGuaranteeExportTitle: '1-Click Full Export',
  suiteGuaranteeExportBody: 'Download all CSV/JSON data with zero restrictions anytime.',
  suiteGuaranteeStripeTitle: 'Stripe Connect Express',
  suiteGuaranteeStripeBody: 'Direct payouts to your bank account with BankID security.',
  suiteGuaranteeMigrationTitle: 'White-Glove Migration',
  suiteGuaranteeMigrationBody: 'Free 1:1 support moving active members from Skool or Stan Store.',
  suiteGuaranteePricingTitle: 'Transparent Pricing',
  suiteGuaranteePricingBody: '0% or low platform fees with no surprise hidden charges.',
  roiEyebrow: 'ROI Calculator',
  roiHeadline: 'Estimate your monthly revenue from your community',
  roiSub: 'Adjust the sliders. 1–3% conversion is realistic for an engaged creator audience.',
  roiFollowers: 'Select Follower Count',
  roiMonthlyPrice: 'Monthly Membership Price',
  roiConversion: 'Conversion Rate',
  roiEstimatedRevenue: 'Estimated Monthly Revenue',
  roiEarnLine: 'With just {pct}% conversion, you earn ${amount} / month',
  roiPayingMembers: 'Approx. {count} paying members at {price} SEK',
  faqEyebrow: 'Help & Frequently Asked Questions',
  faqHeadline: "Got questions? We've got answers",
  faqSub: 'Payments, bio, social tagging, VAT and migrating members.',
  faqPaymentsQ: 'How do mobile payments work?',
  faqPaymentsA:
    'Members pay with mobile payment in checkout — often in under 10 seconds. Funds link to your creator account so you never rebuild checkout yourself.',
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
    'Yes. Switch Active Social Sets in Creator Admin. Plans scale from Starter (1 set / 8 profiles) to Creator and Pro/Agency for more brands and profiles.',
  faqImportQ: 'Can I import my members from Facebook or Skool?',
  faqImportA:
    'Yes. Import members via email lists and invite them into your new community. They sign in with email or BankID and keep access to your courses and events.',
  faqPayoutQ: 'When do I get paid out?',
  faqPayoutA:
    'Revenue appears in Analytics and pays out to your bank account on the platform payout schedule. Track status, amounts, and history without chasing Stripe reports.',
  faqTrialQ: 'Is there a free plan?',
  faqTrialA:
    'Starter is free forever. Creator and Pro/Agency can be started when you are ready — no long lock-in. Yearly billing saves 17%.',
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
    'Social Sets, Bio Builder, post tagging, analytics, community, checkout and AI — built in from day one.',
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
  notesTab: 'Notes',
  notesTitle: 'Notes',
  notesHint: 'Jot down ideas, reminders, and drafts for this workspace.',
  notesNew: 'New note',
  notesUntitled: 'Untitled note',
  notesEmpty: 'No notes yet. Create one to get started.',
  notesPlaceholder: 'Write your note…',
  notesTitlePlaceholder: 'Title',
  notesDelete: 'Delete note',
  notesAutosaved: 'Autosaved on this device',
  workflowIdeas: 'Ideas',
  workflowInProduction: 'In production',
  workflowReview: 'Review',
  workflowScheduled: 'Scheduled',
  workflowPublished: 'Published',
  workflowFailed: 'Failed',
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
  connectFacebook: 'Connect Facebook Page',
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
landingHeroLine1: 'The All-in-One Creator Engine',
  landingHeroLine2: 'For Socials, Storefronts & Community.',
  landingHeroLine3: 'Monetize Every Click.',
  navFeatures: 'Features',
  navPricing: 'Pricing',
  navCommunities: 'Explore Communities',
  logInShort: 'Log in',
  getStartedShort: 'Get started',
  pillarsEyebrow: 'Value Pillars',
  pillarsHeadline: 'Everything you need to grow.',
  pillarsSub: 'Plan content, sell products, and keep your community engaged — in one Nordic studio.',
  pillarPlanTitle: 'Plan & Post',
  pillarPlanSub: 'Multi-brand social media planner & analytics board.',
  pillarPlanP1: 'Visual calendar',
  pillarPlanP2: 'Cross-platform scheduling',
  pillarPlanP3: 'Deep analytics',
  pillarSellTitle: 'Sell & Convert',
  pillarSellSub: 'Instant bio storefront with fast checkout.',
  pillarSellP1: '1-Tap Mobile Checkout',
  pillarSellP2: 'Digital products',
  pillarSellP3: 'Custom storefronts',
  pillarEngageTitle: 'Engage & Retain',
  pillarEngageSub: 'Gamified community, classroom & live events.',
  pillarEngageP1: 'Hosted courses',
  pillarEngageP2: 'Paid memberships',
  pillarEngageP3: 'Live streams',
  mostPopular: 'Most Popular',
  whyChooseUsSub: 'One unified OS replacing 5+ separate subscriptions, complex logins, and hidden fees.',
  fragmentedStack: 'Fragmented Tool Stack',
  fragmentedStackSub: 'Multiple single-feature apps',
  allInOneWinner: 'All-in-One Winner',
  metricPaymentOptions: 'Payment Options',
  metricCreatorTools: 'Creator Tools',
  compareOldCost: '~$100–$250 / mo stacked fees',
  compareNewCost: 'From $0 / mo',
  compareOldPay: 'Limited gateways, high checkout friction',
  compareNewPay: 'Mobile · Cards · Apple Pay',
  compareOldVat: 'Manual calculations & messy bookkeeping',
  compareNewVat: 'Automated Nordic VAT & Accounting Sync',
  compareOldTools: 'Disconnected bio links, schedulers & tools',
  compareNewTools: 'Bio Link · Content Planner · Tagging Built-in',
  compareFooter: 'Save over $2,000 / year and 10+ hours a week by consolidating your creator stack.',
  featureLabel: 'Feature',
  pricingEyebrow: 'Simple & Transparent Pricing',
  pricingHeadline: 'Everything in one place.',
  pricingHeadlineAccent: 'Save hours & 80% on your stack.',
  pricingSub: 'Consolidate social planning, bio link storefront, community, courses, and email CRM into one unified dashboard — at a fraction of the cost.',
  pricingSaveHours: 'Save 15+ hours/mo',
  pricingSaveMoney: 'Save 2,000+ SEK/mo',
  pricingZeroFee: '0% Platform Fee Option',
  pricingMonthly: 'Monthly',
  pricingYearly: 'Yearly',
  pricingSave17: 'Save 17%',
  planStarter: 'Starter',
  planStarterSub: 'Perfect for launching your first digital product or bio link without fixed costs.',
  planFreeForever: 'Free forever',
  planBilledMonthly: 'Billed monthly',
  planStarterCta: 'Start Free Forever',
  planCreator: 'Creator',
  planCreatorSub: 'Everything you need to sell, post, and grow your community — cancel anytime.',
  planCreatorSubYearly: 'Billed annually (1,990 SEK/yr) — Save 17%',
  planCreatorCta: 'Start 14-Day Free Trial →',
  planPro: 'Pro/Agency',
  planProSub: 'For high-earning creators, educators, and multi-brand agencies scaling up.',
  planProSubYearly: 'Billed annually (6,990 SEK/yr) — Save 17%',
  planProCta: 'Choose Pro/Agency',
  planProBadge: '0% Platform Fee',
  sekPerMo: 'SEK / mo',
  pricingTrustCancel: 'Cancel anytime with 1-click',
  pricingTrustSecurity: 'BankID & Bank-grade security',
  pricingTrustMigration: 'Free migration support',
  planF0: '8% Transaction Fee on Sales (No monthly sub)',
  planF1: '1 Social Set & Bio Link Storefront',
  planF2: '1 Free Community (Up to 25 members)',
  planF3: 'Sell digital products & downloads',
  planF4: '1-Tap Mobile Checkout',
  planF5: 'Basic Analytics & Email CRM',
  planF6: '1 seat in your workspace',
  planC0: 'Everything in Starter, plus…',
  planC1: 'Unlimited Community Members',
  planC2: 'Full Social Content Planner & Kanban',
  planC3: 'Bio Link Storefront & 1-Tap Checkout',
  planC4: 'Classroom Courses & Video Hosting (25 GB)',
  planC5: 'Email CRM & Broadcasts (2,500 contacts)',
  planC6: 'Reduced 2.5% Platform Fee',
  planC7: '2 seats in your workspace for teammates',
  planC8: 'Social Inbox & Instagram DMs',
  planP0: 'Everything in Creator, plus…',
  planP1: '0% Platform Fee (Keep 100% revenue)',
  planP2: 'Multiple Communities & 3 Workspaces',
  planP3: '5 seats in workspace (+99 kr per extra)',
  planP4: 'Custom Domain Linking (yourname.se)',
  planP5: 'AI Content & Member Copilot Suite',
  planP6: 'Priority 1:1 Onboarding & Support',
  planP7: 'Social Inbox & Instagram DMs included',
  discoverExplore: 'Discover & Explore',
  findNordicCommunity: 'Find your next',
  findNordicCommunityAccent: 'Nordic community',
  discoverSub: 'Explore high-value communities, masterclasses, and digital hubs created by leading creators across Scandinavia.',
  allCategoriesPill: 'All Categories',
  communityOfWeek: 'Community of the Week',
  trendingCommunities: 'Trending Communities',
  membershipFee: 'Membership Fee',
  cancelAnytimeReady: 'Cancel anytime · Instant access',
  instantAccessBadge: 'Instant Access',
  coursesIncluded: '12 Courses Included',
  reviewsLabel: '4.9 · 128 reviews',
  joinArrow: 'Join →',
  clearFilterShort: 'Clear filter',
  noCommunitiesMatch: 'No communities match',
  showAllShort: 'Show all',
  faqFilterAll: 'All Questions',
  faqFilterPayments: 'Payments & Checkout',
  faqFilterCommunity: 'Community & Migration',
  faqFilterVat: 'VAT & Accounting',
  faqFilterWorkspace: 'Workspace & Domain',
  faqStillQuestion: 'Still have a question?',
  faqStillSub: 'Our Nordic creator support team is here to help you move over smoothly.',
  faqContactSupport: 'Contact Support Team',
  faqDomainQ: 'Can I link my own custom domain (e.g., yourname.se)?',
  faqDomainA: 'Absolutely! You can use our default short links or connect your own domain (e.g., hub.yourdomain.se) with automated SSL certificates included on Pro/Agency plans.',
  faqBusinessQ: 'Do I need a registered business to start selling?',
  faqBusinessA: 'No! You can launch as an individual creator or sole proprietor using Mobile BankID verification. As your sales grow, you can update business profile details, VAT ID, or company information in settings.',
  featuresTryAdmin: 'Try in Admin Dashboard →',
  featuresLivePreview: 'Live Admin Preview',
  getStartedEyebrow: 'Get started',
  footerProduct: 'Product',
  footerAccount: 'Account',
  footerLegal: 'Legal',
  footerSupport: 'Support',
  footerBlurb: 'Engineered by creators, for creators. We built the all-in-one studio we wished existed for our own agency.',
  footerBuiltFor: 'Built for creators worldwide. Founded in Sweden.',
  footerRights: 'All rights reserved.',
  footerBanking: 'BankID-ready · Instant checkout · Nordic VAT (6%/25%)',
  legalIntegritet: 'Privacy Policy',
  legalGdpr: 'GDPR & Data',
  legalVillkor: 'Terms of Service',
  legalCookies: 'Cookie Policy',
  backToHomeShort: '← Back to home',
  adminNavPlanner: 'Planner',
  adminNavMedia: 'Media Library',
  adminNavInbox: 'Inbox',
  adminNavAnalytics: 'Analytics',
  adminNavBio: 'Bio Store',
  adminNavCommunity: 'Community',
  adminNavEmail: 'Email CRM',
  adminNavSettings: 'Settings',
  peekIn: 'Peek in',
  openArrow: 'Open →',
  pinnedBadge: 'Pinned',
  writeCommentPlaceholder: 'Write a comment...',
  loadingFeed: 'Loading feed...',
  pointsLabel: 'Points',
  communitiesStat: 'communities',
  refAndEarn: 'Ref & Earn',
  invitedCount: 'Invited',
  earnedSek: 'SEK earned',
  bonusXp: 'Bonus XP',
  accountEyebrow: 'Account',
  authenticating: 'Authenticating…',
  liveStreamBadge: 'LIVE STREAM',
  aiCourseAssistant: 'AI Course Assistant',
  aiCourseAssistantSub: 'Ask anything about your lessons',
  ruleBeRespectful: 'Be respectful 🤝',
  ruleNoSpam: 'No spam',
  ruleLanguages: 'Swedish / English',
  ruleHelpEachOther: 'Help each other',
  tagQuestions: '#Questions',
  tagInspiration: '#Inspiration',
  tagResults: '#Results',
  tagTips: '#Tips',
  tagMilestone: '#Milestone',
  classShort: 'Class',
  adminShort: 'Admin',
  primaryMobileNav: 'Primary mobile',
  lastUpdated: 'Last updated:',
  legalEyebrow: 'Legal',
  signingOut: 'Signing out…',
  eventsHeroHeadline: 'Live Events & Webinars',
  eventsHeroSub: 'Join live sessions, RSVP, and connect with the community in real time.',
  totalRegistered: 'Total registered',
  comeBackSoon: 'Come back soon!',
  mins: 'MIN',
  eventChat: 'Event Chat',
  streamStartsSoon: 'Stream starting soon',
  updatesEvery3s: 'Updates every 3s',
  currencySek: 'SEK',
  coursesInCommunity: 'Courses in {name}',
  pickCourseHint: 'Pick a course to get started',
  loadingCommunity: 'Loading community…',
  communityNotFound: 'Community not found',
  teamMembersAria: 'Team members',
  editPost: 'Edit post',
  createSchedulePost: 'Create / Schedule post',
  crossPostDesc:
    'Cross-post to Instagram, TikTok, LinkedIn and YouTube — with live preview.',
  crossPosting: 'Cross-posting',
  youtubeSettings: 'YouTube settings',
  videoTitleLabel: 'Video title',
  youtubeTitlePlaceholder: 'Title shown on YouTube',
  privacyStatus: 'Privacy status',
  publishAsShorts: 'Publish as YouTube Shorts',
  videoCategory: 'Video category',
  tagsLabel: 'Tags',
  tagsPlaceholder: 'e.g. shorts, tips, ecommerce',
  separateWithCommas: 'Separate with commas',
  emojiBtn: 'Emoji',
  polishWithAi: 'Rewrite with AI',
  captionPlaceholder: 'Write your caption…',
  dateAndTime: 'Date & time',
  saveDraft: 'Save draft',
  publishNow: 'Publish now',
  schedulePost: 'Schedule',
  captionPreviewPlaceholder: 'Your caption appears here…',
  newPostDefault: 'New post',
  analyticsAndRevenue: 'Analytics & revenue',
  analyticsOverview: 'Revenue',
  analyticsAudience: 'Audience',
  analyticsPosts: 'Posts',
  analyticsReels: 'Reels',
  analyticsStories: 'Stories',
  analyticsHashtags: 'Hashtags',
  analyticsLinkinBio: 'Link in bio',
  analyticsMonthlyReports: 'Monthly Reports',
  postDetailTitle: 'Post analytics',
  postDetailClose: 'Close',
  postDetailOpenOriginal: 'Open original',
  postDetailEngagementMix: 'Engagement mix',
  postDetailNoImage: 'No preview',
  exportLabel: 'Export',
  last7Days: '7 days',
  kpiRevenueCheckout: 'Revenue (Checkout)',
  kpiFollowers: 'Followers',
  totalFollowersAll: 'Total followers',
  followersPerAccount: 'Followers per account',
  shareOfAudience: 'Share of audience',
  kpiBioStoreCvr: 'Bio Store CVR',
  kpiPlannedPosts: 'Planned posts',
  performanceCheckoutTitle: 'Performance & checkout revenue',
  performanceCheckoutSub: 'Daily revenue in SEK over the last week',
  chartRevenue: 'Revenue',
  chartVisitors: 'Visitors',
  topBioProductsTitle: 'Top products in Bio Store',
  topBioProductsSub: 'Clicks, conversion and checkout revenue',
  newProduct: 'New product',
  colProduct: 'Product',
  colCategory: 'Category',
  colClicks: 'Clicks',
  colConversion: 'Conversion',
  colRevenue: 'Revenue',
  colStatus: 'Status',
  reach7d: 'Reach (7d)',
  postPerformance: 'Post performance',
  reelPerformance: 'Reel performance',
  storyPerformance: 'Story performance',
  hashtagAnalysis: 'Hashtag analysis',
  linkinBioAnalyticsTitle: 'Link in bio',
  clicksTotalBioUtm: '{n} clicks total · Bio Store UTM',
  addProductsForLinkPerf: 'Add products in Bio Store to see link performance.',
  uniqueCol: 'Unique',
  linkInBioSub: 'Bio Store link performance · {range}',
  linkInBioTopLink: 'Top link',
  linkInBioClickShare: 'Click share',
  linkInBioConversionHint: 'Unique visitors who clicked through',
  linkInBioUniqueRate: 'Unique rate',
  copyCommunityLink: 'Copy link',
  communityLinkCopied: 'Copied',
  communityAccessEmailSent:
    'We emailed you a link to join {community}. Check your inbox.',
  communityAccessEmailNote:
    'Buyers get an automated email with a direct link to this community after purchase.',
  emailAutomations: 'Community emails',
  emailAutomationsSub:
    'Purchase unlocks and automated emails sent to community members',
  automationActive: 'Active',
  automationPaused: 'Paused',
  automationTrigger: 'Trigger',
  automationSent: 'Sent',
  automationLastSent: 'Last sent',
  automationPause: 'Pause',
  automationResume: 'Resume',
  noAutomationsYet: 'No automations yet — add one to welcome members or send purchase emails.',
  communityEmailsRecent: 'Recent sends',
  communityEmailsEmpty: 'No community automation emails yet for this workspace',
  purchaseAccessEmail: 'Purchase → community',
  memberAutoEmail: 'Member automation',
  automationRules: 'Automation rules',
  addAutomation: 'Add automation',
  editAutomation: 'Edit automation',
  saveAutomation: 'Save automation',
  automationName: 'Name',
  automationSubject: 'Subject',
  automationBody: 'Email body',
  automationDescription: 'Description',
  automationSaved: 'Automation saved',
  deleteAutomation: 'Delete',
  deleteAutomationConfirm: 'Delete this automation? This cannot be undone.',
  automationDeleted: 'Automation deleted',
  settingsNavProfile: 'Profile',
  settingsNavNotifications: 'Notifications',
  settingsNavIntegrations: 'Integrations',
  settingsOrg: 'Organization',
  settingsNavGeneral: 'General',
  settingsNavMembers: 'Members',
  settingsNavSpaces: 'Workspaces',
  settingsNavTags: 'Tags',
  settingsNavBranding: 'Branding',
  settingsNavWorkflows: 'Workflows',
  settingsNavBilling: 'Billing',
  settingsNavAi: 'AI usage',
  settingsWorkspaces: 'Workspaces',
  settingsSearchWorkspaces: 'Search workspaces',
  settingsNewWorkspace: 'New workspace',
  settingsUpdateProfile: 'Update profile information.',
  settingsCalendar: 'Calendar',
  settingsCalendarSub: 'Update your calendar preferences.',
  settingsWeekStart: 'What day of the week should your calendar start on?',
  settingsMonday: 'Monday',
  settingsSunday: 'Sunday',
  settingsSecurity: 'Security',
  settingsNewPassword: 'New password',
  settingsNewPasswordHint: 'Update your account password.',
  settingsReset: 'Reset',
  settingsEnable2fa: 'Enable two-factor authentication',
  settingsEnable2faSub: 'Add an extra layer of security to your clikd: account.',
  settingsManage2fa: 'Manage 2FA',
  settings2faOn: '2FA is on for this account.',
  settingsContact: 'Contact',
  settingsNewEmail: 'New email',
  settingsNewEmailHint: 'Update your account email. We’ll send a confirmation link.',
  settingsLogOut: 'Log out',
  settingsDeleteAccount: 'Delete account',
  settingsNotificationsSub: 'Choose what you want to hear about.',
  settingsComingSoon: 'More controls coming soon.',
  settingsBillingSub: 'Plan & social sets for {handle}',
  settingsPlanActive: 'Active',
  settingsSocialSetsTitle: 'Social sets',
  settingsSocialSetsHint: 'Each Social Set groups profiles for one brand workspace on clikd:.',
  settingsManageSocials: 'Manage social accounts',
  settingsClose: 'Close settings',
  flashDisplayNameSaved: 'Display name saved',
  flashPasswordUpdated: 'Password updated',
  flash2faEnabled: '2FA enabled',
  flash2faDisabled: '2FA disabled',
  flashEmailConfirm: 'Confirmation email sent',
  flashDeleteConfirm: 'Account deletion requires confirmation',
  notifNewMembers: 'New community members',
  notifPurchases: 'Product purchases',
  notifAutomations: 'Email automation sends',
  notifLiveReminders: 'Live event reminders',
  notifWeeklyDigest: 'Weekly email digest',
  notifWeeklyDigestHint:
    'Once a week we send a summary of approved notification types to your account email.',
  notifInAppHint:
    'Checked items appear in the bell menu in the admin header. Uncheck to mute that category.',
  notifSampleNewMembers: '3 new members joined Creator Lab',
  notifSamplePurchase: 'E-book purchase: Creator Starter Pack',
  notifSampleAutomation: 'Broadcast open rate hit 62%',
  notifSampleLive: 'Live reminder: session starts in 1 hour',
  notifEmpty: 'No notifications right now — turn categories on in Settings.',
  notifPrefsSaved: 'Notification preferences saved',
  settingsIntegrationsSub:
    'Overview of social spaces and accounts authorized via API. Manage each connection here.',
  settingsIntegrationsOverview: 'Connected platforms',
  settingsApiAuthorized: 'Authorized · API ✓',
  settingsApiNotConnected: 'Not connected',
  settingsConnectedAt: 'Connected {date}',
  settingsNoSocialsYet: 'No platforms connected yet for this workspace.',
  settingsWorkspacesSub:
    'All social spaces on your account — team members, roles, and channels.',
  settingsWorkspaceMembers: 'Team members',
  settingsWorkspaceRole: 'Role',
  settingsWorkspaceChannels: 'Channels',
  settingsAddWorkspace: 'Add workspace',
  settingsNoMembers: 'No teammates on this workspace yet.',
  settingsWorkflowsSub:
    'Automated emails and workflows that run for your communities and store.',
  settingsWorkflowActive: 'Active',
  settingsWorkflowPaused: 'Paused',
  settingsWorkflowSent: '{n} sent',
  settingsWorkflowLastSent: 'Last sent {date}',
  settingsNoWorkflows: 'No workflows yet — create them in Email CRM.',
  settingsOpenEmailCrm: 'Open Email CRM',
  settingsPaymentMethod: 'Payment method',
  settingsPaymentStripe: 'Billed securely via Stripe',
  settingsCardOnFile: 'Visa ending in 4242',
  settingsRenewalDate: 'Next renewal',
  settingsRenewalHint: 'Your plan renews automatically unless cancelled.',
  settingsBillingPortal: 'Manage billing in Stripe',
  settingsSubscriptions: 'Subscriptions',
  settingsSubscriptionsSub: 'Manage your subscriptions',
  settingsManageSubscriptions: 'Manage Subscriptions',
  settingsPlanSince: 'Starter plan since {date}',
  settingsTrialEnds: 'Free trial ends {date}',
  settingsBillingMembers: 'Members',
  settingsUnitPrice: 'Unit price',
  settingsBillingInterval: 'Billing interval',
  settingsNextInvoice: 'Next invoice date',
  settingsFirstCharge: 'First charge excl. tax',
  settingsBillingDetails: 'Billing details',
  settingsBillingDetailsSub: 'Contact information and payment method on file.',
  settingsEdit: 'Edit',
  settingsPaymentMethodLabel: 'Payment method',
  settingsCardMastercard: 'Mastercard credit card ending in 4242 · Stripe',
  settingsNoTaxId: 'No tax identifier on file',
  settingsAddTaxId: 'Add tax ID',
  settingsInvoiceHistory: 'Invoice history',
  settingsInvoiceHistorySub: 'Your most recent invoices.',
  settingsInvoiceTrial: 'Free trial period for 1 × clikd: Starter',
  settingsIntervalYear: 'Year',
  settingsIntervalMonth: 'Month',
  settingsAvailablePlans: 'Available plans',
  settingsMembersSub: 'Manage your organization members · {n} seat',
  settingsInviteMember: 'Invite member',
  settingsAllSpaces: 'All spaces',
  settingsRoleAdmin: 'Admin',
  settingsRoleEditor: 'Editor',
  settingsRoleApprover: 'Approver',
  settingsRoleViewer: 'Viewer',
  settingsInviteTitle: 'Invite a teammate',
  settingsInviteHint: 'They’ll get an email with access to the spaces you choose.',
  settingsInviteSend: 'Send invite',
  settingsInviteSent: 'Invite sent',
  settingsMemberPending: 'Pending',
  settingsOrgTitle: 'Organization',
  settingsOrgSub: 'Manage organization settings and shared configuration.',
  settingsSpaceAccess: 'Space access',
  accountMenuTitle: 'Account',
  accountMenuWorkspace: 'Workspace',
  accountMenuRole: 'Role',
  accountMenuCreator: 'Creator',
  accountMenuSettingsBilling: 'Settings & billing',
  accountMenuProfileBio: 'Profile & bio',
  paymentsActive: 'Payments Active ✓',
  notificationsTitle: 'Notifications',
  aiCopilotTitle: 'AI Copilot',
  activeBlocksTitle: 'Active blocks',
  activeBlocksSub: 'Buttons, products, e-books & social links. Drag to reorder.',
  addLinkOrProduct: 'Add Link / Product',
  linksAndLeadMagnets: 'Links & lead magnets',
  noLinksYet: 'No links yet',
  storeProductsTitle: 'Store products',
  noStoreProductsYet: 'No store products yet',
  sentBroadcastsTitle: 'Sent broadcasts',
  sentBroadcastsSub: 'History with open & click stats — click for details',
  noBroadcastsYet: 'No broadcasts yet',
  communityAccessLabel: 'Community access',
  communityAccessHint: 'Give buyers access to one of your communities after purchase',
  whichCommunity: 'Which community?',
  yesLabel: 'Yes',
  noLabel: 'No',
  unlocksLabel: 'Unlocks',
  statusLabel: 'Status',
  optionalLabel: 'Optional',
  mergeTagsHint:
    'Merge tags: {first_name}, {name}, {email}, {community}, {community_url}',
  socialInboxEyebrow: 'Instagram',
  socialInboxTitle: 'Inbox',
  socialInboxSub: 'Your Instagram DMs · {workspace}',
  inboxZero: 'No Instagram DMs yet',
  instagramDmsTitle: 'Instagram DMs',
  instagramDmsHint: 'Direct messages from your connected Instagram',
  instagramDmReplyPlaceholder: 'Reply on Instagram…',
  instagramDmSend: 'Send reply',
  instagramNotConnected: 'Connect Instagram to this social space',
  statusLive: 'Live',
  statusPaused: 'Paused',
  performanceChartAria: 'Performance chart',
  bioTabDesign: 'Design & Theme',
  bioTabBlocks: 'Blocks & Links',
  bioTabAnalytics: 'UTM Analytics',
  bioTabSettings: 'Settings',
  liveStudioPreview: 'Live Studio Preview',
  presetsCount: '8 Presets',
  themeMidnight: 'Midnight Glass',
  themeMidnightBlurb: 'Dark mesh + frosted glass',
  themeChampagne: 'Champagne Luxe',
  themeChampagneBlurb: 'Warm silk + gold accents',
  themeAurora: 'Aurora Glow',
  themeAuroraBlurb: 'Indigo / purple glow',
  themeNordic: 'Nordic Minimal',
  themeNordicBlurb: 'Clean white + crisp slate',
  mockLinkWelcomeSub: 'Welcome to my world',
  mockLinkStudioTitle: 'Clikd Studio',
  mockLinkStudioSub: 'The place to be',
  mockLinkCoaching: '1:1 Coaching',
  mockLinkCoachingSub: 'Book a call',
  yourInfo: 'Your info',
  fieldRequired: 'This field is required',
  validEmail: 'Enter a valid email',
  validPhone: 'Enter a valid phone number',
  selectOption: 'Select…',
  cardApplePay: 'Card / Apple Pay',
  chooseImageType: 'Choose a JPG, PNG, or WebP image.',
  maxFileSize5mb: 'Max file size is 5 MB.',
  uploadFailedRetry: 'Upload failed. Try again.',
  variantHintFrosted: 'Blur + glass',
  variantHintSolid: 'Bold slate',
  variantHintLuxe: 'White card',
  variantHintMinimal: 'Outline only',
  fontHintJakarta: ' — Modern Clean',
  fontHintPlayfair: ' — Editorial Luxury',
  fontHintSpace: ' — Tech / Web3',
  fontHintDefault: ' — Minimal Functional',
  linkInBio: 'Link in Bio',
  publishChanges: 'Publish Changes',
  publishedCheck: 'Published',
  openPublicBioTitle: 'Open your public link-in-bio in a new tab',
  exclusiveThemes: 'Exclusive Themes',
  exclusiveThemesSub: 'Luxury preset selector with live swatches',
  headerCoverBanner: 'Header & Cover Banner',
  hdCoverPhoto: 'HD Cover Photo',
  optionalBannerAbove: 'Optional banner above avatar',
  coverImage: 'Cover image',
  uploadBannerHint: 'Upload a banner from your device',
  avatarShape: 'Avatar shape',
  shapeCircle: 'Circle',
  shapeSquircle: 'Squircle',
  verifiedBadge: 'Verified badge',
  verifiedBadgeHint: 'Indigo checkmark on avatar',
  socialIconsLayout: 'Social icons layout',
  socialLayoutHeader: 'Header row',
  socialLayoutDock: 'Bottom dock',
  canvasBackground: 'Canvas & Background',
  backgroundType: 'Background type',
  bgSolidMesh: 'Solid / Mesh',
  bgHdImage: 'HD Image',
  bgLiquid: 'Liquid Gradient',
  meshGradient: 'Mesh gradient',
  meshGradientHint: 'Layered color blobs on canvas',
  primaryTintColor: 'Primary tint color',
  backgroundImage: 'Background image',
  uploadCanvasBgHint: 'Upload a full-canvas background from your device',
  textIconColor: 'Text & icon color',
  mutedTextColor: 'Muted text',
  typographyLabel: 'Typography',
  exclusiveBlockDesigns: 'Exclusive Block Designs',
  blockVariant: 'Block variant',
  variantFrosted: 'Frosted Glass',
  variantSolid: 'Solid Color',
  variantLuxe: 'Luxe Silk',
  variantMinimal: 'Minimal Border',
  blockBackground: 'Block background',
  blockTextColor: 'Block text',
  cornerCurvature: 'Corner curvature',
  radiusCurved: 'Curved',
  radiusSharp: 'Sharp',
  radiusPill: 'Pill',
  hoverEffect: 'Hover effect',
  hoverLift: 'Lift & glow',
  hoverShimmer: 'Border shimmer',
  hoverScale: 'Scale up',
  replaceImage: 'Replace image',
  uploadFromDevice: 'Upload from device',
  noImageYet: 'No image yet',
  imageFormatHint: 'JPG, PNG or WebP · Max 5 MB',
  titleAndMedia: 'Title & Media',
  platformsCol: 'Platforms',
  quickEdit: 'Quick Edit',
  noPostsMatchFilter: 'No posts match the filter.',
  today: 'Today',
  previous: 'Previous',
  postItNote: 'Post-it',
  addPostIt: 'Add post-it',
  moreNotes: 'more note(s)',
  morePosts: 'more',
  editReminder: 'Edit reminder',
  newReminder: 'New reminder',
  colorLabel: 'Color',
  saveNote: 'Save note',
  notePlaceholder: 'e.g. Film B-roll, remind the team, caption deadline…',
  dayMon: 'Mon',
  dayTue: 'Tue',
  dayWed: 'Wed',
  dayThu: 'Thu',
  dayFri: 'Fri',
  daySat: 'Sat',
  daySun: 'Sun',
  oneTapCheckout: '1-Tap Checkout',
  secureCheckout: 'Secure checkout',
  closeCheckout: 'Close checkout',
  paymentConfirmed: 'Payment confirmed!',
  redirectingTo: 'Redirecting to {destination} in {seconds}s…',
  continueNow: 'Continue now',
  payInstantly: 'Pay instantly · {amount} SEK',
  waitingForLive: 'Waiting for live…',
  yourNamePlaceholder: 'Your name',
  loadingCalendar: 'Loading calendar…',
  statScheduled: 'Scheduled',
  statDrafts: 'Drafts',
  statPublished: 'Published',
  createSchedulePostBtn: 'Create / Schedule Post',
  copilotIdeas: 'Ideas',
  copilotCaption: 'Caption',
  copilotHashtags: 'Hashtags',
  copilotHooks: 'Hooks',
  copilotSaved: 'Saved ideas',
  copilotIdeasHint: 'Get 3 unique post ideas with captions per platform.',
  copilotCaptionHint: 'Write or polish a caption from your brief.',
  copilotHashtagsHint: 'Suggest relevant hashtags for your topic.',
  copilotHooksHint: 'Scroll-stoppers and openers for Reels / Shorts.',
  copilotSavedHint:
    'Your saved ideas, captions and hooks — ready to open in Post Studio.',
  writeCaptionShort: 'Write caption',
  courseContentHint: 'course content',
  yourPurchaseHint: 'your purchase',
  liveEventHint:
    "The broadcast hasn't started yet — keep this link bookmarked.",
  publishOrSave: 'Publish / Save',
  allTeamWorkspaces: 'All team workspaces',
  emailBodyPlaceholder: 'Write your email… Drop an image into the text where it should appear.',
  socialSpaces: 'Social Spaces',
  linkGoogleCalendar: 'Link Google Calendar',
  calendarFilter: 'Filter',
  eventsCount: '{count} events',
  viewMonth: 'Month',
  viewWeek: 'Week',
  viewDay: 'Day',
  viewList: 'List',
  noContentTasksHappening: 'No content or tasks currently happening',
  adminNavProjects: 'Projects',
  projectsTitle: 'Projects',
  projectsSub: 'Campaign labels for {name} — tag posts when you create or schedule them.',
  createProject: 'New project',
  newProject: 'New project label',
  projectNamePlaceholder: 'e.g. Summer Launch 2026',
  projectDescPlaceholder: 'Short description of this campaign…',
  noProjectsYet: 'No projects yet',
  selectProjectHint: 'Create a project folder to organize and plan linked content',
  projectsFoldersHint: 'Projects — open a folder to plan its content',
  visionboardEyebrow: 'Inspiration',
  visionboardTitle: 'Visionboard',
  visionboardSub: 'Pin reference images that define the look and feel of this project.',
  visionboardUpload: 'Upload image',
  visionboardFromLibrary: 'From media library',
  visionboardEmpty: 'Drop inspiration here — upload or pick from your library',
  visionboardNotePlaceholder: 'Optional note for the next pin…',
  visionboardUntitled: 'Untitled pin',
  visionboardSaveFailed: 'Could not save visionboard',
  visionboardImagesOnly: 'Only images can be pinned to the visionboard',
  visionboardLibraryEmpty: 'No images in your media library yet',
  linkedPosts: 'linked posts',
  noPostsInProject: 'No content tagged with this project yet. Tag posts in Post Studio.',
  deleteProjectConfirm: 'Delete this project label? Posts keep their content but lose this tag.',
  deleteProjectTitle: 'Delete project?',
  deleteProjectPermanentCheckbox: 'I understand this project will be permanently removed',
  campaignLabels: 'Project labels',
  campaignLabelsHint: 'Tag this post with campaigns it belongs to',
  createMediaFolder: 'New folder',
  newMediaFolder: 'New media folder',
  mediaFolderNamePlaceholder: 'e.g. Product shots',
  mediaFolderDescPlaceholder: 'What belongs in this folder…',
  noMediaFoldersYet: 'No folders yet',
  selectMediaFolderHint: 'Select a folder to browse images and videos',
  mediaFolderSub: 'Organize creatives for {name}',
  noMediaInFolder: 'No images or videos in this folder yet.',
  deleteMediaFolderTitle: 'Delete folder?',
  deleteMediaFolderConfirm: 'Media in this folder will be removed from the library.',
  deleteMediaFolderPermanentCheckbox: 'I understand this folder will be permanently removed',
  mediaLibraryRoot: 'Brand assets',
  mediaLibraryRootDesc: 'All images and videos across your media library — organize them in folders below.',
  audienceGender: 'Gender',
  audienceAge: 'Age',
  audienceDemographics: 'Demographics',
  audienceActiveTimes: 'Active times',
  audienceGenderWomen: 'Women',
  audienceGenderMen: 'Men',
  audienceGenderOther: 'Other',
  audienceTopCountries: 'Top countries',
  audienceTopCities: 'Top cities',
  audienceActiveTimesHint: 'When your audience is most active (local time)',
  audienceLocation: 'Location',
  demographicsUnavailable:
    'Demographics need an Instagram Business/Creator account with 100+ followers and insight permissions. Reconnect Instagram under Settings → Socials, then refresh.',
  demographicsFromViewers: 'Based on accounts that viewed / engaged with your content',
  demographicsFromFollowers: 'Based on your Instagram followers',
  demographicsAllPlatforms: 'All platforms',
  demographicsPlatformStatus: 'Sources',
  audienceLessActive: 'Less',
  audienceMoreActive: 'More',
  analyticsTab: 'Analytics',
  metricReach: 'Reach',
  metricViews: 'Views',
  metricLikes: 'Likes',
  metricComments: 'Comments',
  metricShares: 'Shares',
  metricSaves: 'Saves',
  metricEngagementRate: 'Engagement rate',
  engagementSummaryTitle: 'Engagement summary',
  engagementSummarySub: 'Likes, comments, shares and saves across all content',
  totalEngagement: 'Total engagement',
  engagementRateHint: 'Average engagement rate for {name} · {range}',
  engagementRateTrend: '{delta} vs previous period',
  engagementRateFormula: 'Engagement ÷ reach × 100',
  pctOfEngagement: '{n}% of engagement',
  dateRange1Week: '1 week',
  dateRange1Month: '1 month',
  dateRange3Months: '3 months',
  dateRange1Year: '1 year',
  dateRange2Years: '2 years',
  dateRangeCustom: 'Custom dates',
  dateRangeFrom: 'From',
  dateRangeTo: 'To',
  dateRangeApply: 'Apply',
  dateRangePresets: 'Quick ranges',
  bestPerformingPosts: 'Best performing',
  mostViewedPosts: 'Most viewed content',
  bestPerformingSub: 'Highest engagement rate in this period',
  mostViewedSub: 'Highest impressions in this period',
  postsPerformanceCompare: 'Comparing post performance · {range}',
  reelsPerformanceCompare: 'Comparing reel performance · {range}',
  storiesPerformanceCompare: 'Comparing story performance · {range}',
  metricImpressions: 'Impressions',
  metricPlays: 'Plays',
  hashtagsUsedTitle: 'Hashtags you used',
  hashtagsUsedSub: 'Performance of tags in your content · {range}',
  hashtagUses: 'Uses',
  hashtagReach: 'Reach',
  hashtagTrend: 'Trend',
  hashtagsUnique: 'Unique tags',
  hashtagsAvgLift: 'Avg. reach lift',
  hashtagsTaggedPosts: 'Tagged posts',
  aiHashtagIdeasTitle: 'AI hashtag ideas',
  aiHashtagIdeasSub: 'Fresh sets for upcoming content, based on what already works for you',
  aiHashtagGenerate: 'Generate ideas',
  aiHashtagGenerating: 'Generating…',
  aiHashtagCopySet: 'Copy set',
  aiHashtagCopied: 'Copied',
  aiHashtagSetFor: 'For {topic}',
  hashtagColTag: 'Hashtag',
  hashtagColPosts: 'Posts',
  toastChooseImage: 'Please choose an image',
  toastChooseImageFile: 'Please choose an image file',
  toastUploadFailed: 'Upload failed',
  toastLogoUpdated: 'Logo updated',
  toastFaviconUpdated: 'Favicon updated',
  toastBrandingSaveFailed: 'Could not save branding to database',
  toastProfilePhotoUpdated: 'Profile photo updated',
  toastProfilePhotoUploadFailed: 'Could not upload profile photo',
  toastTimezoneSaveFailed: 'Could not save timezone',
  toastNotifPrefsSaveFailed: 'Could not save notification preferences',
  toastDeleteAccountFailed: 'Could not delete account — contact support',
  orgBrandingTitle: 'Organization branding',
  orgBrandingSub: 'Name and assets shown across your creator brand.',
  orgNameLabel: 'Organization name',
  orgLogoLabel: 'Organization logo',
  orgLogoHint: 'Square PNG/JPG recommended.',
  orgFaviconLabel: 'Favicon',
  uploadLogo: 'Upload logo',
  uploadFavicon: 'Upload favicon',
  profilePhotoLabel: 'Profile photo',
  uploadingEllipsis: 'Uploading…',
  timezoneLabel: 'Timezone',
  timezoneHint: 'Used for calendars, reports, and scheduled posts.',
  notifInAppTitle: 'In-App Notifications (Bell)',
  notifInAppBellHint: 'Bell alerts in Creator Admin',
  notifEmailTitle: 'Email Notifications',
  deleteAccountTitle: 'Delete account?',
  deleteAccountBody:
    'This permanently deletes your account and workspace data. Type DELETE to confirm.',
  deleteAccountConfirmPlaceholder: 'Type DELETE',
  deleteAccountConfirm: 'Delete account',
  closeAria: 'Close',
  aiUsageThisMonth: 'This month',
  aiUsageWordsUsed: 'words used',
  aiUsageGateTitle: 'AI usage',
  aiUsageGateBody: 'Track your monthly AI word allowance for this workspace.',
  toastSelectWorkspaceBeforeConnect: 'Select a workspace before connecting an account',
  toastSocialConnected: '{platform} connected successfully!',
  toastPopupBlocked: 'Popup blocked — allow popups for this site and try again',
  toastConnectionFailed: 'Connection failed',
  toastCouldNotConnect: 'Could not connect {platform}',
  toastAccountDisconnected: 'Account disconnected successfully',
  toastDisconnectNetworkError: 'Network error while disconnecting account',
  toastTikTokSessionExpired: 'TikTok session expired — reconnect your account',
  toastTikTokSwitchFailed: 'Could not switch TikTok account',
  connectMetaAccountsTitle: 'Connect Meta accounts',
  connectMetaAccountsSub:
    'Connect Instagram and Facebook separately, or link both in one Meta Suite login.',
  resyncMetaWebhooks: 'Re-sync Meta Webhooks',
  connectTikTokTitle: 'Connect TikTok Account',
  connectTikTokSub:
    'Link TikTok Business for ads, inbox, and advertiser access. After connecting, your account status shows here.',
  demoModeSimulatedTitle: 'Demo Mode — simulated OAuth',
  demoModeSimulatedSub:
    'Turn Demo Mode off to use live Instagram, Facebook, TikTok, YouTube, LinkedIn, and Pinterest connections.',
  toastPickScheduleFirst: 'Pick a schedule date & time first',
  toastConnectIgFbSettings: 'Connect Instagram, Facebook, or TikTok under Settings → Socials first',
  toastConnectSocialSettings: 'Connect the selected platforms under Settings → Socials first',
  toastCaptionRequired: 'Add a caption before saving or publishing',
  toastTikTokNeedsMedia: 'TikTok needs a photo or video. Upload media before publishing or scheduling.',
  toastPostedSuccess: 'Posted',
  toastSavedScheduled: 'Saved & scheduled',
  studioActions: 'Actions',
  studioPublish: 'Publish',
  studioSaveOptions: 'Save options',
  createBrandWorkspaceTitle: 'Create new Team Workspace / Brand',
  createBrandWorkspaceSub:
    'Create a workspace for a brand or team with its own channels and content.',
  brandWorkspaceNameLabel: 'Brand / Team Workspace Name',
  brandWorkspaceNamePlaceholder: 'e.g. "Acme Brand Scandinavia"',
  socialHandleLabel: 'Social Media Handle',
  socialHandlePlaceholder: 'e.g. "@acme_official"',
  connectedChannelsLabel: 'Connected Channels',
  toastWorkspaceActivated: '“{name}” activated',
  toastWorkspaceCreateFailed: 'Could not create workspace',
  toastWorkspaceSaveFailed: 'Could not save workspace to database',
  toastWorkspaceDeleteFailed: 'Could not delete workspace in database',
  toastBioSaveFailed: 'Could not save bio to database',
  toastLessonProgressFailed: 'Could not save lesson progress',
  pickLessonHint: 'Pick a lesson on the left',
  toastCourseSaved: 'Course saved',
  toastCommunityRequired: 'Select a community first',
  classroomEmptyAdminTitle: 'No courses yet',
  classroomEmptyAdminBody: 'Create your first course for this community.',
  toastOfferTitleRequired: 'Offer title is required',
  toastOfferPriceRequired: 'Enter a valid price',
  toastOfferCommunityRequired: 'Community is required',
  toastCsvImportSuccess: 'Imported {count} subscribers',
  toastCsvImportFailed: 'CSV import failed',
  toastFolderRenamed: 'Folder renamed',
  toastFolderRenameFailed: 'Could not rename folder',
  toastFolderCreated: 'Folder created',
  toastFolderCreateFailed: 'Could not create folder',
  toastFolderDeleted: 'Folder deleted',
  toastFolderDeleteFailed: 'Could not delete folder',
  toastReorderProjectsFailed: 'Could not reorder projects',
  toastReorderFoldersFailed: 'Could not reorder folders',
  toastSelectWorkspaceBeforeConnectShort: 'Select a workspace before connecting',
  toastAllowPopupsConnect: 'Allow popups to connect social accounts',
  toastCreateProjectFailed: 'Could not create project',
  toastHashtagsAdded: 'Hashtags added',
  toastAddHashtagsFirst: 'Add hashtags first',
  toastSavedToFavourites: 'Saved to favourites',
  toastUpdatePlanFailed: 'Could not update plan',
  toastPostedToCommunity: 'Posted to community',
  toastCommentFailed: 'Could not add comment',
  toastPostDeleted: 'Post deleted',
  toastPostUpdated: 'Post updated',
  toastOfferAddTitle: 'Add an offer title',
  toastOfferEnterPriceSek: 'Enter a price in SEK (use 0 for free)',
  toastOfferNeedCommunity: 'Create a community before adding store offers',
  toastAddEmailAddress: 'Add at least one email address',
  toastUploadCsvFirst: 'Upload a CSV with at least one valid email first',
  toastUploadCsvOnly: 'Please upload a .csv file',
  toastNoValidEmailsCsv: 'No valid emails found in that CSV',
  toastCsvReadFailed: 'Could not read that CSV',
  toastCommunityUnlocked: 'Community dashboard unlocked for this workspace',
  toastCourseNeedCommunity: 'Select a community before saving a course',
  toastFileUploaded: 'File uploaded',
  toastFileDeleted: 'File deleted',
  toastFileDeleteFailed: 'Could not delete file',
  toastGoogleDisconnected: 'Google account disconnected',
  toastGoogleDisconnectFailed: 'Could not disconnect Google',
  toastSelectWorkspaceFirst: 'Select a workspace first',
  toastProjectUpdated: 'Project updated',
  toastProjectUpdateFailed: 'Could not update project',
  toastProjectGoalSaved: 'Project goal saved',
  toastProjectGoalSaveFailed: 'Could not save project goal',
  toastStripeConnectUpdated: 'Stripe Connect updated — you can request a payout when ready',
  toastStripeFinishOnboarding: 'Finish Stripe Connect onboarding to enable payouts',
  toastBankAlreadyConnected: 'Bank account already connected',
  toastFrozenReportCreated: 'Frozen report created',
  toastAutomationSaved: 'Automation settings saved',
  toastReportDeleted: 'Report deleted',
  toastShareLinkCopied: 'Share link copied',
  toastSelectFileFirst: 'Select at least one file',
  toastDriveImportNoFile: 'Drive import returned no file',
  toastAutomationDeleted: 'Automation rule deleted successfully',
  toastLiveDiagnosticPassed: 'Live diagnostic passed — Comment-to-DM stack looks ready.',
  toastSaveFailed: 'Save failed',
  toastPublishFailed: 'Publish failed',
  toastPlanSwitched: 'Switched to {plan}',
  toastCouldNotPost: 'Could not post',
  toastCouldNotSaveOffer: 'Could not save offer',
  toastCsvContactsFound: 'Found {count} contact(s)',
  toastCouldNotSaveCourse: 'Could not save course',
  toastLinkMediaFolderFailed: 'Could not link media folder',
  toastCreateMediaFolderFailed: 'Could not create media folder',
  toastLinkedMediaFolder: 'Linked “{name}” to this project',
  toastCreatedLinkedFolder: 'Created and linked “{name}”',
  toastRevenueLoadFailed: 'Revenue failed to load',
  toastStripeConnectStartFailed: 'Could not start Stripe Connect',
  toastConnectFailed: 'Connect failed',
  toastBuildFailed: 'Build failed',
  toastDeleteFailed: 'Delete failed',
  toastMaxFilesPerPost: 'Max {count} files per post',
  toastExtraFilesSkipped: 'Only {count} files per post — extra files skipped',
  toastRuleUpdated: 'Rule updated',
  toastCommentToDmCreated: 'Comment-to-DM rule created',
  toastToggleFailed: 'Toggle failed',
  toastDeleteAutomationFailed: 'Failed to delete automation',
  toastNoRecentIgComments: 'No recent Instagram comments found.',
  toastFetchedIgComments: 'Fetched {count} comment(s) from Instagram.',
  toastFetchCommentsFailed: 'Could not fetch comments',
  inboxTabAutomations: 'Automations',
  inboxSync: 'Sync',
  inboxSyncIssue:
    'Instagram sync issue: {error}. Try Sync, or reconnect under Settings → Socials.',
  inboxDmNeedPerms: 'Instagram DMs need messaging permissions',
  inboxReconnectIg: 'Reconnect Instagram',
  inboxAll: 'All',
  inboxTikTokDemo: 'TikTok (Demo)',
  inboxAllMessages: 'All Messages',
  inboxDms: 'DMs',
  inboxComments: 'Comments',
  inboxSearchConversations: 'Search conversations…',
  inboxSyncing: 'Syncing…',
  inboxNoMatches: 'No matches',
  inboxNoDms: 'No DMs yet',
  inboxNoComments: 'No comments yet',
  inboxEmpty: 'Inbox is empty',
  inboxTryAnotherSearch: 'Try another search term.',
  inboxTapSync: 'Tap Sync to refresh connected inboxes.',
  inboxComment: 'Comment',
  inboxProfile: 'Profile',
  inboxNoMessagesInThread: 'No messages in this thread yet',
  inboxMediaSoon: 'Media replies coming soon',
  inboxAttachMedia: 'Attach media',
  inboxAiQuickReply: 'AI quick reply',
  inboxReplyTikTok: 'Reply on TikTok…',
  inboxWriteReply: 'Write a reply…',
  inboxReplyComment: 'Reply to comment…',
  inboxSelectConversation: 'Select a conversation',
  dmKpiActiveTriggers: 'Active Triggers',
  dmKpiRules: '{n} Rules',
  dmKpiDmsSent: 'DMs Sent This Month',
  dmKpiDms: '{n} DMs',
  dmKpiStorefrontClicks: 'Storefront Clicks',
  dmKpiClicks: '{n} Clicks',
  dmKpiConversion: 'Conversion Rate',
  dmTitle: 'Comment-to-DM Automations',
  dmSub: 'When someone comments a keyword, Clikd sends your DM + storefront link.',
  dmResyncWebhooks: 'Re-sync Meta Webhooks',
  dmCreateRule: 'Create new rule',
  dmDevTools: 'Developer tools & diagnostics (optional)',
  dmRunLiveDebug: 'Run live diagnostic',
  dmTestAutomation: 'Test automation',
  dmFetchComments: 'Fetch latest comments',
  dmSelectRecentComment: 'Select a recent Instagram comment',
  dmFetchCommentsFirst: 'Fetch comments first…',
  dmPickComment: 'Choose a comment…',
  dmCommentIdLabel: 'Instagram Comment ID (optional for live DM test)',
  dmCommentIdPlaceholder: 'e.g. 17912345678901234',
  dmRunLiveTestDm: 'Run live test DM',
  dmDiagnosticTitle: 'Live Comment-to-DM Diagnostic',
  dmAllChecksPassed: 'All checks passed',
  dmIssuesFound: 'Issues found — see checklist + Meta errors below',
  dmDismiss: 'Dismiss',
  dmCheckToken: 'Instagram token valid',
  dmCheckWebhooks: 'Meta webhooks subscribed (comments, messages)',
  dmCheckRules: 'Active automation rules found in database',
  dmCheckPayload: 'Private reply Graph API payload formatted correctly',
  dmFixPrefix: 'Fix:',
  dmLiveReplyResult: 'Live Private Reply Result',
  dmEmptyHeadline: 'No automation rules yet',
  dmEmptyDesc:
    'Create a keyword trigger so Instagram comments auto-send a DM with your Clikd storefront link.',
  dmEmptyCta: 'Create Comment-to-DM rule',
  dmActive: 'Active',
  dmPaused: 'Paused',
  dmPauseAria: 'Pause automation',
  dmActivateAria: 'Activate automation',
  dmEdit: 'Edit',
  dmDelete: 'Delete',
  dmDeleteConfirm: 'Delete this automation rule?',
  dmDmsSentClicks: '{dms} DMs sent · {clicks} clicks',
  dmRetry: 'Retry',
  dmLoadFailed: 'Could not load automations:',
  dmUnknownError: 'Unknown error',
  dmClose: 'Close',
  dmModalEyebrow: 'Comment-to-DM',
  dmEditRule: 'Edit rule',
  dmCreateRuleTitle: 'Create Comment-to-DM rule',
  dmFieldTitle: 'Title',
  dmTitlePlaceholder: 'Masterclass keyword',
  dmFieldKeywords: 'Trigger keywords (comma-separated)',
  dmFieldDm: 'Direct message',
  dmFieldButton: 'Button label',
  dmFieldStorefront: 'Clikd storefront link',
  dmPublicReplyToggle: 'Also post an automatic public comment reply',
  dmSaveChanges: 'Save changes',
  dmCreateRuleBtn: 'Create rule',
  dmJustNow: 'just now',
  dmMinsAgo: '{n} min ago',
  dmHoursAgo: '{n} h ago',
  dmDaysAgo: '{n} d ago',
  dmUnknownUser: '@unknown',
  dmEmptyComment: '(empty)',
  dmInvalidCommentId:
    'Please enter a valid numeric Instagram Comment ID to send a live test Private Reply.',
  dmDefaultMessage:
    'Hi! Thanks for your comment. Here is the direct link to my new Masterclass:',
  dmDefaultCta: 'Open storefront',
  dmDefaultPublicReply: 'Check your DMs!',
  toastUpdateProjectLinkFailed: 'Could not update project link',
  toastUploadedFromDevice: 'Uploaded from your device',
  toastMovedToFolder: 'Moved to {dest}',
  toastMoveFileFailed: 'Could not move file',
  toastDeletedFromLibrary: 'Deleted from media library',
  toastUploadedToFolder: 'Uploaded to folder',
  toastImportedFile: 'Imported {name}',
  toastInviteResent: 'Invite resent to {email}',
  toastConnectionFailedDetail: 'Connection failed: {error}',
  adsEyebrow: 'Meta · Ads',
  adsManagerTitle: 'Ads Manager',
  adsManagerSub: 'Campaigns, ad sets & creatives',
  adsCreateCampaign: 'Create campaign',
  adsSyncMeta: 'Sync Meta',
  adsDemoData: 'Demo data',
  adsPerformance: 'Performance',
  adsPerformanceSub: 'Spend, conversions, ROAS & CPC for the selected range.',
  adsLast7Days: 'Last 7 days',
  adsLast30Days: 'Last 30 days',
  adsSpend: 'Spend',
  adsConversions: 'Conversions',
  adsRoas: 'ROAS',
  adsCpc: 'CPC',
  adsTrend: '{metric} trend',
  adsNoInsightData: 'No insight data for this range yet.',
  adsCampaigns: 'Campaigns',
  adsAdSets: 'Ad Sets',
  adsAds: 'Ads',
  adsClearFilter: 'Clear filter',
  adsStatus: 'Status',
  adsCampaign: 'Campaign',
  adsAdSet: 'Ad set',
  adsAd: 'Ad',
  adsDailyBudget: 'Daily budget',
  adsImpressions: 'Impressions',
  adsClicks: 'Clicks',
  adsActive: 'Active',
  adsPaused: 'Paused',
  adsNoCampaigns: 'No campaigns yet — create one or sync from Meta.',
  adsNoAdSets: 'No ad sets for this filter.',
  adsNoAds: 'No ads for this filter.',
  adsLoading: 'Loading Ads Manager…',
  adsSave: 'Save',
  adsDelivery: 'Delivery',
  adsDeliveryActiveHint: 'Currently delivering on Meta',
  adsDeliveryPausedHint: 'Paused — not spending',
  adsPerformanceSection: 'Performance',
  adsSettings: 'Settings',
  adsObjective: 'Objective',
  adsTargeting: 'Targeting',
  adsHeadline: 'Headline',
  adsCreative: 'Creative',
  adsNoCreative: 'No creative preview',
  adsParentCampaign: 'Campaign',
  adsParentAdSet: 'Ad set',
  adsAdAccount: 'Ad account',
  adsViewAdSets: 'View ad sets',
  adsViewAds: 'View ads',
  adsSaveBudget: 'Save budget',
  adsDetailsCampaign: 'Campaign details',
  adsDetailsAdSet: 'Ad set details',
  adsDetailsAd: 'Ad details',
  adsMetaSyncNote:
    'Changes sync to Meta when Facebook is connected with ads permissions; demo rows update locally.',
  adsToastActive: 'Set to Active',
  adsToastPaused: 'Paused',
  adsToastBudget: 'Daily budget updated',
  adsBudgetHint: 'Amount Meta can spend per day for this {kind}.',
  adsFromDate: 'From',
  adsCreateTitle: 'Create campaign',
  adsStepObjective: 'Objective',
  adsStepAudience: 'Audience & retargeting',
  adsStepCreative: 'Creative',
  adsCampaignName: 'Campaign name',
  adsDailyBudgetLabel: 'Daily budget ({currency})',
  adsContinue: 'Continue',
  adsCancel: 'Cancel',
  adsBack: 'Back',
  adsCreateSubmit: 'Create campaign',
  adsAiCopywriter: 'AI Copywriter',
  adsCreativeSources: 'Add from your device, Media Library, or Google Drive.',
  adsFromDevice: 'From device',
  adsMediaLibrary: 'Media Library',
  adsDropCreative: 'Drop an image or video here',
  adsOrChooseSource: 'Or choose a source below',
  adsRemove: 'Remove',
  adsSelected: '{kind} selected',
  adsObjSales: 'Sales',
  adsObjLeads: 'Leads',
  adsObjTraffic: 'Traffic',
  adsObjEngagement: 'Engagement',
  adsObjSalesBlurb: 'Drive purchases & checkout completions.',
  adsObjLeadsBlurb: 'Collect emails, waitlists & form fills.',
  adsObjTrafficBlurb: 'Send people to your store or bio link.',
  adsObjEngagementBlurb: 'Boost post & Reel interactions.',
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
  trustPillCheckout: '⚡ Inbyggd snabbcheckout',
  trustPillVat: '🧾 Automatisk Fortnox & moms',
  trustPillAi: '🤖 3× AI Copilots ingår',
  trustPillSocial: '📅 Planner, Bio & Social Sets',
  whyChooseUs: 'Varför välja oss',
  whyChooseUsHeadline: 'Sluta jonglera flera plattformar',
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
  suiteEyebrow: 'Creator Admin',
  suiteHeadline: 'Din kompletta Creator Command Center',
  suiteSub:
    'Byt ut fem splittrade abonnemang mot en samlad studio. Direktpublicering, bio-storefront, community och e-post-CRM — med 100 % dataägande.',
  suitePlannerTitle: 'Kalender & Planner',
  suitePlannerSummary:
    'Schemalägg och auto-posta innehåll över dina Social Set-profiler med Kanban- och kalendervy.',
  suiteBioTitle: 'Bio Link Builder',
  suiteBioSummary:
    'Egna teman, UTM-spårning, digitala produkter och 1-trycks mobilcheckout.',
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
  suiteCommunityTitle: 'Community & kurser',
  suiteCommunitySummary:
    'Medlemsflöden, moderation, kurser, storefront, live-event och XP-leaderboards.',
  suiteEmailTitle: 'E-post CRM & Broadcasts',
  suiteEmailSummary:
    'Prenumerantkatalog, automatiska utskick, taggar och engagemangsspårning på Resend.',
  suiteTrustCreators: 'Betrodd av 500+ nordiska kreatörer & byråer',
  suiteTrustBankId: 'BankID & Stripe-verifierad',
  suiteTrustOwnership: '100 % dataägande',
  suiteTrustPayouts: 'Direktutbetalning till bank',
  suiteTrustApis: 'Officiella Meta- & TikTok-API:er',
  suitePublishTitle: 'Automatisk publicering på flera plattformar',
  suitePublishSummary:
    'Schemalägg och publicera videor direkt till TikTok, Instagram Reels och Facebook på sekunder. Inbyggda OAuth-scopes — inga manuella utkast eller push-godkännanden.',
  suitePublishBadge: 'Direct Publishing API',
  suiteTikTokDirect: 'TikTok Direct Post aktiv',
  suiteInstagramReel: 'Instagram Auto-Reel',
  suiteDirectApiStatus: '100 % Direct API Status ✓',
  suiteEmailFooterVerified: 'Resend-verifierad',
  suiteEmailInboxRate: '99,8 % inbox-garanti',
  suiteInboxTrigger: 'Auto kommentar-till-DM',
  suiteBioCheckout: '1-trycks Swish- & kortcheckout',
  suiteCommunityXp: 'Gamifierad medlemsyta & XP',
  suiteAdsNew: 'NYTT',
  suiteAdsTitle: 'Meta Ads Manager & ROAS',
  suiteAdsSummary:
    'Lansera Facebook- och Instagram-kampanjer direkt från studion med realtids-ROAS och konverteringsattribution.',
  suiteAdsFooter: 'Kampanj-ROAS i realtid',
  suiteReportsTitle: 'Djupgående analytics & intäktsrapporter',
  suiteReportsSummary:
    'Räckvidd, videovisningar, impressions, publikväxt, Linkin.bio och total Swish- & kortförsäljning — samlat i en vy.',
  suiteReportsReach: 'Räckvidd: 94,2K',
  suiteReportsViews: 'Visningar: 186,4K',
  suiteReportsFollowers: '+842 följare',
  suiteReportsFooter: 'Fullständiga cross-platform-rapporter',
  suiteOwnershipBadge: '100 % DATAÄGANDE & INGEN INLÅSNING',
  suiteOwnershipHeadline:
    'Du äger din business. Exportera medlemmar, kurser och försäljning när som helst.',
  suiteOwnershipSub:
    'Ingen plattformsinlåsning. 1-klicks CSV/JSON för medlemslistor, transaktioner och e-postkontakter.',
  suiteCtaStudio: 'Starta din gratis studio →',
  suiteGuaranteeExportTitle: '1-klicks full export',
  suiteGuaranteeExportBody: 'Ladda ner all CSV/JSON-data utan begränsningar, när som helst.',
  suiteGuaranteeStripeTitle: 'Stripe Connect Express',
  suiteGuaranteeStripeBody: 'Direktutbetalning till ditt bankkonto med BankID.',
  suiteGuaranteeMigrationTitle: 'White-glove-migrering',
  suiteGuaranteeMigrationBody: 'Gratis 1:1-stöd när du flyttar aktiva medlemmar från Skool eller Stan Store.',
  suiteGuaranteePricingTitle: 'Transparent prissättning',
  suiteGuaranteePricingBody: '0 % eller låg plattformsavgift — inga dolda kostnader.',
  roiEyebrow: 'ROI-kalkylator',
  roiHeadline: 'Uppskatta din månadsintäkt från din community',
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
  faqPaymentsQ: 'Hur fungerar mobilbetalningar?',
  faqPaymentsA:
    'Medlemmar betalar med mobilbetalning i kassan — ofta under 10 sekunder. Pengarna kopplas till ditt creator-konto.',
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
    'Ja. Byt Active Social Set i Creator Admin. Planer skalar från Starter (1 set / 8 profiler) till Creator och Pro/Agency.',
  faqImportQ: 'Kan jag importera medlemmar från Facebook eller Skool?',
  faqImportA:
    'Ja. Importera via e-postlistor och bjud in dem till din nya community. De loggar in med e-post eller BankID.',
  faqPayoutQ: 'När får jag utbetalning?',
  faqPayoutA:
    'Intäkter syns i Analytics och betalas ut enligt payout-schemat. Följ status utan att jaga Stripe-rapporter.',
  faqTrialQ: 'Finns det en gratisplan?',
  faqTrialA: 'Starter är gratis för alltid. Creator och Pro/Agency kan startas när du är redo — ingen lång bindningstid.',
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
    'Social Sets, Bio Builder, post-tagging, analytics, community, checkout och AI — inbyggt från start.',
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
  notesTab: 'Notes',
  notesTitle: 'Notes',
  notesHint: 'Skriv ner idéer, påminnelser och utkast för den här workspacen.',
  notesNew: 'Ny anteckning',
  notesUntitled: 'Namnlös anteckning',
  notesEmpty: 'Inga anteckningar än. Skapa en för att komma igång.',
  notesPlaceholder: 'Skriv din anteckning…',
  notesTitlePlaceholder: 'Titel',
  notesDelete: 'Radera anteckning',
  notesAutosaved: 'Autosparas på den här enheten',
  workflowIdeas: 'Ideer',
  workflowInProduction: 'I produktion',
  workflowReview: 'Granskning',
  workflowScheduled: 'Schemalagt',
  workflowPublished: 'Publicerat',
  workflowFailed: 'Misslyckades',
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
  connectFacebook: 'Anslut Facebook-sida',
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
landingHeroLine1: 'The All-in-One Creator Engine',
  landingHeroLine2: 'För socialt, storefronts & community.',
  landingHeroLine3: 'Tjäna på varje klick.',
  navFeatures: 'Funktioner',
  navPricing: 'Priser',
  navCommunities: 'Utforska Communities',
  logInShort: 'Logga in',
  getStartedShort: 'Kom igång',
  pillarsEyebrow: 'Value Pillars',
  pillarsHeadline: 'Allt du behöver för att växa.',
  pillarsSub: 'Planera innehåll, sälj produkter och engagera din community — i en nordisk studio.',
  pillarPlanTitle: 'Plan & Post',
  pillarPlanSub: 'Multi-brand social planner & analytics.',
  pillarPlanP1: 'Visuell kalender',
  pillarPlanP2: 'Schemaläggning över plattformar',
  pillarPlanP3: 'Djup analytics',
  pillarSellTitle: 'Sell & Convert',
  pillarSellSub: 'Direkt bio-storefront med snabb checkout.',
  pillarSellP1: '1-trycks mobilcheckout',
  pillarSellP2: 'Digitala produkter',
  pillarSellP3: 'Anpassade storefronts',
  pillarEngageTitle: 'Engage & Retain',
  pillarEngageSub: 'Gamifierad community, classroom & live events.',
  pillarEngageP1: 'Hostade kurser',
  pillarEngageP2: 'Betalda medlemskap',
  pillarEngageP3: 'Live streams',
  mostPopular: 'Mest populär',
  whyChooseUsSub: 'Ett enhetligt OS som ersätter 5+ separata abonnemang, krångliga inloggningar och dolda avgifter.',
  fragmentedStack: 'Fragmenterad verktygsstack',
  fragmentedStackSub: 'Flera enfunktionella appar',
  allInOneWinner: 'Allt-i-ett-vinnare',
  metricPaymentOptions: 'Betalningsalternativ',
  metricCreatorTools: 'Creator-verktyg',
  compareOldCost: '~$100–$250 / mån staplade avgifter',
  compareNewCost: 'Från $0 / mån',
  compareOldPay: 'Begränsade gateways, hög friktion',
  compareNewPay: 'Mobil · Kort · Apple Pay',
  compareOldVat: 'Manuell beräkning & rörig bokföring',
  compareNewVat: 'Automatisk nordisk moms & bokföringssynk',
  compareOldTools: 'Frånkopplade bio-länkar, schedulers & verktyg',
  compareNewTools: 'Bio Link · Content Planner · Tagging inbyggt',
  compareFooter: 'Spara över $2,000 / år och 10+ timmar i veckan genom att konsolidera din creator-stack.',
  featureLabel: 'Funktion',
  pricingEyebrow: 'Enkel & transparent prissättning',
  pricingHeadline: 'Allt på ett ställe.',
  pricingHeadlineAccent: 'Spara timmar & 80% på din stack.',
  pricingSub: 'Samla social planering, bio-storefront, community, kurser och e-post-CRM i en dashboard — till en bråkdel av kostnaden.',
  pricingSaveHours: 'Spara 15+ timmar/mån',
  pricingSaveMoney: 'Spara 2,000+ SEK/mån',
  pricingZeroFee: '0% plattformsavgift',
  pricingMonthly: 'Månadsvis',
  pricingYearly: 'Årsvis',
  pricingSave17: 'Spara 17%',
  planStarter: 'Starter',
  planStarterSub: 'Perfekt för att lansera din första digitala produkt eller bio-länk utan fasta kostnader.',
  planFreeForever: 'Gratis för alltid',
  planBilledMonthly: 'Faktureras månadsvis',
  planStarterCta: 'Börja gratis för alltid',
  planCreator: 'Creator',
  planCreatorSub: 'Allt du behöver för att sälja, posta och växa din community — avsluta när som helst.',
  planCreatorSubYearly: 'Faktureras årsvis (1,990 SEK/år) — Spara 17%',
  planCreatorCta: 'Starta 14 dagars gratis trial →',
  planPro: 'Pro/Agency',
  planProSub: 'För high-earning creators, educators och multi-brand-byråer som skalar upp.',
  planProSubYearly: 'Faktureras årsvis (6,990 SEK/år) — Spara 17%',
  planProCta: 'Välj Pro/Agency',
  planProBadge: '0% plattformsavgift',
  sekPerMo: 'SEK / mån',
  pricingTrustCancel: 'Avsluta när som helst med 1 klick',
  pricingTrustSecurity: 'BankID & banknivå-säkerhet',
  pricingTrustMigration: 'Gratis migrationssupport',
  planF0: '8% transaktionsavgift på försäljning (ingen månadsavgift)',
  planF1: '1 Social Set & Bio Link Storefront',
  planF2: '1 gratis community (upp till 25 medlemmar)',
  planF3: 'Sälj digitala produkter & nedladdningar',
  planF4: '1-trycks mobilcheckout',
  planF5: 'Grundläggande Analytics & Email CRM',
  planF6: '1 plats i ditt workspace',
  planC0: 'Allt i Starter, plus…',
  planC1: 'Obegränsat antal community-medlemmar',
  planC2: 'Full Social Content Planner & Kanban',
  planC3: 'Bio Link Storefront & 1-trycks checkout',
  planC4: 'Classroom-kurser & videohosting (25 GB)',
  planC5: 'Email CRM & Broadcasts (2,500 kontakter)',
  planC6: 'Reducerad 2,5% plattformsavgift',
  planC7: '2 platser i ditt workspace för teammedlemmar',
  planC8: 'Social Inbox & Instagram-DM:ar',
  planP0: 'Allt i Creator, plus…',
  planP1: '0% plattformsavgift (behåll 100% av intäkterna)',
  planP2: 'Flera communities & 3 workspaces',
  planP3: '5 platser i workspace (+99 kr per extra)',
  planP4: 'Egen domän (dittnamn.se)',
  planP5: 'AI Content & Member Copilot Suite',
  planP6: 'Prioriterad 1:1 onboarding & support',
  planP7: 'Social Inbox & Instagram-DM:ar ingår',
  discoverExplore: 'Upptäck & utforska',
  findNordicCommunity: 'Hitta din nästa',
  findNordicCommunityAccent: 'nordiska community',
  discoverSub: 'Utforska high-value communities, masterclasses och digitala hubbar från ledande creators i Skandinavien.',
  allCategoriesPill: 'Alla kategorier',
  communityOfWeek: 'Veckans community',
  trendingCommunities: 'Trending communities',
  membershipFee: 'Medlemsavgift',
  cancelAnytimeReady: 'Avsluta när som helst · Direkt access',
  instantAccessBadge: 'Direkt access',
  coursesIncluded: '12 kurser ingår',
  reviewsLabel: '4.9 · 128 recensioner',
  joinArrow: 'Gå med →',
  clearFilterShort: 'Rensa filter',
  noCommunitiesMatch: 'Inga communities matchar',
  showAllShort: 'Visa alla',
  faqFilterAll: 'Alla frågor',
  faqFilterPayments: 'Betalningar & Checkout',
  faqFilterCommunity: 'Community & migrering',
  faqFilterVat: 'Moms & bokföring',
  faqFilterWorkspace: 'Workspace & domän',
  faqStillQuestion: 'Har du fortfarande en fråga?',
  faqStillSub: 'Vårt nordiska creator-supportteam hjälper dig att flytta över smidigt.',
  faqContactSupport: 'Kontakta support',
  faqDomainQ: 'Kan jag koppla egen domän (t.ex. dittnamn.se)?',
  faqDomainA: 'Absolut! Använd våra standardlänkar eller koppla egen domän (t.ex. hub.dindomän.se) med automatiskt SSL på Pro/Agency-planer.',
  faqBusinessQ: 'Behöver jag ett registrerat företag för att börja sälja?',
  faqBusinessA: 'Nej! Du kan starta som enskild creator med BankID. När försäljningen växer kan du uppdatera företagsprofil, momsregistreringsnummer eller bolagsuppgifter i inställningarna.',
  featuresTryAdmin: 'Testa i Admin Dashboard →',
  featuresLivePreview: 'Live Admin Preview',
  getStartedEyebrow: 'Kom igång',
  footerProduct: 'Produkt',
  footerAccount: 'Konto',
  footerLegal: 'Juridik',
  footerSupport: 'Support',
  footerBlurb: 'Engineered by creators, for creators. We built the all-in-one studio we wished existed for our own agency.',
  footerBuiltFor: 'Byggd för creators världen över. Grundad i Sverige.',
  footerRights: 'Alla rättigheter förbehållna.',
  footerBanking: 'BankID-redo · Snabbcheckout · Nordisk moms (6%/25%)',
  legalIntegritet: 'Integritetspolicy',
  legalGdpr: 'GDPR & Data',
  legalVillkor: 'Användarvillkor',
  legalCookies: 'Cookie Policy',
  backToHomeShort: '← Tillbaka till startsidan',
  adminNavPlanner: 'Planner',
  adminNavMedia: 'Mediabibliotek',
  adminNavInbox: 'Inbox',
  adminNavAnalytics: 'Analytics',
  adminNavBio: 'Bio Store',
  adminNavCommunity: 'Community',
  adminNavEmail: 'Email CRM',
  adminNavSettings: 'Inställningar',
  peekIn: 'Kika in',
  openArrow: 'Öppna →',
  pinnedBadge: 'Fäst',
  writeCommentPlaceholder: 'Skriv en kommentar...',
  loadingFeed: 'Laddar feed...',
  pointsLabel: 'Poäng',
  communitiesStat: 'communities',
  refAndEarn: 'Ref & Earn',
  invitedCount: 'Inbjudna',
  earnedSek: 'SEK intjänat',
  bonusXp: 'Bonus XP',
  accountEyebrow: 'Konto',
  authenticating: 'Autentiserar…',
  liveStreamBadge: 'LIVE STREAM',
  aiCourseAssistant: 'AI-kursassistent',
  aiCourseAssistantSub: 'Fråga vad som helst om dina lektioner',
  ruleBeRespectful: 'Var respektfull 🤝',
  ruleNoSpam: 'Ingen spam',
  ruleLanguages: 'Svenska / Engelska',
  ruleHelpEachOther: 'Hjälp varandra',
  tagQuestions: '#Frågor',
  tagInspiration: '#Inspiration',
  tagResults: '#Resultat',
  tagTips: '#Tips',
  tagMilestone: '#Milstolpe',
  classShort: 'Klass',
  adminShort: 'Admin',
  primaryMobileNav: 'Primär mobilnavigering',
  lastUpdated: 'Senast uppdaterad:',
  legalEyebrow: 'Juridiskt',
  signingOut: 'Loggar ut…',
  eventsHeroHeadline: 'Live Events & Webbinarier',
  eventsHeroSub: 'Delta i livesessioner, OSA och koppla upp dig med communityn i realtid.',
  totalRegistered: 'Anmälda totalt',
  comeBackSoon: 'Kom tillbaka snart!',
  mins: 'MIN',
  eventChat: 'Eventchatt',
  streamStartsSoon: 'Streamen startar snart',
  updatesEvery3s: 'Uppdateras var 3s',
  currencySek: 'SEK',
  coursesInCommunity: 'Kurser i {name}',
  pickCourseHint: 'Välj en kurs för att komma igång',
  loadingCommunity: 'Laddar community…',
  communityNotFound: 'Communityt hittades inte',
  teamMembersAria: 'Teammedlemmar',
  editPost: 'Redigera inlägg',
  createSchedulePost: 'Skapa / Schemalägg inlägg',
  crossPostDesc:
    'Cross-posta till Instagram, TikTok, LinkedIn och YouTube — med live-förhandsvisning.',
  crossPosting: 'Cross-posting',
  youtubeSettings: 'YouTube-inställningar',
  videoTitleLabel: 'Videotitel',
  youtubeTitlePlaceholder: 'Titel som syns på YouTube',
  privacyStatus: 'Integritetsstatus',
  publishAsShorts: 'Publicera som YouTube Shorts',
  videoCategory: 'Videokategori',
  tagsLabel: 'Taggar',
  tagsPlaceholder: 't.ex. shorts, tips, ehandel',
  separateWithCommas: 'Separera med komma',
  emojiBtn: 'Emoji',
  polishWithAi: 'Formulera om med AI',
  captionPlaceholder: 'Skriv din bildtext…',
  dateAndTime: 'Datum & tid',
  saveDraft: 'Spara utkast',
  publishNow: 'Publicera nu',
  schedulePost: 'Schemalägg',
  captionPreviewPlaceholder: 'Din caption visas här…',
  newPostDefault: 'Nytt inlägg',
  analyticsAndRevenue: 'Analys & intäkter',
  analyticsOverview: 'Intäkter',
  analyticsAudience: 'Publik',
  analyticsPosts: 'Inlägg',
  analyticsReels: 'Reels',
  analyticsStories: 'Stories',
  analyticsHashtags: 'Hashtags',
  analyticsLinkinBio: 'Länk i bio',
  analyticsMonthlyReports: 'Månadsrapporter',
  postDetailTitle: 'Inläggsanalys',
  postDetailClose: 'Stäng',
  postDetailOpenOriginal: 'Öppna original',
  postDetailEngagementMix: 'Engagement-fördelning',
  postDetailNoImage: 'Ingen förhandsvisning',
  exportLabel: 'Exportera',
  last7Days: '7 dagar',
  kpiRevenueCheckout: 'Intäkter (Checkout)',
  kpiFollowers: 'Följare',
  totalFollowersAll: 'Totalt antal följare',
  followersPerAccount: 'Följare per konto',
  shareOfAudience: 'Andel av publiken',
  kpiBioStoreCvr: 'Bio Store CVR',
  kpiPlannedPosts: 'Planerade inlägg',
  performanceCheckoutTitle: 'Prestanda & checkout-intäkter',
  performanceCheckoutSub: 'Dagliga intäkter i SEK under senaste veckan',
  chartRevenue: 'Intäkter',
  chartVisitors: 'Besökare',
  topBioProductsTitle: 'Topprodukter i Bio Store',
  topBioProductsSub: 'Klick, konvertering och checkout-intäkt',
  newProduct: 'Ny produkt',
  colProduct: 'Produkt',
  colCategory: 'Kategori',
  colClicks: 'Klick',
  colConversion: 'Konvertering',
  colRevenue: 'Intäkt',
  colStatus: 'Status',
  reach7d: 'Räckvidd (7d)',
  postPerformance: 'Inläggsprestanda',
  reelPerformance: 'Reel-prestanda',
  storyPerformance: 'Story-prestanda',
  hashtagAnalysis: 'Hashtag-analys',
  linkinBioAnalyticsTitle: 'Länk i bio',
  clicksTotalBioUtm: '{n} klick totalt · Bio Store UTM',
  addProductsForLinkPerf: 'Lägg till produkter i Bio Store för att se länkprestanda.',
  uniqueCol: 'Unika',
  linkInBioSub: 'Bio Store-länkprestanda · {range}',
  linkInBioTopLink: 'Topplänk',
  linkInBioClickShare: 'Klickandel',
  linkInBioConversionHint: 'Unika besökare som klickade vidare',
  linkInBioUniqueRate: 'Unik andel',
  copyCommunityLink: 'Kopiera länk',
  communityLinkCopied: 'Kopierad',
  communityAccessEmailSent:
    'Vi har mejlat dig en länk till {community}. Kolla inkorgen.',
  communityAccessEmailNote:
    'Köpare får ett automatiskt mejl med en direktlänk till communityt efter köpet.',
  emailAutomations: 'Community-mejl',
  emailAutomationsSub:
    'Köp som låser upp community och automationer till medlemmar',
  automationActive: 'Aktiv',
  automationPaused: 'Pausad',
  automationTrigger: 'Utlösare',
  automationSent: 'Skickade',
  automationLastSent: 'Senast skickad',
  automationPause: 'Pausa',
  automationResume: 'Återuppta',
  noAutomationsYet: 'Inga automationer ännu — lägg till en för välkomst- eller köpmejl.',
  communityEmailsRecent: 'Senaste utskick',
  communityEmailsEmpty: 'Inga community-automationer skickade för denna yta ännu',
  purchaseAccessEmail: 'Köp → community',
  memberAutoEmail: 'Medlemsautomation',
  automationRules: 'Automationsregler',
  addAutomation: 'Lägg till automation',
  editAutomation: 'Redigera automation',
  saveAutomation: 'Spara automation',
  automationName: 'Namn',
  automationSubject: 'Ämne',
  automationBody: 'Mejlinnehåll',
  automationDescription: 'Beskrivning',
  automationSaved: 'Automation sparad',
  deleteAutomation: 'Radera',
  deleteAutomationConfirm: 'Radera denna automation? Detta går inte att ångra.',
  automationDeleted: 'Automation raderad',
  settingsNavProfile: 'Profil',
  settingsNavNotifications: 'Aviseringar',
  settingsNavIntegrations: 'Integrationer',
  settingsOrg: 'Organisation',
  settingsNavGeneral: 'Allmänt',
  settingsNavMembers: 'Medlemmar',
  settingsNavSpaces: 'Arbetsytor',
  settingsNavTags: 'Taggar',
  settingsNavBranding: 'Varumärke',
  settingsNavWorkflows: 'Arbetsflöden',
  settingsNavBilling: 'Fakturering',
  settingsNavAi: 'AI-användning',
  settingsWorkspaces: 'Arbetsytor',
  settingsSearchWorkspaces: 'Sök arbetsytor',
  settingsNewWorkspace: 'Ny arbetsyta',
  settingsUpdateProfile: 'Uppdatera profilinformation.',
  settingsCalendar: 'Kalender',
  settingsCalendarSub: 'Uppdatera dina kalenderpreferenser.',
  settingsWeekStart: 'Vilken dag ska veckan börja på i kalendern?',
  settingsMonday: 'Måndag',
  settingsSunday: 'Söndag',
  settingsSecurity: 'Säkerhet',
  settingsNewPassword: 'Nytt lösenord',
  settingsNewPasswordHint: 'Uppdatera ditt kontolösenord.',
  settingsReset: 'Återställ',
  settingsEnable2fa: 'Aktivera tvåfaktorsautentisering',
  settingsEnable2faSub: 'Lägg till ett extra lager av säkerhet på ditt clikd:-konto.',
  settingsManage2fa: 'Hantera 2FA',
  settings2faOn: '2FA är aktiverat för detta konto.',
  settingsContact: 'Kontakt',
  settingsNewEmail: 'Ny e-post',
  settingsNewEmailHint: 'Uppdatera din e-post. Vi skickar en bekräftelselänk.',
  settingsLogOut: 'Logga ut',
  settingsDeleteAccount: 'Radera konto',
  settingsNotificationsSub: 'Välj vad du vill få aviseringar om.',
  settingsComingSoon: 'Fler inställningar kommer snart.',
  settingsBillingSub: 'Plan & social sets för {handle}',
  settingsPlanActive: 'Aktiv',
  settingsSocialSetsTitle: 'Social sets',
  settingsSocialSetsHint: 'Varje Social Set grupperar profiler för ett varumärke på clikd:.',
  settingsManageSocials: 'Hantera sociala konton',
  settingsClose: 'Stäng inställningar',
  flashDisplayNameSaved: 'Visningsnamn sparat',
  flashPasswordUpdated: 'Lösenord uppdaterat',
  flash2faEnabled: '2FA aktiverat',
  flash2faDisabled: '2FA avaktiverat',
  flashEmailConfirm: 'Bekräftelsemejl skickat',
  flashDeleteConfirm: 'Radering av konto kräver bekräftelse',
  notifNewMembers: 'Nya community-medlemmar',
  notifPurchases: 'Produktköp',
  notifAutomations: 'Automatiska e-postutskick',
  notifLiveReminders: 'Påminnelser om live-event',
  notifWeeklyDigest: 'Veckosammanfattning via e-post',
  notifWeeklyDigestHint:
    'En gång i veckan skickar vi en sammanfattning av godkända aviseringstyper till din kontomejl.',
  notifInAppHint:
    'Markerade alternativ syns i klockikonen i admin-headern. Avmarkera för att tysta kategorin.',
  notifSampleNewMembers: '3 nya medlemmar gick med i Creator Lab',
  notifSamplePurchase: 'E-boksköp: Creator Starter Pack',
  notifSampleAutomation: 'Broadcast öppningsfrekvens 62%',
  notifSampleLive: 'Live-påminnelse: sessionen börjar om 1 timme',
  notifEmpty: 'Inga aviseringar just nu — aktivera kategorier under Inställningar.',
  notifPrefsSaved: 'Aviseringsinställningar sparade',
  settingsIntegrationsSub:
    'Översikt över sociala ytor och konton auktoriserade via API. Hantera varje koppling här.',
  settingsIntegrationsOverview: 'Anslutna plattformar',
  settingsApiAuthorized: 'Auktoriserad · API ✓',
  settingsApiNotConnected: 'Ej ansluten',
  settingsConnectedAt: 'Ansluten {date}',
  settingsNoSocialsYet: 'Inga plattformar anslutna för denna arbetsyta ännu.',
  settingsWorkspacesSub:
    'Alla sociala ytor på ditt konto — teammedlemmar, roller och kanaler.',
  settingsWorkspaceMembers: 'Teammedlemmar',
  settingsWorkspaceRole: 'Roll',
  settingsWorkspaceChannels: 'Kanaler',
  settingsAddWorkspace: 'Lägg till arbetsyta',
  settingsNoMembers: 'Inga teammedlemmar på denna arbetsyta ännu.',
  settingsWorkflowsSub:
    'Automatiska e-postflöden och workflows för dina communities och din butik.',
  settingsWorkflowActive: 'Aktiv',
  settingsWorkflowPaused: 'Pausad',
  settingsWorkflowSent: '{n} skickade',
  settingsWorkflowLastSent: 'Senast skickad {date}',
  settingsNoWorkflows: 'Inga workflows ännu — skapa dem i E-post CRM.',
  settingsOpenEmailCrm: 'Öppna E-post CRM',
  settingsPaymentMethod: 'Betalningsmetod',
  settingsPaymentStripe: 'Betalas säkert via Stripe',
  settingsCardOnFile: 'Visa som slutar på 4242',
  settingsRenewalDate: 'Nästa förnyelse',
  settingsRenewalHint: 'Din plan förnyas automatiskt om den inte sägs upp.',
  settingsBillingPortal: 'Hantera fakturering i Stripe',
  settingsSubscriptions: 'Prenumerationer',
  settingsSubscriptionsSub: 'Hantera dina prenumerationer',
  settingsManageSubscriptions: 'Hantera prenumerationer',
  settingsPlanSince: 'Starter-plan sedan {date}',
  settingsTrialEnds: 'Gratis provperiod slutar {date}',
  settingsBillingMembers: 'Medlemmar',
  settingsUnitPrice: 'Enhetspris',
  settingsBillingInterval: 'Faktureringsintervall',
  settingsNextInvoice: 'Nästa fakturadatum',
  settingsFirstCharge: 'Första debitering exkl. moms',
  settingsBillingDetails: 'Faktureringsuppgifter',
  settingsBillingDetailsSub: 'Kontaktuppgifter och betalningsmetod.',
  settingsEdit: 'Redigera',
  settingsPaymentMethodLabel: 'Betalningsmetod',
  settingsCardMastercard: 'Mastercard som slutar på 4242 · Stripe',
  settingsNoTaxId: 'Inget momsregistreringsnummer sparat',
  settingsAddTaxId: 'Lägg till moms-ID',
  settingsInvoiceHistory: 'Fakturahistorik',
  settingsInvoiceHistorySub: 'Dina senaste fakturor.',
  settingsInvoiceTrial: 'Gratis provperiod för 1 × clikd: Starter',
  settingsIntervalYear: 'År',
  settingsIntervalMonth: 'Månad',
  settingsAvailablePlans: 'Tillgängliga planer',
  settingsMembersSub: 'Hantera organisationens medlemmar · {n} plats',
  settingsInviteMember: 'Bjud in medlem',
  settingsAllSpaces: 'Alla ytor',
  settingsRoleAdmin: 'Admin',
  settingsRoleEditor: 'Redaktör',
  settingsRoleApprover: 'Godkännare',
  settingsRoleViewer: 'Läsare',
  settingsInviteTitle: 'Bjud in en teammedlem',
  settingsInviteHint: 'De får ett mejl med tillgång till de ytor du väljer.',
  settingsInviteSend: 'Skicka inbjudan',
  settingsInviteSent: 'Inbjudan skickad',
  settingsMemberPending: 'Väntande',
  settingsOrgTitle: 'Organisation',
  settingsOrgSub: 'Hantera organisationsinställningar och delad konfiguration.',
  settingsSpaceAccess: 'Ytåtkomst',
  accountMenuTitle: 'Konto',
  accountMenuWorkspace: 'Arbetsyta',
  accountMenuRole: 'Roll',
  accountMenuCreator: 'Creator',
  accountMenuSettingsBilling: 'Inställningar & fakturering',
  accountMenuProfileBio: 'Profil & bio',
  paymentsActive: 'Betalningar aktiva ✓',
  notificationsTitle: 'Aviseringar',
  aiCopilotTitle: 'AI Copilot',
  activeBlocksTitle: 'Aktiva block',
  activeBlocksSub: 'Knappar, produkter, e-böcker & sociala länkar. Dra för att sortera.',
  addLinkOrProduct: 'Lägg till länk / produkt',
  linksAndLeadMagnets: 'Länkar & lead magnets',
  noLinksYet: 'Inga länkar ännu',
  storeProductsTitle: 'Store-produkter',
  noStoreProductsYet: 'Inga store-produkter ännu',
  sentBroadcastsTitle: 'Skickade utskick',
  sentBroadcastsSub: 'Historik med öppnings- & klickstatistik — klicka för detaljer',
  noBroadcastsYet: 'Inga utskick ännu',
  communityAccessLabel: 'Community-access',
  communityAccessHint: 'Ge köpare access till en av dina communities efter köpet',
  whichCommunity: 'Vilken community?',
  yesLabel: 'Ja',
  noLabel: 'Nej',
  unlocksLabel: 'Låser upp',
  statusLabel: 'Status',
  optionalLabel: 'Valfritt',
  mergeTagsHint:
    'Merge-taggar: {first_name}, {name}, {email}, {community}, {community_url}',
  socialInboxEyebrow: 'Instagram',
  socialInboxTitle: 'Inbox',
  socialInboxSub: 'Dina Instagram-DM:ar · {workspace}',
  inboxZero: 'Inga Instagram-DM:ar ännu',
  instagramDmsTitle: 'Instagram-DM:ar',
  instagramDmsHint: 'Direktmeddelanden från ditt anslutna Instagram',
  instagramDmReplyPlaceholder: 'Svara på Instagram…',
  instagramDmSend: 'Skicka svar',
  instagramNotConnected: 'Koppla Instagram till den här social space',
  statusLive: 'Live',
  statusPaused: 'Pausad',
  performanceChartAria: 'Prestandadiagram',
  bioTabDesign: 'Design & Theme',
  bioTabBlocks: 'Blocks & Links',
  bioTabAnalytics: 'UTM Analytics',
  bioTabSettings: 'Inställningar',
  liveStudioPreview: 'Live Studio-förhandsvisning',
  presetsCount: '8 förinställningar',
  themeMidnight: 'Midnight Glass',
  themeMidnightBlurb: 'Mörk mesh + frostat glas',
  themeChampagne: 'Champagne Luxe',
  themeChampagneBlurb: 'Varm silke + guldaccenter',
  themeAurora: 'Aurora Glow',
  themeAuroraBlurb: 'Indigo / lila glöd',
  themeNordic: 'Nordic Minimal',
  themeNordicBlurb: 'Rent vitt + skarp slate',
  mockLinkWelcomeSub: 'Välkommen till min värld',
  mockLinkStudioTitle: 'Clikd Studio',
  mockLinkStudioSub: 'Platsen att vara',
  mockLinkCoaching: '1:1 Coaching',
  mockLinkCoachingSub: 'Boka ett samtal',
  yourInfo: 'Dina uppgifter',
  fieldRequired: 'Detta fält är obligatoriskt',
  validEmail: 'Ange en giltig e-postadress',
  validPhone: 'Ange ett giltigt telefonnummer',
  selectOption: 'Välj…',
  cardApplePay: 'Kort / Apple Pay',
  chooseImageType: 'Välj en JPG-, PNG- eller WebP-bild.',
  maxFileSize5mb: 'Max filstorlek är 5 MB.',
  uploadFailedRetry: 'Uppladdning misslyckades. Försök igen.',
  variantHintFrosted: 'Blur + glas',
  variantHintSolid: 'Kraftig slate',
  variantHintLuxe: 'Vit kort',
  variantHintMinimal: 'Endast kontur',
  fontHintJakarta: ' — Modern ren',
  fontHintPlayfair: ' — Redaktionell lyx',
  fontHintSpace: ' — Tech / Web3',
  fontHintDefault: ' — Minimal funktionell',
  linkInBio: 'Link in Bio',
  publishChanges: 'Publicera ändringar',
  publishedCheck: 'Publicerad',
  openPublicBioTitle: 'Öppna din publika link-in-bio i en ny flik',
  exclusiveThemes: 'Exklusiva teman',
  exclusiveThemesSub: 'Lyxiga förinställningar med live-swatches',
  headerCoverBanner: 'Header & cover-banner',
  hdCoverPhoto: 'HD-coverfoto',
  optionalBannerAbove: 'Valfri banner ovanför avatar',
  coverImage: 'Coverbild',
  uploadBannerHint: 'Ladda upp en banner från din enhet',
  avatarShape: 'Avatarform',
  shapeCircle: 'Cirkel',
  shapeSquircle: 'Squircle',
  verifiedBadge: 'Verifierad badge',
  verifiedBadgeHint: 'Indigo-bock på avataren',
  socialIconsLayout: 'Layout för sociala ikoner',
  socialLayoutHeader: 'Header-rad',
  socialLayoutDock: 'Nedre dock',
  canvasBackground: 'Canvas & bakgrund',
  backgroundType: 'Bakgrundstyp',
  bgSolidMesh: 'Solid / Mesh',
  bgHdImage: 'HD-bild',
  bgLiquid: 'Flytande gradient',
  meshGradient: 'Mesh-gradient',
  meshGradientHint: 'Lager av färgblobbar på canvas',
  primaryTintColor: 'Primär tonfärg',
  backgroundImage: 'Bakgrundsbild',
  uploadCanvasBgHint: 'Ladda upp en full canvas-bakgrund från din enhet',
  textIconColor: 'Text- & ikonfärg',
  mutedTextColor: 'Dämpad text',
  typographyLabel: 'Typografi',
  exclusiveBlockDesigns: 'Exklusiva blockdesigner',
  blockVariant: 'Blockvariant',
  variantFrosted: 'Frosted Glass',
  variantSolid: 'Solid färg',
  variantLuxe: 'Luxe Silk',
  variantMinimal: 'Minimal border',
  blockBackground: 'Blockbakgrund',
  blockTextColor: 'Blocktext',
  cornerCurvature: 'Hörnradie',
  radiusCurved: 'Rundad',
  radiusSharp: 'Skarp',
  radiusPill: 'Pill',
  hoverEffect: 'Hover-effekt',
  hoverLift: 'Lyft & glow',
  hoverShimmer: 'Border shimmer',
  hoverScale: 'Skala upp',
  replaceImage: 'Byt bild',
  uploadFromDevice: 'Ladda upp från enhet',
  noImageYet: 'Ingen bild ännu',
  imageFormatHint: 'JPG, PNG eller WebP · Max 5 MB',
  titleAndMedia: 'Titel & Media',
  platformsCol: 'Plattformar',
  quickEdit: 'Snabbredigera',
  noPostsMatchFilter: 'Inga inlägg matchar filtret.',
  today: 'Idag',
  previous: 'Föregående',
  postItNote: 'Post-it',
  addPostIt: 'Lägg till post-it',
  moreNotes: 'fler lappar',
  morePosts: 'mer',
  editReminder: 'Redigera påminnelse',
  newReminder: 'Ny påminnelse',
  colorLabel: 'Färg',
  saveNote: 'Spara lapp',
  notePlaceholder: 'T.ex. Filma B-roll, påminn teamet, deadline för caption…',
  dayMon: 'Mån',
  dayTue: 'Tis',
  dayWed: 'Ons',
  dayThu: 'Tor',
  dayFri: 'Fre',
  daySat: 'Lör',
  daySun: 'Sön',
  oneTapCheckout: '1-taps checkout',
  secureCheckout: 'Säker checkout',
  closeCheckout: 'Stäng checkout',
  paymentConfirmed: 'Betalning bekräftad!',
  redirectingTo: 'Omdirigerar till {destination} om {seconds}s…',
  continueNow: 'Fortsätt nu',
  payInstantly: 'Betala direkt · {amount} SEK',
  waitingForLive: 'Väntar på live…',
  yourNamePlaceholder: 'Ditt namn',
  loadingCalendar: 'Laddar kalender…',
  statScheduled: 'Schemalagda',
  statDrafts: 'Utkast',
  statPublished: 'Publicerade',
  createSchedulePostBtn: 'Skapa / Schemalägg Inlägg',
  copilotIdeas: 'Idéer',
  copilotCaption: 'Caption',
  copilotHashtags: 'Hashtags',
  copilotHooks: 'Hooks',
  copilotSaved: 'Sparade idéer',
  copilotIdeasHint: 'Få 3 unika inläggsidéer med captions per plattform.',
  copilotCaptionHint: 'Skriv eller polera en caption utifrån din brief.',
  copilotHashtagsHint: 'Föreslå relevanta hashtags för ditt ämne.',
  copilotHooksHint: 'Scroll-stoppare och öppningsrader för Reels / Shorts.',
  copilotSavedHint:
    'Dina sparade idéer, captions och hooks — redo att öppna i Post Studio.',
  writeCaptionShort: 'Skriv caption',
  courseContentHint: 'kursinnehåll',
  yourPurchaseHint: 'ditt köp',
  liveEventHint:
    'Sändningen har inte startat ännu — behåll länken bokmärkt.',
  publishOrSave: 'Publicera / Spara',
  allTeamWorkspaces: 'Alla team-ytor',
  emailBodyPlaceholder: 'Skriv ditt mejl… Dra in en bild i texten där den ska synas.',
  socialSpaces: 'Social Spaces',
  linkGoogleCalendar: 'Koppla Google Calendar',
  calendarFilter: 'Filter',
  eventsCount: '{count} events',
  viewMonth: 'Månad',
  viewWeek: 'Vecka',
  viewDay: 'Dag',
  viewList: 'Lista',
  noContentTasksHappening: 'Inget innehåll eller uppgifter just nu',
  adminNavProjects: 'Projekt',
  projectsTitle: 'Projekt',
  projectsSub: 'Kampanjetiketter för {name} — tagga inlägg när du skapar eller schemalägger.',
  createProject: 'Nytt projekt',
  newProject: 'Ny projektetikett',
  projectNamePlaceholder: 't.ex. Summer Launch 2026',
  projectDescPlaceholder: 'Kort beskrivning av kampanjen…',
  noProjectsYet: 'Inga projekt ännu',
  selectProjectHint: 'Skapa en projektmapp för att organisera och planera kopplat content',
  projectsFoldersHint: 'Projekt — öppna en mapp för att planera innehållet',
  visionboardEyebrow: 'Inspiration',
  visionboardTitle: 'Visionboard',
  visionboardSub: 'Fäst referensbilder som sätter tonen för projektet.',
  visionboardUpload: 'Ladda upp bild',
  visionboardFromLibrary: 'Från mediabiblioteket',
  visionboardEmpty: 'Lägg till inspiration — ladda upp eller välj från biblioteket',
  visionboardNotePlaceholder: 'Valfri anteckning för nästa pin…',
  visionboardUntitled: 'Namnlös pin',
  visionboardSaveFailed: 'Kunde inte spara visionboard',
  visionboardImagesOnly: 'Endast bilder kan fästas på visionboarden',
  visionboardLibraryEmpty: 'Inga bilder i mediabiblioteket ännu',
  linkedPosts: 'kopplade inlägg',
  noPostsInProject: 'Inget content taggat med detta projekt ännu. Tagga i Post Studio.',
  deleteProjectConfirm: 'Ta bort denna projektetikett? Inläggen behålls men tappar taggen.',
  deleteProjectTitle: 'Ta bort projekt?',
  deleteProjectPermanentCheckbox: 'Jag förstår att projektet tas bort permanent',
  campaignLabels: 'Projektetiketter',
  campaignLabelsHint: 'Tagga inlägget med kampanjer det tillhör',
  createMediaFolder: 'Ny mapp',
  newMediaFolder: 'Ny mediamapp',
  mediaFolderNamePlaceholder: 't.ex. Produktbilder',
  mediaFolderDescPlaceholder: 'Vad som hör hemma i den här mappen…',
  noMediaFoldersYet: 'Inga mappar ännu',
  selectMediaFolderHint: 'Välj en mapp för att bläddra bland bilder och videor',
  mediaFolderSub: 'Organisera creatives för {name}',
  noMediaInFolder: 'Inga bilder eller videor i den här mappen ännu.',
  deleteMediaFolderTitle: 'Ta bort mapp?',
  deleteMediaFolderConfirm: 'Media i mappen tas bort från biblioteket.',
  deleteMediaFolderPermanentCheckbox: 'Jag förstår att mappen tas bort permanent',
  mediaLibraryRoot: 'Brand assets',
  mediaLibraryRootDesc: 'Alla bilder och videor i ditt mediabibliotek — organisera dem i mapparna nedan.',
  audienceGender: 'Kön',
  audienceAge: 'Ålder',
  audienceDemographics: 'Demografi',
  audienceActiveTimes: 'Aktiva tider',
  audienceGenderWomen: 'Kvinnor',
  audienceGenderMen: 'Män',
  audienceGenderOther: 'Annat',
  audienceTopCountries: 'Toppländer',
  audienceTopCities: 'Toppstäder',
  audienceActiveTimesHint: 'När din publik är mest aktiv (lokal tid)',
  audienceLocation: 'Plats',
  demographicsUnavailable:
    'Demografi kräver ett Instagram Business/Creator-konto med 100+ följare och insight-behörighet. Anslut Instagram igen under Inställningar → Sociala konton och uppdatera.',
  demographicsFromViewers: 'Baserat på konton som tittat på / engagerat med ditt innehåll',
  demographicsFromFollowers: 'Baserat på dina Instagram-följare',
  demographicsAllPlatforms: 'Alla plattformar',
  demographicsPlatformStatus: 'Källor',
  audienceLessActive: 'Mindre',
  audienceMoreActive: 'Mer',
  analyticsTab: 'Analys',
  metricReach: 'Räckvidd',
  metricViews: 'Visningar',
  metricLikes: 'Gillamarkeringar',
  metricComments: 'Kommentarer',
  metricShares: 'Delningar',
  metricSaves: 'Sparningar',
  metricEngagementRate: 'Engagement rate',
  engagementSummaryTitle: 'Engagement-sammanfattning',
  engagementSummarySub: 'Gillamarkeringar, kommentarer, delningar och sparningar för allt content',
  totalEngagement: 'Totalt engagement',
  engagementRateHint: 'Genomsnittlig engagement rate för {name} · {range}',
  engagementRateTrend: '{delta} jämfört med föregående period',
  engagementRateFormula: 'Engagement ÷ räckvidd × 100',
  pctOfEngagement: '{n}% av engagement',
  dateRange1Week: '1 vecka',
  dateRange1Month: '1 månad',
  dateRange3Months: '3 månader',
  dateRange1Year: '1 år',
  dateRange2Years: '2 år',
  dateRangeCustom: 'Egna datum',
  dateRangeFrom: 'Från',
  dateRangeTo: 'Till',
  dateRangeApply: 'Använd',
  dateRangePresets: 'Snabbval',
  bestPerformingPosts: 'Bäst presterande',
  mostViewedPosts: 'Mest visat content',
  bestPerformingSub: 'Högst engagement rate i perioden',
  mostViewedSub: 'Flest visningar i perioden',
  postsPerformanceCompare: 'Jämför inläggsprestanda · {range}',
  reelsPerformanceCompare: 'Jämför reel-prestanda · {range}',
  storiesPerformanceCompare: 'Jämför story-prestanda · {range}',
  metricImpressions: 'Visningar',
  metricPlays: 'Spelningar',
  hashtagsUsedTitle: 'Hashtags du använt',
  hashtagsUsedSub: 'Prestanda för taggar i ditt content · {range}',
  hashtagUses: 'Användningar',
  hashtagReach: 'Räckvidd',
  hashtagTrend: 'Trend',
  hashtagsUnique: 'Unika taggar',
  hashtagsAvgLift: 'Snitt räckviddslyft',
  hashtagsTaggedPosts: 'Taggade inlägg',
  aiHashtagIdeasTitle: 'AI-hashtagidéer',
  aiHashtagIdeasSub: 'Nya set för kommande content, baserat på vad som redan funkar för dig',
  aiHashtagGenerate: 'Generera idéer',
  aiHashtagGenerating: 'Genererar…',
  aiHashtagCopySet: 'Kopiera set',
  aiHashtagCopied: 'Kopierat',
  aiHashtagSetFor: 'För {topic}',
  hashtagColTag: 'Hashtag',
  hashtagColPosts: 'Inlägg',
  toastChooseImage: 'Välj en bild',
  toastChooseImageFile: 'Välj en bildfil',
  toastUploadFailed: 'Uppladdningen misslyckades',
  toastLogoUpdated: 'Logotyp uppdaterad',
  toastFaviconUpdated: 'Favicon uppdaterad',
  toastBrandingSaveFailed: 'Kunde inte spara branding till databasen',
  toastProfilePhotoUpdated: 'Profilbild uppdaterad',
  toastProfilePhotoUploadFailed: 'Kunde inte ladda upp profilbild',
  toastTimezoneSaveFailed: 'Kunde inte spara tidszon',
  toastNotifPrefsSaveFailed: 'Kunde inte spara aviseringsinställningar',
  toastDeleteAccountFailed: 'Kunde inte ta bort kontot — kontakta support',
  orgBrandingTitle: 'Organisationsbranding',
  orgBrandingSub: 'Namn och tillgångar som visas för ditt skaparvarumärke.',
  orgNameLabel: 'Organisationsnamn',
  orgLogoLabel: 'Organisationslogotyp',
  orgLogoHint: 'Kvadratisk PNG/JPG rekommenderas.',
  orgFaviconLabel: 'Favicon',
  uploadLogo: 'Ladda upp logotyp',
  uploadFavicon: 'Ladda upp favicon',
  profilePhotoLabel: 'Profilbild',
  uploadingEllipsis: 'Laddar upp…',
  timezoneLabel: 'Tidszon',
  timezoneHint: 'Används för kalendrar, rapporter och schemalagda inlägg.',
  notifInAppTitle: 'Aviseringar i appen (klockan)',
  notifInAppBellHint: 'Klockaviseringar i Creator Admin',
  notifEmailTitle: 'E-postaviseringar',
  deleteAccountTitle: 'Ta bort konto?',
  deleteAccountBody:
    'Detta raderar permanent ditt konto och workspace-data. Skriv DELETE för att bekräfta.',
  deleteAccountConfirmPlaceholder: 'Skriv DELETE',
  deleteAccountConfirm: 'Ta bort konto',
  closeAria: 'Stäng',
  aiUsageThisMonth: 'Denna månad',
  aiUsageWordsUsed: 'ord använda',
  aiUsageGateTitle: 'AI-användning',
  aiUsageGateBody: 'Följ din månatliga AI-ordkvot för detta workspace.',
  toastSelectWorkspaceBeforeConnect: 'Välj ett workspace innan du kopplar ett konto',
  toastSocialConnected: '{platform} kopplat!',
  toastPopupBlocked: 'Popup blockerad — tillåt popups för den här sidan och försök igen',
  toastConnectionFailed: 'Kopplingen misslyckades',
  toastCouldNotConnect: 'Kunde inte koppla {platform}',
  toastAccountDisconnected: 'Kontot frånkopplat',
  toastDisconnectNetworkError: 'Nätverksfel vid frånkoppling',
  toastTikTokSessionExpired: 'TikTok-sessionen har gått ut — koppla om kontot',
  toastTikTokSwitchFailed: 'Kunde inte byta TikTok-konto',
  connectMetaAccountsTitle: 'Koppla Meta-konton',
  connectMetaAccountsSub:
    'Koppla Instagram och Facebook separat, eller båda via en Meta Suite-inloggning.',
  resyncMetaWebhooks: 'Synka om Meta-webhooks',
  connectTikTokTitle: 'Koppla TikTok-konto',
  connectTikTokSub:
    'Länka TikTok Business för annonser, inbox och annonsörsåtkomst. Efter anslutning visas kontostatus här.',
  demoModeSimulatedTitle: 'Demoläge — simulerad OAuth',
  demoModeSimulatedSub:
    'Stäng demoläge för att använda live Instagram, Facebook, TikTok, YouTube, LinkedIn och Pinterest.',
  toastPickScheduleFirst: 'Välj datum och tid först',
  toastConnectIgFbSettings: 'Koppla Instagram, Facebook eller TikTok under Inställningar → Socials först',
  toastConnectSocialSettings: 'Koppla de valda plattformarna under Inställningar → Socials först',
  toastCaptionRequired: 'Lägg till en bildtext innan du sparar eller publicerar',
  toastTikTokNeedsMedia: 'TikTok kräver foto eller video. Ladda upp media innan du publicerar eller schemalägger.',
  toastPostedSuccess: 'Publicerat',
  toastSavedScheduled: 'Sparat & schemalagt',
  studioActions: 'Åtgärder',
  studioPublish: 'Publicera',
  studioSaveOptions: 'Sparalternativ',
  createBrandWorkspaceTitle: 'Skapa nytt Team Workspace / varumärke',
  createBrandWorkspaceSub:
    'Skapa ett workspace för ett varumärke eller team med egna kanaler och innehåll.',
  brandWorkspaceNameLabel: 'Varumärke / Team Workspace-namn',
  brandWorkspaceNamePlaceholder: 't.ex. "Acme Brand Scandinavia"',
  socialHandleLabel: 'Social handle',
  socialHandlePlaceholder: 't.ex. "@acme_official"',
  connectedChannelsLabel: 'Anslutna kanaler',
  toastWorkspaceActivated: '“{name}” aktiverat',
  toastWorkspaceCreateFailed: 'Kunde inte skapa workspace',
  toastWorkspaceSaveFailed: 'Kunde inte spara workspace till databasen',
  toastWorkspaceDeleteFailed: 'Kunde inte ta bort workspace i databasen',
  toastBioSaveFailed: 'Kunde inte spara bio till databasen',
  toastLessonProgressFailed: 'Kunde inte spara lektionsprogress',
  pickLessonHint: 'Välj en lektion till vänster',
  toastCourseSaved: 'Kurs sparad',
  toastCommunityRequired: 'Välj en community först',
  classroomEmptyAdminTitle: 'Inga kurser ännu',
  classroomEmptyAdminBody: 'Skapa din första kurs för den här communityn.',
  toastOfferTitleRequired: 'Erbjudandetiteln krävs',
  toastOfferPriceRequired: 'Ange ett giltigt pris',
  toastOfferCommunityRequired: 'Community krävs',
  toastCsvImportSuccess: 'Importerade {count} prenumeranter',
  toastCsvImportFailed: 'CSV-import misslyckades',
  toastFolderRenamed: 'Mappen bytte namn',
  toastFolderRenameFailed: 'Kunde inte byta namn på mappen',
  toastFolderCreated: 'Mapp skapad',
  toastFolderCreateFailed: 'Kunde inte skapa mapp',
  toastFolderDeleted: 'Mapp borttagen',
  toastFolderDeleteFailed: 'Kunde inte ta bort mapp',
  toastReorderProjectsFailed: 'Kunde inte ändra ordning på projekt',
  toastReorderFoldersFailed: 'Kunde inte ändra ordning på mappar',
  toastSelectWorkspaceBeforeConnectShort: 'Välj ett workspace innan du kopplar',
  toastAllowPopupsConnect: 'Tillåt popups för att koppla sociala konton',
  toastCreateProjectFailed: 'Kunde inte skapa projekt',
  toastHashtagsAdded: 'Hashtags tillagda',
  toastAddHashtagsFirst: 'Lägg till hashtags först',
  toastSavedToFavourites: 'Sparat i favoriter',
  toastUpdatePlanFailed: 'Kunde inte uppdatera planen',
  toastPostedToCommunity: 'Publicerat i community',
  toastCommentFailed: 'Kunde inte lägga till kommentar',
  toastPostDeleted: 'Inlägg borttaget',
  toastPostUpdated: 'Inlägg uppdaterat',
  toastOfferAddTitle: 'Lägg till en erbjudandetitel',
  toastOfferEnterPriceSek: 'Ange pris i SEK (0 för gratis)',
  toastOfferNeedCommunity: 'Skapa en community innan du lägger till erbjudanden',
  toastAddEmailAddress: 'Lägg till minst en e-postadress',
  toastUploadCsvFirst: 'Ladda upp en CSV med minst en giltig e-post först',
  toastUploadCsvOnly: 'Ladda upp en .csv-fil',
  toastNoValidEmailsCsv: 'Inga giltiga e-postadresser hittades i CSV:n',
  toastCsvReadFailed: 'Kunde inte läsa CSV:n',
  toastCommunityUnlocked: 'Community-dashboard upplåst för detta workspace',
  toastCourseNeedCommunity: 'Välj en community innan du sparar en kurs',
  toastFileUploaded: 'Fil uppladdad',
  toastFileDeleted: 'Fil borttagen',
  toastFileDeleteFailed: 'Kunde inte ta bort fil',
  toastGoogleDisconnected: 'Google-konto frånkopplat',
  toastGoogleDisconnectFailed: 'Kunde inte frånkoppla Google',
  toastSelectWorkspaceFirst: 'Välj ett workspace först',
  toastProjectUpdated: 'Projekt uppdaterat',
  toastProjectUpdateFailed: 'Kunde inte uppdatera projekt',
  toastProjectGoalSaved: 'Projektmål sparat',
  toastProjectGoalSaveFailed: 'Kunde inte spara projektmål',
  toastStripeConnectUpdated: 'Stripe Connect uppdaterat — du kan begära utbetalning när du är redo',
  toastStripeFinishOnboarding: 'Slutför Stripe Connect-onboarding för utbetalningar',
  toastBankAlreadyConnected: 'Bankkonto redan kopplat',
  toastFrozenReportCreated: 'Fryst rapport skapad',
  toastAutomationSaved: 'Automationsinställningar sparade',
  toastReportDeleted: 'Rapport borttagen',
  toastShareLinkCopied: 'Delningslänk kopierad',
  toastSelectFileFirst: 'Välj minst en fil',
  toastDriveImportNoFile: 'Drive-import returnerade ingen fil',
  toastAutomationDeleted: 'Automationsregel borttagen',
  toastLiveDiagnosticPassed: 'Live-diagnostik OK — Comment-to-DM-stacken ser redo ut.',
  toastSaveFailed: 'Sparningen misslyckades',
  toastPublishFailed: 'Publiceringen misslyckades',
  toastPlanSwitched: 'Bytte till {plan}',
  toastCouldNotPost: 'Kunde inte publicera',
  toastCouldNotSaveOffer: 'Kunde inte spara erbjudandet',
  toastCsvContactsFound: 'Hittade {count} kontakt(er)',
  toastCouldNotSaveCourse: 'Kunde inte spara kursen',
  toastLinkMediaFolderFailed: 'Kunde inte länka mediamapp',
  toastCreateMediaFolderFailed: 'Kunde inte skapa mediamapp',
  toastLinkedMediaFolder: 'Länkade “{name}” till projektet',
  toastCreatedLinkedFolder: 'Skapade och länkade “{name}”',
  toastRevenueLoadFailed: 'Kunde inte ladda intäkter',
  toastStripeConnectStartFailed: 'Kunde inte starta Stripe Connect',
  toastConnectFailed: 'Kopplingen misslyckades',
  toastBuildFailed: 'Bygget misslyckades',
  toastDeleteFailed: 'Borttagningen misslyckades',
  toastMaxFilesPerPost: 'Max {count} filer per inlägg',
  toastExtraFilesSkipped: 'Endast {count} filer per inlägg — övriga hoppades över',
  toastRuleUpdated: 'Regel uppdaterad',
  toastCommentToDmCreated: 'Comment-to-DM-regel skapad',
  toastToggleFailed: 'Växlingen misslyckades',
  toastDeleteAutomationFailed: 'Kunde inte ta bort automation',
  toastNoRecentIgComments: 'Inga senaste kommentarer hittades på Instagram.',
  toastFetchedIgComments: 'Hämtade {count} kommentar(er) från Instagram.',
  toastFetchCommentsFailed: 'Kunde inte hämta kommentarer',
  inboxTabAutomations: 'Automationer',
  inboxSync: 'Synka',
  inboxSyncIssue:
    'Instagram-synkfel: {error}. Prova Synka, eller koppla om under Inställningar → Socials.',
  inboxDmNeedPerms: 'Instagram-DM kräver meddelandebehörighet',
  inboxReconnectIg: 'Koppla om Instagram',
  inboxAll: 'Alla',
  inboxTikTokDemo: 'TikTok (Demo)',
  inboxAllMessages: 'Alla meddelanden',
  inboxDms: 'DM:ar',
  inboxComments: 'Kommentarer',
  inboxSearchConversations: 'Sök konversationer…',
  inboxSyncing: 'Synkar…',
  inboxNoMatches: 'Inga träffar',
  inboxNoDms: 'Inga DM:ar ännu',
  inboxNoComments: 'Inga kommentarer ännu',
  inboxEmpty: 'Inkorgen är tom',
  inboxTryAnotherSearch: 'Prova ett annat sökord.',
  inboxTapSync: 'Tryck Synka för att uppdatera anslutna inkorgar.',
  inboxComment: 'Kommentar',
  inboxProfile: 'Profil',
  inboxNoMessagesInThread: 'Inga meddelanden i den här tråden ännu',
  inboxMediaSoon: 'Mediasvar kommer snart',
  inboxAttachMedia: 'Bifoga media',
  inboxAiQuickReply: 'AI-snabbsvar',
  inboxReplyTikTok: 'Svara på TikTok…',
  inboxWriteReply: 'Skriv ett svar…',
  inboxReplyComment: 'Svara på kommentaren…',
  inboxSelectConversation: 'Välj en konversation',
  dmKpiActiveTriggers: 'Aktiva triggers',
  dmKpiRules: '{n} regler',
  dmKpiDmsSent: 'DM:ar skickade denna månad',
  dmKpiDms: '{n} DM:ar',
  dmKpiStorefrontClicks: 'Storefront-klick',
  dmKpiClicks: '{n} klick',
  dmKpiConversion: 'Konverteringsgrad',
  dmTitle: 'Kommentar-till-DM-automationer',
  dmSub: 'När någon kommenterar ett nyckelord skickar clikd: ditt DM + storefront-länk.',
  dmResyncWebhooks: 'Synka om Meta-webhooks',
  dmCreateRule: 'Skapa ny regel',
  dmDevTools: 'Utvecklarverktyg & diagnostik (valfritt)',
  dmRunLiveDebug: 'Kör live-felsökning',
  dmTestAutomation: 'Testa automation',
  dmFetchComments: 'Hämta senaste kommentarer',
  dmSelectRecentComment: 'Välj senaste Instagram-kommentar',
  dmFetchCommentsFirst: 'Hämta kommentarer först…',
  dmPickComment: 'Välj en kommentar…',
  dmCommentIdLabel: 'Instagram Comment ID (valfritt för live-DM-test)',
  dmCommentIdPlaceholder: 't.ex. 17912345678901234',
  dmRunLiveTestDm: 'Kör live test-DM',
  dmDiagnosticTitle: 'Live-diagnostik för kommentar-till-DM',
  dmAllChecksPassed: 'Alla kontroller godkända',
  dmIssuesFound: 'Problem hittades — se checklistan och Meta-fel nedan',
  dmDismiss: 'Stäng',
  dmCheckToken: 'Giltig Instagram-token',
  dmCheckWebhooks: 'Meta-webhooks prenumererade (kommentarer, meddelanden)',
  dmCheckRules: 'Aktiva automationsregler hittades i databasen',
  dmCheckPayload: 'Private Reply Graph API-payload formaterad korrekt',
  dmFixPrefix: 'Åtgärd:',
  dmLiveReplyResult: 'Resultat för live Private Reply',
  dmEmptyHeadline: 'Inga automationsregler ännu',
  dmEmptyDesc:
    'Skapa en nyckelords-trigger så att Instagram-kommentarer automatiskt skickar ett DM med din clikd:-storefront-länk.',
  dmEmptyCta: 'Skapa kommentar-till-DM-regel',
  dmActive: 'Aktiv',
  dmPaused: 'Pausad',
  dmPauseAria: 'Pausa automation',
  dmActivateAria: 'Aktivera automation',
  dmEdit: 'Redigera',
  dmDelete: 'Ta bort',
  dmDeleteConfirm: 'Ta bort den här automationsregeln?',
  dmDmsSentClicks: '{dms} DM:ar skickade · {clicks} klick',
  dmRetry: 'Försök igen',
  dmLoadFailed: 'Kunde inte ladda automationer:',
  dmUnknownError: 'Okänt fel',
  dmClose: 'Stäng',
  dmModalEyebrow: 'Kommentar-till-DM',
  dmEditRule: 'Redigera regel',
  dmCreateRuleTitle: 'Skapa kommentar-till-DM-regel',
  dmFieldTitle: 'Titel',
  dmTitlePlaceholder: 'Nyckelord för masterclass',
  dmFieldKeywords: 'Trigger-nyckelord (kommaseparerade)',
  dmFieldDm: 'Direktmeddelande',
  dmFieldButton: 'Knapptext',
  dmFieldStorefront: 'clikd: storefront-länk',
  dmPublicReplyToggle: 'Publicera även automatiskt kommentarsvar',
  dmSaveChanges: 'Spara ändringar',
  dmCreateRuleBtn: 'Skapa regel',
  dmJustNow: 'nyss',
  dmMinsAgo: '{n} min sedan',
  dmHoursAgo: '{n} h sedan',
  dmDaysAgo: '{n} d sedan',
  dmUnknownUser: '@okänd',
  dmEmptyComment: '(tom)',
  dmInvalidCommentId:
    'Ange ett giltigt numeriskt Instagram Comment ID för att skicka ett live-test av Private Reply.',
  dmDefaultMessage:
    'Hej! Tack för din kommentar. Här är direktlänken till min nya Masterclass:',
  dmDefaultCta: 'Öppna storefront',
  dmDefaultPublicReply: 'Kolla din DM!',
  toastUpdateProjectLinkFailed: 'Kunde inte uppdatera projektlänk',
  toastUploadedFromDevice: 'Uppladdat från din enhet',
  toastMovedToFolder: 'Flyttad till {dest}',
  toastMoveFileFailed: 'Kunde inte flytta fil',
  toastDeletedFromLibrary: 'Borttagen från mediabiblioteket',
  toastUploadedToFolder: 'Uppladdad till mapp',
  toastImportedFile: 'Importerade {name}',
  toastInviteResent: 'Inbjudan skickades igen till {email}',
  toastConnectionFailedDetail: 'Kopplingen misslyckades: {error}',
  adsEyebrow: 'Meta · Annonser',
  adsManagerTitle: 'Annonshantering',
  adsManagerSub: 'Kampanjer, annonsgrupper & annonser',
  adsCreateCampaign: 'Skapa kampanj',
  adsSyncMeta: 'Synka Meta',
  adsDemoData: 'Demodata',
  adsPerformance: 'Prestanda',
  adsPerformanceSub: 'Spend, konverteringar, ROAS & CPC för valt intervall.',
  adsLast7Days: 'Senaste 7 dagarna',
  adsLast30Days: 'Senaste 30 dagarna',
  adsSpend: 'Spend',
  adsConversions: 'Konverteringar',
  adsRoas: 'ROAS',
  adsCpc: 'CPC',
  adsTrend: '{metric}-trend',
  adsNoInsightData: 'Ingen insiktsdata för detta intervall ännu.',
  adsCampaigns: 'Kampanjer',
  adsAdSets: 'Annonsgrupper',
  adsAds: 'Annonser',
  adsClearFilter: 'Rensa filter',
  adsStatus: 'Status',
  adsCampaign: 'Kampanj',
  adsAdSet: 'Annonsgrupp',
  adsAd: 'Annons',
  adsDailyBudget: 'Daglig budget',
  adsImpressions: 'Visningar',
  adsClicks: 'Klick',
  adsActive: 'Aktiv',
  adsPaused: 'Pausad',
  adsNoCampaigns: 'Inga kampanjer ännu — skapa en eller synka från Meta.',
  adsNoAdSets: 'Inga annonsgrupper för detta filter.',
  adsNoAds: 'Inga annonser för detta filter.',
  adsLoading: 'Laddar Annonshantering…',
  adsSave: 'Spara',
  adsDelivery: 'Leverans',
  adsDeliveryActiveHint: 'Levereras just nu på Meta',
  adsDeliveryPausedHint: 'Pausad — ingen spend',
  adsPerformanceSection: 'Prestanda',
  adsSettings: 'Inställningar',
  adsObjective: 'Mål',
  adsTargeting: 'Målgrupp',
  adsHeadline: 'Rubrik',
  adsCreative: 'Creative',
  adsNoCreative: 'Ingen creative-förhandsvisning',
  adsParentCampaign: 'Kampanj',
  adsParentAdSet: 'Annonsgrupp',
  adsAdAccount: 'Annonskonto',
  adsViewAdSets: 'Visa annonsgrupper',
  adsViewAds: 'Visa annonser',
  adsSaveBudget: 'Spara budget',
  adsDetailsCampaign: 'Kampanjdetaljer',
  adsDetailsAdSet: 'Annonsgruppsdetaljer',
  adsDetailsAd: 'Annonsdetaljer',
  adsMetaSyncNote:
    'Ändringar synkas till Meta när Facebook är kopplat med annonsbehörigheter; demorader uppdateras lokalt.',
  adsToastActive: 'Satt till Aktiv',
  adsToastPaused: 'Pausad',
  adsToastBudget: 'Daglig budget uppdaterad',
  adsBudgetHint: 'Belopp Meta kan spendera per dag för denna {kind}.',
  adsFromDate: 'Från',
  adsCreateTitle: 'Skapa kampanj',
  adsStepObjective: 'Mål',
  adsStepAudience: 'Målgrupp & retargeting',
  adsStepCreative: 'Creative',
  adsCampaignName: 'Kampanjnamn',
  adsDailyBudgetLabel: 'Daglig budget ({currency})',
  adsContinue: 'Fortsätt',
  adsCancel: 'Avbryt',
  adsBack: 'Tillbaka',
  adsCreateSubmit: 'Skapa kampanj',
  adsAiCopywriter: 'AI-copywriter',
  adsCreativeSources: 'Lägg till från enhet, mediabibliotek eller Google Drive.',
  adsFromDevice: 'Från enhet',
  adsMediaLibrary: 'Mediabibliotek',
  adsDropCreative: 'Släpp en bild eller video här',
  adsOrChooseSource: 'Eller välj källa nedan',
  adsRemove: 'Ta bort',
  adsSelected: '{kind} vald',
  adsObjSales: 'Försäljning',
  adsObjLeads: 'Leads',
  adsObjTraffic: 'Trafik',
  adsObjEngagement: 'Engagemang',
  adsObjSalesBlurb: 'Driv köp och checkout-kompletteringar.',
  adsObjLeadsBlurb: 'Samla e-post, väntelistor och formulär.',
  adsObjTrafficBlurb: 'Skicka trafik till din store eller bio-länk.',
  adsObjEngagementBlurb: 'Boosta inlägg och Reels-interaktioner.',
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
  analyticsTab: 'Analyse',
  analyticsAndRevenue: 'Analyse & inntekter',
  analyticsOverview: 'Inntekter',
  analyticsAudience: 'Publikum',
  analyticsPosts: 'Innlegg',
  analyticsLinkinBio: 'Lenke i bio',
  analyticsMonthlyReports: 'Månedsrapporter',
  postDetailTitle: 'Innleggsanalyse',
  postDetailClose: 'Lukk',
  postDetailOpenOriginal: 'Åpne original',
  postDetailEngagementMix: 'Engagement-fordeling',
  postDetailNoImage: 'Ingen forhåndsvisning',
  bestPerformingPosts: 'Best presterende',
  mostViewedPosts: 'Mest viste innhold',
  exportLabel: 'Eksporter',
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
  suiteEyebrow: 'Creator Admin',
  suiteHeadline: 'Ditt komplette Creator Command Center',
  suiteSub:
    'Bytt ut fem fragmenterte abonnement med ett samlet studio. Direkte publisering, bio-storefront, community og e-post-CRM — med 100 % dataeierskap.',
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
    'Social Sets, Bio Builder, post-tagging, analytics, community, checkout og AI — innebygd fra start.',
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
  workflowFailed: 'Mislyktes',
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
  connectFacebook: 'Koble til Facebook-side',
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
  analyticsTab: 'Analyse',
  analyticsAndRevenue: 'Analyse & indtægter',
  analyticsOverview: 'Indtægter',
  analyticsAudience: 'Publikum',
  analyticsPosts: 'Opslag',
  analyticsLinkinBio: 'Link i bio',
  analyticsMonthlyReports: 'Månedsrapporter',
  postDetailTitle: 'Opslagsanalyse',
  postDetailClose: 'Luk',
  postDetailOpenOriginal: 'Åbn original',
  postDetailEngagementMix: 'Engagement-fordeling',
  postDetailNoImage: 'Ingen forhåndsvisning',
  bestPerformingPosts: 'Bedst præsterende',
  mostViewedPosts: 'Mest sete indhold',
  exportLabel: 'Eksporter',
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
    'Erstat fem fragmenterede abonnementer med ét samlet studio. Direkte publicering, bio-storefront, community og e-mail-CRM — med 100 % dataejerskab.',
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
    'Social Sets, Bio Builder, post-tagging, analytics, community, checkout og AI — indbygget fra start.',
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
  workflowFailed: 'Mislykkedes',
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
  connectFacebook: 'Forbind Facebook-side',
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
  trustPillCheckout: '⚡ Sisäänrakennettu pikamaksu',
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
  suiteEyebrow: 'Creator Admin',
  suiteHeadline: 'Täydellinen Creator Command Center',
  suiteSub:
    'Korvaa viisi hajanaista tilausta yhdellä studiolla. Suora julkaisu, bio-kauppa, yhteisö ja sähköposti-CRM — 100 % datan omistajuudella.',
  suitePlannerTitle: 'Kalenteri & Planner',
  suitePlannerSummary:
    'Aikatauluta ja auto-julkaise sisältöä Social Set -profiileihisi Kanban- ja kalenterinäkymällä.',
  suiteBioTitle: 'Bio Link Builder',
  suiteBioSummary:
    'Omat teemat, UTM-seuranta, digituotteet ja 1-napin mobiilimaksu.',
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
  roiHeadline: 'Arvioi kuukausitulosi yhteisöstäsi',
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
  faqPaymentsQ: 'Miten mobiilimaksut toimivat?',
  faqPaymentsA:
    'Jäsenet maksavat mobiilimaksulla tai kortilla kassalla — usein alle 10 sekunnissa. Rahat yhdistetään creator-tiliisi.',
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
    'Kyllä. Vaihda Active Social Set Creator Adminissa. Suunnitelmat skaalautuvat Starterista Creatoriin ja Pro/Agencyyn.',
  faqImportQ: 'Voinko tuoda jäseniä Facebookista tai Skoolista?',
  faqImportA:
    'Kyllä. Tuo sähköpostilistoilla ja kutsu heidät uuteen yhteisöön. He kirjautuvat sähköpostilla tai BankID:llä.',
  faqPayoutQ: 'Milloin saan maksun?',
  faqPayoutA:
    'Tulot näkyvät Analyticsissa ja maksetaan payout-aikataulun mukaan.',
  faqTrialQ: 'Onko ilmainen suunnitelma?',
  faqTrialA: 'Starter on ilmainen ikuisesti. Creator ja Pro/Agency voi aloittaa kun olet valmis.',
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
    'Social Sets, Bio Builder, post-tagging, analytics, yhteisö, checkout ja AI — sisäänrakennettuna alusta alkaen.',
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
  notesTab: 'Notes',
  notesTitle: 'Notes',
  notesHint: 'Kirjaa ideoita, muistutuksia ja luonnoksia tälle työtilalle.',
  notesNew: 'Uusi muistiinpano',
  notesUntitled: 'Nimetön muistiinpano',
  notesEmpty: 'Ei muistiinpanoja vielä. Luo ensimmäinen aloittaaksesi.',
  notesPlaceholder: 'Kirjoita muistiinpano…',
  notesTitlePlaceholder: 'Otsikko',
  notesDelete: 'Poista muistiinpano',
  notesAutosaved: 'Tallennetaan automaattisesti tälle laitteelle',
  workflowIdeas: 'Ideat',
  workflowInProduction: 'Tuotannossa',
  workflowReview: 'Tarkistus',
  workflowScheduled: 'Ajastettu',
  workflowPublished: 'Julkaistu',
  workflowFailed: 'Epäonnistui',
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
  connectFacebook: 'Yhdistä Facebook-sivu',
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
navFeatures: 'Ominaisuudet',
  navPricing: 'Hinnat',
  navCommunities: 'Tutustu yhteisöihin',
  logInShort: 'Kirjaudu',
  getStartedShort: 'Aloita',
  mostPopular: 'Suosituin',
  legalIntegritet: 'Tietosuojakäytäntö',
  legalGdpr: 'GDPR & Data',
  legalVillkor: 'Käyttöehdot',
  legalCookies: 'Evästekäytäntö',
  footerLegal: 'Juridiikka',
  footerProduct: 'Tuote',
  footerAccount: 'Tili',
  footerSupport: 'Tuki',
  pinnedBadge: 'Kiinnitetty',
  loadingFeed: 'Ladataan feediä...',
  writeCommentPlaceholder: 'Kirjoita kommentti...',
  pointsLabel: 'Pisteet',
  communitiesStat: 'yhteisöä',
  refAndEarn: 'Kutsu & ansaitse',
  invitedCount: 'Kutsutut',
  earnedSek: 'SEK ansaittu',
  bonusXp: 'Bonus-XP',
  accountEyebrow: 'Tili',
  authenticating: 'Todennetaan…',
  liveStreamBadge: 'LIVE STREAM',
  aiCourseAssistant: 'AI-kurssiassistentti',
  aiCourseAssistantSub: 'Kysy mitä tahansa oppitunneistasi',
  ruleBeRespectful: 'Ole kunnioittava 🤝',
  ruleNoSpam: 'Ei spammia',
  ruleLanguages: 'Ruotsi / englanti',
  ruleHelpEachOther: 'Auttakaa toisianne',
  tagQuestions: '#Kysymykset',
  tagInspiration: '#Inspiraatio',
  tagResults: '#Tulokset',
  tagTips: '#Vinkit',
  tagMilestone: '#Virstanpylväs',
  classShort: 'Luokka',
  adminShort: 'Admin',
  primaryMobileNav: 'Ensisijainen mobiilinavigointi',
  lastUpdated: 'Viimeksi päivitetty:',
  legalEyebrow: 'Juridiikka',
  signingOut: 'Kirjaudutaan ulos…',
  eventsHeroHeadline: 'Live-tapahtumat & webinaarit',
  eventsHeroSub: 'Osallistu live-sessioihin, ilmoittaudu ja ole yhteydessä yhteisöön reaaliajassa.',
  totalRegistered: 'Ilmoittautuneita yhteensä',
  comeBackSoon: 'Tule pian takaisin!',
  mins: 'MIN',
  eventChat: 'Tapahtumachat',
  streamStartsSoon: 'Stream alkaa pian',
  updatesEvery3s: 'Päivittyy 3 s välein',
  currencySek: 'SEK',
  coursesInCommunity: 'Kurssit: {name}',
  pickCourseHint: 'Valitse kurssi aloittaaksesi',
  loadingCommunity: 'Ladataan yhteisöä…',
  communityNotFound: 'Yhteisöä ei löytynyt',
  teamMembersAria: 'Tiimin jäsenet',
  editPost: 'Muokkaa julkaisua',
  createSchedulePost: 'Luo / ajasta julkaisu',
  crossPostDesc:
    'Julkaise Instagramiin, TikTokiin, LinkedIniin ja YouTubeen — live-esikatselulla.',
  crossPosting: 'Cross-posting',
  youtubeSettings: 'YouTube-asetukset',
  videoTitleLabel: 'Videon otsikko',
  youtubeTitlePlaceholder: 'Otsikko YouTubessa',
  privacyStatus: 'Yksityisyys',
  publishAsShorts: 'Julkaise YouTube Shortsina',
  videoCategory: 'Videokategoria',
  tagsLabel: 'Tagit',
  tagsPlaceholder: 'esim. shorts, vinkit, verkkokauppa',
  separateWithCommas: 'Erota pilkuilla',
  emojiBtn: 'Emoji',
  polishWithAi: 'Muotoile AI:lla',
  captionPlaceholder: 'Kirjoita kuvateksti…',
  dateAndTime: 'Päivä & aika',
  saveDraft: 'Tallenna luonnos',
  publishNow: 'Julkaise nyt',
  schedulePost: 'Ajasta',
  captionPreviewPlaceholder: 'Kuvatekstisi näkyy tässä…',
  newPostDefault: 'Uusi julkaisu',
  analyticsAndRevenue: 'Analytics & tulot',
  analyticsOverview: 'Tulot',
  analyticsAudience: 'Yleisö',
  analyticsPosts: 'Julkaisut',
  analyticsReels: 'Reels',
  analyticsStories: 'Stories',
  analyticsHashtags: 'Hashtagit',
  analyticsLinkinBio: 'Linkki biossa',
  analyticsMonthlyReports: 'Kuukausiraportit',
  postDetailTitle: 'Julkaisun analytiikka',
  postDetailClose: 'Sulje',
  postDetailOpenOriginal: 'Avaa alkuperäinen',
  postDetailEngagementMix: 'Engagement-jakauma',
  postDetailNoImage: 'Ei esikatselua',
  exportLabel: 'Vie',
  last7Days: '7 päivää',
  kpiRevenueCheckout: 'Tulot (Checkout)',
  kpiFollowers: 'Seuraajat',
  totalFollowersAll: 'Seuraajat yhteensä',
  followersPerAccount: 'Seuraajat tilittäin',
  shareOfAudience: 'Osuus yleisöstä',
  kpiPlannedPosts: 'Ajastetut julkaisut',
  performanceCheckoutTitle: 'Suorituskyky & checkout-tulot',
  performanceCheckoutSub: 'Päivittäiset tulot SEK:nä viime viikolta',
  chartRevenue: 'Tulot',
  chartVisitors: 'Vierailijat',
  topBioProductsTitle: 'Bio Storen top-tuotteet',
  topBioProductsSub: 'Klikkaukset, konversio ja checkout-tulot',
  newProduct: 'Uusi tuote',
  colProduct: 'Tuote',
  colCategory: 'Kategoria',
  colClicks: 'Klikit',
  colConversion: 'Konversio',
  colRevenue: 'Tulo',
  colStatus: 'Tila',
  bioTabDesign: 'Design & teema',
  bioTabBlocks: 'Lohkot & linkit',
  bioTabAnalytics: 'UTM-analytiikka',
  bioTabSettings: 'Asetukset',
  liveStudioPreview: 'Live Studio -esikatselu',
  presetsCount: '8 esiasetusta',
  themeMidnight: 'Midnight Glass',
  themeMidnightBlurb: 'Tumma mesh + huurrelasi',
  themeChampagne: 'Champagne Luxe',
  themeChampagneBlurb: 'Lämmin silkki + kulta',
  themeAurora: 'Aurora Glow',
  themeAuroraBlurb: 'Indigo / violetti hehku',
  themeNordic: 'Nordic Minimal',
  themeNordicBlurb: 'Puhdas valkoinen + slate',
  mockLinkWelcomeSub: 'Tervetuloa maailmaani',
  mockLinkStudioTitle: 'Clikd Studio',
  mockLinkStudioSub: 'Paikka olla',
  mockLinkCoaching: '1:1 Coaching',
  mockLinkCoachingSub: 'Varaa puhelu',
  yourInfo: 'Tietosi',
  fieldRequired: 'Tämä kenttä on pakollinen',
  validEmail: 'Anna kelvollinen sähköposti',
  validPhone: 'Anna kelvollinen puhelinnumero',
  selectOption: 'Valitse…',
  cardApplePay: 'Kortti / Apple Pay',
  chooseImageType: 'Valitse JPG-, PNG- tai WebP-kuva.',
  maxFileSize5mb: 'Suurin tiedostokoko on 5 MB.',
  uploadFailedRetry: 'Lataus epäonnistui. Yritä uudelleen.',
  variantHintFrosted: 'Sumu + lasi',
  variantHintSolid: 'Rohkea slate',
  variantHintLuxe: 'Valkoinen kortti',
  variantHintMinimal: 'Vain ääriviiva',
  fontHintJakarta: ' — Moderni puhdas',
  fontHintPlayfair: ' — Toimituksellinen luksus',
  fontHintSpace: ' — Tech / Web3',
  fontHintDefault: ' — Minimalistinen',
  linkInBio: 'Link in Bio',
  publishChanges: 'Julkaise muutokset',
  publishedCheck: 'Julkaistu',
  exclusiveThemes: 'Eksklusiiviset teemat',
  titleAndMedia: 'Otsikko & media',
  platformsCol: 'Alustat',
  quickEdit: 'Pikamuokkaus',
  noPostsMatchFilter: 'Ei julkaisuja suodattimella.',
  today: 'Tänään',
  previous: 'Edellinen',
  postItNote: 'Post-it',
  addPostIt: 'Lisää post-it',
  morePosts: 'lisää',
  editReminder: 'Muokkaa muistutusta',
  newReminder: 'Uusi muistutus',
  colorLabel: 'Väri',
  saveNote: 'Tallenna lappu',
  dayMon: 'Ma',
  dayTue: 'Ti',
  dayWed: 'Ke',
  dayThu: 'To',
  dayFri: 'Pe',
  daySat: 'La',
  daySun: 'Su',
  oneTapCheckout: '1-napin checkout',
  secureCheckout: 'Turvallinen kassa',
  closeCheckout: 'Sulje kassa',
  paymentConfirmed: 'Maksu vahvistettu!',
  redirectingTo: 'Ohjataan kohteeseen {destination} {seconds}s…',
  continueNow: 'Jatka nyt',
  payInstantly: 'Maksa heti · {amount} SEK',
  waitingForLive: 'Odotetaan liveä…',
  yourNamePlaceholder: 'Nimesi',
  loadingCalendar: 'Ladataan kalenteria…',
  statScheduled: 'Ajastetut',
  statDrafts: 'Luonnokset',
  statPublished: 'Julkaistut',
  createSchedulePostBtn: 'Luo / ajasta julkaisu',
  copilotIdeas: 'Ideat',
  copilotCaption: 'Kuvateksti',
  copilotHashtags: 'Hashtagit',
  copilotHooks: 'Hookit',
  copilotSaved: 'Tallennetut ideat',
  copilotIdeasHint: 'Saa 3 uniikkia julkaisuideaa kuvateksteillä per alusta.',
  copilotCaptionHint: 'Kirjoita tai viimeistele kuvateksti briefistäsi.',
  copilotHashtagsHint: 'Ehdota relevantteja hashtageja aiheellesi.',
  copilotHooksHint: 'Scroll-stopperit ja avausrivit Reelsille / Shortseille.',
  copilotSavedHint:
    'Tallennetut ideasi, kuvatekstisi ja hookkisi — valmiina Post Studioon.',
  writeCaptionShort: 'Kirjoita kuvateksti',
  courseContentHint: 'kurssisisältö',
  yourPurchaseHint: 'ostoksesi',
  liveEventHint:
    'Lähetys ei ole vielä alkanut — pidä tämä linkki kirjanmerkeissä.',
  publishOrSave: 'Julkaise / Tallenna',
  allTeamWorkspaces: 'Kaikki tiimitilat',
  emailBodyPlaceholder: 'Kirjoita sähköposti… Vedä kuva tekstiin siihen kohtaan, johon sen kuuluu tulla.',
  socialSpaces: 'Social Spaces',
  linkGoogleCalendar: 'Yhdistä Google Calendar',
  calendarFilter: 'Suodata',
  eventsCount: '{count} tapahtumaa',
  viewMonth: 'Kuukausi',
  viewWeek: 'Viikko',
  viewDay: 'Päivä',
  viewList: 'Lista',
  noContentTasksHappening: 'Ei sisältöä tai tehtäviä juuri nyt',
  adminNavProjects: 'Projektit',
  projectsTitle: 'Projektit',
  projectsSub: 'Kampanjatunnisteet tilalle {name} — merkitse julkaisut luodessa tai ajastaessa.',
  createProject: 'Uusi projekti',
  newProject: 'Uusi projektitunniste',
  projectNamePlaceholder: 'esim. Summer Launch 2026',
  projectDescPlaceholder: 'Lyhyt kuvaus kampanjasta…',
  noProjectsYet: 'Ei projekteja vielä',
  selectProjectHint: 'Luo projektimappa organisoidaksesi ja suunnitellaksesi sisältöä',
  projectsFoldersHint: 'Projektit — avaa kansio suunnitellaksesi sisältöä',
  visionboardEyebrow: 'Inspiraatio',
  visionboardTitle: 'Visionboard',
  visionboardSub: 'Kiinnitä referenssikuvat, jotka määrittävät projektin ilmeen.',
  visionboardUpload: 'Lataa kuva',
  visionboardFromLibrary: 'Mediakirjastosta',
  visionboardEmpty: 'Lisää inspiraatiota — lataa tai valitse kirjastosta',
  visionboardNotePlaceholder: 'Valinnainen muistiinpano seuraavalle pinille…',
  visionboardUntitled: 'Nimetön pin',
  visionboardSaveFailed: 'Visionboardin tallennus epäonnistui',
  visionboardImagesOnly: 'Vain kuvia voi kiinnittää visionboardiin',
  visionboardLibraryEmpty: 'Mediakirjastossa ei ole vielä kuvia',
  linkedPosts: 'linkitettyä julkaisua',
  noPostsInProject: 'Ei sisältöä tällä projektilla vielä. Merkitse Post Studiossa.',
  deleteProjectConfirm: 'Poista tämä projektitunniste? Julkaisut säilyvät, mutta tunniste poistuu.',
  deleteProjectTitle: 'Poista projekti?',
  deleteProjectPermanentCheckbox: 'Ymmärrän, että projekti poistetaan pysyvästi',
  campaignLabels: 'Projektitunnisteet',
  campaignLabelsHint: 'Merkitse julkaisu kampanjoihin joihin se kuuluu',
  createMediaFolder: 'Uusi kansio',
  newMediaFolder: 'Uusi mediakansio',
  mediaFolderNamePlaceholder: 'esim. Tuotekuvat',
  mediaFolderDescPlaceholder: 'Mitä tähän kansioon kuuluu…',
  noMediaFoldersYet: 'Ei kansioita vielä',
  selectMediaFolderHint: 'Valitse kansio selataksesi kuvia ja videoita',
  mediaFolderSub: 'Järjestä creativet tilalle {name}',
  noMediaInFolder: 'Ei kuvia tai videoita tässä kansiossa vielä.',
  deleteMediaFolderTitle: 'Poista kansio?',
  deleteMediaFolderConfirm: 'Kansion media poistetaan kirjastosta.',
  deleteMediaFolderPermanentCheckbox: 'Ymmärrän, että kansio poistetaan pysyvästi',
  mediaLibraryRoot: 'Brand assets',
  mediaLibraryRootDesc: 'Kaikki kuvat ja videot mediakirjastossasi — järjestä ne alle oleviin kansioihin.',
  audienceGender: 'Sukupuoli',
  audienceAge: 'Ikä',
  audienceDemographics: 'Demografia',
  audienceActiveTimes: 'Aktiiviset ajat',
  audienceGenderWomen: 'Naiset',
  audienceGenderMen: 'Miehet',
  audienceGenderOther: 'Muu',
  audienceTopCountries: 'Suosituimmat maat',
  audienceTopCities: 'Suosituimmat kaupungit',
  audienceActiveTimesHint: 'Milloin yleisösi on aktiivisimmillaan (paikallinen aika)',
  audienceLocation: 'Sijainti',
  demographicsUnavailable:
    'Demografia edellyttää Instagram Business/Creator -tiliä, jossa on yli 100 seuraajaa, sekä insight-oikeudet. Yhdistä Instagram uudelleen asetuksissa ja päivitä.',
  demographicsFromViewers: 'Perustuu tileihin, jotka katselivat / sitoutuivat sisältöösi',
  demographicsFromFollowers: 'Perustuu Instagram-seuraajiisi',
  demographicsAllPlatforms: 'Kaikki alustat',
  demographicsPlatformStatus: 'Lähteet',
  audienceLessActive: 'Vähemmän',
  audienceMoreActive: 'Enemmän',
  analyticsTab: 'Analytiikka',
  metricReach: 'Kattavuus',
  metricViews: 'Katselut',
  metricLikes: 'Tykkäykset',
  metricComments: 'Kommentit',
  metricShares: 'Jaot',
  metricSaves: 'Tallennukset',
  metricEngagementRate: 'Engagement rate',
  engagementSummaryTitle: 'Engagement-yhteenveto',
  engagementSummarySub: 'Tykkäykset, kommentit, jaot ja tallennukset kaikesta sisällöstä',
  totalEngagement: 'Engagement yhteensä',
  engagementRateHint: 'Keskimääräinen engagement rate tilalle {name} · {range}',
  engagementRateTrend: '{delta} edelliseen jaksoon verrattuna',
  engagementRateFormula: 'Engagement ÷ kattavuus × 100',
  pctOfEngagement: '{n} % engagementista',
  dateRange1Week: '1 viikko',
  dateRange1Month: '1 kuukausi',
  dateRange3Months: '3 kuukautta',
  dateRange1Year: '1 vuosi',
  dateRange2Years: '2 vuotta',
  dateRangeCustom: 'Mukautetut päivämäärät',
  dateRangeFrom: 'Alkaen',
  dateRangeTo: 'Asti',
  dateRangeApply: 'Käytä',
  dateRangePresets: 'Pikavalinnat',
  bestPerformingPosts: 'Parhaiten suoriutuvat',
  mostViewedPosts: 'Eniten katsottu sisältö',
  bestPerformingSub: 'Korkein engagement rate tällä jaksolla',
  mostViewedSub: 'Eniten näyttökertoja tällä jaksolla',
  postsPerformanceCompare: 'Julkaisujen suorituskyvyn vertailu · {range}',
  reelsPerformanceCompare: 'Reelsien suorituskyvyn vertailu · {range}',
  storiesPerformanceCompare: 'Tarinoiden suorituskyvyn vertailu · {range}',
  metricImpressions: 'Näyttökerrat',
  metricPlays: 'Toistot',
  hashtagsUsedTitle: 'Käyttämäsi hashtagit',
  hashtagsUsedSub: 'Tagien suorituskyky sisällössäsi · {range}',
  hashtagUses: 'Käyttökerrat',
  hashtagReach: 'Kattavuus',
  hashtagTrend: 'Trendi',
  hashtagsUnique: 'Uniikit tagit',
  hashtagsAvgLift: 'Keskim. kattavuusnousu',
  hashtagsTaggedPosts: 'Tagatut julkaisut',
  aiHashtagIdeasTitle: 'AI-hashtagideat',
  aiHashtagIdeasSub: 'Uudet setit tulevaan sisältöön — perustuu siihen mikä jo toimii',
  aiHashtagGenerate: 'Luo ideoita',
  aiHashtagGenerating: 'Luodaan…',
  aiHashtagCopySet: 'Kopioi setti',
  aiHashtagCopied: 'Kopioitu',
  aiHashtagSetFor: 'Aiheelle {topic}',
  hashtagColTag: 'Hashtag',
  hashtagColPosts: 'Julkaisut',
  linkInBioSub: 'Bio Store -linkkien suorituskyky · {range}',
  linkInBioTopLink: 'Top-linkki',
  linkInBioClickShare: 'Klikkiosuus',
  linkInBioConversionHint: 'Uniikit kävijät jotka klikkasivat eteenpäin',
  linkInBioUniqueRate: 'Uniikkiosuus',
  copyCommunityLink: 'Kopioi linkki',
  communityLinkCopied: 'Kopioitu',
  communityAccessEmailSent:
    'Lähetimme sinulle linkin yhteisöön {community}. Tarkista sähköpostisi.',
  communityAccessEmailNote:
    'Ostajat saavat automaattisen sähköpostin suoran yhteisölinkin kanssa oston jälkeen.',
  emailAutomations: 'Yhteisösähköpostit',
  emailAutomationsSub:
    'Ostojen yhteisöavaimet ja jäsenille lähtevät automaatiot',
  automationActive: 'Aktiivinen',
  automationPaused: 'Tauolla',
  automationTrigger: 'Laukaisin',
  automationSent: 'Lähetetty',
  automationLastSent: 'Viimeksi lähetetty',
  automationPause: 'Keskeytä',
  automationResume: 'Jatka',
  noAutomationsYet: 'Ei automaatioita vielä — lisää tervetuloa- tai ostosähköposti.',
  communityEmailsRecent: 'Viimeisimmät lähetykset',
  communityEmailsEmpty: 'Ei yhteisöautomaatiosähköposteja tälle työtilalle vielä',
  purchaseAccessEmail: 'Osto → yhteisö',
  memberAutoEmail: 'Jäsenautomaatio',
  automationRules: 'Automaatiosäännöt',
  addAutomation: 'Lisää automaatio',
  editAutomation: 'Muokkaa automaatiota',
  saveAutomation: 'Tallenna automaatio',
  automationName: 'Nimi',
  automationSubject: 'Aihe',
  automationBody: 'Sähköpostin sisältö',
  automationDescription: 'Kuvaus',
  automationSaved: 'Automaatio tallennettu',
  deleteAutomation: 'Poista',
  deleteAutomationConfirm: 'Poistetaanko tämä automaatio? Toimintoa ei voi perua.',
  automationDeleted: 'Automaatio poistettu',
  settingsNavProfile: 'Profiili',
  settingsNavNotifications: 'Ilmoitukset',
  settingsNavIntegrations: 'Integraatiot',
  settingsOrg: 'Organisaatio',
  settingsNavGeneral: 'Yleiset',
  settingsNavMembers: 'Jäsenet',
  settingsNavSpaces: 'Työtilat',
  settingsNavTags: 'Tunnisteet',
  settingsNavBranding: 'Brändi',
  settingsNavWorkflows: 'Työnkulut',
  settingsNavBilling: 'Laskutus',
  settingsNavAi: 'AI-käyttö',
  settingsWorkspaces: 'Työtilat',
  settingsSearchWorkspaces: 'Hae työtiloja',
  settingsNewWorkspace: 'Uusi työtila',
  settingsUpdateProfile: 'Päivitä profiilitiedot.',
  settingsCalendar: 'Kalenteri',
  settingsCalendarSub: 'Päivitä kalenteriasetuksesi.',
  settingsWeekStart: 'Mistä viikonpäivästä kalenteri alkaa?',
  settingsMonday: 'Maanantai',
  settingsSunday: 'Sunnuntai',
  settingsSecurity: 'Turvallisuus',
  settingsNewPassword: 'Uusi salasana',
  settingsNewPasswordHint: 'Päivitä tilisi salasana.',
  settingsReset: 'Palauta',
  settingsEnable2fa: 'Ota kaksivaiheinen tunnistus käyttöön',
  settingsEnable2faSub: 'Lisää ekstra turvakerros clikd:-tilillesi.',
  settingsManage2fa: 'Hallitse 2FA:ta',
  settings2faOn: '2FA on käytössä tällä tilillä.',
  settingsContact: 'Yhteystiedot',
  settingsNewEmail: 'Uusi sähköposti',
  settingsNewEmailHint: 'Päivitä tilisi sähköposti. Lähetämme vahvistuslinkin.',
  settingsLogOut: 'Kirjaudu ulos',
  settingsDeleteAccount: 'Poista tili',
  settingsNotificationsSub: 'Valitse mistä haluat ilmoituksia.',
  settingsComingSoon: 'Lisää asetuksia tulossa pian.',
  settingsBillingSub: 'Paketti & social setit tilille {handle}',
  settingsPlanActive: 'Aktiivinen',
  settingsSocialSetsTitle: 'Social setit',
  settingsSocialSetsHint: 'Jokainen Social Set ryhmittelee profiilit yhdelle brändityötilalle clikd::ssä.',
  settingsManageSocials: 'Hallitse some-tilejä',
  settingsClose: 'Sulje asetukset',
  flashDisplayNameSaved: 'Näyttönimi tallennettu',
  flashPasswordUpdated: 'Salasana päivitetty',
  flash2faEnabled: '2FA käytössä',
  flash2faDisabled: '2FA pois käytöstä',
  flashEmailConfirm: 'Vahvistussähköposti lähetetty',
  flashDeleteConfirm: 'Tilin poisto vaatii vahvistuksen',
  notifNewMembers: 'Uudet yhteisön jäsenet',
  notifPurchases: 'Tuoteostokset',
  notifAutomations: 'Automaattiset sähköpostit',
  notifLiveReminders: 'Live-tapahtumien muistutukset',
  accountMenuTitle: 'Tili',
  accountMenuWorkspace: 'Työtila',
  accountMenuRole: 'Rooli',
  accountMenuCreator: 'Creator',
  accountMenuSettingsBilling: 'Asetukset & laskutus',
  accountMenuProfileBio: 'Profiili & bio',
  paymentsActive: 'Maksut aktiivisia ✓',
  notificationsTitle: 'Ilmoitukset',
  aiCopilotTitle: 'AI Copilot',
  activeBlocksTitle: 'Aktiiviset lohkot',
  activeBlocksSub: 'Painikkeet, tuotteet, e-kirjat & some-linkit. Vedä järjestääksesi.',
  addLinkOrProduct: 'Lisää linkki / tuote',
  linksAndLeadMagnets: 'Linkit & lead magnetit',
  noLinksYet: 'Ei linkkejä vielä',
  storeProductsTitle: 'Kauppatuotteet',
  noStoreProductsYet: 'Ei kauppatuotteita vielä',
  sentBroadcastsTitle: 'Lähetetyt lähetykset',
  sentBroadcastsSub: 'Historia avaus- & klikkaustilastoilla — klikkaa lisätietoja',
  noBroadcastsYet: 'Ei lähetyksiä vielä',
  communityAccessLabel: 'Yhteisöoikeus',
  communityAccessHint: 'Anna ostajille pääsy yhteen yhteisöistäsi oston jälkeen',
  whichCommunity: 'Mikä yhteisö?',
  yesLabel: 'Kyllä',
  noLabel: 'Ei',
  unlocksLabel: 'Avaa',
  statusLabel: 'Tila',
  optionalLabel: 'Valinnainen',
  mergeTagsHint:
    'Yhdistämistunnisteet: {first_name}, {name}, {email}, {community}, {community_url}',
  socialInboxEyebrow: 'Instagram',
  socialInboxTitle: 'Inbox',
  socialInboxSub: 'Instagram-yksityisviestisi · {workspace}',
  inboxZero: 'Ei Instagram-viestejä vielä',
  instagramDmsTitle: 'Instagram-viestit',
  instagramDmsHint: 'Yksityisviestit yhdistetystä Instagram-tilistä',
  instagramDmReplyPlaceholder: 'Vastaa Instagramissa…',
  instagramDmSend: 'Lähetä vastaus',
  instagramNotConnected: 'Yhdistä Instagram tähän social spaceen',
  toastChooseImage: 'Valitse kuva',
  toastChooseImageFile: 'Valitse kuvatiedosto',
  toastUploadFailed: 'Lähetys epäonnistui',
  toastLogoUpdated: 'Logo päivitetty',
  toastFaviconUpdated: 'Favicon päivitetty',
  toastBrandingSaveFailed: 'Brändäystä ei voitu tallentaa tietokantaan',
  toastProfilePhotoUpdated: 'Profiilikuva päivitetty',
  toastProfilePhotoUploadFailed: 'Profiilikuvaa ei voitu ladata',
  toastTimezoneSaveFailed: 'Aikavyöhykettä ei voitu tallentaa',
  toastNotifPrefsSaveFailed: 'Ilmoitusasetuksia ei voitu tallentaa',
  toastDeleteAccountFailed: 'Tiliä ei voitu poistaa — ota yhteyttä tukeen',
  orgBrandingTitle: 'Organisaation brändäys',
  orgBrandingSub: 'Nimi ja resurssit, jotka näkyvät creator-brändissäsi.',
  orgNameLabel: 'Organisaation nimi',
  orgLogoLabel: 'Organisaation logo',
  orgLogoHint: 'Neliömäinen PNG/JPG suositellaan.',
  orgFaviconLabel: 'Favicon',
  uploadLogo: 'Lataa logo',
  uploadFavicon: 'Lataa favicon',
  profilePhotoLabel: 'Profiilikuva',
  uploadingEllipsis: 'Ladataan…',
  timezoneLabel: 'Aikavyöhyke',
  timezoneHint: 'Käytetään kalentereissa, raporteissa ja ajastetuissa julkaisuissa.',
  notifInAppTitle: 'Sovellusilmoitukset (kello)',
  notifInAppBellHint: 'Kelloilmoitukset Creator Adminissa',
  notifEmailTitle: 'Sähköposti-ilmoitukset',
  deleteAccountTitle: 'Poista tili?',
  deleteAccountBody:
    'Tämä poistaa tilisi ja workspace-datan pysyvästi. Kirjoita DELETE vahvistaaksesi.',
  deleteAccountConfirmPlaceholder: 'Kirjoita DELETE',
  deleteAccountConfirm: 'Poista tili',
  closeAria: 'Sulje',
  aiUsageThisMonth: 'Tässä kuussa',
  aiUsageWordsUsed: 'sanaa käytetty',
  aiUsageGateTitle: 'AI-käyttö',
  aiUsageGateBody: 'Seuraa kuukausittaista AI-sanan kiintiötä tälle workspacelle.',
  toastSelectWorkspaceBeforeConnect: 'Valitse workspace ennen tilin yhdistämistä',
  toastSocialConnected: '{platform} yhdistetty!',
  toastPopupBlocked: 'Ponnahdusikkuna estetty — salli pop-upit ja yritä uudelleen',
  toastConnectionFailed: 'Yhdistäminen epäonnistui',
  toastCouldNotConnect: 'Ei voitu yhdistää: {platform}',
  toastAccountDisconnected: 'Tili irrotettu',
  toastDisconnectNetworkError: 'Verkkovirhe irrotettaessa tiliä',
  toastTikTokSessionExpired: 'TikTok-istunto vanhentui — yhdistä uudelleen',
  toastTikTokSwitchFailed: 'TikTok-tiliä ei voitu vaihtaa',
  connectMetaAccountsTitle: 'Yhdistä Meta-tilit',
  connectMetaAccountsSub:
    'Yhdistä Instagram ja Facebook erikseen tai molemmat yhdellä Meta Suite -kirjautumisella.',
  resyncMetaWebhooks: 'Synkronoi Meta-webhookit uudelleen',
  connectTikTokTitle: 'Yhdistä TikTok-tili',
  connectTikTokSub: 'Linkitä TikTok Content Postingiin. Yhdistä tili uudelleen tämän päivityksen jälkeen, jotta video.publish myönnetään.',
  demoModeSimulatedTitle: 'Demotila — simuloitu OAuth',
  demoModeSimulatedSub:
    'Poista demotila käytöstä live-Instagram-, Facebook-, TikTok-, YouTube-, LinkedIn- ja Pinterest-yhteyksiä varten.',
  toastPickScheduleFirst: 'Valitse ensin päivämäärä ja aika',
  toastConnectIgFbSettings: 'Yhdistä Instagram, Facebook tai TikTok kohdassa Asetukset → Socials ensin',
  toastConnectSocialSettings: 'Yhdistä valitut alustat kohdassa Asetukset → Socials ensin',
  toastCaptionRequired: 'Lisää kuvateksti ennen tallennusta tai julkaisua',
  toastTikTokNeedsMedia: 'TikTok vaatii kuvan tai videon. Lataa media ennen julkaisua tai ajastusta.',
  toastPostedSuccess: 'Julkaistu',
  toastSavedScheduled: 'Tallennettu & ajastettu',
  studioActions: 'Toiminnot',
  studioPublish: 'Julkaise',
  studioSaveOptions: 'Tallennusvaihtoehdot',
  createBrandWorkspaceTitle: 'Luo uusi Team Workspace / brändi',
  createBrandWorkspaceSub:
    'Luo workspace brändille tai tiimille omilla kanavilla ja sisällöllä.',
  brandWorkspaceNameLabel: 'Brändi / Team Workspace -nimi',
  brandWorkspaceNamePlaceholder: 'esim. "Acme Brand Scandinavia"',
  socialHandleLabel: 'Some-käyttäjänimi',
  socialHandlePlaceholder: 'esim. "@acme_official"',
  connectedChannelsLabel: 'Yhdistetyt kanavat',
  toastWorkspaceActivated: '“{name}” aktivoitu',
  toastWorkspaceCreateFailed: 'Workspacen luonti epäonnistui',
  toastWorkspaceSaveFailed: 'Workspacen tallennus tietokantaan epäonnistui',
  toastWorkspaceDeleteFailed: 'Workspacen poisto tietokannasta epäonnistui',
  toastBioSaveFailed: 'Bion tallennus tietokantaan epäonnistui',
  toastLessonProgressFailed: 'Oppitunnin edistymistä ei voitu tallentaa',
  pickLessonHint: 'Valitse oppitunti vasemmalta',
  toastCourseSaved: 'Kurssi tallennettu',
  toastCommunityRequired: 'Valitse ensin yhteisö',
  classroomEmptyAdminTitle: 'Ei kursseja vielä',
  classroomEmptyAdminBody: 'Luo ensimmäinen kurssi tälle yhteisölle.',
  toastOfferTitleRequired: 'Tarjouksen otsikko vaaditaan',
  toastOfferPriceRequired: 'Anna kelvollinen hinta',
  toastOfferCommunityRequired: 'Yhteisö vaaditaan',
  toastCsvImportSuccess: 'Tuotiin {count} tilaajaa',
  toastCsvImportFailed: 'CSV-tuonti epäonnistui',
  toastFolderRenamed: 'Kansio nimetty uudelleen',
  toastFolderRenameFailed: 'Kansion uudelleennimeäminen epäonnistui',
  toastFolderCreated: 'Kansio luotu',
  toastFolderCreateFailed: 'Kansion luonti epäonnistui',
  toastFolderDeleted: 'Kansio poistettu',
  toastFolderDeleteFailed: 'Kansion poisto epäonnistui',
  toastReorderProjectsFailed: 'Projektien järjestystä ei voitu muuttaa',
  toastReorderFoldersFailed: 'Kansioiden järjestystä ei voitu muuttaa',
  toastSelectWorkspaceBeforeConnectShort: 'Valitse workspace ennen yhdistämistä',
  toastAllowPopupsConnect: 'Salli ponnahdusikkunat some-tilien yhdistämiseen',
  toastCreateProjectFailed: 'Projektin luonti epäonnistui',
  toastHashtagsAdded: 'Hashtagit lisätty',
  toastAddHashtagsFirst: 'Lisää hashtagit ensin',
  toastSavedToFavourites: 'Tallennettu suosikkeihin',
  toastUpdatePlanFailed: 'Suunnitelman päivitys epäonnistui',
  toastPostedToCommunity: 'Julkaistu yhteisöön',
  toastCommentFailed: 'Kommenttia ei voitu lisätä',
  toastPostDeleted: 'Julkaisu poistettu',
  toastPostUpdated: 'Julkaisu päivitetty',
  toastOfferAddTitle: 'Lisää tarjouksen otsikko',
  toastOfferEnterPriceSek: 'Anna hinta SEK (0 = ilmainen)',
  toastOfferNeedCommunity: 'Luo yhteisö ennen kaupan tarjouksia',
  toastAddEmailAddress: 'Lisää vähintään yksi sähköposti',
  toastUploadCsvFirst: 'Lataa CSV, jossa on vähintään yksi kelvollinen sähköposti',
  toastUploadCsvOnly: 'Lataa .csv-tiedosto',
  toastNoValidEmailsCsv: 'CSV:stä ei löytynyt kelvollisia sähköposteja',
  toastCsvReadFailed: 'CSV:tä ei voitu lukea',
  toastCommunityUnlocked: 'Yhteisön hallinta avattu tälle workspacelle',
  toastCourseNeedCommunity: 'Valitse yhteisö ennen kurssin tallennusta',
  toastFileUploaded: 'Tiedosto ladattu',
  toastFileDeleted: 'Tiedosto poistettu',
  toastFileDeleteFailed: 'Tiedoston poisto epäonnistui',
  toastGoogleDisconnected: 'Google-tili irrotettu',
  toastGoogleDisconnectFailed: 'Googlen irrotus epäonnistui',
  toastSelectWorkspaceFirst: 'Valitse workspace ensin',
  toastProjectUpdated: 'Projekti päivitetty',
  toastProjectUpdateFailed: 'Projektin päivitys epäonnistui',
  toastProjectGoalSaved: 'Projektitavoite tallennettu',
  toastProjectGoalSaveFailed: 'Projektitavoitetta ei voitu tallentaa',
  toastStripeConnectUpdated: 'Stripe Connect päivitetty — voit pyytää maksua kun olet valmis',
  toastStripeFinishOnboarding: 'Viimeistele Stripe Connect -onboarding maksuja varten',
  toastBankAlreadyConnected: 'Pankkitili on jo yhdistetty',
  toastFrozenReportCreated: 'Jäädytetty raportti luotu',
  toastAutomationSaved: 'Automaatioasetukset tallennettu',
  toastReportDeleted: 'Raportti poistettu',
  toastShareLinkCopied: 'Jakolinkki kopioitu',
  toastSelectFileFirst: 'Valitse vähintään yksi tiedosto',
  toastDriveImportNoFile: 'Drive-tuonti ei palauttanut tiedostoa',
  toastAutomationDeleted: 'Automaatiosääntö poistettu',
  toastLiveDiagnosticPassed: 'Live-diagnostiikka OK — Comment-to-DM-pino näyttää valmiilta.',
  toastSaveFailed: 'Tallennus epäonnistui',
  toastPublishFailed: 'Julkaisu epäonnistui',
  toastPlanSwitched: 'Vaihdettu suunnitelmaan {plan}',
  toastCouldNotPost: 'Julkaisu epäonnistui',
  toastCouldNotSaveOffer: 'Tarjousta ei voitu tallentaa',
  toastCsvContactsFound: 'Löytyi {count} yhteystietoa',
  toastCouldNotSaveCourse: 'Kurssia ei voitu tallentaa',
  toastLinkMediaFolderFailed: 'Mediakansiota ei voitu linkittää',
  toastCreateMediaFolderFailed: 'Mediakansion luonti epäonnistui',
  toastLinkedMediaFolder: 'Linkitetty “{name}” tähän projektiin',
  toastCreatedLinkedFolder: 'Luotu ja linkitetty “{name}”',
  toastRevenueLoadFailed: 'Tulojen lataus epäonnistui',
  toastStripeConnectStartFailed: 'Stripe Connectin käynnistys epäonnistui',
  toastConnectFailed: 'Yhdistäminen epäonnistui',
  toastBuildFailed: 'Rakennus epäonnistui',
  toastDeleteFailed: 'Poisto epäonnistui',
  toastMaxFilesPerPost: 'Enintään {count} tiedostoa per julkaisu',
  toastExtraFilesSkipped: 'Vain {count} tiedostoa per julkaisu — ylimääräiset ohitettiin',
  toastRuleUpdated: 'Sääntö päivitetty',
  toastCommentToDmCreated: 'Comment-to-DM-sääntö luotu',
  toastToggleFailed: 'Vaihto epäonnistui',
  toastDeleteAutomationFailed: 'Automaation poisto epäonnistui',
  toastNoRecentIgComments: 'Instagramista ei löytynyt tuoreita kommentteja.',
  toastFetchedIgComments: 'Haettiin {count} kommenttia Instagramista.',
  toastFetchCommentsFailed: 'Kommentteja ei voitu hakea',
  toastUpdateProjectLinkFailed: 'Projektilinkin päivitys epäonnistui',
  toastUploadedFromDevice: 'Ladattu laitteeltasi',
  toastMovedToFolder: 'Siirretty kansioon {dest}',
  toastMoveFileFailed: 'Tiedoston siirto epäonnistui',
  toastDeletedFromLibrary: 'Poistettu mediakirjastosta',
  toastUploadedToFolder: 'Ladattu kansioon',
  toastImportedFile: 'Tuotu {name}',
  toastInviteResent: 'Kutsu lähetetty uudelleen osoitteeseen {email}',
  toastConnectionFailedDetail: 'Yhdistäminen epäonnistui: {error}',
  adsEyebrow: 'Meta · Mainokset',
  adsManagerTitle: 'Mainosten hallinta',
  adsManagerSub: 'Kampanjat, mainosjoukot ja mainokset',
  adsCreateCampaign: 'Luo kampanja',
  adsSyncMeta: 'Synkronoi Meta',
  adsDemoData: 'Demoaineisto',
  adsPerformance: 'Suorituskyky',
  adsPerformanceSub: 'Kulutus, konversiot, ROAS ja CPC valitulle jaksolle.',
  adsLast7Days: 'Viimeiset 7 päivää',
  adsLast30Days: 'Viimeiset 30 päivää',
  adsSpend: 'Kulutus',
  adsConversions: 'Konversiot',
  adsRoas: 'ROAS',
  adsCpc: 'CPC',
  adsTrend: '{metric}-trendi',
  adsNoInsightData: 'Ei näkemystietoja tälle jaksolle vielä.',
  adsCampaigns: 'Kampanjat',
  adsAdSets: 'Mainosjoukot',
  adsAds: 'Mainokset',
  adsClearFilter: 'Tyhjennä suodatin',
  adsStatus: 'Tila',
  adsCampaign: 'Kampanja',
  adsAdSet: 'Mainosjoukko',
  adsAd: 'Mainos',
  adsDailyBudget: 'Päiväbudjetti',
  adsImpressions: 'Näyttökerrat',
  adsClicks: 'Klikkaukset',
  adsActive: 'Aktiivinen',
  adsPaused: 'Keskeytetty',
  adsNoCampaigns: 'Ei kampanjoita vielä — luo yksi tai synkronoi Metasta.',
  adsNoAdSets: 'Ei mainosjoukkoja tälle suodattimelle.',
  adsNoAds: 'Ei mainoksia tälle suodattimelle.',
  adsLoading: 'Ladataan mainosten hallintaa…',
  adsSave: 'Tallenna',
  adsDelivery: 'Toimitus',
  adsDeliveryActiveHint: 'Toimitetaan juuri nyt Metassa',
  adsDeliveryPausedHint: 'Keskeytetty — ei kulutusta',
  adsPerformanceSection: 'Suorituskyky',
  adsSettings: 'Asetukset',
  adsObjective: 'Tavoite',
  adsTargeting: 'Kohdennus',
  adsHeadline: 'Otsikko',
  adsCreative: 'Creative',
  adsNoCreative: 'Ei creative-esikatselua',
  adsParentCampaign: 'Kampanja',
  adsParentAdSet: 'Mainosjoukko',
  adsAdAccount: 'Mainostili',
  adsViewAdSets: 'Näytä mainosjoukot',
  adsViewAds: 'Näytä mainokset',
  adsSaveBudget: 'Tallenna budjetti',
  adsDetailsCampaign: 'Kampanjan tiedot',
  adsDetailsAdSet: 'Mainosjoukon tiedot',
  adsDetailsAd: 'Mainoksen tiedot',
  adsMetaSyncNote:
    'Muutokset synkataan Metaan, kun Facebook on yhdistetty mainosoikeuksilla; demorivit päivittyvät paikallisesti.',
  adsToastActive: 'Asetettu aktiiviseksi',
  adsToastPaused: 'Keskeytetty',
  adsToastBudget: 'Päiväbudjetti päivitetty',
  adsBudgetHint: 'Summa, jonka Meta voi käyttää päivässä tälle: {kind}.',
  adsFromDate: 'Alkaen',
  adsCreateTitle: 'Luo kampanja',
  adsStepObjective: 'Tavoite',
  adsStepAudience: 'Yleisö ja uudelleenkohdennus',
  adsStepCreative: 'Creative',
  adsCampaignName: 'Kampanjan nimi',
  adsDailyBudgetLabel: 'Päiväbudjetti ({currency})',
  adsContinue: 'Jatka',
  adsCancel: 'Peruuta',
  adsBack: 'Takaisin',
  adsCreateSubmit: 'Luo kampanja',
  adsAiCopywriter: 'AI-copywriter',
  adsCreativeSources: 'Lisää laitteelta, mediakirjastosta tai Google Drivesta.',
  adsFromDevice: 'Laitteelta',
  adsMediaLibrary: 'Mediakirjasto',
  adsDropCreative: 'Pudota kuva tai video tähän',
  adsOrChooseSource: 'Tai valitse lähde alta',
  adsRemove: 'Poista',
  adsSelected: '{kind} valittu',
  adsObjSales: 'Myynti',
  adsObjLeads: 'Liidit',
  adsObjTraffic: 'Liikenne',
  adsObjEngagement: 'Engagement',
  adsObjSalesBlurb: 'Kasvata ostoksia ja checkout-valmistumisia.',
  adsObjLeadsBlurb: 'Kerää sähköposteja, jonolistoja ja lomakkeita.',
  adsObjTrafficBlurb: 'Ohjaa liikennettä kauppaan tai bio-linkkiin.',
  adsObjEngagementBlurb: 'Kasvata julkaisujen ja Reelsien vuorovaikutusta.',
};

export const EXTRA_BY_LOCALE: Record<ExtraLocale, ExtraDict> = {
  en: EXTRA_EN,
  sv: EXTRA_SV,
  no: EXTRA_NO,
  da: EXTRA_DA,
  fi: EXTRA_FI,
};
