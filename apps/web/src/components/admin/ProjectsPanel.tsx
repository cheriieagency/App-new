'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Folder, FolderKanban, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useWorkspace } from '@/context/WorkspaceContext';
import { useAdminNav } from '@/components/admin/AdminNavContext';
import AdminEmptyState from '@/components/admin/AdminEmptyState';
import { AdminPageHeader, adminCardClass } from '@/components/admin/AdminUi';
import ProjectVisionBoard from '@/components/admin/ProjectVisionBoard';
import ProjectFilesPanel from '@/components/admin/ProjectFilesPanel';
import ProjectGoalProgress from '@/components/admin/ProjectGoalProgress';
import ContentPlannerShell from '@/components/planner/ContentPlannerShell';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useLanguage } from '@/lib/locale-context';
import { t, tf } from '@/lib/i18n';
import type { CampaignLabel } from '@/lib/mock-content-planner';
import {
  isMediaLibraryRoot,
  type MediaFolder,
} from '@/lib/mock-media-library';

const COLORS = ['#F472B6', '#9089F0', '#10B981', '#F59E0B', '#2B2568', '#0EA5E9'];
const DEFAULT_FOLDER_COLOR = '#2B2568';

/** Matches Content Planner / create-post warm canvas. */
const OUTLINE_BTN =
  'inline-flex items-center justify-center gap-1.5 h-8 min-h-[32px] px-2.5 rounded-sm bg-transparent text-[9px] font-medium uppercase tracking-[0.08em] text-[#8A857D] hover:bg-[#F0EFEA] hover:text-[#2C2621] transition-colors';
const PRIMARY_BTN =
  'inline-flex items-center justify-center gap-1.5 h-8 min-h-[32px] px-3 rounded-sm bg-[#F0EFEA] text-[#2C2621] text-[9px] font-medium uppercase tracking-[0.08em] hover:bg-[#E6E3DB] transition-colors disabled:opacity-40';
const FIELD_LABEL =
  'block text-[9px] font-semibold uppercase tracking-[0.12em] text-[#8A857D] mb-1';
const UNDERLINE_INPUT =
  'w-full h-9 min-h-[36px] bg-transparent border-0 border-b border-[#E6E3DB] rounded-none px-0 text-xs text-[#2C2621] placeholder:text-[#C4BFB6] focus:outline-none focus:border-[#2C2621]';
const DIALOG_SHELL =
  'max-w-[min(440px,94vw)] rounded-sm border-[#E6E3DB] p-0 gap-0';

/**
 * Projects section: overview of all projects as folders; open one to see
 * planner content scoped to that campaign label.
 */
