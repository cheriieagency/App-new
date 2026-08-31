/**
 * Shared upload hook used across Media Library, Planner, Classroom, etc.
 * Prefers Cloudflare R2 presigned PUT for File uploads when configured;
 * falls back to /api/upload (Supabase / data-URL) for small or legacy paths.
 */

import React from 'react';
import {
  isR2UploadAvailable,
  uploadToR2,
  type R2UploadFolder,
} from '@/lib/upload/r2';

interface ReactNativeAsset {
  file?: File;
  uri: string;
  name?: string;
  mimeType?: string;
}

export interface UploadInput {
  reactNativeAsset?: ReactNativeAsset;
  file?: File;
  url?: string;
  base64?: string;
  buffer?: Buffer;
  /** R2 / storage folder hint */
  folder?: R2UploadFolder;
  workspaceId?: string;
  /** 0–100 while uploading via R2 */
  onProgress?: (percentage: number) => void;
  /** Skip R2 and force legacy /api/upload (multipart). */
  forceLegacy?: boolean;
}

export interface UploadResult {
  url?: string;
  mimeType?: string | null;
  key?: string;
  storage?: 'r2' | 'supabase' | 'data_url' | 'passthrough';
  error?: string;
}

interface UploadHookResult {
  loading: boolean;
  progress: number;
}

function useUpload(): [
  (input: UploadInput) => Promise<UploadResult>,
  UploadHookResult,
] {
  const [loading, setLoading] = React.useState(false);
  const [progress, setProgress] = React.useState(0);

  const upload = React.useCallback(
    async (input: UploadInput): Promise<UploadResult> => {
      try {
        setLoading(true);
        setProgress(0);

        // Prefer direct-to-R2 for File blobs when public R2 URL is configured.
        const file =
          input.file ||
          (input.reactNativeAsset?.file ? input.reactNativeAsset.file : null);

        if (file && !input.forceLegacy && isR2UploadAvailable()) {
          try {
            const result = await uploadToR2(file, {
              folder: input.folder,
              workspaceId: input.workspaceId,
              onProgress: (pct) => {
                setProgress(pct);
                input.onProgress?.(pct);
              },
            });
            return {
              url: result.url,
              key: result.key,
              mimeType: file.type || null,
              storage: 'r2',
            };
          } catch (r2Error) {
            // Fall through to legacy upload for small files / misconfig.
            console.warn('[useUpload] R2 upload failed — trying /api/upload', r2Error);
            // Large videos cannot go through Vercel body — surface the R2 error.
            if (file.size > 4 * 1024 * 1024 || file.type.startsWith('video/')) {
              const message =
                r2Error instanceof Error ? r2Error.message : 'R2 upload failed';
              return { error: message };
            }
          }
        }

        let response: Response | undefined;
        if ('reactNativeAsset' in input && input.reactNativeAsset) {
          if (input.reactNativeAsset.file) {
            const formData = new FormData();
            formData.append('file', input.reactNativeAsset.file);
            if (input.folder) formData.append('folder', input.folder);
            response = await fetch('/api/upload', {
              method: 'POST',
              body: formData,
            });
          } else {
            throw new Error('Upload client not configured');
          }
        } else if ('file' in input && input.file) {
          const formData = new FormData();
          formData.append('file', input.file);
          if (input.folder) formData.append('folder', input.folder);
          response = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
          });
        } else if ('url' in input) {
          response = await fetch('/api/upload', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url: input.url }),
          });
        } else if ('base64' in input) {
          response = await fetch('/api/upload', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ base64: input.base64 }),
          });
        } else {
          response = await fetch('/api/upload', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/octet-stream',
            },
            body: input.buffer as unknown as BodyInit,
          });
        }

        if (!response.ok) {
          if (response.status === 413) {
            throw new Error(
              'Upload failed: File too large. Configure Cloudflare R2 for large videos.'
            );
          }
          throw new Error('Upload failed');
        }
        const data = (await response.json()) as {
          url?: string;
          mimeType?: string | null;
          storage?: UploadResult['storage'];
        };
        setProgress(100);
        return {
          url: data.url,
          mimeType: data.mimeType || null,
          storage: data.storage,
        };
      } catch (uploadError) {
        if (uploadError instanceof Error) {
          return { error: uploadError.message };
        }
        if (typeof uploadError === 'string') {
          return { error: uploadError };
        }
        return { error: 'Upload failed' };
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return [upload, { loading, progress }];
}

export default useUpload;
