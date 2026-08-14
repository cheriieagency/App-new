'use client';

/**
 * Import from Google Drive — Media Library & Content Planner.
 */

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FolderOpen, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { useWorkspaceOptional } from '@/context/WorkspaceContext';

type DriveFile = {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number | null;
};

type Props = {
  target?: 'media_library' | 'planner';
  className?: string;
  onImported?: (payload: {
    fileUrl: string;
    mediaId: string | number | null;
    fileName: string;
    fileType?: string | null;
  }) => void;
};

export default function GoogleDriveImportButton({
  target = 'media_library',
  className = '',
  onImported,
}: Props) {
  const workspace = useWorkspaceOptional();
  const workspaceId = workspace?.activeWorkspace?.id ?? null;
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const statusQuery = useQuery({
    queryKey: ['google-status', workspaceId],
    queryFn: async () => {
      const qs = workspaceId
        ? `?workspaceId=${encodeURIComponent(workspaceId)}`
        : '';
      const r = await fetch(`/api/admin/google/status${qs}`);
      if (!r.ok) throw new Error('status failed');
      return r.json() as Promise<{ connected: boolean; email: string | null }>;
    },
    enabled: Boolean(workspaceId),
  });

  const filesQuery = useQuery({
    queryKey: ['drive-files', workspaceId],
    queryFn: async () => {
      const qs = workspaceId
        ? `?workspaceId=${encodeURIComponent(workspaceId)}`
        : '';
      const r = await fetch(`/api/admin/drive/files${qs}`);
      if (!r.ok) throw new Error('list failed');
      return r.json() as Promise<{
        connected: boolean;
        files: DriveFile[];
        message?: string;
      }>;
    },
    enabled: open && Boolean(workspaceId),
  });

  const importMutation = useMutation({
    mutationFn: async (file: DriveFile) => {
      const r = await fetch('/api/admin/drive/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId: file.id,
          fileName: file.name,
          mimeType: file.mimeType,
          workspaceId,
          target,
        }),
      });
      const json = (await r.json()) as {
        success?: boolean;
        error?: string;
        fileUrl?: string;
        mediaId?: string | number | null;
        fileName?: string;
        fileType?: string | null;
      };
      if (!r.ok || !json.success) {
        throw new Error(json.error || 'Import failed');
      }
      return json;
    },
    onSuccess: (json) => {
      toast.success(`Imported ${json.fileName || 'file'}`);
      setOpen(false);
      void qc.invalidateQueries({ queryKey: ['media-folder'] });
      void qc.invalidateQueries({ queryKey: ['media-folders'] });
      void qc.invalidateQueries({ queryKey: ['media-library-db'] });
      onImported?.({
        fileUrl: json.fileUrl || '',
        mediaId: json.mediaId ?? null,
        fileName: json.fileName || 'file',
        fileType: json.fileType ?? null,
      });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Import failed');
    },
  });

  const connected = Boolean(statusQuery.data?.connected);
  const connectUrl = useMemo(() => {
    if (!workspaceId) return '/api/auth/google/login';
    return `/api/auth/google/login?workspaceId=${encodeURIComponent(workspaceId)}`;
  }, [workspaceId]);

  const handleClick = () => {
    if (!workspaceId) {
      toast.message('Select a workspace first');
      return;
    }
    if (!connected) {
      setOpen(true);
      return;
    }
    setOpen(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={
          className ||
          'inline-flex items-center justify-center gap-1.5 h-11 min-h-[44px] px-3.5 rounded-xl border border-slate-200 bg-white text-xs font-extrabold text-slate-700 hover:bg-slate-50 transition-colors'
        }
      >
        <FolderOpen size={14} /> Import from Google Drive
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            onClick={() => !importMutation.isPending && setOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Google Drive import"
            className="relative z-10 w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[85vh] flex flex-col"
          >
            <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-slate-100">
              <div>
                <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400">
                  Google Drive
                </p>
                <h3 className="font-clikd-wordmark font-extrabold text-lg text-slate-900 mt-0.5">
                  Import a file
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="h-11 w-11 min-h-[44px] min-w-[44px] rounded-xl bg-slate-50 flex items-center justify-center"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-5 py-4 overflow-y-auto flex-1">
              {!connected ? (
                <div className="rounded-2xl border border-[#E9D5FF] bg-[#FDF4FF] px-4 py-5 space-y-3">
                  <p className="text-sm font-semibold text-slate-800">
                    Connect Google Account to import files directly from Google
                    Drive
                  </p>
                  <a
                    href={connectUrl}
                    className="inline-flex items-center justify-center h-11 min-h-[44px] w-full rounded-xl bg-[#2B2568] text-white text-sm font-extrabold"
                  >
                    Connect Google Account
                  </a>
                </div>
              ) : filesQuery.isLoading ? (
                <div className="py-12 flex items-center justify-center gap-2 text-sm text-slate-400">
                  <Loader2 className="animate-spin" size={16} /> Loading Drive…
                </div>
              ) : (filesQuery.data?.files || []).length === 0 ? (
                <p className="py-10 text-center text-sm text-slate-400">
                  No files found in Drive
                </p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {(filesQuery.data?.files || []).map((file) => (
                    <li
                      key={file.id}
                      className="py-3 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">
                          {file.name}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">
                          {file.mimeType}
                          {file.sizeBytes
                            ? ` · ${Math.round(file.sizeBytes / 1024)} KB`
                            : ''}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={importMutation.isPending}
                        onClick={() => importMutation.mutate(file)}
                        className="h-11 min-h-[44px] px-3 rounded-xl bg-clikd-pink text-white text-xs font-extrabold shrink-0 disabled:opacity-60"
                      >
                        {importMutation.isPending ? (
                          <Loader2 className="animate-spin" size={14} />
                        ) : (
                          'Import'
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
