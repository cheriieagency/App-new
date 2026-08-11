'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ElementType } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3,
  CalendarDays,
  ChevronDown,
  FolderKanban,
  Image as ImageIcon,
  Inbox,
  Link2,
  Mail,
  Plus,
  Settings,
  Users,
} from 'lucide-react';
import WorkspaceSelector from '@/components/planner/WorkspaceSelector';
import CreateWorkspaceModal from '@/components/planner/CreateWorkspaceModal';
import AdminPlanModal, { useAdminPlan } from '@/components/admin/AdminPlanModal';
import { useWorkspace } from '@/context/WorkspaceContext';
import { useAdminNav, type AdminSection } from '@/components/admin/AdminNavContext';
import { ClikdMark } from '@/components/brand/ClikdLogo';
import { useLanguage } from '@/lib/i18n';
import type { NestedKey } from '@/lib/i18n';
import type { CampaignLabel } from '@/lib/mock-content-planner';
import { MEDIA_LIBRARY_ROOT_ID } from '@/lib/mock-media-library';

type NavItem = {
  key: AdminSection;
  labelKey: NestedKey;
  icon: ElementType;
  href: string;
  badge?: string;
};

/** Clean labels matching the Clikd admin shell reference. */
const NAV: NavItem[] = [
  { key: 'calendar', labelKey: 'admin.planner', icon: CalendarDays, href: '/planner' },
  { key: 'media', labelKey: 'admin.mediaLibrary', icon: ImageIcon, href: '/admin?tab=media' },
  { key: 'projects', labelKey: 'admin.projects', icon: FolderKanban, href: '/admin?tab=projects' },
  { key: 'inbox', labelKey: 'admin.socialInbox', icon: Inbox, href: '/admin?tab=inbox', badge: '3' },
  { key: 'analytics', labelKey: 'admin.analytics', icon: BarChart3, href: '/admin?tab=analytics' },
  { key: 'biobuilder', labelKey: 'admin.bioBuilder', icon: Link2, href: '/admin?tab=biobuilder' },
  { key: 'community', labelKey: 'admin.community', icon: Users, href: '/admin?tab=community' },
  { key: 'email', labelKey: 'admin.emailCrm', icon: Mail, href: '/admin?tab=email' },
  { key: 'settings', labelKey: 'admin.settings', icon: Settings, href: '/admin?tab=settings' },
];

function planName(plan: string) {
  if (plan === 'starter') return 'Starter';
  if (plan === 'pro') return 'Pro Plan';
  return 'Pro Plan';
}

