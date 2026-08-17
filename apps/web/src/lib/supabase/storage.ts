/**
 * Supabase Storage helpers (service role). Server-only.
 * Produces public HTTPS URLs for Meta/IG publish and media library.
 */

import { randomUUID } from 'crypto';
import { supabaseEnv } from '@/lib/config/env';
import {
  getSupabaseAdmin,
  isSupabaseAdminConfigured,
} from '@/lib/supabase/admin';

/** Default public bucket for brand assets / post media. */
export function mediaStorageBucket(): string {
  return supabaseEnv.storageBucket();
}

function sanitizeFileName(name: string): string {
  const base = name.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-');
  return base.slice(0, 120) || 'file';
}

async function ensurePublicBucket(bucket: string): Promise<void> {
  const admin = getSupabaseAdmin();
  const { data: buckets, error: listError } = await admin.storage.listBuckets();
  if (listError) {
    console.warn('[supabase/storage] listBuckets failed', listError.message);
  }
  if (buckets?.some((b) => b.name === bucket)) return;

  const { error } = await admin.storage.createBucket(bucket, {
    public: true,
    fileSizeLimit: 50 * 1024 * 1024,
  });
  // Race / already exists is fine.
  if (error && !/already exists|duplicate/i.test(error.message)) {
    throw new Error(`Could not create storage bucket "${bucket}": ${error.message}`);
  }
}

/**
 * Upload bytes to Supabase Storage and return a public HTTPS URL.
 * Returns null when service role is not configured (caller may fall back).
 */
export async function uploadToSupabaseStorage(input: {
  bytes: Buffer | Uint8Array;
  mimeType: string;
  fileName?: string;
  folder?: string;
  /** Optional bucket override (default: configured media bucket). */
  bucket?: string;
}): Promise<{ url: string; path: string; bucket: string } | null> {
  if (!isSupabaseAdminConfigured()) return null;

  const bucket = (input.bucket || supabaseEnv.storageBucket()).trim() || 'media';
  await ensurePublicBucket(bucket);

  const folder = (input.folder || 'uploads').replace(/^\/+|\/+$/g, '');
  const safeName = sanitizeFileName(input.fileName || 'upload.bin');
  const path = `${folder}/${Date.now()}-${randomUUID().slice(0, 8)}-${safeName}`;

  const admin = getSupabaseAdmin();
  const { error } = await admin.storage.from(bucket).upload(path, input.bytes, {
    contentType: input.mimeType || 'application/octet-stream',
    upsert: false,
  });
  if (error) {
    throw new Error(`Supabase Storage upload failed: ${error.message}`);
  }

  const { data } = admin.storage.from(bucket).getPublicUrl(path);
  const url = data.publicUrl;
  if (!url?.startsWith('https://')) {
    // Fallback: build from project URL if SDK returns empty.
    const base = supabaseEnv.url()?.replace(/\/$/, '');
    if (!base) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL for public URL');
    return {
      url: `${base}/storage/v1/object/public/${bucket}/${path}`,
      path,
      bucket,
    };
  }
  return { url, path, bucket };
}
