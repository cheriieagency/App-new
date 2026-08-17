'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type DragEvent, type ElementType } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BarChart3,
  CalendarDays,
  ChevronDown,
  FolderKanban,
  GripVertical,
  Home,
  Image as ImageIcon,
  Inbox,
  Link2,
  Mail,
  Pencil,
  Plus,
  Settings,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import WorkspaceSelector from '@/components/planner/WorkspaceSelector';
import CreateWorkspaceModal from '@/components/planner/CreateWorkspaceModal';
import AdminPlanModal, { useAdminPlan } from '@/components/admin/AdminPlanModal';
import { useWorkspace } from '@/context/WorkspaceContext';
import { useAdminNav, type AdminSection, adminProjectsHref } from '@/components/admin/AdminNavContext';
import { ClikdMark } from '@/components/brand/ClikdLogo';
import { useLanguage } from '@/lib/i18n';
import type { NestedKey } from '@/lib/i18n';
import type { CampaignLabel } from '@/lib/mock-content-planner';
import {
  MEDIA_LIBRARY_ROOT_ID,
  type MediaFolder,
} from '@/lib/mock-media-library';
import {
  PLAN_DISPLAY_NAME,
  normalizeWorkspacePlan,
  type WorkspacePlan,
} from '@/lib/config/plans';

const PROJECT_DND = 'application/x-clikd-project';
const FOLDER_DND = 'application/x-clikd-media-folder';

function moveItemBefore(ids: string[], fromId: string, toId: string): string[] {
  if (fromId === toId) return ids;
  const next = ids.filter((id) => id !== fromId);
  const toIndex = next.indexOf(toId);
  if (toIndex < 0) return ids;
  next.splice(toIndex, 0, fromId);
  return next;
}
type NavItem = {
  key: AdminSection;
  labelKey: NestedKey;
  icon: ElementType;
  href: string;
  badge?: string;
};

/** Clean labels matching the Clikd admin shell reference. */
const NAV: NavItem[] = [
  { key: 'home', labelKey: 'admin.home', icon: Home, href: '/admin?tab=home' },
  { key: 'calendar', labelKey: 'admin.planner', icon: CalendarDays, href: '/planner' },
  { key: 'media', labelKey: 'admin.mediaLibrary', icon: ImageIcon, href: '/admin?tab=media' },
  { key: 'projects', labelKey: 'admin.projects', icon: FolderKanban, href: '/admin?tab=projects' },
  { key: 'inbox', labelKey: 'admin.socialInbox', icon: Inbox, href: '/admin?tab=inbox' },
  { key: 'analytics', labelKey: 'admin.analytics', icon: BarChart3, href: '/admin?tab=analytics' },
  { key: 'biobuilder', labelKey: 'admin.bioBuilder', icon: Link2, href: '/admin?tab=biobuilder' },
  { key: 'community', labelKey: 'admin.community', icon: Users, href: '/admin?tab=community' },
  { key: 'email', labelKey: 'admin.emailCrm', icon: Mail, href: '/admin?tab=email' },
  { key: 'settings', labelKey: 'admin.settings', icon: Settings, href: '/admin?tab=settings' },
];