function planPrice(_plan: string) {
  return 'see plan';
}

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const onPlanner = pathname.startsWith('/planner');
  const {
    section,
    setSection,
    activeCampaignId,
    setActiveCampaignId,
    setCreateProjectOpen,
    activeMediaFolderId,
    setActiveMediaFolderId,
    setCreateMediaFolderOpen,
  } = useAdminNav();
  const { t } = useLanguage();
  const {
    brandWorkspaces,
    activeWorkspaceId,
    setActiveWorkspaceId,
    refreshWorkspaces,
  } = useWorkspace();
  const [createOpen, setCreateOpen] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
  const [projectsOpen, setProjectsOpen] = useState(section === 'projects');
  const [mediaOpen, setMediaOpen] = useState(section === 'media');
  const { data: planData } = useAdminPlan();
  const plan = planData?.plan ?? 'creator';

  const { data: campaignsData } = useQuery<{ campaigns: CampaignLabel[] }>({
    queryKey: ['planner-campaigns'],
    queryFn: async () => {
      const r = await fetch('/api/planner/campaigns');
      if (!r.ok) throw new Error('Failed');
      return r.json();
    },
  });
  const campaigns = campaignsData?.campaigns ?? [];

  const { data: mediaData } = useQuery<{ folders: { id: string; name: string; color: string }[] }>({
    queryKey: ['media-folders'],
    queryFn: async () => {
      const r = await fetch('/api/admin/media');
      if (!r.ok) throw new Error('Failed');
      return r.json();
    },
  });
  const mediaFolders = mediaData?.folders ?? [];

  useEffect(() => {
    if (section === 'projects') setProjectsOpen(true);
    if (section === 'media') setMediaOpen(true);
  }, [section]);

  // When Projects opens with no campaign selected, pick the first one.
  useEffect(() => {
    if (section !== 'projects') return;
    if (activeCampaignId && campaigns.some((c) => c.id === activeCampaignId)) return;
    if (campaigns[0]) setActiveCampaignId(campaigns[0].id);
  }, [section, activeCampaignId, campaigns, setActiveCampaignId]);

  // When Media opens with no / invalid folder, land on the permanent Brand assets root.
  useEffect(() => {
    if (section !== 'media') return;
    if (activeMediaFolderId === MEDIA_LIBRARY_ROOT_ID) return;
    if (activeMediaFolderId && mediaFolders.some((f) => f.id === activeMediaFolderId)) return;
    setActiveMediaFolderId(MEDIA_LIBRARY_ROOT_ID);
  }, [section, activeMediaFolderId, mediaFolders, setActiveMediaFolderId]);

  return (
    <>
      <aside className="hidden md:flex fixed left-0 top-0 bottom-0 z-40 w-64 flex-col justify-between bg-white border-r border-slate-200/80 text-slate-900 h-screen rounded-bl-[28px]">
        <div className="flex flex-col min-h-0 flex-1">
          <div className="px-4 pt-5 pb-4 space-y-4">
            <Link
              href="/"
              className="flex items-center gap-2.5 px-0.5 min-h-[44px] hover:opacity-90 transition-opacity"
              aria-label="clikd: home"
            >
              <ClikdMark size={34} className="rounded-[11px] shadow-sm" />
              <p className="font-clikd-wordmark font-extrabold text-[17px] text-slate-900 tracking-tight leading-none">
                clikd<span className="text-[#F472B6]">:</span>
              </p>
            </Link>

            <WorkspaceSelector
              compact
              workspaces={brandWorkspaces}
              activeId={activeWorkspaceId}
              onSelect={(ws) => setActiveWorkspaceId(ws.id)}
              onCreateNew={() => setCreateOpen(true)}
            />
          </div>

          <nav
            className="flex-1 overflow-y-auto px-3 pt-2 pb-4 space-y-0.5"
            aria-label="Admin categories"
          >
            {NAV.map(({ key, labelKey, icon: Icon, href, badge }) => {
              const active =
                key === 'calendar'
                  ? onPlanner || section === 'calendar'
                  : !onPlanner && section === key;
              const className = [
                'w-full flex items-center gap-3 h-11 min-h-[44px] px-3.5 transition-all duration-200',
                active
                  ? 'rounded-2xl bg-[#1a1848] text-white font-semibold shadow-sm'
                  : 'rounded-2xl text-slate-500 hover:bg-slate-50 hover:text-slate-800 font-medium',
              ].join(' ');

              if (key === 'media') {
                return (
                  <div key={key} className="space-y-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        const nextOpen = section === 'media' ? !mediaOpen : true;
                        setMediaOpen(nextOpen);
                        setProjectsOpen(false);
                        setSection('media');
                        if (!pathname.startsWith('/admin')) {
                          router.push(href);
                        }
                      }}
                      className={className}
                      aria-expanded={mediaOpen && section === 'media'}
                      aria-controls="admin-media-submenu"
                    >
                      <Icon
                        size={18}
                        strokeWidth={1.75}
                        className="flex-shrink-0 opacity-90"
                        aria-hidden
                      />
                      <span className="text-[13px] truncate text-left flex-1 tracking-tight">
                        {t(labelKey)}
                      </span>
                      <ChevronDown
                        size={16}
                        strokeWidth={2}
                        className={`flex-shrink-0 transition-transform duration-200 ${
                          mediaOpen && section === 'media' ? 'rotate-180' : ''
                        } ${active ? 'opacity-80' : 'opacity-50'}`}
                        aria-hidden
                      />
                    </button>

                    {mediaOpen && section === 'media' && (
                      <div
                        id="admin-media-submenu"
                        className="pl-3 ml-3 border-l border-slate-200/80 space-y-0.5 py-0.5"
                      >
                        {/* Permanent root — all brand assets; not deletable */}
                        <div className="space-y-0.5">
                          <button
                            type="button"
                            onClick={() => setActiveMediaFolderId(MEDIA_LIBRARY_ROOT_ID)}
                            className={[
                              'w-full flex items-center gap-2.5 h-10 min-h-[40px] px-3 rounded-xl text-left transition-colors',
                              activeMediaFolderId === MEDIA_LIBRARY_ROOT_ID
                                ? 'bg-[#E9D5FF]/70 text-[#1a1848] font-semibold'
                                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800 font-medium',
                            ].join(' ')}
                            aria-current={
                              activeMediaFolderId === MEDIA_LIBRARY_ROOT_ID
                                ? 'page'
                                : undefined
                            }
                            aria-expanded="true"
                            aria-controls="admin-media-folders"
                          >
                            <span
                              className="w-2 h-2 rounded-full flex-shrink-0 bg-[#2B2568]"
                              aria-hidden
                            />
                            <span className="text-[12px] truncate tracking-tight">
                              {t('mediaLibraryRoot')}
                            </span>
                          </button>

                          {/* Nested folders under Brand assets (Drive-style) */}
                          <div
                            id="admin-media-folders"
                            className="pl-3 ml-3 border-l border-slate-200/70 space-y-0.5 py-0.5"
                          >
                            {mediaFolders.map((f) => {
                              const selected = f.id === activeMediaFolderId;
                              return (
                                <button
                                  key={f.id}
                                  type="button"
                                  onClick={() => setActiveMediaFolderId(f.id)}
                                  className={[
                                    'w-full flex items-center gap-2.5 h-10 min-h-[40px] px-3 rounded-xl text-left transition-colors',
                                    selected
                                      ? 'bg-[#E9D5FF]/70 text-[#1a1848] font-semibold'
                                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800 font-medium',
                                  ].join(' ')}
                                  aria-current={selected ? 'page' : undefined}
                                >
                                  <span
                                    className="w-2 h-2 rounded-full flex-shrink-0"
                                    style={{ background: f.color }}
                                  />
                                  <span className="text-[12px] truncate tracking-tight">
                                    {f.name}
                                  </span>
                                </button>
                              );
                            })}
                            <button
                              type="button"
                              onClick={() => {
                                setSection('media');
                                if (!pathname.startsWith('/admin')) {
                                  router.push('/admin?tab=media');
                                }
                                setCreateMediaFolderOpen(true);
                              }}
                              className="w-full flex items-center gap-2.5 h-10 min-h-[40px] px-3 rounded-xl text-left text-slate-500 hover:bg-slate-50 hover:text-[#1a1848] font-medium transition-colors"
                            >
                              <Plus
                                size={12}
                                strokeWidth={2.5}
                                className="flex-shrink-0 text-[#F472B6]"
                                aria-hidden
                              />
                              <span className="text-[12px] truncate tracking-tight">
                                {t('createMediaFolder')}
                              </span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              }

              if (key === 'projects') {
                return (
                  <div key={key} className="space-y-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        const nextOpen = section === 'projects' ? !projectsOpen : true;
                        setProjectsOpen(nextOpen);
                        setMediaOpen(false);
                        setSection('projects');
                        if (!pathname.startsWith('/admin')) {
                          router.push(href);
                        }
                      }}
                      className={className}
                      aria-expanded={projectsOpen && section === 'projects'}
                      aria-controls="admin-projects-submenu"
                    >
                      <Icon
                        size={18}
                        strokeWidth={1.75}
                        className="flex-shrink-0 opacity-90"
                        aria-hidden
                      />
                      <span className="text-[13px] truncate text-left flex-1 tracking-tight">
                        {t(labelKey)}
                      </span>
                      <ChevronDown
                        size={16}
                        strokeWidth={2}
                        className={`flex-shrink-0 transition-transform duration-200 ${
                          projectsOpen && section === 'projects' ? 'rotate-180' : ''
                        } ${active ? 'opacity-80' : 'opacity-50'}`}
                        aria-hidden
                      />
                    </button>

                    {projectsOpen && section === 'projects' && (
                      <div
                        id="admin-projects-submenu"
                        className="pl-3 ml-3 border-l border-slate-200/80 space-y-0.5 py-0.5"
                      >
                        {campaigns.length === 0 ? (
                          <p className="px-3 py-2 text-[11px] font-medium text-slate-400">
                            {t('noProjectsYet')}
                          </p>
                        ) : (
                          campaigns.map((c) => {
                            const selected = c.id === activeCampaignId;
                            return (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => setActiveCampaignId(c.id)}
                                className={[
                                  'w-full flex items-center gap-2.5 h-10 min-h-[40px] px-3 rounded-xl text-left transition-colors',
                                  selected
                                    ? 'bg-[#E9D5FF]/70 text-[#1a1848] font-semibold'
                                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800 font-medium',
                                ].join(' ')}
                                aria-current={selected ? 'page' : undefined}
                              >
                                <span
                                  className="w-2 h-2 rounded-full flex-shrink-0"
                                  style={{ background: c.color }}
                                />
                                <span className="text-[12px] truncate tracking-tight">
                                  {c.name}
                                </span>
                              </button>
                            );
                          })
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setSection('projects');
                            if (!pathname.startsWith('/admin')) {
                              router.push('/admin?tab=projects');
                            }
                            setCreateProjectOpen(true);
                          }}
                          className="w-full flex items-center gap-2.5 h-10 min-h-[40px] px-3 rounded-xl text-left text-slate-500 hover:bg-slate-50 hover:text-[#1a1848] font-medium transition-colors"
                        >
                          <Plus
                            size={12}
                            strokeWidth={2.5}
                            className="flex-shrink-0 text-[#F472B6]"
                            aria-hidden
                          />
                          <span className="text-[12px] truncate tracking-tight">
                            {t('createProject')}
                          </span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <Link
                  key={key}
                  href={href}
                  onClick={() => {
                    setProjectsOpen(false);
                    setMediaOpen(false);
                    // Planner lives on /planner — don't rewrite the admin URL to ?tab=calendar.
                    if (key !== 'calendar') setSection(key);
                  }}
                  className={className}
                  aria-current={active ? 'page' : undefined}
                >
                  <Icon
                    size={18}
                    strokeWidth={1.75}
                    className="flex-shrink-0 opacity-90"
                    aria-hidden
                  />
                  <span className="text-[13px] truncate text-left flex-1 tracking-tight">
                    {t(labelKey)}
                  </span>
                  {badge && (
                    <span
                      className={`text-[11px] font-semibold min-w-[22px] h-[22px] px-1.5 rounded-full inline-flex items-center justify-center tabular-nums ${
                        active
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="px-5 pb-5 pt-2">
          <button
            type="button"
            onClick={() => setPlanOpen(true)}
            className="w-full flex items-center justify-between gap-3 min-h-[44px] group"
          >
            <span className="font-mono text-[11px] font-medium text-slate-500 group-hover:text-slate-800 transition-colors">
              {planName(plan)}
            </span>
            <span className="font-mono text-[11px] font-medium text-slate-400 group-hover:text-slate-600 transition-colors tabular-nums">
              {planPrice(plan)}
            </span>
          </button>
        </div>
      </aside>

      <AdminPlanModal open={planOpen} onOpenChange={setPlanOpen} />

      <CreateWorkspaceModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        createUrl="/api/admin/workspaces"
        onCreated={(ws) => {
          refreshWorkspaces();
          setActiveWorkspaceId(ws.id);
        }}
      />
    </>
  );
}
