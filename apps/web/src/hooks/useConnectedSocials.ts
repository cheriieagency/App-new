'use client';

/**
 * Shared connected-socials gate for admin / planner.
 * Delegates to useSocialAccounts (live Supabase/Neon social_accounts).
 */

export {
  useSocialAccounts as useConnectedSocials,
  type SocialAccountsResponse,
} from '@/hooks/useSocialAccounts';
