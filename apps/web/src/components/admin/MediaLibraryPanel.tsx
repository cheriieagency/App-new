'use client';

import { useEffect, useMemo, useRef, useState, type DragEvent } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Folder, FolderKanban, Pencil, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { useWorkspace } from '@/context/WorkspaceContext';
import {
  adminProjectsHref,
  useAdminNav,
} from '@/components/admin/AdminNavContext';
import { AdminPageHeader, adminCardClass } from '@/components/admin/AdminUi';
import AdminEmptyState from '@/components/admin/AdminEmptyState';
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
import {
  MEDIA_LIBRARY_ROOT,
  MEDIA_LIBRARY_ROOT_ID,
  isMediaLibraryRoot,
  type MediaAsset,
  type MediaFolder,
} from '@/lib/mock-media-library';
import type { CampaignLabel } from '@/lib/mock-content-planner';
import GoogleDriveImportButton from '@/components/admin/GoogleDriveImportButton';
import useUpload from '@/utils/useUpload';

/* Swatches ordered by hue family so similar colors sit beside each other. */
const COLORS = [
  // Pinks
  '#F472B6', // signature pink
  '#EC4899', // fuchsia
  // Purples / violets
  '#2B2568', // midnight periwinkle (default)
  '#9089F0', // soft periwinkle
  '#A78BFA', // lilac
  '#8B5CF6', // violet
  '#6366F1', // indigo
  // Blues / teals
  '#0EA5E9', // sky
  '#14B8A6', // teal
  // Greens
  '#10B981', // mint
  '#84CC16', // lime
  // Warm
  '#F59E0B', // amber
  '#F97316', // orange
  '#EF4444', // coral red
  // Neutrals
  '#64748B', // slate
  '#0F172A', // dark ink
];
const DEFAULT_FOLDER_COLOR = '#2B2568';
const MEDIA_DND_TYPE = 'application/x-clikd-media-asset';

/**
 * Media Library: images/videos organized by folders from the sidebar submenu.
 * Permanent “Brand assets” root shows every file across the library.
 */
