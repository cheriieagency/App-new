/**
 * Google Drive file list + binary download helpers.
 */

export type DriveFileMeta = {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number | null;
  modifiedTime: string | null;
  iconLink: string | null;
  thumbnailLink: string | null;
};

export async function listDriveFiles(
  accessToken: string,
  pageSize = 25
): Promise<DriveFileMeta[]> {
  const url = new URL('https://www.googleapis.com/drive/v3/files');
  url.searchParams.set(
    'q',
    "trashed = false and mimeType != 'application/vnd.google-apps.folder'"
  );
  url.searchParams.set(
    'fields',
    'files(id,name,mimeType,size,modifiedTime,iconLink,thumbnailLink)'
  );
  url.searchParams.set('pageSize', String(Math.min(50, Math.max(1, pageSize))));
  url.searchParams.set('orderBy', 'modifiedTime desc');

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = (await res.json()) as {
    files?: Array<{
      id?: string;
      name?: string;
      mimeType?: string;
      size?: string;
      modifiedTime?: string;
      iconLink?: string;
      thumbnailLink?: string;
    }>;
    error?: { message?: string };
  };
  if (!res.ok) {
    throw new Error(data.error?.message || 'Failed to list Drive files');
  }

  return (data.files || [])
    .filter((f) => f.id && f.name)
    .map((f) => ({
      id: String(f.id),
      name: String(f.name),
      mimeType: String(f.mimeType || 'application/octet-stream'),
      sizeBytes: f.size != null ? Number(f.size) || null : null,
      modifiedTime: f.modifiedTime || null,
      iconLink: f.iconLink || null,
      thumbnailLink: f.thumbnailLink || null,
    }));
}

/** Download a Drive file as a Buffer (exports Google Docs types as PDF/PNG when needed). */
export async function downloadDriveFile(
  accessToken: string,
  fileId: string,
  mimeType?: string | null
): Promise<{ buffer: Buffer; contentType: string; exported: boolean }> {
  const googleNative = (mimeType || '').startsWith('application/vnd.google-apps.');
  let url: string;
  let contentType = mimeType || 'application/octet-stream';
  let exported = false;

  if (googleNative) {
    const exportMime =
      mimeType === 'application/vnd.google-apps.document'
        ? 'application/pdf'
        : mimeType === 'application/vnd.google-apps.spreadsheet'
          ? 'application/pdf'
          : mimeType === 'application/vnd.google-apps.presentation'
            ? 'application/pdf'
            : mimeType === 'application/vnd.google-apps.drawing'
              ? 'image/png'
              : 'application/pdf';
    url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}/export?mimeType=${encodeURIComponent(exportMime)}`;
    contentType = exportMime;
    exported = true;
  } else {
    url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`;
  }

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(errText || `Drive download failed (${res.status})`);
  }

  const arrayBuffer = await res.arrayBuffer();
  const headerType = res.headers.get('content-type');
  if (headerType) contentType = headerType.split(';')[0].trim() || contentType;

  return {
    buffer: Buffer.from(arrayBuffer),
    contentType,
    exported,
  };
}
