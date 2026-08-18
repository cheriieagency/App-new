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

/** Signed URL lifetime — long enough for IG/TikTok video processing. */
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24;

export type ParsedStorageObject = {
  bucket: string;
  path: string;
};

/** True when the URL is HTTPS and not a local/dev host. */
export function isPublicHttpsUrl(raw: string): boolean {
  try {
    const url = new URL(raw.trim());
    if (url.protocol !== 'https:') return false;
    const host = url.hostname.toLowerCase();
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '0.0.0.0' ||
      host.endsWith('.local') ||
      host.endsWith('.localhost')
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Parse a Supabase Storage object URL (public or signed) into bucket + path.
 */
export function parseSupabaseStorageUrl(raw: string): ParsedStorageObject | null {
  try {
    const url = new URL(raw.trim());
    const match = url.pathname.match(
      /\/storage\/v1\/object\/(?:public|sign|authenticated)\/([^/]+)\/(.+)$/
    );
    if (!match) return null;
    const bucket = decodeURIComponent(match[1]);
    const path = decodeURIComponent(match[2]);
    if (!bucket || !path) return null;
    return { bucket, path };
  } catch {
    return null;
  }
}

function looksLikeStoragePath(raw: string): boolean {
  const value = raw.trim().replace(/^\/+/, '');
  if (!value || value.includes('://')) return false;
  return /^[a-zA-Z0-9._/-]+$/.test(value);
}

/**
 * Resolve bucket/path to a public HTTPS URL, falling back to a long-lived signed URL.
 */
export async function publicOrSignedUrlFromStoragePath(
  path: string,
  bucket?: string
): Promise<string | null> {
  if (!isSupabaseAdminConfigured()) return null;
  const resolvedBucket =
    (bucket || supabaseEnv.storageBucket()).trim() || 'media';
  const objectPath = path.replace(/^\/+/, '');
  if (!objectPath) return null;

  const admin = getSupabaseAdmin();
  const { data: publicData } = admin.storage
    .from(resolvedBucket)
    .getPublicUrl(objectPath);
  const publicUrl = publicData.publicUrl?.trim() || '';
  if (isPublicHttpsUrl(publicUrl)) {
    return publicUrl;
  }

  const { data: signed, error } = await admin.storage
    .from(resolvedBucket)
    .createSignedUrl(objectPath, SIGNED_URL_TTL_SECONDS);
  if (error || !signed?.signedUrl) {
    console.warn('[supabase/storage] createSignedUrl failed', error?.message);
    return publicUrl.startsWith('https://') ? publicUrl : null;
  }
  return signed.signedUrl;
}

/**
 * Guarantee Instagram/TikTok receive a fully-qualified public HTTPS media URL.
 * Rejects blob:, data:, localhost, and relative paths unless they map to Storage.
 */
export async function ensurePublicHttpsMediaUrl(raw: string): Promise<string> {
  const trimmed = (raw || '').trim();
  if (!trimmed) {
    throw new Error('Media URL is empty — upload a file before publishing.');
  }
  if (trimmed.startsWith('blob:')) {
    throw new Error(
      'Media is a local blob URL. Re-upload the file so it gets a public HTTPS address.'
    );
  }
  if (trimmed.startsWith('data:')) {
    throw new Error(
      'Media is an inline data URL. Instagram/TikTok require a public HTTPS file — re-upload to storage.'
    );
  }

  if (!/^https?:\/\//i.test(trimmed) && looksLikeStoragePath(trimmed)) {
    const fromPath = await publicOrSignedUrlFromStoragePath(trimmed);
    if (fromPath) return fromPath;
    throw new Error(
      `Could not resolve storage path to a public HTTPS URL: ${trimmed.slice(0, 80)}`
    );
  }

  if (/^http:\/\//i.test(trimmed)) {
    throw new Error(
      'Media URL must be HTTPS (not HTTP) for Instagram/TikTok to fetch it.'
    );
  }

  if (!isPublicHttpsUrl(trimmed)) {
    throw new Error(
      'Media URL is not a publicly accessible HTTPS address (localhost or invalid).'
    );
  }

  const stored = parseSupabaseStorageUrl(trimmed);
  if (stored) {
    const ensured = await publicOrSignedUrlFromStoragePath(
      stored.path,
      stored.bucket
    );
    if (ensured) return ensured;
  }

  return trimmed;
}
