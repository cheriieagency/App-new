/**
 * In-memory onboarding store for demo mode (no DATABASE_URL).
 */

export type OnboardingPayload = {
  full_name: string;
  role_category: string;
  primary_use_cases: string[];
  referral_source: string;
  brand_name: string;
  brand_website: string;
  team_size: string;
};

type StoredResponse = OnboardingPayload & {
  id: string;
  user_id: string;
  created_at: string;
};

const byUser = new Map<string, OnboardingPayload & { onboarding_completed: true }>();
const history: StoredResponse[] = [];

export function saveDemoOnboarding(userId: string, payload: OnboardingPayload) {
  byUser.set(userId, { ...payload, onboarding_completed: true });
  history.push({
    id: `onb-${Date.now()}`,
    user_id: userId,
    created_at: new Date().toISOString(),
    ...payload,
  });
  return { profile: byUser.get(userId)!, response: history[history.length - 1] };
}

export function getDemoOnboarding(userId: string) {
  return byUser.get(userId) ?? null;
}
