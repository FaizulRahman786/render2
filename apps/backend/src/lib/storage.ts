// ============================================
// MEDIA STORAGE SERVICE
// ============================================
// Uploads material files to Cloudinary when configured, with a graceful
// fallback to local disk serving (the previous, still-supported behavior).
//
//   - Cloudinary is the PRIMARY store when CLOUDINARY_URL is present.
//   - On any Cloudinary failure we log and fall back to local storage so an
//     existing flow never breaks because the media provider hiccupped.
//   - The Cloudinary uploader is injectable so unit tests exercise both paths
//     without network access to the real account.

import fs from 'fs';
import path from 'path';
import { v2 as cloudinaryV2 } from 'cloudinary';
import { config } from '../config/env.js';

export interface CloudinaryUploader {
  upload: (
    filePath: string,
    options: { folder: string },
  ) => Promise<{
    secure_url: string;
    public_id: string;
    width?: number;
    height?: number;
    format?: string;
    bytes?: number;
  }>;
  destroy: (publicId: string) => Promise<{ result: string }>;
}

export interface StoredFile {
  /** Public URL suitable for <img src>/<a href> and for materials.file_url. */
  fileUrl: string;
  /** Cloudinary public id when stored remotely, otherwise null. */
  cloudinaryId: string | null;
  /** True when the file remains on the local disk (fallback path). */
  storedLocally: boolean;
}

export interface LibraryStoredFile extends StoredFile {
  /** Present for image assets when Cloudinary reports them. */
  width?: number | null;
  height?: number | null;
  format?: string | null;
  /** Reported by Cloudinary, otherwise the local file size. */
  bytes?: number | null;
}

let cachedUploader: CloudinaryUploader | null | undefined;

/** Build a Cloudinary uploader from CLOUDINARY_URL, or null when unset/broken. */
export function buildCloudinaryUploader(url: string): CloudinaryUploader | null {
  if (!url) return null;
  try {
    cloudinaryV2.config({ url });
    return {
      upload: (filePath, options) =>
        cloudinaryV2.uploader.upload(filePath, {
          folder: options.folder,
          resource_type: 'auto',
        }) as Promise<{
          secure_url: string;
          public_id: string;
          width?: number;
          height?: number;
          format?: string;
          bytes?: number;
        }>,
      destroy: (publicId) => cloudinaryV2.uploader.destroy(publicId),
    };
  } catch (err) {
    console.error('[storage] Cloudinary config failed; using local storage only.', err);
    return null;
  }
}

function defaultUploader(): CloudinaryUploader | null {
  if (cachedUploader === undefined) {
    cachedUploader = buildCloudinaryUploader(config.cloudinaryUrl);
  }
  return cachedUploader;
}

/**
 * Store a material file (already saved to `filePath` by multer).
 * Cloudinary-first, local-fallback. Never throws for storage failures so the
 * request can always return something useful.
 * `folder` selects the Cloudinary folder (materials vs media library).
 */
export async function storeMaterialFile(
  filePath: string,
  opts: { localBaseUrl: string; folder?: string },
  uploader?: CloudinaryUploader | null,
): Promise<StoredFile> {
  const cloud = uploader === undefined ? defaultUploader() : uploader;

  if (cloud) {
    try {
      const result = await cloud.upload(filePath, { folder: opts.folder ?? 'coaching/materials' });
      return {
        fileUrl: result.secure_url,
        cloudinaryId: result.public_id,
        storedLocally: false,
      };
    } catch (err) {
      console.error('[storage] Cloudinary upload failed; falling back to local storage.', (err as Error)?.message ?? err);
    }
  }

  return {
    fileUrl: `${opts.localBaseUrl}/${path.basename(filePath)}`,
    cloudinaryId: null,
    storedLocally: true,
  };
}

/**
 * Library variant of storeMaterialFile: additionally returns Cloudinary image
 * metadata (width/height/format/bytes) used by the media library table.
 */
export async function storeLibraryFile(
  filePath: string,
  opts: { localBaseUrl: string; folder?: string },
  uploader?: CloudinaryUploader | null,
): Promise<LibraryStoredFile> {
  const cloud = uploader === undefined ? defaultUploader() : uploader;

  if (cloud) {
    try {
      const result = await cloud.upload(filePath, { folder: opts.folder ?? 'coaching/library' });
      return {
        fileUrl: result.secure_url,
        cloudinaryId: result.public_id,
        storedLocally: false,
        width: result.width ?? null,
        height: result.height ?? null,
        format: result.format ?? null,
        bytes: result.bytes ?? null,
      };
    } catch (err) {
      console.error('[storage] Cloudinary upload failed; falling back to local storage.', (err as Error)?.message ?? err);
    }
  }

  return {
    fileUrl: `${opts.localBaseUrl}/${path.basename(filePath)}`,
    cloudinaryId: null,
    storedLocally: true,
    width: null,
    height: null,
    format: path.extname(filePath).replace('.', '') || null,
    bytes: null,
  };
}

/** Best-effort cleanup of the temporary file left by multer after a Cloud upload. */
export function removeLocalFile(filePath: string): void {
  try {
    if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch (_err) {
    // Non-fatal: leftover temp files are acceptable on failure.
  }
}

/** Best-effort Cloudinary delete for a material that used cloudinary_id. */
export async function deleteCloudinaryAsset(
  publicId: string | null | undefined,
  uploader?: CloudinaryUploader | null,
): Promise<void> {
  if (!publicId) return;
  const cloud = uploader === undefined ? defaultUploader() : uploader;
  if (!cloud) return;
  try {
    await cloud.destroy(publicId);
  } catch (err) {
    console.error('[storage] Cloudinary destroy failed.', (err as Error).message ?? err);
  }
}