'use client';

/**
 * React hook for Cloudflare R2 direct uploads with progress.
 */

import { useCallback, useRef, useState } from 'react';
import {
  isR2UploadAvailable,
  uploadToR2,
  type R2UploadFolder,
  type R2UploadResult,
} from '@/lib/upload/r2';

export type UseR2UploadOptions = {
  folder?: R2UploadFolder;
  workspaceId?: string;
};

export function useR2Upload(defaults: UseR2UploadOptions = {}) {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    setProgress(0);
    setError(null);
  }, []);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  const upload = useCallback(
    async (
      file: File,
      options?: UseR2UploadOptions & {
        onProgress?: (percentage: number) => void;
      }
    ): Promise<R2UploadResult> => {
      setIsUploading(true);
      setError(null);
      setProgress(0);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const result = await uploadToR2(file, {
          folder: options?.folder ?? defaults.folder,
          workspaceId: options?.workspaceId ?? defaults.workspaceId,
          signal: controller.signal,
          onProgress: (pct) => {
            setProgress(pct);
            options?.onProgress?.(pct);
          },
        });
        return result;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Upload failed';
        setError(message);
        throw err;
      } finally {
        setIsUploading(false);
        abortRef.current = null;
      }
    },
    [defaults.folder, defaults.workspaceId]
  );

  return {
    upload,
    isUploading,
    progress,
    error,
    reset,
    cancel,
    isAvailable: isR2UploadAvailable(),
  };
}

export default useR2Upload;
