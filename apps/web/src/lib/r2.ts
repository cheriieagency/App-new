/**
 * Cloudflare R2 client (S3-compatible) for direct browser uploads via presigned URLs.
 */

import { S3Client } from '@aws-sdk/client-s3';
import { r2Env } from '@/lib/config/env';

let client: S3Client | null = null;

/** True when all server-side R2 credentials + public URL are configured. */
export function isR2Configured(): boolean {
  return r2Env.isConfigured();
}

export function getR2BucketName(): string {
  const bucket = r2Env.bucketName();
  if (!bucket) throw new Error('CLOUDFLARE_R2_BUCKET_NAME is not configured');
  return bucket;
}

export function getR2PublicBaseUrl(): string {
  const base = r2Env.publicUrl();
  if (!base) throw new Error('NEXT_PUBLIC_R2_PUBLIC_URL is not configured');
  return base.replace(/\/$/, '');
}

/** Lazy singleton — never instantiate without credentials. */
export function getR2Client(): S3Client {
  if (client) return client;

  const accountId = r2Env.accountId();
  const accessKeyId = r2Env.accessKeyId();
  const secretAccessKey = r2Env.secretAccessKey();

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error('Cloudflare R2 credentials are not configured');
  }

  client = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
    // R2 requires path-style URLs; virtual-hosted
    // `{bucket}.{account}.r2.cloudflarestorage.com` often fails DNS.
    forcePathStyle: true,
  });

  return client;
}

/** Build the public object URL for a storage key. */
export function r2PublicObjectUrl(key: string): string {
  const cleanKey = key.replace(/^\/+/, '');
  return `${getR2PublicBaseUrl()}/${cleanKey}`;
}
