/**
 * Upload handler — prefers Supabase Storage (service role) for public HTTPS URLs.
 * Falls back to data URLs when Supabase is not configured (local demo).
 */

import {
  resolveWorkspacePlan,
  hasFeature,
  minPlanForFeature,
  upgradeRequiredResponse,
} from '@/lib/plan-guard';
import { isSupabaseAdminConfigured } from '@/lib/supabase/admin';
import { uploadToSupabaseStorage } from '@/lib/supabase/storage';

function dataUrlFromBuffer(buffer: Buffer, mimeType: string): string {
  return `data:${mimeType};base64,${buffer.toString('base64')}`;
}

async function resolveStoredUrl(input: {
  buffer: Buffer;
  mimeType: string;
  fileName?: string;
  folder?: string;
  bucket?: string;
}): Promise<{ url: string; mimeType: string; storage: 'supabase' | 'data_url' }> {
  if (isSupabaseAdminConfigured()) {
    try {
      const stored = await uploadToSupabaseStorage({
        bytes: input.buffer,
        mimeType: input.mimeType,
        fileName: input.fileName,
        folder: input.folder || 'uploads',
        bucket: input.bucket,
      });
      if (stored?.url) {
        return { url: stored.url, mimeType: input.mimeType, storage: 'supabase' };
      }
    } catch (error) {
      console.error('[upload] Supabase Storage failed — falling back to data URL', error);
    }
  }
  return {
    url: dataUrlFromBuffer(input.buffer, input.mimeType),
    mimeType: input.mimeType,
    storage: 'data_url',
  };
}

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get('content-type') ?? '';

    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData();
      const file = form.get('file');
      if (!(file instanceof File)) {
        return Response.json({ error: 'file required' }, { status: 400 });
      }

      // Video hosting uploads require Creator+ (Starter is embeds-only).
      const isVideo =
        file.type.startsWith('video/') ||
        form.get('purpose') === 'video' ||
        form.get('kind') === 'video';
      const plan = await resolveWorkspacePlan(request.headers);
      if (isVideo && !hasFeature(plan, 'coursesAndVideoHosting')) {
        return upgradeRequiredResponse(minPlanForFeature('coursesAndVideoHosting'), {
          feature: 'coursesAndVideoHosting',
          message: 'Video hosting requires Creator plan',
        });
      }

      // Storage allows larger assets; data-URL fallback stays at 10 MB.
      // Prefer /api/upload/presigned-url (R2) for videos / files over ~4.5 MB.
      const maxBytes = isSupabaseAdminConfigured() ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
      if (file.size > maxBytes) {
        return Response.json(
          {
            error: 'File too large',
            message:
              'Use Cloudflare R2 direct upload (/api/upload/presigned-url) for files over this limit.',
            hint: 'Configure NEXT_PUBLIC_R2_PUBLIC_URL and R2 credentials in .env.local',
          },
          { status: 413 }
        );
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const mimeType = file.type || 'application/octet-stream';
      const folderRaw = form.get('folder');
      const bucketRaw = form.get('bucket');
      const folder =
        typeof folderRaw === 'string' && folderRaw.trim()
          ? folderRaw.trim()
          : 'uploads';
      const bucket =
        typeof bucketRaw === 'string' && bucketRaw.trim()
          ? bucketRaw.trim()
          : undefined;
      const result = await resolveStoredUrl({
        buffer,
        mimeType,
        fileName: file.name,
        folder,
        bucket,
      });
      return Response.json(result);
    }

    if (contentType.includes('application/json')) {
      const body = await request.json();
      if (typeof body?.base64 === 'string') {
        const mimeType = body.mimeType || 'image/jpeg';
        const raw = body.base64.replace(/^data:[^;]+;base64,/, '');
        const buffer = Buffer.from(raw, 'base64');
        if (buffer.byteLength > (isSupabaseAdminConfigured() ? 50 : 10) * 1024 * 1024) {
          return Response.json({ error: 'File too large' }, { status: 413 });
        }
        const result = await resolveStoredUrl({
          buffer,
          mimeType,
          fileName: typeof body.fileName === 'string' ? body.fileName : 'upload.bin',
        });
        return Response.json(result);
      }
      if (typeof body?.url === 'string') {
        return Response.json({
          url: body.url,
          mimeType: body.mimeType ?? null,
          storage: 'passthrough',
        });
      }
      return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    return Response.json({ error: 'Unsupported content type' }, { status: 415 });
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Upload failed' }, { status: 500 });
  }
}