export default function ProjectsPanel() {
  const { locale } = useLanguage();
  const { activeWorkspace } = useWorkspace();
  const {
    activeCampaignId,
    setActiveCampaignId,
    createProjectOpen,
    setCreateProjectOpen,
    setActiveMediaFolderId,
  } = useAdminNav();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLORS[1]);
  const [description, setDescription] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteAcknowledged, setDeleteAcknowledged] = useState(false);
  const [linkFolderOpen, setLinkFolderOpen] = useState(false);
  const [linkFolderId, setLinkFolderId] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState(COLORS[1]);
  const [editDescription, setEditDescription] = useState('');
  const creating = createProjectOpen;

  const { data: campaignsData, isLoading } = useQuery<{ campaigns: CampaignLabel[] }>({
    queryKey: ['planner-campaigns'],
    queryFn: async () => {
      const r = await fetch('/api/planner/campaigns', { credentials: 'include' });
      if (!r.ok) throw new Error('Failed');
      return r.json();
    },
  });

  const { data: mediaFoldersData } = useQuery<{ folders: MediaFolder[] }>({
    queryKey: ['media-folders', activeWorkspace.id],
    queryFn: async () => {
      const r = await fetch('/api/admin/media', {
        headers: activeWorkspace.id
          ? {
              'x-workspace-id': activeWorkspace.id,
              'x-active-workspace-id': activeWorkspace.id,
            }
          : undefined,
        credentials: 'include',
      });
      if (!r.ok) throw new Error('Failed');
      return r.json();
    },
  });

  const campaigns = campaignsData?.campaigns ?? [];
  const mediaFolders = (mediaFoldersData?.folders ?? []).filter(
    (f) => !isMediaLibraryRoot(f.id)
  );

  // Keep Projects overview in the same order as the sidebar (sort_order).
  const sortedProjects = useMemo(() => [...campaigns], [campaigns]);

  const active =
    activeCampaignId && campaigns.some((c) => c.id === activeCampaignId)
      ? (campaigns.find((c) => c.id === activeCampaignId) ?? null)
      : null;

  const linkedMediaFolders = useMemo(
    () =>
      active
        ? mediaFolders.filter((f) => f.campaign_id === active.id)
        : [],
    [active, mediaFolders]
  );

  const linkableFolders = useMemo(() => mediaFolders, [mediaFolders]);

  const createMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch('/api/planner/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'create', name, color, description }),
      });
      if (!r.ok) throw new Error('create failed');
      return r.json() as Promise<{ campaign: CampaignLabel }>;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['planner-campaigns'] });
      setName('');
      setDescription('');
      setCreateProjectOpen(false);
      setActiveCampaignId(data.campaign.id);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch('/api/planner/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'delete', id }),
      });
      if (!r.ok) throw new Error('delete failed');
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planner-campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['planner-posts'] });
      setDeleteOpen(false);
      setDeleteAcknowledged(false);
      setActiveCampaignId(null);
    },
  });

  const updateProjectMutation = useMutation({
    mutationFn: async () => {
      if (!active) throw new Error('No project selected');
      const r = await fetch('/api/planner/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: 'update',
          id: active.id,
          name: editName.trim(),
          color: editColor,
          description: editDescription,
        }),
      });
      if (!r.ok) throw new Error('Could not update project');
      return r.json() as Promise<{ campaign: CampaignLabel }>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planner-campaigns'] });
      setEditOpen(false);
      toast.success(t('toastProjectUpdated', locale));
    },
    onError: () => toast.error(t('toastProjectUpdateFailed', locale)),
  });

  const openEditDialog = () => {
    if (!active) return;
    setEditName(active.name);
    setEditColor(active.color || COLORS[1]);
    setEditDescription(active.description || '');
    setEditOpen(true);
  };

  const workspaceHeaders: Record<string, string> = activeWorkspace.id
    ? {
        'x-workspace-id': activeWorkspace.id,
        'x-active-workspace-id': activeWorkspace.id,
      }
    : {};

  const linkExistingFolderMutation = useMutation({
    mutationFn: async (folderId: string) => {
      if (!active) throw new Error('No project selected');
      const r = await fetch('/api/admin/media', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...workspaceHeaders,
        },
        credentials: 'include',
        body: JSON.stringify({
          action: 'update',
          id: folderId,
          campaignId: active.id,
        }),
      });
      if (!r.ok) throw new Error('Could not link folder');
      return r.json() as Promise<{ folder: MediaFolder }>;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['media-folders'] });
      setLinkFolderOpen(false);
      setLinkFolderId('');
      toast.success(
        tf('toastLinkedMediaFolder', locale, { name: data.folder.name })
      );
    },
    onError: () => toast.error(t('toastLinkMediaFolderFailed', locale)),
  });

  const createLinkedFolderMutation = useMutation({
    mutationFn: async () => {
      if (!active) throw new Error('No project selected');
      const r = await fetch('/api/admin/media', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...workspaceHeaders,
        },
        credentials: 'include',
        body: JSON.stringify({
          action: 'create',
          name: newFolderName.trim() || `${active.name} assets`,
          color: DEFAULT_FOLDER_COLOR,
          description: `Media for ${active.name}`,
          campaignId: active.id,
        }),
      });
      if (!r.ok) throw new Error('Could not create folder');
      return r.json() as Promise<{ folder: MediaFolder }>;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['media-folders'] });
      setLinkFolderOpen(false);
      setNewFolderName('');
      setLinkFolderId('');
      toast.success(
        tf('toastCreatedLinkedFolder', locale, { name: data.folder.name })
      );
      setActiveMediaFolderId(data.folder.id);
    },
    onError: () => toast.error(t('toastCreateMediaFolderFailed', locale)),
  });

  const openDeleteDialog = () => {
    setDeleteAcknowledged(false);
    setDeleteOpen(true);
  };

  const deleteDialog = active ? (
    <Dialog
      open={deleteOpen}
      onOpenChange={(open) => {
        setDeleteOpen(open);
        if (!open) setDeleteAcknowledged(false);
      }}
    >
      <DialogContent className={DIALOG_SHELL}>
        <DialogHeader className="px-5 sm:px-6 pt-5 pb-3 text-left">
          <DialogTitle className="text-sm font-semibold text-[#2C2621]">
            {t('deleteProjectTitle', locale)}
          </DialogTitle>
          <DialogDescription className="text-[11px] text-[#8A857D] pt-1 leading-snug">
            <span className="font-semibold text-[#2C2621]">{active.name}</span>
            {' — '}
            {t('deleteProjectConfirm', locale)}
          </DialogDescription>
        </DialogHeader>

        <div className="px-5 sm:px-6 pb-2">
          <label className="flex items-start gap-3 min-h-[44px] cursor-pointer border border-[#E6E3DB] bg-[#F9F8F6] px-3 py-2.5 hover:border-[#2C2621]/40 transition-colors">
            <input
              type="checkbox"
              checked={deleteAcknowledged}
              onChange={(e) => setDeleteAcknowledged(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded-sm border-[#E6E3DB] text-[#1C1917] focus:ring-[#1C1917]/20"
            />
            <span className="text-xs font-medium text-[#2C2621] leading-snug">
              {t('deleteProjectPermanentCheckbox', locale)}
            </span>
          </label>
        </div>

        <DialogFooter className="px-5 sm:px-6 py-4 border-t border-[#E6E3DB] flex-row gap-2 sm:justify-end">
          <button
            type="button"
            onClick={() => setDeleteOpen(false)}
            className="text-[9px] font-semibold uppercase tracking-[0.1em] text-[#8A857D] hover:text-[#2C2621] h-8 min-h-[32px] px-2"
          >
            {t('cancel', locale)}
          </button>
          <button
            type="button"
            disabled={!deleteAcknowledged || deleteMutation.isPending}
            onClick={() => deleteMutation.mutate(active.id)}
            className="h-8 min-h-[32px] px-3 bg-[#B85C38] hover:bg-[#9a4c2e] text-white text-[9px] font-semibold uppercase tracking-[0.1em] disabled:opacity-40 disabled:pointer-events-none"
          >
            {t('delete', locale)}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ) : null;

  const linkFolderDialog = active ? (
    <Dialog
      open={linkFolderOpen}
      onOpenChange={(open) => {
        setLinkFolderOpen(open);
        if (!open) {
          setLinkFolderId('');
          setNewFolderName('');
        }
      }}
    >
      <DialogContent className={DIALOG_SHELL}>
        <DialogHeader className="px-5 sm:px-6 pt-5 pb-3 text-left">
          <DialogTitle className="text-sm font-semibold text-[#2C2621]">
            Link media folder
          </DialogTitle>
          <DialogDescription className="text-[11px] text-[#8A857D] pt-1 leading-snug">
            Connect a Media Library folder to{' '}
            <span className="font-semibold text-[#2C2621]">{active.name}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="px-5 sm:px-6 pb-4 space-y-4">
          <label className="block">
            <span className={FIELD_LABEL}>Existing folder</span>
            <select
              value={linkFolderId}
              onChange={(e) => setLinkFolderId(e.target.value)}
              className="w-full h-9 min-h-[36px] border-0 border-b border-[#E6E3DB] bg-transparent px-0 text-xs text-[#2C2621] focus:outline-none focus:border-[#2C2621]"
            >
              <option value="">
                {linkableFolders.length === 0
                  ? 'No folders yet — create one below'
                  : 'Choose a folder…'}
              </option>
              {linkableFolders.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                  {f.campaign_id === active.id
                    ? ' (linked here)'
                    : f.campaign_id
                      ? ' (linked to another project)'
                      : ''}
                </option>
              ))}
            </select>
          </label>

          <div className="relative flex items-center gap-3">
            <div className="flex-1 h-px bg-[#E6E3DB]" />
            <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#A8A29E]">
              or
            </span>
            <div className="flex-1 h-px bg-[#E6E3DB]" />
          </div>

          <label className="block">
            <span className={FIELD_LABEL}>Create new folder</span>
            <input
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder={`${active.name} assets`}
              className={UNDERLINE_INPUT}
            />
          </label>
        </div>

        <DialogFooter className="px-5 sm:px-6 py-4 border-t border-[#E6E3DB] flex-col sm:flex-row gap-2 sm:justify-end">
          <button
            type="button"
            onClick={() => setLinkFolderOpen(false)}
            className="text-[9px] font-semibold uppercase tracking-[0.1em] text-[#8A857D] hover:text-[#2C2621] h-8 min-h-[32px] px-2"
          >
            {t('cancel', locale)}
          </button>
          <button
            type="button"
            disabled={
              !linkFolderId ||
              linkExistingFolderMutation.isPending ||
              createLinkedFolderMutation.isPending ||
              linkableFolders.find((f) => f.id === linkFolderId)?.campaign_id ===
                active.id
            }
            onClick={() => linkExistingFolderMutation.mutate(linkFolderId)}
            className={`${OUTLINE_BTN} disabled:opacity-40`}
          >
            Link selected
          </button>
          <button
            type="button"
            disabled={
              createLinkedFolderMutation.isPending ||
              linkExistingFolderMutation.isPending
            }
            onClick={() => createLinkedFolderMutation.mutate()}
            className={PRIMARY_BTN}
          >
            Create & link
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ) : null;

  const editProjectDialog = active ? (
    <Dialog
      open={editOpen}
      onOpenChange={(open) => {
        setEditOpen(open);
      }}
    >
      <DialogContent className={DIALOG_SHELL}>
        <DialogHeader className="px-5 sm:px-6 pt-5 pb-3 text-left">
          <DialogTitle className="text-sm font-semibold text-[#2C2621]">
            Edit project
          </DialogTitle>
          <DialogDescription className="text-[11px] text-[#8A857D] pt-1 leading-snug">
            Update the name, color, and description for this project.
          </DialogDescription>
        </DialogHeader>
        <div className="px-5 sm:px-6 pb-4 space-y-3">
          <label className="block">
            <span className={FIELD_LABEL}>Name</span>
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder={t('projectNamePlaceholder', locale)}
              className={UNDERLINE_INPUT}
            />
          </label>
          <label className="block">
            <span className={FIELD_LABEL}>Description</span>
            <textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              placeholder={t('projectDescPlaceholder', locale)}
              className="w-full min-h-[72px] border border-[#E6E3DB] rounded-sm bg-white px-2.5 py-2 text-xs text-[#2C2621] resize-none focus:outline-none focus:border-[#2C2621] placeholder:text-[#C4BFB6]"
            />
          </label>
          <div>
            <span className={FIELD_LABEL}>Color</span>
            <div className="flex flex-wrap items-center gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setEditColor(c)}
                  className={`w-7 h-7 min-h-[28px] min-w-[28px] transition-transform ${
                    editColor === c
                      ? 'ring-2 ring-offset-1 ring-[#1C1917]'
                      : 'hover:opacity-90'
                  }`}
                  style={{ background: c }}
                  aria-label={`Color ${c}`}
                  aria-pressed={editColor === c}
                />
              ))}
            </div>
          </div>
        </div>
        <DialogFooter className="px-5 sm:px-6 py-4 border-t border-[#E6E3DB] flex-row gap-2 sm:justify-end">
          <button
            type="button"
            onClick={() => setEditOpen(false)}
            className="text-[9px] font-semibold uppercase tracking-[0.1em] text-[#8A857D] hover:text-[#2C2621] h-8 min-h-[32px] px-2"
          >
            {t('cancel', locale)}
          </button>
          <button
            type="button"
            disabled={!editName.trim() || updateProjectMutation.isPending}
            onClick={() => updateProjectMutation.mutate()}
            className={PRIMARY_BTN}
          >
            {t('save', locale)}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ) : null;

  if (creating) {
    return (
      <div className="space-y-6">
        <CreateProjectForm
          name={name}
          setName={setName}
          description={description}
          setDescription={setDescription}
          color={color}
          setColor={setColor}
          onCancel={() => setCreateProjectOpen(false)}
          onSave={() => createMutation.mutate()}
          saving={createMutation.isPending}
          locale={locale}
        />
      </div>
    );
  }

  // No project selected → show every project as a sorted folder.
  if (!active) {
    return (
      <div className="space-y-6">
        <AdminPageHeader
          compact
          eyebrow={t('adminNavProjects', locale)}
          title={t('projectsTitle', locale)}
          description={
            activeWorkspace
              ? tf('projectsSub', locale, { name: activeWorkspace.name })
              : undefined
          }
          actions={
            <button
              type="button"
              onClick={() => setCreateProjectOpen(true)}
              className={PRIMARY_BTN}
            >
              <Plus size={12} strokeWidth={2.5} />
              {t('createProject', locale)}
            </button>
          }
        />

        {isLoading ? (
          <div className={`${adminCardClass} py-12 text-center text-xs text-[#8A857D]`}>
            {t('loading', locale)}
          </div>
        ) : sortedProjects.length === 0 ? (
          <AdminEmptyState
            icon={FolderKanban}
            headline={t('noProjectsYet', locale)}
            description={t('selectProjectHint', locale)}
            ctaLabel={`+ ${t('createProject', locale)}`}
            onCta={() => setCreateProjectOpen(true)}
          />
        ) : (
          <div className="space-y-2">
            <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#8A857D]">
              {t('projectsFoldersHint', locale)}
            </p>
            <div className="flex flex-wrap items-start gap-4 sm:gap-5">
              {sortedProjects.map((project) => (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => setActiveCampaignId(project.id)}
                  className="flex flex-col items-center gap-1.5 min-w-[72px] max-w-[96px] p-1.5 hover:opacity-90 transition-opacity"
                >
                  <div
                    className="w-12 h-12 min-h-[48px] min-w-[48px] text-white flex items-center justify-center"
                    style={{ background: project.color || '#1C1917' }}
                  >
                    <Folder size={22} />
                  </div>
                  <p className="text-[11px] font-semibold text-[#2C2621] text-center line-clamp-2 leading-snug">
                    {project.name}
                  </p>
                  <ProjectGoalProgress campaign={project} compact />
                </button>
              ))}
              <button
                type="button"
                onClick={() => setCreateProjectOpen(true)}
                className="flex flex-col items-center gap-1.5 min-w-[72px] max-w-[96px] p-1.5 hover:opacity-90 transition-opacity"
              >
                <div className="w-12 h-12 min-h-[48px] min-w-[48px] border border-dashed border-[#D6D3CD] text-[#A8A29E] flex items-center justify-center">
                  <Plus size={18} strokeWidth={2} />
                </div>
                <p className="text-[11px] font-semibold text-[#8A857D] text-center line-clamp-2 leading-snug">
                  {t('createProject', locale)}
                </p>
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ProjectGoalProgress campaign={active} />
      <ProjectVisionBoard campaign={active} />
      <ProjectFilesPanel
        campaign={active}
        headerExtra={
          linkedMediaFolders[0] ? (
            <button
              type="button"
              onClick={() => setActiveMediaFolderId(linkedMediaFolders[0].id)}
              className={OUTLINE_BTN}
            >
              <Folder size={12} aria-hidden />
              {linkedMediaFolders[0].name}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setLinkFolderId('');
                setNewFolderName('');
                setLinkFolderOpen(true);
              }}
              className="inline-flex items-center justify-center gap-1.5 h-8 min-h-[32px] px-2.5 rounded-sm bg-transparent text-[9px] font-medium uppercase tracking-[0.08em] text-[#8A857D] hover:bg-[#F0EFEA] hover:text-[#2C2621] transition-colors"
            >
              Link media folder
            </button>
          )
        }
      />
      <ContentPlannerShell
        campaignId={active.id}
        embedded
        eyebrow={t('adminNavProjects', locale)}
        title={
          <span className="inline-flex items-center gap-2 min-w-0">
            <span
              className="w-2.5 h-2.5 flex-shrink-0"
              style={{ background: active.color || COLORS[1] }}
              aria-hidden
            />
            <span className="truncate">{active.name}</span>
            <button
              type="button"
              onClick={openEditDialog}
              className="inline-flex h-8 w-8 min-h-[32px] min-w-[32px] items-center justify-center text-[#A8A29E] hover:text-[#2C2621] flex-shrink-0"
              aria-label="Edit project"
              title="Edit project"
            >
              <Pencil size={13} />
            </button>
          </span>
        }
        description={
          active.description ||
          (activeWorkspace
            ? tf('projectsSub', locale, { name: activeWorkspace.name })
            : undefined)
        }
        headerExtra={
          <button
            type="button"
            onClick={openDeleteDialog}
            className="inline-flex items-center justify-center h-8 w-8 min-h-[32px] min-w-[32px] text-[#A8A29E] hover:text-[#B85C38] transition-colors"
            aria-label={t('delete', locale)}
          >
            <Trash2 size={14} />
          </button>
        }
      />
      {deleteDialog}
      {linkFolderDialog}
      {editProjectDialog}
    </div>
  );
}