export default function MediaLibraryPanel() {
  const { locale } = useLanguage();
  const { activeWorkspace } = useWorkspace();
  const {
    section,
    activeMediaFolderId,
    setActiveMediaFolderId,
    createMediaFolderOpen,
    setCreateMediaFolderOpen,
  } = useAdminNav();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [color, setColor] = useState(DEFAULT_FOLDER_COLOR);
  const [description, setDescription] = useState('');
  const [campaignId, setCampaignId] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteAcknowledged, setDeleteAcknowledged] = useState(false);
  const [assetToDelete, setAssetToDelete] = useState<MediaAsset | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [draggingAssetId, setDraggingAssetId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [upload, { loading: uploading }] = useUpload();
  const creating = createMediaFolderOpen;

  const { data: foldersData } = useQuery<{ folders: MediaFolder[] }>({
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

  const { data: campaignsData } = useQuery<{ campaigns: CampaignLabel[] }>({
    queryKey: ['planner-campaigns'],
    queryFn: async () => {
      const r = await fetch('/api/planner/campaigns', { credentials: 'include' });
      if (!r.ok) throw new Error('Failed');
      return r.json();
    },
  });
  const projects = campaignsData?.campaigns ?? [];
  const projectById = useMemo(() => {
    const map = new Map<string, CampaignLabel>();
    for (const p of projects) map.set(p.id, p);
    return map;
  }, [projects]);

  const folders = foldersData?.folders ?? [];
  const activeId =
    !activeMediaFolderId || isMediaLibraryRoot(activeMediaFolderId)
      ? MEDIA_LIBRARY_ROOT_ID
      : folders.some((f) => f.id === activeMediaFolderId)
        ? activeMediaFolderId
        : MEDIA_LIBRARY_ROOT_ID;
  const isRoot = isMediaLibraryRoot(activeId);
  const active: MediaFolder = isRoot
    ? {
        ...MEDIA_LIBRARY_ROOT,
        ...(folders.find((f) => f.id === MEDIA_LIBRARY_ROOT_ID) || {}),
        id: MEDIA_LIBRARY_ROOT_ID,
        permanent: true,
      }
    : (folders.find((f) => f.id === activeId) as MediaFolder);

  // Only auto-select Brand assets while Media is the active section.
  // Media stays mounted (keep-alive) after first visit — without this guard,
  // leaving Media clears folder id → this effect calls setActiveMediaFolderId
  // → that setter forces section back to 'media' and navigation appears broken.
  useEffect(() => {
    if (section !== 'media') return;
    if (!activeMediaFolderId) {
      setActiveMediaFolderId(MEDIA_LIBRARY_ROOT_ID);
    }
  }, [section, activeMediaFolderId, setActiveMediaFolderId]);

  useEffect(() => {
    setRenaming(false);
    setRenameValue(active?.name || '');
  }, [activeId, active?.name]);

  const { data: folderDetail, isLoading } = useQuery<{
    folder: MediaFolder | null;
    assets: MediaAsset[];
  }>({
    queryKey: ['media-folder', activeId, activeWorkspace.id],
    queryFn: async () => {
      const r = await fetch(
        `/api/admin/media?folder=${encodeURIComponent(activeId)}`,
        {
          headers: activeWorkspace.id
            ? {
                'x-workspace-id': activeWorkspace.id,
                'x-active-workspace-id': activeWorkspace.id,
              }
            : undefined,
          credentials: 'include',
        }
      );
      if (!r.ok) throw new Error('Failed');
      return r.json();
    },
    enabled: Boolean(activeId) && !creating,
  });

  const assets = folderDetail?.assets ?? [];
  // Nested folders under Brand assets (sidebar categories) — shown as cards in root.
  const nestedFolders = useMemo(
    () => folders.filter((f) => !isMediaLibraryRoot(f.id)),
    [folders]
  );
  // Root query returns every asset — use that for folder counts + loose files only in grid.
  const assetCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const a of assets) {
      const key =
        a.folder_id && !isMediaLibraryRoot(a.folder_id)
          ? a.folder_id
          : MEDIA_LIBRARY_ROOT_ID;
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    return counts;
  }, [assets]);
  const visibleAssets = isRoot
    ? assets.filter(
        (a) => !a.folder_id || isMediaLibraryRoot(a.folder_id)
      )
    : assets;
  const hasContent = isRoot
    ? nestedFolders.length > 0 || visibleAssets.length > 0
    : visibleAssets.length > 0;

  const workspaceHeaders: Record<string, string> = activeWorkspace.id
    ? {
        'x-workspace-id': activeWorkspace.id,
        'x-active-workspace-id': activeWorkspace.id,
      }
    : {};

  const createMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch('/api/admin/media', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(activeWorkspace.id
            ? {
                'x-workspace-id': activeWorkspace.id,
                'x-active-workspace-id': activeWorkspace.id,
              }
            : {}),
        },
        credentials: 'include',
        body: JSON.stringify({
          action: 'create',
          name,
          color,
          description,
          campaignId: campaignId || null,
        }),
      });
      if (!r.ok) throw new Error('create failed');
      return r.json() as Promise<{ folder: MediaFolder }>;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['media-folders'] });
      setName('');
      setDescription('');
      setColor(DEFAULT_FOLDER_COLOR);
      setCampaignId('');
      setCreateMediaFolderOpen(false);
      setActiveMediaFolderId(data.folder.id);
      toast.success(
        data.folder.campaign_id
          ? 'Folder created and linked to project'
          : 'Folder created'
      );
    },
  });

  const linkProjectMutation = useMutation({
    mutationFn: async (nextCampaignId: string | null) => {
      const r = await fetch('/api/admin/media', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...workspaceHeaders,
        },
        credentials: 'include',
        body: JSON.stringify({
          action: 'update',
          id: activeId,
          campaignId: nextCampaignId,
        }),
      });
      if (!r.ok) throw new Error('Could not link project');
      return r.json() as Promise<{ folder: MediaFolder }>;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['media-folders'] });
      queryClient.invalidateQueries({ queryKey: ['media-folder', activeId] });
      toast.success(
        data.folder.campaign_id
          ? 'Folder linked to project'
          : 'Project link removed'
      );
    },
    onError: () => toast.error(t('toastUpdateProjectLinkFailed', locale)),
  });

  const renameMutation = useMutation({
    mutationFn: async (nextName: string) => {
      const r = await fetch('/api/admin/media', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(activeWorkspace.id
            ? {
                'x-workspace-id': activeWorkspace.id,
                'x-active-workspace-id': activeWorkspace.id,
              }
            : {}),
        },
        credentials: 'include',
        body: JSON.stringify({
          action: 'rename',
          id: activeId,
          name: nextName,
        }),
      });
      if (!r.ok) throw new Error('rename failed');
      return r.json() as Promise<{ folder: MediaFolder }>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media-folders'] });
      queryClient.invalidateQueries({ queryKey: ['media-folder', activeId] });
      setRenaming(false);
      toast.success(t('toastFolderRenamed', locale));
    },
    onError: () => toast.error(t('toastFolderRenameFailed', locale)),
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const result = await upload({ file });
      if (!result.url) {
        throw new Error(result.error || 'Upload failed');
      }
      const r = await fetch('/api/admin/media', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(activeWorkspace.id
            ? {
                'x-workspace-id': activeWorkspace.id,
                'x-active-workspace-id': activeWorkspace.id,
              }
            : {}),
        },
        credentials: 'include',
        body: JSON.stringify({
          action: 'upload',
          folderId: activeId,
          imageUrl: result.url,
          label: file.name,
          fileName: file.name,
          fileType: file.type,
          sizeBytes: file.size,
          kind: file.type.startsWith('video/') ? 'video' : 'image',
        }),
      });
      if (!r.ok) throw new Error('Could not save to media library');
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media-folder', activeId] });
      queryClient.invalidateQueries({ queryKey: ['media-folder'] });
      queryClient.invalidateQueries({ queryKey: ['media-folders'] });
      toast.success(t('toastUploadedFromDevice', locale));
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    },
  });

  const moveMutation = useMutation({
    mutationFn: async ({
      assetId,
      folderId,
    }: {
      assetId: string;
      folderId: string;
    }) => {
      const r = await fetch('/api/admin/media', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...workspaceHeaders,
        },
        credentials: 'include',
        body: JSON.stringify({
          action: 'move',
          assetId,
          folderId,
        }),
      });
      if (!r.ok) throw new Error('Could not move file');
      return r.json() as Promise<{ asset: MediaAsset }>;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['media-folder'] });
      queryClient.invalidateQueries({ queryKey: ['media-folders'] });
      const dest =
        isMediaLibraryRoot(vars.folderId)
          ? 'Brand assets'
          : nestedFolders.find((f) => f.id === vars.folderId)?.name ||
            'folder';
      toast.success(tf('toastMovedToFolder', locale, { dest }));
    },
    onError: () => toast.error(t('toastMoveFileFailed', locale)),
    onSettled: () => {
      setDropTargetId(null);
      setDraggingAssetId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch('/api/admin/media', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(activeWorkspace.id
            ? {
                'x-workspace-id': activeWorkspace.id,
                'x-active-workspace-id': activeWorkspace.id,
              }
            : {}),
        },
        credentials: 'include',
        body: JSON.stringify({ action: 'delete', id }),
      });
      if (!r.ok) throw new Error('delete failed');
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media-folders'] });
      queryClient.invalidateQueries({ queryKey: ['media-folder'] });
      setDeleteOpen(false);
      setDeleteAcknowledged(false);
      setActiveMediaFolderId(MEDIA_LIBRARY_ROOT_ID);
    },
  });

  const deleteAssetMutation = useMutation({
    mutationFn: async (assetId: string) => {
      const r = await fetch('/api/admin/media', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...workspaceHeaders,
        },
        credentials: 'include',
        body: JSON.stringify({ action: 'delete_asset', assetId }),
      });
      if (!r.ok) throw new Error('Could not delete file');
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media-folder'] });
      queryClient.invalidateQueries({ queryKey: ['media-folders'] });
      setAssetToDelete(null);
      toast.success(t('toastDeletedFromLibrary', locale));
    },
    onError: () => toast.error(t('toastFileDeleteFailed', locale)),
  });

  const onDeviceFiles = (files: FileList | null) => {
    if (!files?.length) return;
    Array.from(files).forEach((file) => uploadMutation.mutate(file));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const onAssetDragStart = (e: DragEvent, assetId: string) => {
    e.dataTransfer.setData(MEDIA_DND_TYPE, assetId);
    e.dataTransfer.setData('text/plain', assetId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggingAssetId(assetId);
  };

  const onAssetDragEnd = () => {
    setDraggingAssetId(null);
    setDropTargetId(null);
  };

  const onFolderDragOver = (e: DragEvent, folderId: string) => {
    if (
      !e.dataTransfer.types.includes(MEDIA_DND_TYPE) &&
      !e.dataTransfer.types.includes('Files')
    ) {
      return;
    }
    e.preventDefault();
    e.dataTransfer.dropEffect = e.dataTransfer.types.includes(MEDIA_DND_TYPE)
      ? 'move'
      : 'copy';
    setDropTargetId(folderId);
  };

  const onFolderDragLeave = (e: DragEvent, folderId: string) => {
    const related = e.relatedTarget as Node | null;
    if (related && e.currentTarget.contains(related)) return;
    if (dropTargetId === folderId) setDropTargetId(null);
  };

  const onFolderDrop = (e: DragEvent, folderId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDropTargetId(null);

    const assetId =
      e.dataTransfer.getData(MEDIA_DND_TYPE) ||
      e.dataTransfer.getData('text/plain');
    if (assetId) {
      moveMutation.mutate({ assetId, folderId });
      return;
    }

    // OS file drop onto a folder → upload straight into that folder.
    const files = e.dataTransfer.files;
    if (!files?.length) return;
    Array.from(files).forEach(async (file) => {
      try {
        const result = await upload({ file });
        if (!result.url) throw new Error(result.error || 'Upload failed');
        const r = await fetch('/api/admin/media', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...workspaceHeaders,
          },
          credentials: 'include',
          body: JSON.stringify({
            action: 'upload',
            folderId,
            imageUrl: result.url,
            label: file.name,
            fileName: file.name,
            fileType: file.type,
            sizeBytes: file.size,
            kind: file.type.startsWith('video/') ? 'video' : 'image',
          }),
        });
        if (!r.ok) throw new Error('Could not save to media library');
        queryClient.invalidateQueries({ queryKey: ['media-folder'] });
        queryClient.invalidateQueries({ queryKey: ['media-folders'] });
        toast.success(t('toastUploadedToFolder', locale));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Upload failed');
      }
    });
  };

  const deviceUploadButton = (
    <button
      type="button"
      onClick={() => fileInputRef.current?.click()}
      disabled={uploading || uploadMutation.isPending}
      className="inline-flex items-center justify-center gap-1.5 h-11 min-h-[44px] px-3.5 rounded-xl border border-slate-200 bg-white text-xs font-extrabold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
    >
      <Upload size={14} />
      {uploading || uploadMutation.isPending
        ? 'Uploading…'
        : 'Upload from device'}
    </button>
  );

  if (creating) {
    return (
      <div className="space-y-6">
        <CreateFolderForm
          name={name}
          setName={setName}
          description={description}
          setDescription={setDescription}
          color={color}
          setColor={setColor}
          campaignId={campaignId}
          setCampaignId={setCampaignId}
          projects={projects}
          onCancel={() => {
            setCreateMediaFolderOpen(false);
            setCampaignId('');
          }}
          onSave={() => createMutation.mutate()}
          saving={createMutation.isPending}
          locale={locale}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        className="hidden"
        onChange={(e) => onDeviceFiles(e.target.files)}
      />

      <AdminPageHeader
        eyebrow={t('adminNavMedia', locale)}
        title={
          renaming ? (
            <form
              className="flex flex-wrap items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (renameValue.trim()) renameMutation.mutate(renameValue.trim());
              }}
            >
              <input
                autoFocus
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                className="h-11 min-h-[44px] min-w-[180px] max-w-full rounded-xl border border-slate-200 bg-white px-3 text-lg sm:text-xl font-extrabold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                aria-label="Folder name"
              />
              <button
                type="submit"
                disabled={!renameValue.trim() || renameMutation.isPending}
                className="h-11 min-h-[44px] px-3 rounded-xl bg-slate-900 text-white text-xs font-extrabold disabled:opacity-40"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => {
                  setRenaming(false);
                  setRenameValue(active.name);
                }}
                className="h-11 min-h-[44px] px-3 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-50"
              >
                Cancel
              </button>
            </form>
          ) : (
            <span className="inline-flex items-center gap-2">
              {active.name}
              <button
                type="button"
                onClick={() => {
                  setRenameValue(active.name);
                  setRenaming(true);
                }}
                className="inline-flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                aria-label="Rename folder"
                title="Rename folder"
              >
                <Pencil size={15} />
              </button>
            </span>
          )
        }
        description={
          active.description ||
          tf('mediaFolderSub', locale, { name: activeWorkspace.name })
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {deviceUploadButton}
            <GoogleDriveImportButton
              target="media_library"
              onImported={() => {
                queryClient.invalidateQueries({
                  queryKey: ['media-folder', activeId],
                });
                queryClient.invalidateQueries({ queryKey: ['media-folders'] });
                queryClient.invalidateQueries({ queryKey: ['media-folder'] });
              }}
            />
            {!isRoot ? (
              <button
                type="button"
                onClick={() => {
                  setDeleteAcknowledged(false);
                  setDeleteOpen(true);
                }}
                className="inline-flex items-center justify-center h-11 w-11 min-h-[44px] min-w-[44px] rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                aria-label={t('delete', locale)}
              >
                <Trash2 size={16} />
              </button>
            ) : null}
          </div>
        }
      />

      {!isRoot ? (
        <div className={`${adminCardClass} p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4`}>
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <FolderKanban size={16} className="text-[#2B2568] shrink-0" aria-hidden />
            <div className="min-w-0">
              <p className="text-[10px] font-mono font-bold uppercase tracking-[0.12em] text-slate-400">
                Linked project
              </p>
              <p className="text-sm font-semibold text-slate-700 truncate">
                {active.campaign_id && projectById.get(active.campaign_id)
                  ? projectById.get(active.campaign_id)!.name
                  : 'Not linked to a project'}
              </p>
            </div>
          </div>
          <label className="block sm:min-w-[220px]">
            <span className="sr-only">Connect folder to project</span>
            <select
              value={active.campaign_id || ''}
              disabled={linkProjectMutation.isPending}
              onChange={(e) =>
                linkProjectMutation.mutate(e.target.value || null)
              }
              className="w-full h-11 min-h-[44px] px-3 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 disabled:opacity-50"
            >
              <option value="">No project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          {active.campaign_id ? (
            <Link
              href={adminProjectsHref({ campaignId: active.campaign_id })}
              className="inline-flex items-center justify-center h-11 min-h-[44px] px-4 rounded-xl border border-slate-200 bg-white text-xs font-extrabold text-slate-700 hover:bg-slate-50 shrink-0"
            >
              Open project
            </Link>
          ) : null}
        </div>
      ) : null}

      {isLoading ? (
        <div
          className={`${adminCardClass} py-16 text-center text-sm text-slate-400`}
        >
          {t('loading', locale)}
        </div>
      ) : !hasContent ? (
        <AdminEmptyState
          icon={Upload}
          headline="No media in this folder yet"
          description="Upload from your device, import from Google Drive, or create a folder to organize brand assets."
          ctaLabel="+ Create Folder"
          onCta={() => setCreateMediaFolderOpen(true)}
          secondary={
            <span className="inline-flex flex-wrap items-center justify-center gap-2">
              {deviceUploadButton}
              <GoogleDriveImportButton
                target="media_library"
                onImported={() => {
                  queryClient.invalidateQueries({
                    queryKey: ['media-folder', activeId],
                  });
                  queryClient.invalidateQueries({ queryKey: ['media-folders'] });
                  queryClient.invalidateQueries({ queryKey: ['media-folder'] });
                }}
              />
            </span>
          }
        />
      ) : (
        <div className="space-y-5">
          {/* Folders row — icon + label only, above the photo grid */}
          <div className="space-y-2">
              {isRoot ? (
                <p className="text-[10px] font-mono font-bold uppercase tracking-[0.12em] text-slate-400">
                  Folders — drag files onto a folder to sort
                </p>
              ) : (
                <p className="text-[10px] font-mono font-bold uppercase tracking-[0.12em] text-slate-400">
                  Drag files onto Brand assets to move them back
                </p>
              )}

              <div className="flex flex-wrap items-start gap-4 sm:gap-5">
                {!isRoot ? (
                  <button
                    type="button"
                    onClick={() => setActiveMediaFolderId(MEDIA_LIBRARY_ROOT_ID)}
                    onDragOver={(e) => onFolderDragOver(e, MEDIA_LIBRARY_ROOT_ID)}
                    onDragLeave={(e) =>
                      onFolderDragLeave(e, MEDIA_LIBRARY_ROOT_ID)
                    }
                    onDrop={(e) => onFolderDrop(e, MEDIA_LIBRARY_ROOT_ID)}
                    className={`flex flex-col items-center gap-1.5 min-w-[72px] max-w-[96px] rounded-xl p-1.5 transition-all ${
                      dropTargetId === MEDIA_LIBRARY_ROOT_ID
                        ? 'ring-2 ring-[#F472B6] ring-offset-2'
                        : 'hover:opacity-90'
                    }`}
                  >
                    <div className="w-14 h-14 min-h-[56px] min-w-[56px] rounded-2xl bg-[#2B2568] text-white flex items-center justify-center">
                      <Folder size={26} />
                    </div>
                    <p className="text-sm font-extrabold text-slate-900 text-center line-clamp-2 leading-snug">
                      Brand assets
                    </p>
                    <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
                      Drop to unfile
                    </p>
                  </button>
                ) : null}

                {isRoot
                  ? nestedFolders.map((folder) => {
                      const count = assetCounts.get(folder.id) || 0;
                      const isHot = dropTargetId === folder.id;
                      const linkedProject = folder.campaign_id
                        ? projectById.get(folder.campaign_id)
                        : null;
                      return (
                        <button
                          key={folder.id}
                          type="button"
                          onClick={() => setActiveMediaFolderId(folder.id)}
                          onDragOver={(e) => onFolderDragOver(e, folder.id)}
                          onDragLeave={(e) => onFolderDragLeave(e, folder.id)}
                          onDrop={(e) => onFolderDrop(e, folder.id)}
                          className={`flex flex-col items-center gap-1.5 min-w-[72px] max-w-[96px] rounded-xl p-1.5 transition-all ${
                            isHot
                              ? 'ring-2 ring-[#F472B6] ring-offset-2'
                              : 'hover:opacity-90'
                          }`}
                        >
                          <div
                            className="w-14 h-14 min-h-[56px] min-w-[56px] rounded-2xl text-white flex items-center justify-center relative"
                            style={{
                              background: folder.color || DEFAULT_FOLDER_COLOR,
                            }}
                          >
                            <Folder size={26} />
                            {linkedProject ? (
                              <span
                                className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-white border border-slate-200 text-[#2B2568] inline-flex items-center justify-center"
                                title={`Linked to ${linkedProject.name}`}
                              >
                                <FolderKanban size={11} aria-hidden />
                              </span>
                            ) : null}
                          </div>
                          <p className="text-sm font-extrabold text-slate-900 text-center line-clamp-2 leading-snug">
                            {folder.name}
                          </p>
                          <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
                            {count} {count === 1 ? 'file' : 'files'}
                          </p>
                          {linkedProject ? (
                            <p className="text-[10px] font-semibold text-[#2B2568] text-center line-clamp-1 leading-snug">
                              {linkedProject.name}
                            </p>
                          ) : null}
                        </button>
                      );
                    })
                  : null}

                {isRoot ? (
                  <button
                    type="button"
                    onClick={() => setCreateMediaFolderOpen(true)}
                    className="flex flex-col items-center gap-1.5 min-w-[72px] max-w-[96px] rounded-xl p-1.5 hover:opacity-90 transition-opacity"
                  >
                    <div className="w-14 h-14 min-h-[56px] min-w-[56px] rounded-2xl border-2 border-dashed border-slate-300 text-slate-400 flex items-center justify-center">
                      <Folder size={24} />
                    </div>
                    <p className="text-sm font-extrabold text-slate-700 text-center leading-snug">
                      New folder
                    </p>
                    <p className="text-[10px] font-semibold text-slate-400 text-center leading-snug">
                      Organize brand assets
                    </p>
                  </button>
                ) : null}
              </div>
            </div>

          {/* Photo / video grid */}
          {visibleAssets.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {visibleAssets.map((m) => (
                <div
                  key={m.id}
                  draggable
                  onDragStart={(e) => onAssetDragStart(e, m.id)}
                  onDragEnd={onAssetDragEnd}
                  className={`${adminCardClass} group relative overflow-hidden text-left cursor-grab active:cursor-grabbing transition-opacity ${
                    draggingAssetId === m.id ? 'opacity-50' : ''
                  }`}
                >
                  <div className="relative">
                    {m.kind === 'video' ? (
                      <video
                        src={m.image}
                        className="w-full aspect-square object-cover bg-slate-100 pointer-events-none"
                        muted
                        playsInline
                      />
                    ) : (
                      <img
                        src={m.image}
                        alt={m.label}
                        className="w-full aspect-square object-cover pointer-events-none"
                        draggable={false}
                      />
                    )}
                    <button
                      type="button"
                      draggable={false}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setAssetToDelete(m);
                      }}
                      onMouseDown={(e) => e.stopPropagation()}
                      onPointerDown={(e) => e.stopPropagation()}
                      className="absolute top-2 right-2 z-10 h-11 min-h-[44px] w-11 min-w-[44px] rounded-xl bg-white/95 border border-slate-200 text-rose-600 shadow-sm inline-flex items-center justify-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 transition-opacity hover:bg-rose-50"
                      aria-label={`Delete ${m.label}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-semibold text-slate-900 truncate">
                      {m.label}
                    </p>
                    <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 mt-0.5">
                      {m.kind} · {m.platform} · drag to folder
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : isRoot && nestedFolders.length > 0 ? (
            <p className="text-sm text-slate-400 font-medium">
              No unfiled photos yet — upload files or drag them into a folder.
            </p>
          ) : null}
        </div>
      )}

      <Dialog
        open={Boolean(assetToDelete)}
        onOpenChange={(open) => {
          if (!open) setAssetToDelete(null);
        }}
      >
        <DialogContent className="max-w-[min(440px,94vw)] rounded-2xl border-slate-200/90 p-0 gap-0">
          <DialogHeader className="px-5 sm:px-6 pt-5 pb-3 text-left">
            <DialogTitle className="text-base font-bold text-slate-900">
              Delete file?
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-500 font-medium pt-1">
              <span className="font-semibold text-slate-800">
                {assetToDelete?.label}
              </span>
              {' — '}
              This removes it from your media library. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="px-5 sm:px-6 py-4 border-t border-slate-100 flex-row gap-2 sm:justify-end">
            <button
              type="button"
              onClick={() => setAssetToDelete(null)}
              className="h-11 min-h-[44px] px-4 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-50"
            >
              {t('cancel', locale)}
            </button>
            <button
              type="button"
              disabled={!assetToDelete || deleteAssetMutation.isPending}
              onClick={() => {
                if (!assetToDelete) return;
                deleteAssetMutation.mutate(assetToDelete.id);
              }}
              className="h-11 min-h-[44px] px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold disabled:opacity-40 disabled:pointer-events-none"
            >
              {t('delete', locale)}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {!isRoot ? (
        <Dialog
          open={deleteOpen}
          onOpenChange={(open) => {
            setDeleteOpen(open);
            if (!open) setDeleteAcknowledged(false);
          }}
        >
          <DialogContent className="max-w-[min(440px,94vw)] rounded-2xl border-slate-200/90 p-0 gap-0">
            <DialogHeader className="px-5 sm:px-6 pt-5 pb-3 text-left">
              <DialogTitle className="text-base font-bold text-slate-900">
                {t('deleteMediaFolderTitle', locale)}
              </DialogTitle>
              <DialogDescription className="text-sm text-slate-500 font-medium pt-1">
                <span className="font-semibold text-slate-800">
                  {active.name}
                </span>
                {' — '}
                {t('deleteMediaFolderConfirm', locale)}
              </DialogDescription>
            </DialogHeader>
            <div className="px-5 sm:px-6 pb-2">
              <label className="flex items-start gap-3 min-h-[44px] cursor-pointer rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 py-3 hover:bg-slate-50 transition-colors">
                <input
                  type="checkbox"
                  checked={deleteAcknowledged}
                  onChange={(e) => setDeleteAcknowledged(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500/30"
                />
                <span className="text-sm font-medium text-slate-700 leading-snug">
                  {t('deleteMediaFolderPermanentCheckbox', locale)}
                </span>
              </label>
            </div>
            <DialogFooter className="px-5 sm:px-6 py-4 border-t border-slate-100 flex-row gap-2 sm:justify-end">
              <button
                type="button"
                onClick={() => setDeleteOpen(false)}
                className="h-11 min-h-[44px] px-4 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-50"
              >
                {t('cancel', locale)}
              </button>
              <button
                type="button"
                disabled={!deleteAcknowledged || deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(active.id)}
                className="h-11 min-h-[44px] px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold disabled:opacity-40 disabled:pointer-events-none"
              >
                {t('delete', locale)}
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}

function CreateFolderForm({
  name,
  setName,
  description,
  setDescription,
  color,
  setColor,
  campaignId,
  setCampaignId,
  projects,
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
  campaignId: string;
  setCampaignId: (v: string) => void;
  projects: CampaignLabel[];
  onCancel: () => void;
  onSave: () => void;
  saving: boolean;
  locale: Parameters<typeof t>[1];
}) {
  return (
    <div className={`${adminCardClass} p-4 sm:p-5 space-y-3`}>
      <p className="text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-slate-400">
        {t('newMediaFolder', locale)}
      </p>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={t('mediaFolderNamePlaceholder', locale)}
        className="w-full h-11 min-h-[44px] rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/5"
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder={t('mediaFolderDescPlaceholder', locale)}
        className="w-full min-h-[72px] rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 resize-none focus:outline-none focus:ring-2 focus:ring-slate-900/5"
      />
      <label className="block">
        <span className="block text-xs font-bold text-slate-700 mb-1.5">
          Link to project (optional)
        </span>
        <select
          value={campaignId}
          onChange={(e) => setCampaignId(e.target.value)}
          className="w-full h-11 min-h-[44px] px-3 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/5"
        >
          <option value="">No project</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        {projects.length === 0 ? (
          <p className="mt-1.5 text-xs text-slate-500 font-medium">
            Create a project under Projects first, then link it here.
          </p>
        ) : null}
      </label>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 w-full">
        <div className="grid grid-cols-8 gap-2.5 w-fit max-w-full">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className={`w-9 h-9 min-h-[36px] min-w-[36px] justify-self-center rounded-full transition-transform ${
                color === c
                  ? 'ring-2 ring-offset-2 ring-slate-900 scale-110'
                  : 'hover:scale-105'
              }`}
              style={{ background: c }}
              aria-label={`Folder color ${c}`}
              aria-pressed={color === c}
            />
          ))}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-center ml-auto">
          <button
            type="button"
            onClick={onCancel}
            className="h-11 min-h-[44px] px-4 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-50"
          >
            {t('cancel', locale)}
          </button>
          <button
            type="button"
            disabled={!name.trim() || saving}
            onClick={onSave}
            className="h-11 min-h-[44px] px-4 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 disabled:opacity-40"
          >
            {t('save', locale)}
          </button>
        </div>
      </div>
    </div>
  );
}
