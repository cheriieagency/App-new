'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bell,
  Check,
  CreditCard,
  Eye,
  EyeOff,
  FileText,
  Grid3X3,
  Layers,
  List,
  LogOut,
  MousePointer2,
  Plus,
  Search,
  Settings2,
  Shield,
  Sparkles,
  Tag,
  User,
  Users,
  X,
  type LucideIcon,
  Zap,
} from 'lucide-react';
import { authClient } from '@/lib/auth-client';
import { clearPlatformRole } from '@/lib/use-platform-role';
import { useWorkspace } from '@/context/WorkspaceContext';
import { useAdminNav } from '@/components/admin/AdminNavContext';
import { adminCardClass } from '@/components/admin/AdminUi';
import { useLocale } from '@/lib/locale-context';
import { t, tf, type TranslationKey } from '@/lib/i18n';

type SettingsTab =
  | 'profile'
  | 'notifications'
  | 'integrations'
  | 'general'
  | 'members'
  | 'spaces'
  | 'tags'
  | 'branding'
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
  { id: 'tags', labelKey: 'settingsNavTags', icon: Tag },
  { id: 'branding', labelKey: 'settingsNavBranding', icon: MousePointer2 },
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
  const router = useRouter();
  const { locale } = useLocale();
  const { setSection } = useAdminNav();
  const { activeWorkspace, brandWorkspaces } = useWorkspace();
  const { data: session } = authClient.useSession();
  const [tab, setTab] = useState<SettingsTab>('profile');
  const [spaceQuery, setSpaceQuery] = useState('');
  const [displayName, setDisplayName] = useState(session?.user?.name || 'Ebba');
  const [email, setEmail] = useState(session?.user?.email || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [weekStart, setWeekStart] = useState('monday');
  const [savedFlash, setSavedFlash] = useState('');
  const [twoFaEnabled, setTwoFaEnabled] = useState(false);

  useEffect(() => {
    if (session?.user?.name) setDisplayName(session.user.name);
    if (session?.user?.email) setEmail(session.user.email);
  }, [session?.user?.name, session?.user?.email]);

  const userName = session?.user?.name || displayName || 'Creator';
  const userEmail = session?.user?.email || email || '—';
  const initial = (userName[0] || 'C').toUpperCase();

  const filteredSpaces = useMemo(() => {
    const q = spaceQuery.trim().toLowerCase();
    if (!q) return brandWorkspaces;
    return brandWorkspaces.filter(
      (w) =>
        w.name.toLowerCase().includes(q) || w.handle.toLowerCase().includes(q)
    );
  }, [brandWorkspaces, spaceQuery]);

  const flash = (msg: string) => {
    setSavedFlash(msg);
    window.setTimeout(() => setSavedFlash(''), 1800);
  };

  const signOut = () => {
    void clearPlatformRole().then(() =>
      authClient.signOut({
        fetchOptions: { onSuccess: () => router.push('/') },
      })
    );
  };

  const closeSettings = () => setSection('analytics');

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

  const notifLabels: TranslationKey[] = [
    'notifNewMembers',
    'notifPurchases',
    'notifAutomations',
    'notifLiveReminders',
  ];

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
                <div
                  key={w.id}
                  className="flex items-center gap-2 px-3 h-9 rounded-xl text-xs font-semibold text-slate-600"
                >
                  <span
                    className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                    style={{ background: w.color || '#1a1848' }}
                  >
                    {w.name[0]}
                  </span>
                  <span className="truncate">{w.name}</span>
                </div>
              ))}
            </div>
            <button
              type="button"
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
              <SectionBlock
                title={t('settingsNavNotifications', locale)}
                subtitle={t('settingsNotificationsSub', locale)}
              >
                <div className="space-y-3">
                  {notifLabels.map((key) => (
                    <label
                      key={key}
                      className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-4 py-3 min-h-[52px]"
                    >
                      <span className="text-sm font-semibold text-slate-800">
                        {t(key, locale)}
                      </span>
                      <input
                        type="checkbox"
                        defaultChecked
                        className="h-5 w-5 rounded border-slate-300 accent-[#1a1848]"
                      />
                    </label>
                  ))}
                </div>
              </SectionBlock>
            )}

            {tab === 'integrations' && (
              <SectionBlock
                title={t('settingsNavIntegrations', locale)}
                subtitle={t('settingsSocialSetsHint', locale)}
              >
                <p className="text-sm text-slate-500 mb-4">
                  {activeWorkspace.handle}
                </p>
                <Link
                  href="/admin/settings/socials"
                  className="inline-flex items-center justify-center h-11 min-h-[44px] px-4 rounded-xl bg-[#1a1848] text-white text-xs font-bold hover:bg-[#2B2568] transition-colors"
                >
                  {t('settingsManageSocials', locale)}
                </Link>
              </SectionBlock>
            )}

            {tab === 'billing' && (
              <>
                <SectionBlock
                  title={t('settingsNavBilling', locale)}
                  subtitle={tf('settingsBillingSub', locale, {
                    handle: activeWorkspace.handle,
                  })}
                >
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
                </SectionBlock>
                <SectionBlock
                  title={t('settingsSocialSetsTitle', locale)}
                  subtitle={t('settingsSocialSetsHint', locale)}
                >
                  <div className={`${adminCardClass} p-4 flex items-start gap-3`}>
                    <Layers size={16} className="text-slate-500 mt-0.5" />
                    <p className="text-sm text-slate-600 font-medium">
                      {t('settingsSocialSetsHint', locale)}
                    </p>
                  </div>
                </SectionBlock>
              </>
            )}

            {(tab === 'general' ||
              tab === 'members' ||
              tab === 'spaces' ||
              tab === 'tags' ||
              tab === 'branding' ||
              tab === 'workflows' ||
              tab === 'ai') && (
              <SectionBlock
                title={t(
                  ORG_NAV.find((n) => n.id === tab)?.labelKey || 'settings',
                  locale
                )}
                subtitle={t('settingsComingSoon', locale)}
              >
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-5 py-10 text-center">
                  <Settings2 size={20} className="mx-auto text-slate-300 mb-2" />
                  <p className="text-sm font-bold text-slate-700">
                    {t(
                      ORG_NAV.find((n) => n.id === tab)?.labelKey || 'settings',
                      locale
                    )}
                  </p>
                  <p className="text-xs text-slate-400 font-medium mt-1 max-w-sm mx-auto">
                    {t('settingsComingSoon', locale)}
                  </p>
                </div>
              </SectionBlock>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
