/**
 * POST /api/upload/presigned-url
 * Issues a short-lived R2 PUT URL so the browser can upload large media
 * directly (bypassing Vercel’s serverless body limit).
 */

import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { requireApiSession } from '@/lib/auth/require-api-session';
import {
  hasFeature,
  minPlanForFeature,
  resolveWorkspacePlan,
  upgradeRequiredResponse,
} from '@/lib/plan-guard';
import { missingEnvKeys, missingEnvResponse, r2Env } from '@/lib/config/env';
import {
  getR2BucketName,
  getR2Client,
  isR2Configured,
  r2PublicObjectUrl,
} from '@/lib/r2';

export const runtime = 'nodejs';

const ALLOWED_FOLDERS = new Set(['videos', 'posts', 'courses', 'general']);

/** R2 single-object PutObject max is 5 GiB. */
const MAX_BYTES = 5 * 1024 * 1024 * 1024;

const PRESIGN_EXPIRES_SECONDS = 900;

function slugifyFilename(name: string): string {
  const base = name.trim().split(/[/\\]/).pop() || 'file';
  const cleaned = base
    .normalize('NFKD')
    .replace(/[^\w.\-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 120);
  return cleaned || 'file';
}

function sanitizeFolder(raw: unknown): string {
  const value = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  return ALLOWED_FOLDERS.has(value) ? value : 'general';
}

function sanitizeWorkspaceSegment(raw: unknown): string {
  if (typeof raw !== 'string') return 'user';
  const cleaned = raw.trim().replace(/[^a-zA-Z0-9_\-]/g, '').slice(0, 64);
  return cleaned || 'user';
}

export async function POST(request: Request) {
  const session = await requireApiSession();
  if (!session.ok) return session.response;

  const missing = missingEnvKeys(...r2Env.requiredKeys);
  if (missing.length || !isR2Configured()) {
    return missingEnvResponse(
      missing.length ? missing : [...r2Env.requiredKeys],
      'Cloudflare R2'
    );
  }

  try {
    const body = (await request.json().catch(() => ({}))) as {
      filename?: string;
      fileType?: string;
      fileSize?: number;
      workspaceId?: string;
      folder?: string;
    };

    const filename =
      typeof body.filename === 'string' && body.filename.trim()
        ? body.filename.trim()
        : '';
    const fileType =
      typeof body.fileType === 'string' && body.fileType.trim()
        ? body.fileType.trim()
        : 'application/octet-stream';

    if (!filename) {
      return Response.json(
        { error: 'filename_required', message: 'filename is required' },
        { status: 400 }
      );
    }

    const fileSize =
      typeof body.fileSize === 'number' && Number.isFinite(body.fileSize)
        ? body.fileSize
        : undefined;

    if (fileSize != null && fileSize > MAX_BYTES) {
      return Response.json(
        {
          error: 'file_too_large',
          message: 'File exceeds the 5 GB R2 upload limit',
        },
        { status: 413 }
      );
    }

    const isVideo =
      fileType.startsWith('video/') ||
      sanitizeFolder(body.folder) === 'videos' ||
      sanitizeFolder(body.folder) === 'courses';

    if (isVideo) {
      const plan = await resolveWorkspacePlan(request.headers);
      if (!hasFeature(plan, 'coursesAndVideoHosting')) {
        return upgradeRequiredResponse(minPlanForFeature('coursesAndVideoHosting'), {
          feature: 'coursesAndVideoHosting',
          message: 'Video hosting requires Creator plan',
        });
      }
    }

    const folder = sanitizeFolder(body.folder);
    const workspaceSeg = sanitizeWorkspaceSegment(
      body.workspaceId || session.user.id
    );
    const key = `uploads/${workspaceSeg}/${folder}/${Date.now()}-${slugifyFilename(filename)}`;

    const command = new PutObjectCommand({
      Bucket: getR2BucketName(),
      Key: key,
      ContentType: fileType,
    });

    const uploadUrl = await getSignedUrl(getR2Client(), command, {
      expiresIn: PRESIGN_EXPIRES_SECONDS,
    });
    const publicUrl = r2PublicObjectUrl(key);

    return Response.json({
      uploadUrl,
      publicUrl,
      key,
      expiresIn: PRESIGN_EXPIRES_SECONDS,
      storage: 'r2' as const,
    });
  } catch (error) {
    console.error('[POST /api/upload/presigned-url]', error);
    return Response.json(
      {
        error: 'presign_failed',
        message:
          error instanceof Error
            ? error.message
            : 'Failed to create presigned upload URL',
      },
      { status: 500 }
    );
  }
}
