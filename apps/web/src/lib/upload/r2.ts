/**
 * Browser → Cloudflare R2 direct upload via presigned PUT URLs.
 * Bypasses Next.js / Vercel request body limits for large video/media.
 */

export type R2UploadFolder = 'videos' | 'posts' | 'courses' | 'general';

export type R2UploadOptions = {
  folder?: R2UploadFolder;
  workspaceId?: string;
  onProgress?: (percentage: number) => void;
  /** Abort in-flight XHR (e.g. unmount). */
  signal?: AbortSignal;
};

export type R2UploadResult = {
  url: string;
  key: string;
  publicUrl: string;
};

type PresignResponse = {
  uploadUrl?: string;
  publicUrl?: string;
  key?: string;
  error?: string;
  message?: string;
};

/** Client-side: public R2 base is set and not a placeholder. */
export function isR2UploadAvailable(): boolean {
  if (typeof process === 'undefined') return false;
  const raw = (process.env.NEXT_PUBLIC_R2_PUBLIC_URL || '').trim();
  if (!raw) return false;
  if (/x{4,}|YOUR_|CHANGE_ME|placeholder/i.test(raw)) return false;
  return true;
}

function inferFolder(file: File, folder?: R2UploadFolder): R2UploadFolder {
  if (folder) return folder;
  if (file.type.startsWith('video/')) return 'videos';
  return 'general';
}

/**
 * Request a PUT URL, stream the file to R2 with progress, return the public URL.
 */
export async function uploadToR2(
  file: File,
  options: R2UploadOptions = {}
): Promise<R2UploadResult> {
  const folder = inferFolder(file, options.folder);

  const presignRes = await fetch('/api/upload/presigned-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      filename: file.name,
      fileType: file.type || 'application/octet-stream',
      fileSize: file.size,
      workspaceId: options.workspaceId,
      folder,
    }),
  });

  const presign = (await presignRes.json().catch(() => ({}))) as PresignResponse;

  if (!presignRes.ok || !presign.uploadUrl || !presign.publicUrl || !presign.key) {
    const message =
      presign.message ||
      presign.error ||
      (presignRes.status === 401
        ? 'Sign in to upload'
        : 'Could not prepare upload');
    throw new Error(message);
  }

  const { uploadUrl, publicUrl, key } = presign;

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl, true);
    xhr.setRequestHeader(
      'Content-Type',
      file.type || 'application/octet-stream'
    );

    const onAbort = () => {
      xhr.abort();
      reject(new Error('Upload cancelled'));
    };
    if (options.signal) {
      if (options.signal.aborted) {
        onAbort();
        return;
      }
      options.signal.addEventListener('abort', onAbort, { once: true });
    }

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || !options.onProgress) return;
      const pct = Math.min(100, Math.round((event.loaded / event.total) * 100));
      options.onProgress(pct);
    };

    xhr.onload = () => {
      options.signal?.removeEventListener('abort', onAbort);
      if (xhr.status === 200 || xhr.status === 204) {
        options.onProgress?.(100);
        resolve();
        return;
      }
      reject(
        new Error(
          `R2 upload failed (${xhr.status})${
            xhr.responseText ? `: ${xhr.responseText.slice(0, 160)}` : ''
          }`
        )
      );
    };

    xhr.onerror = () => {
      options.signal?.removeEventListener('abort', onAbort);
      reject(new Error('Network error while uploading to R2'));
    };

    xhr.onabort = () => {
      options.signal?.removeEventListener('abort', onAbort);
      reject(new Error('Upload cancelled'));
    };

    xhr.send(file);
  });

  return { url: publicUrl, key, publicUrl };
}
