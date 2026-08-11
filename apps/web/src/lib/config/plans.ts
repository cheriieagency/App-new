/**
 * Subscription tier limits & feature flags for clikd: (Starter / Creator / Pro).
 * Single source of truth for UI gates, React hooks, and API route guards.
 */

export type WorkspacePlan = 'starter' | 'creator' | 'pro';

/** Sentinel for “unlimited” numeric caps. */
export const UNLIMITED = 999_999;

export type PlanFeatureKey =
  | 'socialPlanner'
  | 'bioStorefront'
  | 'mobileCheckout'
  | 'emailCRM'
  | 'emailBroadcasts'
  | 'coursesAndVideoHosting'
  | 'customDomain'
  | 'aiCopilotSuite'
  | 'prioritySupport';

export type PlanLimitKey =
  | 'maxWorkspaces'
  | 'maxCommunities'
  | 'maxCommunityMembers'
  | 'maxTeammateSeats'
  | 'maxVideoStorageGb'
  | 'maxEmailContacts';

export type PlanFeatures = Record<PlanFeatureKey, boolean>;

export type PlanLimits = {
  maxWorkspaces: number;
  maxCommunities: number;
  maxCommunityMembers: number;
  maxTeammateSeats: number;
  maxVideoStorageGb: number;
  maxEmailContacts: number;
  platformFeePercent: number;
  features: PlanFeatures;
};

export const PLAN_LIMITS: Record<WorkspacePlan, PlanLimits> = {
  starter: {
    maxWorkspaces: 1,
    maxCommunities: 1,
    maxCommunityMembers: 25,
    maxTeammateSeats: 1,
    maxVideoStorageGb: 0,
    maxEmailContacts: 250,
    platformFeePercent: 8.0,
    features: {
      socialPlanner: true,
      bioStorefront: true,
      mobileCheckout: true,
      emailCRM: true,
      emailBroadcasts: false,
      coursesAndVideoHosting: false,
      customDomain: false,
      aiCopilotSuite: false,
      prioritySupport: false,
    },
  },
  creator: {
    maxWorkspaces: 1,
    maxCommunities: 1,
    maxCommunityMembers: UNLIMITED,
    maxTeammateSeats: 2,
    maxVideoStorageGb: 25,
    maxEmailContacts: 2500,
    platformFeePercent: 2.5,
    features: {
      socialPlanner: true,
      bioStorefront: true,
      mobileCheckout: true,
      emailCRM: true,
      emailBroadcasts: true,
      coursesAndVideoHosting: true,
      customDomain: false,
      aiCopilotSuite: false,
      prioritySupport: false,
    },
  },
  pro: {
    maxWorkspaces: 3,
    maxCommunities: UNLIMITED,
    maxCommunityMembers: UNLIMITED,
    maxTeammateSeats: 5,
    maxVideoStorageGb: 100,
    maxEmailContacts: UNLIMITED,
    platformFeePercent: 0.0,
    features: {
      socialPlanner: true,
      bioStorefront: true,
      mobileCheckout: true,
      emailCRM: true,
      emailBroadcasts: true,
      coursesAndVideoHosting: true,
      customDomain: true,
      aiCopilotSuite: true,
      prioritySupport: true,
    },
  },
};

export const PLAN_RANK: Record<WorkspacePlan, number> = {
  starter: 0,
  creator: 1,
  pro: 2,
};

export const PLAN_DISPLAY_NAME: Record<WorkspacePlan, string> = {
  starter: 'Starter',
  creator: 'Creator',
  pro: 'Pro',
};

export function normalizeWorkspacePlan(value: unknown): WorkspacePlan {
  if (value === 'starter' || value === 'creator' || value === 'pro') return value;
  return 'starter';
}

export function getPlanLimits(plan: WorkspacePlan): PlanLimits {
  return PLAN_LIMITS[plan];
}

export function hasFeature(plan: WorkspacePlan, feature: PlanFeatureKey): boolean {
  return PLAN_LIMITS[plan].features[feature] === true;
}

export function isPlanAtLeast(plan: WorkspacePlan, minPlan: WorkspacePlan): boolean {
  return PLAN_RANK[plan] >= PLAN_RANK[minPlan];
}

export type LimitCheckResult = {
  allowed: boolean;
  limit: number;
  unlimited: boolean;
  remaining: number;
};

/** Check whether currentUsage is still under the plan limit (usage < limit). */
export function checkLimit(
  plan: WorkspacePlan,
  limitKey: PlanLimitKey,
  currentUsage: number
): LimitCheckResult {
  const limit = PLAN_LIMITS[plan][limitKey];
  const unlimited = limit >= UNLIMITED;
  const remaining = unlimited ? UNLIMITED : Math.max(0, limit - currentUsage);
  return {
    allowed: unlimited || currentUsage < limit,
    limit,
    unlimited,
    remaining,
  };
}

/** Lowest plan that unlocks a feature. */
export function minPlanForFeature(feature: PlanFeatureKey): WorkspacePlan {
  if (PLAN_LIMITS.starter.features[feature]) return 'starter';
  if (PLAN_LIMITS.creator.features[feature]) return 'creator';
  return 'pro';
}

export function formatLimit(limit: number): string {
  if (limit >= UNLIMITED) return 'Unlimited';
  return String(limit);
}

export function upgradeBadgeLabel(minPlan: WorkspacePlan): string {
  if (minPlan === 'pro') return '⚡ Upgrade to Pro';
  if (minPlan === 'creator') return '🔒 Requires Creator Plan';
  return 'Upgrade required';
}