function planName(plan: WorkspacePlan) {
  return PLAN_DISPLAY_NAME[plan];
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
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const [draggingProjectId, setDraggingProjectId] = useState<string | null>(null);
  const [dropProjectId, setDropProjectId] = useState<string | null>(null);
  const [draggingFolderId, setDraggingFolderId] = useState<string | null>(null);
  const [dropFolderId, setDropFolderId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { data: planData } = useAdminPlan();
  const plan = normalizeWorkspacePlan(planData?.plan);

  const { data: campaignsData } = useQuery<{ campaigns: CampaignLabel[] }>({
    queryKey: ['planner-campaigns'],
    queryFn: async () => {
      const r = await fetch('/api/planner/campaigns', { credentials: 'include' });
      if (!r.ok) throw new Error('Failed');
      return r.json();
    },
  });
  const campaigns = campaignsData?.campaigns ?? [];

  const { data: mediaData } = useQuery<{ folders: MediaFolder[] }>({
    queryKey: ['media-folders', activeWorkspaceId],
    queryFn: async () => {
      const r = await fetch('/api/admin/media', {
        headers: activeWorkspaceId
          ? {
              'x-workspace-id': activeWorkspaceId,
              'x-active-workspace-id': activeWorkspaceId,
            }
          : undefined,
        credentials: 'include',
      });
      if (!r.ok) throw new Error('Failed');
      return r.json();
    },
  });
  const allMediaFolders = mediaData?.folders ?? [];
  const rootFolder = allMediaFolders.find((f) => f.id === MEDIA_LIBRARY_ROOT_ID);
  const rootFolderName = rootFolder?.name || t('mediaLibraryRoot');
  // Nested only — root is rendered separately above.
  const mediaFolders = allMediaFolders.filter((f) => f.id !== MEDIA_LIBRARY_ROOT_ID);

  const renameFolderMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const r = await fetch('/api/admin/media', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(activeWorkspaceId
            ? {
                'x-workspace-id': activeWorkspaceId,
                'x-active-workspace-id': activeWorkspaceId,
              }
            : {}),
        },
        credentials: 'include',
        body: JSON.stringify({ action: 'rename', id, name }),
      });
      if (!r.ok) throw new Error('rename failed');
      return r.json();
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['media-folders'] });
      queryClient.invalidateQueries({ queryKey: ['media-folder', vars.id] });
      setRenamingFolderId(null);
      toast.success('Folder renamed');
    },
    onError: () => toast.error('Could not rename folder'),
  });

  const reorderProjectsMutation = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      const r = await fetch('/api/planner/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'reorder', orderedIds }),
      });
      if (!r.ok) throw new Error('reorder failed');
      return r.json() as Promise<{ campaigns: CampaignLabel[] }>;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['planner-campaigns'], { campaigns: data.campaigns });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ['planner-campaigns'] });
      toast.error('Could not reorder projects');
    },
  });

  const reorderFoldersMutation = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      const r = await fetch('/api/admin/media', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(activeWorkspaceId
            ? {
                'x-workspace-id': activeWorkspaceId,
                'x-active-workspace-id': activeWorkspaceId,
              }
            : {}),
        },
        credentials: 'include',
        body: JSON.stringify({ action: 'reorder_folders', orderedIds }),
      });
      if (!r.ok) throw new Error('reorder failed');
      return r.json() as Promise<{ folders: MediaFolder[] }>;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['media-folders', activeWorkspaceId], {
        folders: data.folders,
      });
      queryClient.invalidateQueries({ queryKey: ['media-folders'] });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ['media-folders'] });
      toast.error('Could not reorder folders');
    },
  });

  const applyProjectReorder = (fromId: string, toId: string) => {
    const orderedIds = moveItemBefore(
      campaigns.map((c) => c.id),
      fromId,
      toId
    );
    if (orderedIds.join('|') === campaigns.map((c) => c.id).join('|')) return;
    const byId = new Map(campaigns.map((c) => [c.id, c]));
    const optimistic = orderedIds.flatMap((id, index) => {
      const c = byId.get(id);
      return c ? [{ ...c, sort_order: index }] : [];
    });
    queryClient.setQueryData(['planner-campaigns'], { campaigns: optimistic });
    reorderProjectsMutation.mutate(orderedIds);
  };

  const applyFolderReorder = (fromId: string, toId: string) => {
    const orderedIds = moveItemBefore(
      mediaFolders.map((f) => f.id),
      fromId,
      toId
    );
    if (orderedIds.join('|') === mediaFolders.map((f) => f.id).join('|')) return;
    const byId = new Map(mediaFolders.map((f) => [f.id, f]));
    const nestedOptimistic = orderedIds.flatMap((id, index) => {
      const f = byId.get(id);
      return f ? [{ ...f, sort_order: index }] : [];
    });
    const optimisticFolders = [
      ...(rootFolder ? [rootFolder] : []),
      ...nestedOptimistic,
    ];
    queryClient.setQueryData(['media-folders', activeWorkspaceId], {
      folders: optimisticFolders,
    });
    reorderFoldersMutation.mutate(orderedIds);
  };
  const commitFolderRename = () => {
    if (!renamingFolderId || renameFolderMutation.isPending) return;
    const next = renameDraft.trim();
    const current =
      renamingFolderId === MEDIA_LIBRARY_ROOT_ID
        ? rootFolderName
        : mediaFolders.find((f) => f.id === renamingFolderId)?.name;
    if (!next || next === current) {
      setRenamingFolderId(null);
      return;
    }
    renameFolderMutation.mutate({ id: renamingFolderId, name: next });
  };

  useEffect(() => {
    if (section === 'projects') setProjectsOpen(true);
    if (section === 'media') setMediaOpen(true);
  }, [section]);

  // When Projects opens, keep current selection (or none) — overview shows all folders.
  // Do not auto-pick the first campaign.

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
                          {renamingFolderId === MEDIA_LIBRARY_ROOT_ID ? (
                            <form
                              className="flex items-center gap-1 px-1"
                              onSubmit={(e) => {
                                e.preventDefault();
                                commitFolderRename();
                              }}
                            >
                              <span
                                className="w-2 h-2 rounded-full flex-shrink-0 bg-[#2B2568] ml-2"
                                aria-hidden
                              />
                              <input
                                autoFocus
                                value={renameDraft}
                                onChange={(e) => setRenameDraft(e.target.value)}
                                onBlur={commitFolderRename}
                                onKeyDown={(e) => {
                                  if (e.key === 'Escape') setRenamingFolderId(null);
                                }}
                                className="flex-1 min-w-0 h-10 min-h-[40px] rounded-lg border border-slate-200 bg-white px-2 text-[12px] font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                                aria-label="Rename folder"
                              />
                            </form>
                          ) : (
                            <div
                              className={[
                                'group w-full flex items-center gap-1 rounded-xl transition-colors',
                                activeMediaFolderId === MEDIA_LIBRARY_ROOT_ID
                                  ? 'bg-[#E9D5FF]/70 text-[#1a1848]'
                                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800',
                              ].join(' ')}
                            >
                              <button
                                type="button"
                                onClick={() => setActiveMediaFolderId(MEDIA_LIBRARY_ROOT_ID)}
                                onDoubleClick={() => {
                                  setRenameDraft(rootFolderName);
                                  setRenamingFolderId(MEDIA_LIBRARY_ROOT_ID);
                                }}
                                className={[
                                  'flex-1 flex items-center gap-2.5 h-10 min-h-[40px] pl-3 pr-1 rounded-xl text-left',
                                  activeMediaFolderId === MEDIA_LIBRARY_ROOT_ID
                                    ? 'font-semibold'
                                    : 'font-medium',
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
                                  {rootFolderName}
                                </span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setRenameDraft(rootFolderName);
                                  setRenamingFolderId(MEDIA_LIBRARY_ROOT_ID);
                                }}
                                className="opacity-0 group-hover:opacity-100 focus:opacity-100 flex-shrink-0 h-10 w-10 min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700"
                                aria-label="Rename folder"
                                title="Rename"
                              >
                                <Pencil size={12} />
                              </button>
                            </div>
                          )}

                          {/* Nested folders under Brand assets (Drive-style) */}
                          <div
                            id="admin-media-folders"
                            className="pl-3 ml-3 border-l border-slate-200/70 space-y-0.5 py-0.5"
                          >
                            {mediaFolders.map((f) => {
                              const selected = f.id === activeMediaFolderId;
                              if (renamingFolderId === f.id) {
                                return (
                                  <form
                                    key={f.id}
                                    className="flex items-center gap-1 px-1"
                                    onSubmit={(e) => {
                                      e.preventDefault();
                                      commitFolderRename();
                                    }}
                                  >
                                    <span
                                      className="w-2 h-2 rounded-full flex-shrink-0 ml-2"
                                      style={{ background: f.color }}
                                      aria-hidden
                                    />
                                    <input
                                      autoFocus
                                      value={renameDraft}
                                      onChange={(e) => setRenameDraft(e.target.value)}
                                      onBlur={commitFolderRename}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Escape') setRenamingFolderId(null);
                                      }}
                                      className="flex-1 min-w-0 h-10 min-h-[40px] rounded-lg border border-slate-200 bg-white px-2 text-[12px] font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                                      aria-label="Rename folder"
                                    />
                                  </form>
                                );
                              }
                              return (
                                <div
                                  key={f.id}
                                  draggable
                                  onDragStart={(e: DragEvent) => {
                                    e.dataTransfer.setData(FOLDER_DND, f.id);
                                    e.dataTransfer.effectAllowed = 'move';
                                    setDraggingFolderId(f.id);
                                  }}
                                  onDragEnd={() => {
                                    setDraggingFolderId(null);
                                    setDropFolderId(null);
                                  }}
                                  onDragOver={(e: DragEvent) => {
                                    if (
                                      !e.dataTransfer.types.includes(FOLDER_DND) &&
                                      !draggingFolderId
                                    ) {
                                      return;
                                    }
                                    e.preventDefault();
                                    e.dataTransfer.dropEffect = 'move';
                                    setDropFolderId(f.id);
                                  }}
                                  onDragLeave={() => {
                                    if (dropFolderId === f.id) setDropFolderId(null);
                                  }}
                                  onDrop={(e: DragEvent) => {
                                    e.preventDefault();
                                    const fromId =
                                      e.dataTransfer.getData(FOLDER_DND) ||
                                      draggingFolderId;
                                    setDraggingFolderId(null);
                                    setDropFolderId(null);
                                    if (!fromId) return;
                                    applyFolderReorder(fromId, f.id);
                                  }}
                                  className={[
                                    'group w-full flex items-center gap-1 rounded-xl transition-colors',
                                    selected
                                      ? 'bg-[#E9D5FF]/70 text-[#1a1848]'
                                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800',
                                    draggingFolderId === f.id ? 'opacity-50' : '',
                                    dropFolderId === f.id && draggingFolderId !== f.id
                                      ? 'ring-2 ring-[#F472B6]/50 ring-inset'
                                      : '',
                                  ].join(' ')}
                                >
                                  <span
                                    className="flex-shrink-0 h-10 w-6 min-h-[40px] inline-flex items-center justify-center text-slate-300 cursor-grab active:cursor-grabbing"
                                    aria-hidden
                                    title="Drag to reorder"
                                  >
                                    <GripVertical size={12} />
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => setActiveMediaFolderId(f.id)}
                                    onDoubleClick={() => {
                                      setRenameDraft(f.name);
                                      setRenamingFolderId(f.id);
                                    }}
                                    className={[
                                      'flex-1 flex items-center gap-2.5 h-10 min-h-[40px] pl-0 pr-1 rounded-xl text-left',
                                      selected ? 'font-semibold' : 'font-medium',
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
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setRenameDraft(f.name);
                                      setRenamingFolderId(f.id);
                                    }}
                                    className="opacity-0 group-hover:opacity-100 focus:opacity-100 flex-shrink-0 h-10 w-10 min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700"
                                    aria-label="Rename folder"
                                    title="Rename"
                                  >
                                    <Pencil size={12} />
                                  </button>
                                </div>
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
                        setMediaOpen(false);
                        // On overview, chevron toggles the list; from a project, return to folder grid.
                        if (section === 'projects' && !activeCampaignId) {
                          setProjectsOpen((open) => !open);
                        } else {
                          setProjectsOpen(true);
                        }
                        setActiveCampaignId(null);
                        if (!pathname.startsWith('/admin')) {
                          router.push(adminProjectsHref());
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
                              <div
                                key={c.id}
                                draggable
                                onDragStart={(e: DragEvent) => {
                                  e.dataTransfer.setData(PROJECT_DND, c.id);
                                  e.dataTransfer.effectAllowed = 'move';
                                  setDraggingProjectId(c.id);
                                }}
                                onDragEnd={() => {
                                  setDraggingProjectId(null);
                                  setDropProjectId(null);
                                }}
                                onDragOver={(e: DragEvent) => {
                                  if (
                                    !e.dataTransfer.types.includes(PROJECT_DND) &&
                                    !draggingProjectId
                                  ) {
                                    return;
                                  }
                                  e.preventDefault();
                                  e.dataTransfer.dropEffect = 'move';
                                  setDropProjectId(c.id);
                                }}
                                onDragLeave={() => {
                                  if (dropProjectId === c.id) setDropProjectId(null);
                                }}
                                onDrop={(e: DragEvent) => {
                                  e.preventDefault();
                                  const fromId =
                                    e.dataTransfer.getData(PROJECT_DND) ||
                                    draggingProjectId;
                                  setDraggingProjectId(null);
                                  setDropProjectId(null);
                                  if (!fromId) return;
                                  applyProjectReorder(fromId, c.id);
                                }}
                                className={[
                                  'group w-full flex items-center gap-1 rounded-xl transition-colors',
                                  selected
                                    ? 'bg-[#E9D5FF]/70 text-[#1a1848]'
                                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800',
                                  draggingProjectId === c.id ? 'opacity-50' : '',
                                  dropProjectId === c.id &&
                                  draggingProjectId !== c.id
                                    ? 'ring-2 ring-[#F472B6]/50 ring-inset'
                                    : '',
                                ].join(' ')}
                              >
                                <span
                                  className="flex-shrink-0 h-10 w-6 min-h-[40px] inline-flex items-center justify-center text-slate-300 cursor-grab active:cursor-grabbing"
                                  aria-hidden
                                  title="Drag to reorder"
                                >
                                  <GripVertical size={12} />
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveCampaignId(c.id);
                                    if (!pathname.startsWith('/admin')) {
                                      router.push(
                                        adminProjectsHref({ campaignId: c.id })
                                      );
                                    }
                                  }}
                                  className={[
                                    'flex-1 flex items-center gap-2.5 h-10 min-h-[40px] pl-0 pr-3 rounded-xl text-left transition-colors',
                                    selected ? 'font-semibold' : 'font-medium',
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
                              </div>
                            );
                          })
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            if (!pathname.startsWith('/admin')) {
                              router.push(adminProjectsHref({ create: true }));
                              return;
                            }
                            setSection('projects');
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
                  prefetch={true}
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
            className="w-full flex items-center min-h-[44px] group"
          >
            <span className="font-mono text-[11px] font-medium text-slate-500 group-hover:text-slate-800 transition-colors">
              {planName(plan)}
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
          // createWorkspace already persists + activates; refresh keeps lists in sync.
          refreshWorkspaces();
          setActiveWorkspaceId(ws.id);
        }}
      />
    </>
  );
}
