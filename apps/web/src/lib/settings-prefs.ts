/**
 * Lightweight local persistence for settings extras (timezone, org branding,
 * AI usage meters, pending invites) until dedicated APIs are fully wired.
 */

export type OrgBranding = {
  name: string;
  logoUrl: string | null;
  faviconUrl: string | null;
};

export type PendingInvite = {
  id: string;
  name: string;
  email: string;
  role: string;
  space: string;
  invitedAt: string;
};

export type AiUsageSnapshot = {
  used: number;
  limit: number;
  monthKey: string;
};

const TZ_KEY = 'clikd_account_timezone';
const ORG_KEY = 'clikd_org_branding_';
const INVITES_KEY = 'clikd_pending_invites_';
const AI_KEY = 'clikd_ai_usage_';

export function detectDefaultTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Stockholm';
  } catch {
    return 'Europe/Stockholm';
  }
}

export function loadTimezone(userId?: string | null): string {
  if (typeof window === 'undefined') return 'Europe/Stockholm';
  try {
    return (
      localStorage.getItem(`${TZ_KEY}_${userId || 'anon'}`) ||
      detectDefaultTimezone()
    );
  } catch {
    return detectDefaultTimezone();
  }
}

export function saveTimezone(tz: string, userId?: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`${TZ_KEY}_${userId || 'anon'}`, tz);
  } catch {
    /* ignore */
  }
}

export function loadOrgBranding(workspaceId?: string | null): OrgBranding {
  const empty: OrgBranding = { name: '', logoUrl: null, faviconUrl: null };
  if (typeof window === 'undefined') return empty;
  try {
    const raw = localStorage.getItem(`${ORG_KEY}${workspaceId || 'default'}`);
    if (!raw) return empty;
    return { ...empty, ...(JSON.parse(raw) as Partial<OrgBranding>) };
  } catch {
    return empty;
  }
}

export function saveOrgBranding(
  branding: OrgBranding,
  workspaceId?: string | null
): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(
      `${ORG_KEY}${workspaceId || 'default'}`,
      JSON.stringify(branding)
    );
  } catch {
    /* ignore */
  }
}

export function loadPendingInvites(userId?: string | null): PendingInvite[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(`${INVITES_KEY}${userId || 'anon'}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PendingInvite[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function savePendingInvites(
  invites: PendingInvite[],
  userId?: string | null
): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(
      `${INVITES_KEY}${userId || 'anon'}`,
      JSON.stringify(invites)
    );
  } catch {
    /* ignore */
  }
}

function currentMonthKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function loadAiUsage(userId?: string | null): AiUsageSnapshot {
  const monthKey = currentMonthKey();
  // Demo meter until billing meters are wired (matches Settings UX example).
  const fallback: AiUsageSnapshot = { used: 12450, limit: 100000, monthKey };
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(`${AI_KEY}${userId || 'anon'}`);
    if (!raw) {
      localStorage.setItem(`${AI_KEY}${userId || 'anon'}`, JSON.stringify(fallback));
      return fallback;
    }
    const parsed = JSON.parse(raw) as AiUsageSnapshot;
    if (parsed.monthKey !== monthKey) {
      const reset = { used: 0, limit: parsed.limit || 100000, monthKey };
      localStorage.setItem(`${AI_KEY}${userId || 'anon'}`, JSON.stringify(reset));
      return reset;
    }
    return parsed;
  } catch {
    return fallback;
  }
}

/** Common IANA zones for Nordic-first creators. */
export const TIMEZONE_OPTIONS: { value: string; label: string }[] = [
  { value: 'Europe/Stockholm', label: 'Europe/Stockholm (CET/CEST)' },
  { value: 'Europe/Oslo', label: 'Europe/Oslo (CET/CEST)' },
  { value: 'Europe/Copenhagen', label: 'Europe/Copenhagen (CET/CEST)' },
  { value: 'Europe/Helsinki', label: 'Europe/Helsinki (EET/EEST)' },
  { value: 'Europe/London', label: 'Europe/London (GMT/BST)' },
  { value: 'Europe/Berlin', label: 'Europe/Berlin (CET/CEST)' },
  { value: 'Europe/Amsterdam', label: 'Europe/Amsterdam (CET/CEST)' },
  { value: 'America/New_York', label: 'America/New_York (ET)' },
  { value: 'America/Los_Angeles', label: 'America/Los_Angeles (PT)' },
  { value: 'UTC', label: 'UTC' },
];
