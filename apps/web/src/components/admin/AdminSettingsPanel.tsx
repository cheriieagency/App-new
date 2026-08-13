'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  Check,
  ChevronDown,
  CreditCard,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  Grid3X3,
  List,
  LogOut,
  Mail,
  Plus,
  Search,
  Settings2,
  Shield,
  Sparkles,
  User,
  UserPlus,
  Users,
  X,
  type LucideIcon,
  Zap,
} from 'lucide-react';
import { authClient } from '@/lib/auth-client';
import { signOutAndRedirect } from '@/lib/sign-out-client';
import { useWorkspace } from '@/context/WorkspaceContext';
import { useAdminNav } from '@/components/admin/AdminNavContext';
import { adminCardClass } from '@/components/admin/AdminUi';
import CreateWorkspaceModal from '@/components/planner/CreateWorkspaceModal';
import { FeatureGate, PlanLockBadge } from '@/components/common/FeatureGate';
import { useSubscription } from '@/components/common/useSubscription';
import UpgradeModal from '@/components/common/UpgradeModal';
import {
  FacebookIcon,
  InstagramIcon,
  LinkedInIcon,
  PinterestIcon,
  TikTokIcon,
  YouTubeIcon,
} from '@/components/icons/SocialBrandIcons';
import {
  PLATFORM_META,
  TEAM_ROLE_OPTIONS,
  type ConnectedSocialAccount,
  type PlannerTeamMember,
  type SocialPlatform,
  type TeamRole,
} from '@/lib/mock-content-planner';
import type { EmailAutomation } from '@/lib/mock-email-crm';
import { useLocale } from '@/lib/locale-context';
import { t, tf, localeTag, type TranslationKey } from '@/lib/i18n';
import {
  DEFAULT_NOTIF_PREFS,
  loadNotificationPrefs,
  saveNotificationPrefs,
  type NotifPrefKey,
  type NotificationPrefs,
} from '@/lib/notification-prefs';

type SettingsTab =
  | 'profile'
  | 'notifications'
  | 'integrations'
  | 'general'
  | 'members'
  | 'spaces'
  | 'workflows'
  | 'billing'
  | 'ai';

type NavItem = { id: SettingsTab; labelKey: TranslationKey; icon: LucideIcon };

const PROFILE_NAV: NavItem[] = [
  { id: 'profile', labelKey: 'settingsNavProfile', icon: User },
  { id: 'notifications', labelKey: 'settingsNavNotifications', icon: Bell },
  { id: 'integrations', labelKey: 'settingsNavIntegrations', icon: Grid3X3 },
];

const ORG_NAV: NavItem[] = [
  { id: 'general', labelKey: 'settingsNavGeneral', icon: FileText },
  { id: 'members', labelKey: 'settingsNavMembers', icon: Users },
  { id: 'spaces', labelKey: 'settingsNavSpaces', icon: List },
  { id: 'workflows', labelKey: 'settingsNavWorkflows', icon: Zap },
  { id: 'billing', labelKey: 'settingsNavBilling', icon: CreditCard },
  { id: 'ai', labelKey: 'settingsNavAi', icon: Sparkles },
];

const TIERS = [
  {
    id: 'starter',
    name: 'Starter',
    socialSets: 1,
    profiles: 8,
    price: 'Free',
    current: true,
  },
  {
    id: 'growth',
    name: 'Growth',
    socialSets: 2,
    profiles: 16,
    price: '199 SEK/mo',
    current: false,
  },
  {
    id: 'scale',
    name: 'Scale',
    socialSets: 6,
    profiles: 48,
    price: '499 SEK/mo',
    current: false,
  },
] as const;

const SOCIAL_ICONS = {
  instagram: InstagramIcon,
  facebook: FacebookIcon,
  tiktok: TikTokIcon,
  linkedin: LinkedInIcon,
  youtube: YouTubeIcon,
  pinterest: PinterestIcon,
} as const;

const PLATFORM_ORDER: SocialPlatform[] = [
  'instagram',
  'facebook',
  'tiktok',
  'youtube',
  'linkedin',
  'pinterest',
];

const IN_APP_NOTIF_KEYS: Exclude<NotifPrefKey, 'weeklyEmailDigest'>[] = [
  'notifNewMembers',
  'notifPurchases',
  'notifAutomations',
  'notifLiveReminders',
];

/** Demo renewal — first of next month. */
function nextRenewalDate(locale: string): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 1, 1);
  d.setHours(0, 0, 0, 0);
  return d.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/** Format like "Aug 10, 2026 8:00 PM" for billing timestamps. */
