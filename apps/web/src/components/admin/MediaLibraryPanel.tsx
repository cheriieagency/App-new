'use client';

import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { useWorkspace } from '@/context/WorkspaceContext';
import { useAdminNav } from '@/components/admin/AdminNavContext';
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
import GoogleDriveImportButton from '@/components/admin/GoogleDriveImportButton';
import useUpload from '@/utils/useUpload';

const COLORS = ['#F472B6', '#9089F0', '#10B981', '#F59E0B', '#2B2568', '#0EA5E9'];

/**
 * Media Library: images/videos organized by folders from the sidebar submenu.
 * Permanent “Brand assets” root shows every file across the library.
 */
export default function MediaLibraryPanel() {
  const { locale } = useLanguage();
  const { activeWorkspace } = useWorkspace();
  const {
    activeMediaFolderId,
    setActiveMediaFolderId,
    createMediaFolderOpen,
    setCreateMediaFolderOpen,
  } = useAdminNav();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLORS[1]);
  const [description, setDescription] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteAcknowledged, setDeleteAcknowledged] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [upload, { loading: uploading }] = useUpload();
  const creating = createMediaFolderOpen;

  const { data: foldersData } = useQuery<{ folders: MediaFolder[] }>({
    queryKey: ['media-folders'],
    queryFn: async () => {
      const r = await fetch('/api/admin/media');
      if (!r.ok) throw new Error('Failed');
      return r.json();
    },
  });

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

  useEffect(() => {
    if (!activeMediaFolderId) {
      setActiveMediaFolderId(MEDIA_LIBRARY_ROOT_ID);
    }
  }, [activeMediaFolderId, setActiveMediaFolderId]);

  useEffect(() => {
    setRenaming(false);
    setRenameValue(active?.name || '');
  }, [activeId, active?.name]);

  const { data: folderDetail, isLoading } = useQuery<{
    folder: MediaFolder | null;
    assets: MediaAsset[];
  }>({
    queryKey: ['media-folder', activeId],
    queryFn: async () => {
      const r = await fetch(
        `/api/admin/media?folder=${encodeURIComponent(activeId)}`
      );
      if (!r.ok) throw new Error('Failed');
      return r.json();
    },
    enabled: Boolean(activeId) && !creating,
  });

  const assets = folderDetail?.assets ?? [];

  const createMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch('/api/admin/media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', name, color, description }),
      });
      if (!r.ok) throw new Error('create failed');
      return r.json() as Promise<{ folder: MediaFolder }>;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['media-folders'] });
      setName('');
      setDescription('');
      setCreateMediaFolderOpen(false);
      setActiveMediaFolderId(data.folder.id);
    },
  });

  const renameMutation = useMutation({
    mutationFn: async (nextName: string) => {
      const r = await fetch('/api/admin/media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      toast.success('Folder renamed');
    },
    onError: () => toast.error('Could not rename folder'),
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const result = await upload({ file });
      if (!result.url) {
        throw new Error(result.error || 'Upload failed');
      }
      const r = await fetch('/api/admin/media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'upload',
          folderId: activeId,
          imageUrl: result.url,
          label: file.name,
          fileName: file.name,
          fileType: file.type,
          kind: file.type.startsWith('video/') ? 'video' : 'image',
        }),
      });
      if (!r.ok) throw new Error('Could not save to media library');
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media-folder', activeId] });
      queryClient.invalidateQueries({ queryKey: ['media-folders'] });
      toast.success('Uploaded from your device');
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch('/api/admin/media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

  const onDeviceFiles = (files: FileList | null) => {
    if (!files?.length) return;
    Array.from(files).forEach((file) => uploadMutation.mutate(file));
    if (fileInputRef.current) fileInputRef.current.value = '';
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
          onCancel={() => setCreateMediaFolderOpen(false)}
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

      {isLoading ? (
        <div
          className={`${adminCardClass} py-16 text-center text-sm text-slate-400`}
        >
          {t('loading', locale)}
        </div>
      ) : assets.length === 0 ? (
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
                }}
              />
            </span>
          }
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {assets.map((m) => (
            <div
              key={m.id}
              className={`${adminCardClass} overflow-hidden text-left`}
            >
              {m.kind === 'video' ? (
                <video
                  src={m.image}
                  className="w-full aspect-square object-cover bg-slate-100"
                  muted
                  playsInline
                />
              ) : (
                <img
                  src={m.image}
                  alt={m.label}
                  className="w-full aspect-square object-cover"
                />
              )}
              <div className="p-3">
                <p className="text-sm font-semibold text-slate-900 truncate">
                  {m.label}
                </p>
                <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 mt-0.5">
                  {m.kind} · {m.platform}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

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
      <div className="flex flex-wrap items-center gap-2">
        {COLORS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setColor(c)}
            className={`w-8 h-8 min-h-[32px] rounded-full ${
              color === c ? 'ring-2 ring-offset-2 ring-slate-400' : ''
            }`}
            style={{ background: c }}
            aria-label={c}
          />
        ))}
        <div className="flex-1" />
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
  );
}
