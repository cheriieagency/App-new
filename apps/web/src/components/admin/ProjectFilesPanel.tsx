'use client';

import { useRef, useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  FileText,
  Folder,
  FolderPlus,
  Plus,
  Trash2,
  Upload,
} from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/lib/locale-context';
import { t } from '@/lib/i18n';
import { adminCardClass } from '@/components/admin/AdminUi';
import { useWorkspace } from '@/context/WorkspaceContext';
import type { CampaignLabel } from '@/lib/mock-content-planner';
import type {
  ProjectFile,
  ProjectFileFolder,
} from '@/lib/planner/project-files';
import useUpload from '@/utils/useUpload';

const FOLDER_COLORS = [
  '#F472B6',
  '#9089F0',
  '#10B981',
  '#F59E0B',
  '#2B2568',
  '#0EA5E9',
];

const ACCEPT_FILES =
  '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.png,.jpg,.jpeg,.webp,.gif,.mp4,.mov,application/pdf,image/*,video/*,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

type ProjectFilesPanelProps = {
  campaign: CampaignLabel;
  /** Optional action shown next to New folder / Upload (e.g. Link media folder). */
  headerExtra?: ReactNode;
};

function formatBytes(bytes: number) {
  if (!bytes || bytes < 1024) return `${bytes || 0} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileKindLabel(fileType: string, fileName: string) {
  const type = (fileType || '').toLowerCase();
  const name = fileName.toLowerCase();
  if (type.includes('pdf') || name.endsWith('.pdf')) return 'PDF';
  if (type.startsWith('image/')) return 'Image';
  if (type.startsWith('video/')) return 'Video';
  if (type.includes('sheet') || name.endsWith('.xls') || name.endsWith('.xlsx'))
    return 'Spreadsheet';
  if (type.includes('word') || name.endsWith('.doc') || name.endsWith('.docx'))
    return 'Document';
  if (name.endsWith('.zip')) return 'Archive';
  return 'File';
}

/**
 * Project documents area — folders + PDFs/docs under the visionboard.
 */
export default function ProjectFilesPanel({
  campaign,
  headerExtra,
}: ProjectFilesPanelProps) {
  const { locale } = useLanguage();
  const { activeWorkspace } = useWorkspace();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [upload, { loading: uploading }] = useUpload();
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [folderName, setFolderName] = useState('');
  const [folderColor, setFolderColor] = useState(FOLDER_COLORS[4]);

  const workspaceHeaders: Record<string, string> = activeWorkspace.id
    ? {
        'x-workspace-id': activeWorkspace.id,
        'x-active-workspace-id': activeWorkspace.id,
      }
    : {};

  const folderQuery = activeFolderId === null ? 'all' : activeFolderId;

  const { data, isLoading } = useQuery<{
    folders: ProjectFileFolder[];
    files: ProjectFile[];
  }>({
    queryKey: ['project-files', campaign.id, folderQuery, activeWorkspace.id],
    queryFn: async () => {
      const params = new URLSearchParams({
        campaignId: campaign.id,
        folderId: folderQuery,
      });
      const r = await fetch(`/api/planner/project-files?${params}`, {
        headers: workspaceHeaders,
        credentials: 'include',
      });
      if (!r.ok) throw new Error('Failed to load project files');
      return r.json();
    },
  });

  const folders = data?.folders ?? [];
  const files = data?.files ?? [];

  const createFolderMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch('/api/planner/project-files', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...workspaceHeaders,
        },
        credentials: 'include',
        body: JSON.stringify({
          action: 'create_folder',
          campaignId: campaign.id,
          name: folderName,
          color: folderColor,
        }),
      });
      if (!r.ok) throw new Error('Could not create folder');
      return r.json() as Promise<{ folder: ProjectFileFolder }>;
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['project-files', campaign.id] });
      setCreatingFolder(false);
      setFolderName('');
      setActiveFolderId(res.folder.id);
      toast.success(t('toastFolderCreated', locale));
    },
    onError: () => toast.error(t('toastFolderCreateFailed', locale)),
  });

  const deleteFolderMutation = useMutation({
    mutationFn: async (folderId: string) => {
      const r = await fetch('/api/planner/project-files', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...workspaceHeaders,
        },
        credentials: 'include',
        body: JSON.stringify({
          action: 'delete_folder',
          campaignId: campaign.id,
          folderId,
        }),
      });
      if (!r.ok) throw new Error('Could not delete folder');
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-files', campaign.id] });
      setActiveFolderId(null);
      toast.success(t('toastFolderDeleted', locale));
    },
    onError: () => toast.error(t('toastFolderDeleteFailed', locale)),
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const result = await upload({ file });
      if (!result.url) {
        throw new Error(result.error || t('toastUploadFailed', locale));
      }
      const r = await fetch('/api/planner/project-files', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...workspaceHeaders,
        },
        credentials: 'include',
        body: JSON.stringify({
          action: 'upload',
          campaignId: campaign.id,
          folderId: activeFolderId,
          fileName: file.name,
          fileUrl: result.url,
          fileType: file.type || result.mimeType || 'application/octet-stream',
          sizeBytes: file.size,
        }),
      });
      if (!r.ok) throw new Error('Could not save file');
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-files', campaign.id] });
      toast.success(t('toastFileUploaded', locale));
    },
    onError: (err) =>
      toast.error(
        err instanceof Error ? err.message : t('toastUploadFailed', locale)
      ),
  });

  const deleteFileMutation = useMutation({
    mutationFn: async (fileId: string) => {
      const r = await fetch('/api/planner/project-files', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...workspaceHeaders,
        },
        credentials: 'include',
        body: JSON.stringify({
          action: 'delete_file',
          campaignId: campaign.id,
          fileId,
          folderId: activeFolderId,
        }),
      });
      if (!r.ok) throw new Error('Could not delete file');
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-files', campaign.id] });
      toast.success(t('toastFileDeleted', locale));
    },
    onError: () => toast.error(t('toastFileDeleteFailed', locale)),
  });

  const onFiles = (list: FileList | null) => {
    if (!list?.length) return;
    Array.from(list).forEach((file) => uploadMutation.mutate(file));
    if (fileRef.current) fileRef.current.value = '';
  };

  const activeFolder = folders.find((f) => f.id === activeFolderId) || null;

  return (
    <section className="space-y-4 pt-2 border-t border-slate-200/80">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-slate-400">
            Project files
          </p>
          <h2 className="font-clikd-wordmark font-extrabold text-xl sm:text-2xl text-slate-900 tracking-tight mt-1">
            Documents & folders
          </h2>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Add PDFs, decks, briefs, and other files — organize them in folders.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {headerExtra}
          <button
            type="button"
            onClick={() => setCreatingFolder(true)}
            className="inline-flex items-center justify-center gap-1.5 h-11 min-h-[44px] px-4 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors"
          >
            <FolderPlus size={14} />
            New folder
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading || uploadMutation.isPending}
            className="inline-flex items-center justify-center gap-1.5 h-11 min-h-[44px] px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors disabled:opacity-50"
          >
            <Upload size={14} />
            {uploading || uploadMutation.isPending ? 'Uploading…' : 'Upload file'}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept={ACCEPT_FILES}
            multiple
            className="hidden"
            onChange={(e) => onFiles(e.target.files)}
          />
        </div>
      </div>

      {creatingFolder ? (
        <div className={`${adminCardClass} p-4 space-y-3`}>
          <p className="text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-slate-400">
            New folder
          </p>
          <input
            autoFocus
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            placeholder="e.g. Contracts, Briefs, Decks"
            className="w-full h-11 min-h-[44px] rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
          />
          <div className="flex flex-wrap items-center gap-2.5">
            {FOLDER_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setFolderColor(c)}
                className={`w-8 h-8 min-h-[32px] min-w-[32px] rounded-full ${
                  folderColor === c
                    ? 'ring-2 ring-offset-2 ring-slate-900'
                    : ''
                }`}
                style={{ background: c }}
                aria-label={`Color ${c}`}
              />
            ))}
          </div>
          <div className="flex items-center gap-2 justify-end">
            <button
              type="button"
              onClick={() => {
                setCreatingFolder(false);
                setFolderName('');
              }}
              className="h-11 min-h-[44px] px-4 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!folderName.trim() || createFolderMutation.isPending}
              onClick={() => createFolderMutation.mutate()}
              className="h-11 min-h-[44px] px-4 rounded-xl bg-slate-900 text-white text-xs font-semibold disabled:opacity-40"
            >
              Create folder
            </button>
          </div>
        </div>
      ) : null}

      <div className={`${adminCardClass} p-4 sm:p-5 space-y-4`}>
        <div className="flex flex-wrap items-start gap-3 sm:gap-4">
          <button
            type="button"
            onClick={() => setActiveFolderId(null)}
            className={`flex flex-col items-center gap-1.5 min-w-[72px] max-w-[96px] rounded-xl p-1.5 transition-all ${
              activeFolderId === null
                ? 'ring-2 ring-[#F472B6] ring-offset-2'
                : 'hover:opacity-90'
            }`}
          >
            <div className="w-14 h-14 min-h-[56px] min-w-[56px] rounded-2xl bg-[#0F172A] text-white flex items-center justify-center">
              <Folder size={26} />
            </div>
            <p className="text-sm font-extrabold text-slate-900 text-center leading-snug">
              All files
            </p>
          </button>

          {folders.map((folder) => (
            <div key={folder.id} className="relative group">
              <button
                type="button"
                onClick={() => setActiveFolderId(folder.id)}
                className={`flex flex-col items-center gap-1.5 min-w-[72px] max-w-[96px] rounded-xl p-1.5 transition-all ${
                  activeFolderId === folder.id
                    ? 'ring-2 ring-[#F472B6] ring-offset-2'
                    : 'hover:opacity-90'
                }`}
              >
                <div
                  className="w-14 h-14 min-h-[56px] min-w-[56px] rounded-2xl text-white flex items-center justify-center"
                  style={{ background: folder.color }}
                >
                  <Folder size={26} />
                </div>
                <p className="text-sm font-extrabold text-slate-900 text-center line-clamp-2 leading-snug">
                  {folder.name}
                </p>
              </button>
              <button
                type="button"
                onClick={() => deleteFolderMutation.mutate(folder.id)}
                className="absolute -top-1 -right-1 h-8 w-8 min-h-[32px] min-w-[32px] rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-rose-600 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 inline-flex items-center justify-center shadow-sm"
                aria-label={`Delete ${folder.name}`}
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={() => setCreatingFolder(true)}
            className="flex flex-col items-center gap-1.5 min-w-[72px] max-w-[96px] rounded-xl p-1.5 hover:opacity-90"
          >
            <div className="w-14 h-14 min-h-[56px] min-w-[56px] rounded-2xl border-2 border-dashed border-slate-300 text-slate-400 flex items-center justify-center">
              <Plus size={22} />
            </div>
            <p className="text-sm font-extrabold text-slate-500 text-center leading-snug">
              New folder
            </p>
          </button>
        </div>

        <div className="border-t border-slate-100 pt-4">
          <div className="flex items-center justify-between gap-2 mb-3">
            <p className="text-xs font-bold text-slate-600">
              {activeFolder ? activeFolder.name : 'All files'}
            </p>
          </div>

          {isLoading ? (
            <p className="text-sm text-slate-400 font-medium py-8 text-center">
              Loading files…
            </p>
          ) : files.length === 0 ? (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full min-h-[140px] rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/60 flex flex-col items-center justify-center gap-2 text-slate-400 hover:border-slate-300 hover:text-slate-500 transition-colors"
            >
              <FileText size={26} strokeWidth={1.75} />
              <p className="text-sm font-semibold">
                Drop PDFs, docs, or other files here
              </p>
              <p className="text-xs font-medium">
                PDF, Word, Excel, images, video, ZIP
              </p>
            </button>
          ) : (
            <ul className="space-y-2">
              {files.map((file) => (
                <li
                  key={file.id}
                  className="flex items-center gap-3 rounded-xl border border-slate-200/80 bg-white px-3 py-2.5"
                >
                  <div className="h-11 w-11 min-h-[44px] min-w-[44px] rounded-xl bg-slate-100 text-slate-500 inline-flex items-center justify-center flex-shrink-0">
                    <FileText size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <a
                      href={file.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm font-bold text-slate-900 truncate block hover:text-[#2B2568]"
                    >
                      {file.file_name}
                    </a>
                    <p className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400">
                      {fileKindLabel(file.file_type, file.file_name)} ·{' '}
                      {formatBytes(file.size_bytes)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteFileMutation.mutate(file.id)}
                    disabled={deleteFileMutation.isPending}
                    className="h-11 w-11 min-h-[44px] min-w-[44px] rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 inline-flex items-center justify-center flex-shrink-0"
                    aria-label={`Delete ${file.file_name}`}
                  >
                    <Trash2 size={16} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