function formatBillingStamp(date: Date, locale: string): string {
  return date.toLocaleString(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function trialEndDate(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  d.setHours(21, 0, 0, 0);
  return d;
}

function planStartDate(): Date {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  d.setHours(20, 0, 0, 0);
  return d;
}

function SectionBlock({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="py-6 border-b border-slate-100 last:border-0">
      <h3 className="text-base font-extrabold text-slate-900 tracking-tight">{title}</h3>
      {subtitle ? (
        <p className="text-sm text-slate-500 font-medium mt-0.5 mb-4">{subtitle}</p>
      ) : (
        <div className="mb-4" />
      )}
      {children}
    </section>
  );
}

function FieldRow({
  label,
  hint,
  children,
  action,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div>
        <p className="text-sm font-semibold text-slate-800">{label}</p>
        {hint ? <p className="text-xs text-slate-400 font-medium mt-0.5">{hint}</p> : null}
      </div>
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
        <div className="flex-1 min-w-0">{children}</div>
        {action}
      </div>
    </div>
  );
}

export default function AdminSettingsPanel() {
  const { locale } = useLocale();
  const { setSection } = useAdminNav();
  const {
    activeWorkspace,
    brandWorkspaces,
    setActiveWorkspaceId,
    refreshWorkspaces,
  } = useWorkspace();
  const { data: session } = authClient.useSession();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<SettingsTab>('profile');
  const [spaceQuery, setSpaceQuery] = useState('');
  const [displayName, setDisplayName] = useState(session?.user?.name || 'Ebba');
  const [email, setEmail] = useState(session?.user?.email || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [weekStart, setWeekStart] = useState('monday');
  const [savedFlash, setSavedFlash] = useState('');
  const [twoFaEnabled, setTwoFaEnabled] = useState(false);
  const [createWsOpen, setCreateWsOpen] = useState(false);
  const [notifPrefs, setNotifPrefs] = useState<NotificationPrefs>(DEFAULT_NOTIF_PREFS);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<TeamRole>('editor');
  const [inviteSpace, setInviteSpace] = useState<'all' | string>('all');
  const [roleMenuId, setRoleMenuId] = useState<string | null>(null);
  const [spaceMenuId, setSpaceMenuId] = useState<string | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  /** Per-member space access override: 'all' or workspace name. */
  const [spaceAccess, setSpaceAccess] = useState<Record<string, string>>({});

  useEffect(() => {
    if (session?.user?.name) setDisplayName(session.user.name);
    if (session?.user?.email) setEmail(session.user.email);
  }, [session?.user?.name, session?.user?.email]);

  useEffect(() => {
    setNotifPrefs(loadNotificationPrefs(session?.user?.id));
  }, [session?.user?.id]);

  const userName = session?.user?.name || displayName || 'Creator';
  const userEmail = session?.user?.email || email || '—';
  const initial = (userName[0] || 'C').toUpperCase();
  const tag = localeTag(locale);

  const filteredSpaces = useMemo(() => {
    const q = spaceQuery.trim().toLowerCase();
    if (!q) return brandWorkspaces;
    return brandWorkspaces.filter(
      (w) =>
        w.name.toLowerCase().includes(q) || w.handle.toLowerCase().includes(q)
    );
  }, [brandWorkspaces, spaceQuery]);

  const { data: socialsData, isLoading: socialsLoading } = useQuery<{
    accounts: ConnectedSocialAccount[];
  }>({
    queryKey: ['social-accounts'],
    queryFn: async () => {
      const r = await fetch('/api/socials/accounts', { credentials: 'include' });
      if (!r.ok) throw new Error('Failed');
      return r.json();
    },
    enabled: tab === 'integrations',
    staleTime: 15_000,
    refetchOnMount: 'always',
  });

  const { data: teamData } = useQuery<{
    members: PlannerTeamMember[];
    all_members: PlannerTeamMember[];
  }>({
    queryKey: ['planner-team'],
    queryFn: async () => {
      const r = await fetch('/api/planner/team');
      if (!r.ok) throw new Error('Failed');
      return r.json();
    },
    enabled: tab === 'spaces' || tab === 'members',
  });

  const { data: emailData } = useQuery<{ automations: EmailAutomation[] }>({
    queryKey: ['admin-email'],
    queryFn: async () => {
      const r = await fetch('/api/admin/email');
      if (!r.ok) throw new Error('Failed');
      return r.json();
    },
    enabled: tab === 'workflows',
  });

  const accountsByPlatform = useMemo(() => {
    const map = new Map<SocialPlatform, ConnectedSocialAccount>();
    for (const a of socialsData?.accounts ?? []) map.set(a.platform, a);
    return map;
  }, [socialsData?.accounts]);

  const membersByWorkspace = useMemo(() => {
    const all = teamData?.all_members ?? teamData?.members ?? [];
    const map = new Map<string, PlannerTeamMember[]>();
    for (const ws of brandWorkspaces) {
      map.set(
        ws.id,
        all.filter(
          (m) =>
            m.project === ws.name ||
            m.project.toLowerCase() === ws.name.toLowerCase()
        )
      );
    }
    return map;
  }, [teamData, brandWorkspaces]);

  /** Unique org members (by email) for the Members settings view. */
  const orgMembers = useMemo(() => {
    const rank = (r: TeamRole) =>
      r === 'owner' ? 4 : r === 'editor' ? 3 : r === 'approver' ? 2 : 1;
    const all = teamData?.all_members ?? teamData?.members ?? [];
    const byEmail = new Map<string, PlannerTeamMember>();
    for (const m of all) {
      const key = m.email.toLowerCase();
      const prev = byEmail.get(key);
      if (!prev || rank(m.role) > rank(prev.role)) byEmail.set(key, m);
    }
    if (session?.user?.email) {
      const key = session.user.email.toLowerCase();
      if (!byEmail.has(key)) {
        byEmail.set(key, {
          id: `self-${key}`,
          name: session.user.name || userName,
          email: session.user.email,
          role: 'owner',
          project: activeWorkspace.name,
          avatar_url: session.user.image || '',
          planner_access: true,
          status: 'active',
          invited_at: new Date().toISOString(),
        });
      }
    }
    return Array.from(byEmail.values()).sort((a, b) => rank(b.role) - rank(a.role));
  }, [teamData, session?.user, userName, activeWorkspace.name]);

  useEffect(() => {
    if (tab !== 'members') return;
    if (selectedMemberId && orgMembers.some((m) => m.id === selectedMemberId)) return;
    if (orgMembers[0]) setSelectedMemberId(orgMembers[0].id);
  }, [tab, orgMembers, selectedMemberId]);

  const inviteMutation = useMutation({
    mutationFn: async () => {
      const project =
        inviteSpace === 'all'
          ? activeWorkspace.name
          : inviteSpace;
      const r = await fetch('/api/planner/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add',
          name: inviteName.trim() || inviteEmail.split('@')[0],
          email: inviteEmail.trim(),
          role: inviteRole === 'owner' ? 'editor' : inviteRole,
          project,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Failed');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planner-team'] });
      flash(t('settingsInviteSent', locale));
      setInviteOpen(false);
      setInviteName('');
      setInviteEmail('');
      setInviteRole('editor');
      setInviteSpace('all');
    },
    onError: (e) => {
      flash(e instanceof Error ? e.message : 'Failed');
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: TeamRole }) => {
      const r = await fetch('/api/planner/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update', id, role }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Failed');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planner-team'] });
      setRoleMenuId(null);
    },
  });

  const roleLabel = (role: TeamRole) => {
    if (role === 'owner') return t('settingsRoleAdmin', locale);
    if (role === 'editor') return t('settingsRoleEditor', locale);
    if (role === 'approver') return t('settingsRoleApprover', locale);
    return t('settingsRoleViewer', locale);
  };

  const flash = (msg: string) => {
    setSavedFlash(msg);
    window.setTimeout(() => setSavedFlash(''), 1800);
  };

  const toggleNotif = (key: NotifPrefKey) => {
    setNotifPrefs((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      saveNotificationPrefs(next, session?.user?.id);
      flash(t('notifPrefsSaved', locale));
      return next;
    });
  };

  const signOut = () => {
    void signOutAndRedirect('/');
  };

  const closeSettings = () => setSection('analytics');
  const renewalLabel = nextRenewalDate(tag);
  const planSinceStamp = formatBillingStamp(planStartDate(), tag);
  const trialEndsStamp = formatBillingStamp(trialEndDate(), tag);
  const nextInvoiceStamp = formatBillingStamp(trialEndDate(), tag);
  const invoiceDateStamp = planStartDate().toLocaleDateString(tag, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const seatCount = Math.max(1, orgMembers.length);
  const billingName = session?.user?.name || userName;
  const billingAddress = 'Sturegatan 18B, 211 50 Malmö, Sweden';

  const navBtn = (item: NavItem) => {
    const Icon = item.icon;
    const active = tab === item.id;
    return (
      <button
        key={item.id}
        type="button"
        onClick={() => setTab(item.id)}
        className={`w-full flex items-center gap-2.5 h-10 min-h-[40px] px-3 rounded-xl text-sm font-semibold transition-colors ${
          active
            ? 'bg-slate-100 text-slate-900'
            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
        }`}
      >
        <Icon size={15} className={active ? 'text-slate-700' : 'text-slate-400'} />
        {t(item.labelKey, locale)}
      </button>
    );
  };

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl shadow-[0_1px_2px_rgba(15,23,42,0.03)] overflow-hidden min-h-[calc(100vh-8rem)]">
      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] min-h-[inherit]">
        <aside className="border-b lg:border-b-0 lg:border-r border-slate-100 bg-[#FAFAFA] p-4 flex flex-col gap-5">
          <div>
            <p className="text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-slate-400 px-3 mb-1.5">
              {t('settingsNavProfile', locale)}
            </p>
            <div className="space-y-0.5">{PROFILE_NAV.map(navBtn)}</div>
          </div>

          <div>
            <p className="text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-slate-400 px-3 mb-1.5">
              {t('settingsOrg', locale)}
            </p>
            <div className="space-y-0.5">{ORG_NAV.map(navBtn)}</div>
          </div>

          <div className="mt-auto pt-2">
            <p className="text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-slate-400 px-3 mb-2">
              {t('settingsWorkspaces', locale)}
            </p>
            <div className="relative mb-2">
              <Search
                size={13}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={spaceQuery}
                onChange={(e) => setSpaceQuery(e.target.value)}
                placeholder={t('settingsSearchWorkspaces', locale)}
                className="w-full h-10 min-h-[40px] pl-9 pr-3 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-slate-300"
              />
            </div>
            <div className="space-y-0.5 max-h-40 overflow-y-auto mb-2">
              {filteredSpaces.map((w) => (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => {
                    setActiveWorkspaceId(w.id);
                    setTab('spaces');
                  }}
                  className="w-full flex items-center gap-2 px-3 h-9 rounded-xl text-xs font-semibold text-slate-600 hover:bg-white transition-colors text-left"
                >
                  <span
                    className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                    style={{ background: w.color || '#1a1848' }}
                  >
                    {w.name[0]}
                  </span>
                  <span className="truncate">{w.name}</span>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setCreateWsOpen(true)}
              className="w-full flex items-center gap-2 h-10 min-h-[40px] px-3 rounded-xl text-sm font-semibold text-[#1a1848] hover:bg-[#E9D5FF]/40 transition-colors"
            >
              <Plus size={14} className="text-[#F472B6]" />
              {t('settingsNewWorkspace', locale)}
            </button>
          </div>
        </aside>

        <div className="flex flex-col min-w-0 bg-white">
          <div className="flex items-center justify-between gap-3 px-5 sm:px-7 py-4 border-b border-slate-100">
            <div className="flex items-center gap-3 min-w-0">
              {ORG_NAV.some((n) => n.id === tab) ? (
                <div className="min-w-0">
                  <p className="text-lg font-extrabold text-slate-900 tracking-tight">
                    {t('settingsOrgTitle', locale)}
                  </p>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    {t('settingsOrgSub', locale)}
                  </p>
                </div>
              ) : (
                <>
                  <div className="w-10 h-10 min-h-[40px] min-w-[40px] rounded-xl bg-[#1a1848] text-white flex items-center justify-center text-sm font-extrabold flex-shrink-0 overflow-hidden">
                    {session?.user?.image ? (
                      <img
                        src={session.user.image}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      initial
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-extrabold text-slate-900 truncate">{userName}</p>
                    <p className="text-xs font-medium text-slate-500 truncate">{userEmail}</p>
                  </div>
                </>
              )}
            </div>
            <button
              type="button"
              onClick={closeSettings}
              className="h-11 w-11 min-h-[44px] min-w-[44px] rounded-xl hover:bg-slate-50 inline-flex items-center justify-center text-slate-400"
              aria-label={t('settingsClose', locale)}
            >
              <X size={18} />
            </button>
          </div>

          {savedFlash ? (
            <div className="mx-5 sm:mx-7 mt-4 rounded-xl border border-emerald-100 bg-emerald-50 text-emerald-800 px-3 py-2 text-xs font-semibold inline-flex items-center gap-1.5 self-start">
              <Check size={12} /> {savedFlash}
            </div>
          ) : null}

          <div className="flex-1 overflow-y-auto px-5 sm:px-7 py-2 pb-8">
            {tab === 'profile' && (
              <>
                <SectionBlock
                  title={t('settingsNavProfile', locale)}
                  subtitle={t('settingsUpdateProfile', locale)}
                >
                  <FieldRow
                    label={t('displayName', locale)}
                    action={
                      <button
                        type="button"
                        onClick={() => flash(t('flashDisplayNameSaved', locale))}
                        className="h-11 min-h-[44px] px-4 rounded-xl bg-[#1a1848] text-white text-xs font-bold hover:bg-[#2B2568] transition-colors"
                      >
                        {t('save', locale)}
                      </button>
                    }
                  >
                    <input
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full h-11 min-h-[44px] rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 focus:outline-none focus:border-slate-400"
                    />
                  </FieldRow>
                </SectionBlock>

                <SectionBlock
                  title={t('settingsCalendar', locale)}
                  subtitle={t('settingsCalendarSub', locale)}
                >
                  <FieldRow label={t('settingsWeekStart', locale)}>
                    <select
                      value={weekStart}
                      onChange={(e) => setWeekStart(e.target.value)}
                      className="w-full h-11 min-h-[44px] rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 focus:outline-none"
                    >
                      <option value="monday">{t('settingsMonday', locale)}</option>
                      <option value="sunday">{t('settingsSunday', locale)}</option>
                    </select>
                  </FieldRow>
                </SectionBlock>

                <SectionBlock title={t('settingsSecurity', locale)}>
                  <div className="space-y-4">
                    <FieldRow
                      label={t('settingsNewPassword', locale)}
                      hint={t('settingsNewPasswordHint', locale)}
                      action={
                        <button
                          type="button"
                          onClick={() => {
                            setPassword('');
                            flash(t('flashPasswordUpdated', locale));
                          }}
                          className="h-11 min-h-[44px] px-4 rounded-xl bg-[#1a1848] text-white text-xs font-bold hover:bg-[#2B2568] transition-colors"
                        >
                          {t('settingsReset', locale)}
                        </button>
                      }
                    >
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full h-11 min-h-[44px] rounded-xl border border-slate-200 bg-white px-3 pr-11 text-sm font-medium focus:outline-none focus:border-slate-400"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((v) => !v)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-lg inline-flex items-center justify-center text-slate-400 hover:text-slate-600"
                        >
                          {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                    </FieldRow>

                    <div className="rounded-2xl border border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-extrabold text-slate-900">
                          {t('settingsEnable2fa', locale)}
                        </p>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">
                          {twoFaEnabled
                            ? t('settings2faOn', locale)
                            : t('settingsEnable2faSub', locale)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setTwoFaEnabled((v) => !v);
                          flash(
                            twoFaEnabled
                              ? t('flash2faDisabled', locale)
                              : t('flash2faEnabled', locale)
                          );
                        }}
                        className="inline-flex items-center justify-center gap-1.5 h-11 min-h-[44px] px-4 rounded-xl bg-[#1a1848] text-white text-xs font-bold hover:bg-[#2B2568] transition-colors flex-shrink-0"
                      >
                        <Shield size={13} />
                        {twoFaEnabled
                          ? t('settingsManage2fa', locale)
                          : t('settingsEnable2fa', locale)}
                      </button>
                    </div>
                  </div>
                </SectionBlock>

                <SectionBlock title={t('settingsContact', locale)}>
                  <FieldRow
                    label={t('settingsNewEmail', locale)}
                    hint={t('settingsNewEmailHint', locale)}
                    action={
                      <button
                        type="button"
                        onClick={() => flash(t('flashEmailConfirm', locale))}
                        className="h-11 min-h-[44px] px-4 rounded-xl bg-[#1a1848] text-white text-xs font-bold hover:bg-[#2B2568] transition-colors"
                      >
                        {t('settingsReset', locale)}
                      </button>
                    }
                  >
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full h-11 min-h-[44px] rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium focus:outline-none focus:border-slate-400"
                    />
                  </FieldRow>
                </SectionBlock>

                <div className="pt-6 space-y-2.5">
                  <button
                    type="button"
                    onClick={signOut}
                    className="w-full h-12 min-h-[48px] rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors inline-flex items-center justify-center gap-2"
                  >
                    <LogOut size={15} />
                    {t('settingsLogOut', locale)}
                  </button>
                  <button
                    type="button"
                    onClick={() => flash(t('flashDeleteConfirm', locale))}
                    className="w-full h-12 min-h-[48px] rounded-xl bg-rose-500 text-white text-sm font-bold hover:bg-rose-600 transition-colors"
                  >
                    {t('settingsDeleteAccount', locale)}
                  </button>
                </div>
              </>
            )}

            {tab === 'notifications' && (
              <>
                <SectionBlock
                  title={t('settingsNavNotifications', locale)}
                  subtitle={t('notifInAppHint', locale)}
                >
                  <div className="space-y-3">
                    {IN_APP_NOTIF_KEYS.map((key) => (
                      <label
                        key={key}
                        className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-4 py-3 min-h-[52px] cursor-pointer hover:bg-slate-50/80 transition-colors"
                      >
                        <span className="text-sm font-semibold text-slate-800">
                          {t(key, locale)}
                        </span>
                        <input
                          type="checkbox"
                          checked={notifPrefs[key]}
                          onChange={() => toggleNotif(key)}
                          className="h-5 w-5 rounded border-slate-300 accent-[#1a1848]"
                        />
                      </label>
                    ))}
                  </div>
                </SectionBlock>
                <SectionBlock
                  title={t('notifWeeklyDigest', locale)}
                  subtitle={t('notifWeeklyDigestHint', locale)}
                >
                  <label className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-4 py-3 min-h-[52px] cursor-pointer hover:bg-slate-50/80 transition-colors">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800">
                        {t('notifWeeklyDigest', locale)}
                      </p>
                      <p className="text-xs text-slate-400 font-medium mt-0.5 truncate">
                        {userEmail}
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={notifPrefs.weeklyEmailDigest}
                      onChange={() => toggleNotif('weeklyEmailDigest')}
                      className="h-5 w-5 rounded border-slate-300 accent-[#1a1848] flex-shrink-0"
                    />
                  </label>
                </SectionBlock>
              </>
            )}

            {tab === 'integrations' && (
              <SectionBlock
                title={t('settingsNavIntegrations', locale)}
                subtitle={t('settingsIntegrationsSub', locale)}
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                  <div>
                    <p className="text-sm font-bold text-slate-800">
                      {activeWorkspace.name}
                    </p>
                    <p className="text-xs font-mono font-bold text-slate-400">
                      @{activeWorkspace.handle.replace(/^@/, '')}
                    </p>
                  </div>
                  <Link
                    href="/admin/settings/socials"
                    className="inline-flex items-center justify-center h-11 min-h-[44px] px-4 rounded-xl bg-[#1a1848] text-white text-xs font-bold hover:bg-[#2B2568] transition-colors"
                  >
                    {t('settingsManageSocials', locale)}
                  </Link>
                </div>

                <p className="text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-slate-400 mb-2">
                  {t('settingsIntegrationsOverview', locale)}
                </p>

                {socialsLoading ? (
                  <p className="text-sm text-slate-400 font-medium py-6">
                    {t('loading', locale)}
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {PLATFORM_ORDER.map((platform) => {
                      const account = accountsByPlatform.get(platform);
                      const connected = Boolean(account?.connected);
                      const Icon = SOCIAL_ICONS[platform];
                      const meta = PLATFORM_META[platform];
                      return (
                        <div
                          key={platform}
                          className={`${adminCardClass} p-4 flex items-start gap-3`}
                        >
                          <div
                            className="w-10 h-10 min-h-[40px] min-w-[40px] rounded-xl flex items-center justify-center flex-shrink-0"
                            style={{ background: `${meta.color}14` }}
                          >
                            <Icon size={18} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-extrabold text-slate-900">
                              {meta.label}
                            </p>
                            <p className="text-xs font-medium text-slate-500 truncate mt-0.5">
                              {connected
                                ? account?.handle ||
                                  account?.display_name ||
                                  meta.label
                                : t('settingsApiNotConnected', locale)}
                            </p>
                            <p
                              className={`text-[10px] font-bold mt-1.5 ${
                                connected ? 'text-emerald-600' : 'text-slate-400'
                              }`}
                            >
                              {connected
                                ? t('settingsApiAuthorized', locale)
                                : t('settingsApiNotConnected', locale)}
                            </p>
                            {connected && account?.connected_at ? (
                              <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                                {tf('settingsConnectedAt', locale, {
                                  date: new Date(
                                    account.connected_at
                                  ).toLocaleDateString(tag),
                                })}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {!socialsLoading &&
                (socialsData?.accounts ?? []).every((a) => !a.connected) ? (
                  <p className="text-xs text-slate-400 font-medium mt-4">
                    {t('settingsNoSocialsYet', locale)}
                  </p>
                ) : null}
              </SectionBlock>
            )}

            {tab === 'spaces' && (
              <SectionBlock
                title={t('settingsNavSpaces', locale)}
                subtitle={t('settingsWorkspacesSub', locale)}
              >
                <div className="flex justify-end mb-4">
                  <button
                    type="button"
                    onClick={() => setCreateWsOpen(true)}
                    className="inline-flex items-center gap-1.5 h-11 min-h-[44px] px-4 rounded-xl bg-[#1a1848] text-white text-xs font-bold hover:bg-[#2B2568] transition-colors"
                  >
                    <Plus size={14} />
                    {t('settingsAddWorkspace', locale)}
                  </button>
                </div>
                <div className="space-y-4">
                  {brandWorkspaces.map((ws) => {
                    const members = membersByWorkspace.get(ws.id) ?? [];
                    return (
                      <div
                        key={ws.id}
                        className={`${adminCardClass} p-4 sm:p-5 space-y-4`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <span
                              className="w-10 h-10 min-h-[40px] min-w-[40px] rounded-xl flex items-center justify-center text-sm font-extrabold text-white flex-shrink-0"
                              style={{ background: ws.color || '#1a1848' }}
                            >
                              {ws.name[0]}
                            </span>
                            <div className="min-w-0">
                              <p className="text-sm font-extrabold text-slate-900 truncate">
                                {ws.name}
                              </p>
                              <p className="text-xs font-mono font-bold text-slate-400">
                                @{ws.handle.replace(/^@/, '')}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setActiveWorkspaceId(ws.id)}
                            className="text-[10px] font-bold uppercase tracking-wide text-[#F472B6] hover:text-[#2B2568] flex-shrink-0 min-h-[44px] px-2"
                          >
                            {activeWorkspace.id === ws.id
                              ? t('settingsPlanActive', locale)
                              : t('openCommunity', locale)}
                          </button>
                        </div>

                        <div>
                          <p className="text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-slate-400 mb-2">
                            {t('settingsWorkspaceChannels', locale)}
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {(ws.channels ?? []).map((ch) => (
                              <span
                                key={ch}
                                className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600 capitalize"
                              >
                                {PLATFORM_META[ch]?.label || ch}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div>
                          <p className="text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-slate-400 mb-2">
                            {t('settingsWorkspaceMembers', locale)}
                          </p>
                          {members.length === 0 ? (
                            <p className="text-xs text-slate-400 font-medium">
                              {t('settingsNoMembers', locale)}
                            </p>
                          ) : (
                            <ul className="space-y-2">
                              {members.map((m) => (
                                <li
                                  key={m.id}
                                  className="flex items-center gap-3 rounded-xl border border-slate-100 px-3 py-2.5 min-h-[48px]"
                                >
                                  <img
                                    src={m.avatar_url}
                                    alt=""
                                    className="w-8 h-8 rounded-full bg-slate-100 flex-shrink-0"
                                  />
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-bold text-slate-800 truncate">
                                      {m.name}
                                    </p>
                                    <p className="text-[11px] text-slate-400 font-medium truncate">
                                      {m.email}
                                    </p>
                                  </div>
                                  <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500 bg-slate-50 border border-slate-100 rounded-lg px-2 py-1 capitalize">
                                    {m.role}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </SectionBlock>
            )}

            {tab === 'workflows' && (
              <SectionBlock
                title={t('settingsNavWorkflows', locale)}
                subtitle={t('settingsWorkflowsSub', locale)}
              >
                <div className="flex justify-end mb-4">
                  <button
                    type="button"
                    onClick={() => setSection('email')}
                    className="inline-flex items-center gap-1.5 h-11 min-h-[44px] px-4 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <Mail size={14} />
                    {t('settingsOpenEmailCrm', locale)}
                  </button>
                </div>
                {(emailData?.automations ?? []).length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-5 py-10 text-center">
                    <Zap size={20} className="mx-auto text-slate-300 mb-2" />
                    <p className="text-sm font-bold text-slate-700">
                      {t('settingsNoWorkflows', locale)}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {(emailData?.automations ?? []).map((auto) => (
                      <div
                        key={auto.id}
                        className={`${adminCardClass} p-4 flex flex-col sm:flex-row sm:items-center gap-3`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-extrabold text-slate-900">
                              {auto.name}
                            </p>
                            <span
                              className={`text-[10px] font-bold uppercase tracking-wide rounded-lg px-2 py-0.5 ${
                                auto.status === 'active'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-slate-100 text-slate-500'
                              }`}
                            >
                              {auto.status === 'active'
                                ? t('settingsWorkflowActive', locale)
                                : t('settingsWorkflowPaused', locale)}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 font-medium mt-1">
                            {auto.trigger_label || auto.description}
                          </p>
                          <p className="text-[11px] text-slate-400 font-medium mt-1.5">
                            {tf('settingsWorkflowSent', locale, {
                              n: auto.sent_count,
                            })}
                            {auto.last_sent_at
                              ? ` · ${tf('settingsWorkflowLastSent', locale, {
                                  date: new Date(
                                    auto.last_sent_at
                                  ).toLocaleDateString(tag),
                                })}`
                              : ''}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </SectionBlock>
            )}

            {tab === 'billing' && (
              <>
                {/* Subscriptions — current plan + manage */}
                <section className="py-6 border-b border-slate-100">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                        {t('settingsSubscriptions', locale)}
                      </h3>
                      <p className="text-sm text-slate-500 font-medium mt-0.5">
                        {t('settingsSubscriptionsSub', locale)}
                      </p>
                    </div>
                    <a
                      href="https://billing.stripe.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center h-10 min-h-[40px] px-4 rounded-xl bg-[#6366F1] text-white text-xs font-bold hover:bg-[#4F46E5] transition-colors flex-shrink-0"
                    >
                      {t('settingsManageSubscriptions', locale)}
                    </a>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-5">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-5">
                      <div>
                        <p className="text-base font-extrabold text-slate-900">
                          clikd: Starter
                        </p>
                        <p className="text-sm text-slate-500 font-medium mt-0.5">
                          {tf('settingsPlanSince', locale, { date: planSinceStamp })}
                        </p>
                      </div>
                      <span className="inline-flex items-center self-start rounded-full bg-slate-900 text-white text-[11px] font-bold px-3 py-1.5">
                        {tf('settingsTrialEnds', locale, { date: trialEndsStamp })}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 pt-4 border-t border-slate-100">
                      <div>
                        <p className="text-[11px] font-semibold text-slate-400 mb-1">
                          {t('settingsBillingMembers', locale)}
                        </p>
                        <p className="text-sm font-bold text-slate-900">{seatCount}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold text-slate-400 mb-1">
                          {t('settingsUnitPrice', locale)}
                        </p>
                        <p className="text-sm font-bold text-slate-900">0 SEK</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold text-slate-400 mb-1">
                          {t('settingsBillingInterval', locale)}
                        </p>
                        <p className="text-sm font-bold text-slate-900">
                          {t('settingsIntervalMonth', locale)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold text-slate-400 mb-1">
                          {t('settingsNextInvoice', locale)}
                        </p>
                        <p className="text-sm font-bold text-slate-900">{nextInvoiceStamp}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold text-slate-400 mb-1">
                          {t('settingsFirstCharge', locale)}
                        </p>
                        <p className="text-sm font-bold text-slate-900">0 SEK</p>
                      </div>
                    </div>
                  </div>

                  <p className="text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-slate-400 mt-5 mb-2">
                    {t('settingsAvailablePlans', locale)}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {TIERS.map((tier) => (
                      <div
                        key={tier.id}
                        className={`rounded-2xl border p-4 ${
                          tier.current
                            ? 'border-slate-900 bg-slate-50'
                            : 'border-slate-200/80 bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-extrabold text-slate-900">{tier.name}</p>
                          {tier.current && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                              <Check size={11} /> {t('settingsPlanActive', locale)}
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-medium text-slate-600">
                          {tier.socialSets} Social Set{tier.socialSets > 1 ? 's' : ''} /{' '}
                          {tier.profiles} Profiles
                        </p>
                        <p className="text-[11px] font-mono font-bold text-slate-400 mt-2 uppercase tracking-wide">
                          {tier.price}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Billing details */}
                <section className="py-6 border-b border-slate-100">
                  <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                    {t('settingsBillingDetails', locale)}
                  </h3>
                  <p className="text-sm text-slate-500 font-medium mt-0.5 mb-4">
                    {t('settingsBillingDetailsSub', locale)}
                  </p>

                  <div className="space-y-3">
                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900">{billingName}</p>
                        <p className="text-sm text-slate-500 font-medium mt-0.5">{userEmail}</p>
                        <p className="text-sm text-slate-500 font-medium mt-0.5">{billingAddress}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setTab('profile');
                          flash(t('settingsEdit', locale));
                        }}
                        className="text-sm font-semibold text-slate-700 hover:text-slate-900 flex-shrink-0 min-h-[44px] px-1"
                      >
                        {t('settingsEdit', locale)}
                      </button>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900">
                          {t('settingsPaymentMethodLabel', locale)}
                        </p>
                        <p className="text-sm text-slate-500 font-medium mt-0.5">
                          {t('settingsCardMastercard', locale)}
                        </p>
                        <p className="text-xs text-slate-400 font-medium mt-1">
                          {t('settingsRenewalDate', locale)}: {renewalLabel}
                        </p>
                      </div>
                      <a
                        href="https://billing.stripe.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-semibold text-slate-700 hover:text-slate-900 flex-shrink-0 min-h-[44px] px-1 inline-flex items-center"
                      >
                        {t('settingsEdit', locale)}
                      </a>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 flex items-center justify-between gap-3">
                      <p className="text-sm text-slate-500 font-medium">
                        {t('settingsNoTaxId', locale)}
                      </p>
                      <button
                        type="button"
                        onClick={() => flash(t('settingsAddTaxId', locale))}
                        className="text-sm font-semibold text-slate-700 hover:text-slate-900 flex-shrink-0 min-h-[44px] px-1"
                      >
                        {t('settingsAddTaxId', locale)}
                      </button>
                    </div>
                  </div>
                </section>

                {/* Invoice history */}
                <section className="py-6 border-b border-slate-100 last:border-0">
                  <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                    {t('settingsInvoiceHistory', locale)}
                  </h3>
                  <p className="text-sm text-slate-500 font-medium mt-0.5 mb-4">
                    {t('settingsInvoiceHistorySub', locale)}
                  </p>

                  <div className="rounded-2xl border border-slate-200 bg-white divide-y divide-slate-100">
                    <div className="flex items-center gap-3 px-4 py-3.5 min-h-[56px]">
                      <p className="text-sm font-semibold text-slate-500 w-[110px] flex-shrink-0">
                        {invoiceDateStamp}
                      </p>
                      <p className="text-sm font-medium text-slate-800 flex-1 min-w-0 truncate">
                        {t('settingsInvoiceTrial', locale)}
                      </p>
                      <p className="text-sm font-bold text-slate-900 flex-shrink-0">$0.00</p>
                      <a
                        href="https://billing.stripe.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="h-9 w-9 min-h-[36px] min-w-[36px] rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-50 inline-flex items-center justify-center flex-shrink-0"
                        aria-label={t('settingsInvoiceHistory', locale)}
                      >
                        <ExternalLink size={15} />
                      </a>
                    </div>
                  </div>
                </section>
              </>
            )}

            {tab === 'members' && (
              <SectionBlock
                title={t('settingsNavMembers', locale)}
                subtitle={tf('settingsMembersSub', locale, {
                  n: orgMembers.length,
                })}
              >
                <div className="flex justify-end mb-4">
                  <button
                    type="button"
                    onClick={() => setInviteOpen((v) => !v)}
                    className="inline-flex items-center gap-1.5 h-10 min-h-[40px] px-3.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <UserPlus size={14} />
                    {t('settingsInviteMember', locale)}
                  </button>
                </div>

                {inviteOpen && (
                  <div className={`${adminCardClass} p-4 mb-4 space-y-3`}>
                    <div>
                      <p className="text-sm font-extrabold text-slate-900">
                        {t('settingsInviteTitle', locale)}
                      </p>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">
                        {t('settingsInviteHint', locale)}
                      </p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                        value={inviteName}
                        onChange={(e) => setInviteName(e.target.value)}
                        placeholder={t('displayName', locale)}
                        className="h-11 min-h-[44px] rounded-xl border border-slate-200 px-3 text-sm font-medium focus:outline-none focus:border-slate-400"
                      />
                      <input
                        type="email"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder={t('email', locale)}
                        className="h-11 min-h-[44px] rounded-xl border border-slate-200 px-3 text-sm font-medium focus:outline-none focus:border-slate-400"
                      />
                      <select
                        value={inviteRole}
                        onChange={(e) => setInviteRole(e.target.value as TeamRole)}
                        className="h-11 min-h-[44px] rounded-xl border border-slate-200 px-3 text-sm font-medium focus:outline-none"
                      >
                        {TEAM_ROLE_OPTIONS.filter((o) => o.value !== 'owner').map(
                          (o) => (
                            <option key={o.value} value={o.value}>
                              {roleLabel(o.value)}
                            </option>
                          )
                        )}
                      </select>
                      <select
                        value={inviteSpace}
                        onChange={(e) => setInviteSpace(e.target.value)}
                        className="h-11 min-h-[44px] rounded-xl border border-slate-200 px-3 text-sm font-medium focus:outline-none"
                      >
                        <option value="all">{t('settingsAllSpaces', locale)}</option>
                        {brandWorkspaces.map((ws) => (
                          <option key={ws.id} value={ws.name}>
                            {ws.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => setInviteOpen(false)}
                        className="h-10 min-h-[40px] px-3.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50"
                      >
                        {t('cancel', locale)}
                      </button>
                      <button
                        type="button"
                        disabled={!inviteEmail.includes('@') || inviteMutation.isPending}
                        onClick={() => inviteMutation.mutate()}
                        className="h-10 min-h-[40px] px-4 rounded-xl bg-[#1a1848] text-white text-xs font-bold hover:bg-[#2B2568] disabled:opacity-50"
                      >
                        {t('settingsInviteSend', locale)}
                      </button>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  {orgMembers.map((m) => {
                    const selected = selectedMemberId === m.id;
                    const access = spaceAccess[m.id] || 'all';
                    const avatarLetter = (m.name?.[0] || m.email[0] || '?').toUpperCase();
                    return (
                      <div
                        key={m.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => setSelectedMemberId(m.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setSelectedMemberId(m.id);
                          }
                        }}
                        className={`relative flex flex-col sm:flex-row sm:items-center gap-3 rounded-2xl border bg-white px-3.5 py-3 min-h-[64px] transition-colors cursor-pointer ${
                          selected
                            ? 'border-slate-200 shadow-sm'
                            : 'border-slate-200/80 hover:border-slate-300'
                        }`}
                      >
                        {selected && (
                          <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-[#6366F1]" />
                        )}

                        <div className="flex items-center gap-3 min-w-0 flex-1 pl-1">
                          {m.avatar_url ? (
                            <img
                              src={m.avatar_url}
                              alt=""
                              className="w-10 h-10 min-h-[40px] min-w-[40px] rounded-full object-cover flex-shrink-0 bg-[#6366F1]"
                            />
                          ) : (
                            <div className="w-10 h-10 min-h-[40px] min-w-[40px] rounded-full bg-[#6366F1] text-white flex items-center justify-center text-sm font-extrabold flex-shrink-0">
                              {avatarLetter}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-extrabold text-slate-900 truncate">
                                {m.name}
                              </p>
                              {m.status === 'pending' && (
                                <span className="text-[10px] font-bold uppercase tracking-wide text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md">
                                  {t('settingsMemberPending', locale)}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-400 font-medium truncate">
                              {m.email}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0 pl-1 sm:pl-0">
                          <div className="relative">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSpaceMenuId((id) => (id === m.id ? null : m.id));
                                setRoleMenuId(null);
                              }}
                              className="inline-flex items-center justify-center gap-1 h-9 min-h-[36px] w-[118px] px-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50"
                            >
                              <span className="truncate">
                                {access === 'all'
                                  ? t('settingsAllSpaces', locale)
                                  : access}
                              </span>
                              <ChevronDown size={12} className="opacity-60 flex-shrink-0" />
                            </button>
                            {spaceMenuId === m.id && (
                              <div className="absolute right-0 top-full mt-1.5 z-20 w-52 rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden py-1">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSpaceAccess((prev) => ({
                                      ...prev,
                                      [m.id]: 'all',
                                    }));
                                    setSpaceMenuId(null);
                                  }}
                                  className="w-full text-left px-3 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                >
                                  {t('settingsAllSpaces', locale)}
                                </button>
                                {brandWorkspaces.map((ws) => (
                                  <button
                                    key={ws.id}
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSpaceAccess((prev) => ({
                                        ...prev,
                                        [m.id]: ws.name,
                                      }));
                                      setSpaceMenuId(null);
                                    }}
                                    className="w-full text-left px-3 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                  >
                                    {ws.name}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="relative">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setRoleMenuId((id) => (id === m.id ? null : m.id));
                                setSpaceMenuId(null);
                              }}
                              disabled={m.role === 'owner'}
                              className="inline-flex items-center justify-center gap-1.5 h-9 min-h-[36px] w-[118px] px-2.5 rounded-full bg-[#6366F1] text-white text-xs font-bold hover:bg-[#4F46E5] disabled:opacity-90 shadow-sm"
                            >
                              <Shield size={12} strokeWidth={2.5} className="flex-shrink-0" />
                              <span className="truncate">{roleLabel(m.role)}</span>
                              {m.role !== 'owner' ? (
                                <ChevronDown size={12} className="opacity-80 flex-shrink-0" />
                              ) : (
                                <span className="w-3 flex-shrink-0" aria-hidden />
                              )}
                            </button>
                            {roleMenuId === m.id && m.role !== 'owner' && (
                              <div className="absolute right-0 top-full mt-1.5 z-20 w-44 rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden py-1">
                                {TEAM_ROLE_OPTIONS.filter((o) => o.value !== 'owner').map(
                                  (o) => (
                                    <button
                                      key={o.value}
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        updateRoleMutation.mutate({
                                          id: m.id,
                                          role: o.value,
                                        });
                                      }}
                                      className={`w-full text-left px-3 py-2.5 text-xs font-semibold hover:bg-slate-50 ${
                                        m.role === o.value
                                          ? 'text-[#6366F1]'
                                          : 'text-slate-700'
                                      }`}
                                    >
                                      {roleLabel(o.value)}
                                    </button>
                                  )
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {orgMembers.length === 0 && (
                    <p className="text-sm text-slate-400 font-medium py-8 text-center">
                      {t('settingsNoMembers', locale)}
                    </p>
                  )}
                </div>
              </SectionBlock>
            )}

            {(tab === 'general' || tab === 'ai') && (
              <SectionBlock
                title={t(
                  ORG_NAV.find((n) => n.id === tab)?.labelKey || 'settings',
                  locale
                )}
                subtitle={
                  tab === 'ai'
                    ? 'AI Content & Member Copilot Suite'
                    : 'Custom domain & workspace general settings'
                }
              >
                {tab === 'general' ? (
                  <CustomDomainSettingsCard />
                ) : (
                  <AiCopilotSettingsCard />
                )}
              </SectionBlock>
            )}
          </div>
        </div>
      </div>

      <CreateWorkspaceModal
        open={createWsOpen}
        onOpenChange={setCreateWsOpen}
        createUrl="/api/admin/workspaces"
        onCreated={(ws) => {
          refreshWorkspaces();
          setActiveWorkspaceId(ws.id);
          setTab('spaces');
        }}
      />
    </div>
  );
}

function CustomDomainSettingsCard() {
  const {
    hasFeature,
    requestUpgrade,
    upgradeOpen,
    setUpgradeOpen,
    upgradeTarget,
  } = useSubscription();
  const canUse = hasFeature('customDomain');

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          <PlanLockBadge minPlan="pro" />
          <span className="text-xs font-medium text-slate-500">
            Link yourname.se to your bio & community via Vercel DNS
          </span>
        </div>
        <p className="text-sm text-slate-600 leading-relaxed">
          Connect an apex domain (A → 76.76.21.21) or subdomain (CNAME →
          cname.vercel-dns.com). Pro plan required.
        </p>
        {canUse ? (
          <a
            href="/admin/settings/domain"
            className="inline-flex items-center justify-center min-h-[44px] px-4 rounded-xl bg-[#0F172A] text-white text-sm font-bold"
          >
            Manage custom domain
          </a>
        ) : (
          <>
            <button
              type="button"
              onClick={() => requestUpgrade('pro')}
              className="inline-flex items-center justify-center min-h-[44px] px-4 rounded-xl bg-[#0F172A] text-white text-sm font-bold"
            >
              Unlock on Pro
            </button>
            <FeatureGate
              feature="customDomain"
              title="Custom Domain Linking"
              description="Connect yourname.se on the Pro plan."
            />
          </>
        )}
      </div>
      <UpgradeModal
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
        minPlan={upgradeTarget}
      />
    </>
  );
}

function AiCopilotSettingsCard() {
  const {
    hasFeature,
    requestUpgrade,
    upgradeOpen,
    setUpgradeOpen,
    upgradeTarget,
  } = useSubscription();
  const canUse = hasFeature('aiCopilotSuite');

  if (!canUse) {
    return (
      <>
        <FeatureGate
          feature="aiCopilotSuite"
          title="AI Content & Member Copilot"
          description="Generate course outlines, posts, and sales emails. Available on Pro."
        />
        <UpgradeModal
          open={upgradeOpen}
          onOpenChange={setUpgradeOpen}
          minPlan={upgradeTarget}
        />
      </>
    );
  }

  return (
    <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 px-5 py-6">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles size={16} className="text-emerald-700" />
        <p className="text-sm font-extrabold text-emerald-900">AI Copilot Suite unlocked</p>
      </div>
      <p className="text-xs font-medium text-emerald-800/80">
        Open the floating AI Copilot from Creator Admin to generate course outlines,
        community posts, sales emails, and headlines.
      </p>
      <button
        type="button"
        onClick={() => requestUpgrade('pro')}
        className="mt-4 hidden"
      />
    </div>
  );
}
