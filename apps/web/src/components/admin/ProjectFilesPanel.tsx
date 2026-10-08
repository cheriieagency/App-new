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
  const [dragOver, setDragOver] = useState(false);

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

  const requestDeleteFolder = (folderId: string, name: string) => {
    if (!window.confirm(`Delete folder “${name}”? Files inside stay under All files.`)) {
      return;
    }
    deleteFolderMutation.mutate(folderId);
  };

  const activeFolder = folders.find((f) => f.id === activeFolderId) || null;
  const filesBusy = uploading || uploadMutation.isPending;

  return (
    <section className="space-y-4 pt-2 border-t border-[#E6E3DB]">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#8A857D]">
            Project files
          </p>
          <h2 className="text-sm font-semibold text-[#2C2621] tracking-tight mt-1">
            Documents & folders
          </h2>
          <p className="text-[11px] text-[#8A857D] mt-1 leading-snug">
            Add PDFs, decks, briefs, and other files — organize them in folders.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {headerExtra}
          <button
            type="button"
            onClick={() => setCreatingFolder(true)}
            className="inline-flex items-center justify-center gap-1.5 h-8 min-h-[32px] px-2.5 rounded-sm bg-transparent text-[9px] font-medium uppercase tracking-[0.08em] text-[#8A857D] hover:bg-[#F0EFEA] hover:text-[#2C2621] transition-colors"
          >
            <FolderPlus size={12} />
            New folder
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={filesBusy}
            className="inline-flex items-center justify-center gap-1.5 h-8 min-h-[32px] px-3 rounded-sm bg-[#F0EFEA] text-[#2C2621] text-[9px] font-medium uppercase tracking-[0.08em] hover:bg-[#E6E3DB] transition-colors disabled:opacity-50"
          >
            <Upload size={12} />
            {filesBusy ? 'Uploading…' : 'Upload file'}
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
          <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#8A857D]">
            New folder
          </p>
          <input
            autoFocus
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            placeholder="e.g. Contracts, Briefs, Decks"
            className="w-full h-9 min-h-[36px] border-0 border-b border-[#E6E3DB] bg-transparent px-0 text-xs text-[#2C2621] placeholder:text-[#C4BFB6] focus:outline-none focus:border-[#2C2621]"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && folderName.trim()) {
                e.preventDefault();
                createFolderMutation.mutate();
              }
              if (e.key === 'Escape') {
                setCreatingFolder(false);
                setFolderName('');
              }
            }}
          />
          <div className="flex flex-wrap items-center gap-2">
            {FOLDER_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setFolderColor(c)}
                className={`w-6 h-6 min-h-[24px] min-w-[24px] ${
                  folderColor === c ? 'ring-2 ring-offset-1 ring-[#1C1917]' : ''
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
              className="text-[9px] font-semibold uppercase tracking-[0.1em] text-[#8A857D] hover:text-[#2C2621] h-8 min-h-[32px] px-2"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!folderName.trim() || createFolderMutation.isPending}
              onClick={() => createFolderMutation.mutate()}
              className="inline-flex items-center justify-center h-8 min-h-[32px] px-3 rounded-sm bg-[#F0EFEA] text-[#2C2621] text-[9px] font-medium uppercase tracking-[0.08em] hover:bg-[#E6E3DB] disabled:opacity-40"
            >
              Create folder
            </button>
          </div>
        </div>
      ) : null}

      <div className={`${adminCardClass} p-4 sm:p-5 space-y-4`}>
        <div className="flex flex-wrap items-start gap-2.5 sm:gap-3">
          <button
            type="button"
            onClick={() => setActiveFolderId(null)}
            className={`flex flex-col items-center gap-1 min-w-[56px] max-w-[72px] p-1 transition-opacity ${
              activeFolderId === null ? 'opacity-100' : 'hover:opacity-90'
            }`}
          >
            <div
              className={`w-10 h-10 min-h-[40px] min-w-[40px] flex items-center justify-center transition-colors ${
                activeFolderId === null
                  ? 'bg-[#E6E3DB] text-[#2C2621]'
                  : 'bg-[#F0EFEA] text-[#8A857D]'
              }`}
            >
              <Folder size={16} strokeWidth={1.75} />
            </div>
            <p className="text-[10px] font-semibold text-[#2C2621] text-center leading-snug">
              All files
            </p>
          </button>

          {folders.map((folder) => (
            <div key={folder.id} className="relative group">
              <button
                type="button"
                onClick={() => setActiveFolderId(folder.id)}
                className={`flex flex-col items-center gap-1 min-w-[56px] max-w-[72px] p-1 transition-opacity ${
                  activeFolderId === folder.id ? 'opacity-100' : 'hover:opacity-90'
                }`}
              >
                <div
                  className={`w-10 h-10 min-h-[40px] min-w-[40px] text-white flex items-center justify-center ${
                    activeFolderId === folder.id
                      ? 'outline outline-1 outline-offset-1 outline-[#E6E3DB]'
                      : 'opacity-90'
                  }`}
                  style={{ background: folder.color || '#8A857D' }}
                >
                  <Folder size={16} strokeWidth={1.75} />
                </div>
                <p className="text-[10px] font-semibold text-[#2C2621] text-center line-clamp-2 leading-snug">
                  {folder.name}
                </p>
              </button>
              <button
                type="button"
                onClick={() => requestDeleteFolder(folder.id, folder.name)}
                disabled={deleteFolderMutation.isPending}
                className="absolute -top-0.5 -right-0.5 h-6 w-6 min-h-[24px] min-w-[24px] bg-white border border-[#E6E3DB] text-[#A8A29E] hover:text-[#B85C38] opacity-100 sm:opacity-0 sm:group-hover:opacity-100 inline-flex items-center justify-center disabled:opacity-40"
                aria-label={`Delete ${folder.name}`}
              >
                <Trash2 size={10} />
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={() => setCreatingFolder(true)}
            className="flex flex-col items-center gap-1 min-w-[56px] max-w-[72px] p-1 hover:opacity-90"
          >
            <div className="w-10 h-10 min-h-[40px] min-w-[40px] border border-dashed border-[#E6E3DB] text-[#A8A29E] flex items-center justify-center hover:bg-[#F0EFEA] hover:text-[#8A857D] transition-colors">
              <Plus size={14} strokeWidth={1.75} />
            </div>
            <p className="text-[10px] font-semibold text-[#8A857D] text-center leading-snug">
              New folder
            </p>
          </button>
        </div>

        <div
          className="border-t border-[#E6E3DB] pt-4"
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            onFiles(e.dataTransfer.files);
          }}
        >
          <div className="flex items-center justify-between gap-2 mb-3">
            <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#8A857D]">
              {activeFolder ? activeFolder.name : 'All files'}
            </p>
          </div>

          {isLoading ? (
            <p className="text-xs text-[#A8A29E] font-medium py-8 text-center">
              Loading files…
            </p>
          ) : files.length === 0 ? (
            <button
              type="button"
              disabled={filesBusy}
              onClick={() => fileRef.current?.click()}
              className={`w-full min-h-[120px] border border-dashed bg-[#F9F8F6] flex flex-col items-center justify-center gap-1.5 text-[#A8A29E] transition-colors disabled:opacity-50 ${
                dragOver
                  ? 'border-[#1C1917] text-[#2C2621]'
                  : 'border-[#E6E3DB] hover:border-[#1C1917]/40 hover:text-[#8A857D]'
              }`}
            >
              <FileText size={20} strokeWidth={1.75} />
              <p className="text-xs font-semibold">
                Drop PDFs, docs, or other files here
              </p>
              <p className="text-[10px] font-medium">
                PDF, Word, Excel, images, video, ZIP
              </p>
            </button>
          ) : (
            <ul className="space-y-2">
              {files.map((file) => (
                <li
                  key={file.id}
                  className="flex items-center gap-3 border border-[#E6E3DB] bg-white px-2.5 py-2"
                >
                  <div className="h-9 w-9 min-h-[36px] min-w-[36px] bg-[#F0EFEA] text-[#8A857D] inline-flex items-center justify-center flex-shrink-0">
                    <FileText size={15} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <a
                      href={file.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-semibold text-[#2C2621] truncate block hover:underline"
                    >
                      {file.file_name}
                    </a>
                    <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-[#A8A29E]">
                      {fileKindLabel(file.file_type, file.file_name)} ·{' '}
                      {formatBytes(file.size_bytes)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteFileMutation.mutate(file.id)}
                    disabled={deleteFileMutation.isPending}
                    className="h-8 w-8 min-h-[32px] min-w-[32px] text-[#A8A29E] hover:text-[#B85C38] inline-flex items-center justify-center flex-shrink-0 disabled:opacity-40"
                    aria-label={`Delete ${file.file_name}`}
                  >
                    <Trash2 size={13} />
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