function CreateProjectForm({
  name,
  setName,
  description,
  setDescription,
  color,
  setColor,
  onCancel,
  onSave,
  saving,
  locale,
}: {
  name: string;
  setName: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  color: string;
  setColor: (v: string) => void;
  onCancel: () => void;
  onSave: () => void;
  saving: boolean;
  locale: Parameters<typeof t>[1];
}) {
  return (
    <div className={`${adminCardClass} p-4 sm:p-5 space-y-3`}>
      <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#8A857D]">
        {t('newProject', locale)}
      </p>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={t('projectNamePlaceholder', locale)}
        className={UNDERLINE_INPUT}
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder={t('projectDescPlaceholder', locale)}
        className="w-full min-h-[72px] border border-[#E6E3DB] rounded-sm bg-white px-2.5 py-2 text-xs text-[#2C2621] resize-none focus:outline-none focus:border-[#2C2621] placeholder:text-[#C4BFB6]"
      />
      <div className="flex flex-wrap items-center gap-2">
        {COLORS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setColor(c)}
            className={`w-6 h-6 min-h-[24px] ${
              color === c ? 'ring-2 ring-offset-1 ring-[#1C1917]' : ''
            }`}
            style={{ background: c }}
            aria-label={c}
          />
        ))}
        <div className="flex-1" />
        <button
          type="button"
          onClick={onCancel}
          className="text-[9px] font-semibold uppercase tracking-[0.1em] text-[#8A857D] hover:text-[#2C2621] h-8 min-h-[32px] px-2"
        >
          {t('cancel', locale)}
        </button>
        <button
          type="button"
          disabled={!name.trim() || saving}
          onClick={onSave}
          className={PRIMARY_BTN}
        >
          {t('save', locale)}
        </button>
      </div>
    </div>
  );
}
