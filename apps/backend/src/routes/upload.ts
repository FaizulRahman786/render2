import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler, ApiError } from '../middleware/error.js';
import { storeMaterialFile, storeLibraryFile, removeLocalFile } from '../lib/storage.js';
import { db, schema } from '../db/index.js';

const router: ExpressRouter = Router();
router.use(authenticate);

const uploadsDir = path.join(process.cwd(), 'uploads');
const privateRoot = path.join(uploadsDir, 'private');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
if (!fs.existsSync(privateRoot)) fs.mkdirSync(privateRoot, { recursive: true });

// Map allowed MIME types to safe, server-controlled extensions.
// We NEVER use the client-supplied filename extension to prevent spoofing.
const MIME_TO_EXT: Record<string, string> = {
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'video/mp4': '.mp4',
  'video/webm': '.webm',
  'video/avi': '.avi',
  'video/quicktime': '.mov',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/vnd.ms-powerpoint': '.ppt',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
};

// Magic bytes (file signatures) for MIME type validation
// https://en.wikipedia.org/wiki/List_of_file_signatures
const MAGIC_BYTES: Record<string, number[][]> = {
  'application/pdf': [[0x25, 0x50, 0x44, 0x46]], // %PDF
  'image/jpeg': [[0xFF, 0xD8, 0xFF]], // JPEG
  'image/png': [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]], // PNG
  'image/gif': [[0x47, 0x49, 0x46, 0x38, 0x37, 0x61], [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]], // GIF87a, GIF89a
  'image/webp': [[0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50]], // RIFF....WEBP
  'video/mp4': [[0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70], [0x00, 0x00, 0x00, 0x1C, 0x66, 0x74, 0x79, 0x70]], // ftyp
  'video/webm': [[0x1A, 0x45, 0xDF, 0xA3]], // EBML
  'application/msword': [[0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1]], // OLE
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [[0x50, 0x4B, 0x03, 0x04]], // ZIP (docx)
  'application/vnd.ms-powerpoint': [[0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1]], // OLE
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': [[0x50, 0x4B, 0x03, 0x04]], // ZIP (pptx)
};

function validateMagicBytes(mimeType: string, buffer: Buffer): boolean {
  const signatures = MAGIC_BYTES[mimeType];
  if (!signatures) return true; // Allow if no signature defined (e.g., video formats vary)
  return signatures.some((sig) => sig.every((byte, i) => buffer[i] === byte));
}

function makeStorage(dir: string): multer.StorageEngine {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, dir),
    filename: makeFilename,
  });
}

// Per-user storage for private student submissions: files land under
// uploads/private/student/<userId>/ so the authorized download endpoint
// (server.ts) and the returned fileUrl agree on the real path.
function makePerUserStorage(baseDir: string): multer.StorageEngine {
  return multer.diskStorage({
    destination: (req, _file, cb) => {
      const dir = path.join(baseDir, (req as any).user!.id);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: makeFilename,
  });
}

function makeFilename(_req: any, file: any, cb: (err: Error | null, name: string) => void) {
  const unique = Date.now() + '-' + Math.round(Math.random() * 1e6);
  // Use the extension from the validated MIME type — NOT from the original filename
  const ext = MIME_TO_EXT[file.mimetype] || '.bin';
  cb(null, unique + ext);
}

// Validate file magic bytes after upload (multer stores to temp location first)
async function validateUploadedFile(filePath: string, mimeType: string): Promise<void> {
  const signatures = MAGIC_BYTES[mimeType];
  if (!signatures) return; // Skip validation if no signature defined
  const fd = fs.openSync(filePath, 'r');
  const buffer = Buffer.alloc(12); // Read first 12 bytes (max signature length)
  fs.readSync(fd, buffer, 0, 12, 0);
  fs.closeSync(fd);
  const valid = signatures.some((sig) => sig.every((byte, i) => buffer[i] === byte));
  if (!valid) {
    fs.unlinkSync(filePath); // Clean up invalid file
    throw new ApiError(400, 'File content does not match declared type');
  }
}

export const upload = multer({
  storage: makeStorage(uploadsDir),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (Object.keys(MIME_TO_EXT).includes(file.mimetype)) cb(null, true);
    else cb(new ApiError(400, 'File type not allowed'));
  },
});

// ── Public materials upload (institute content) ─────────────────────────────
// Only teachers and admins may upload materials. Students use /submission.
router.post(
  '/',
  (req, _res, next) => {
    if (req.user!.role !== 'teacher' && req.user!.role !== 'admin') {
      return next(new ApiError(403, 'Only teachers and admins can upload materials'));
    }
    next();
  },
  upload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      res.status(400).json({ success: false, error: 'No file uploaded' });
      return;
    }
    // Validate file magic bytes (content matches declared MIME type)
    await validateUploadedFile(req.file.path, req.file.mimetype);
    // Cloudinary-first with local fallback (see lib/storage.ts). On Cloudinary
    // success the multer temp file is removed; on fallback it stays for
    // static serving under /api/uploads/.
    const stored = await storeMaterialFile(req.file.path, { localBaseUrl: '/api/uploads' });
    if (!stored.storedLocally) {
      removeLocalFile(req.file.path);
    }
    res.json({
      success: true,
      data: {
        fileUrl: stored.fileUrl,
        cloudinaryId: stored.cloudinaryId,
        fileName: req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_'),
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
      },
    });
  })
);

// ── Media library upload (admins only) ──────────────────────────────────────
// Uploads an image/video/document into the media library (media_assets) so CMS
// pages, events, notices and faculty profiles can reference a managed asset.
// Cloudinary-first (coaching/library folder), local-disk fallback.
router.post(
  '/media',
  (req, _res, next) => {
    if (req.user!.role !== 'admin') {
      return next(new ApiError(403, 'Only admins can upload to the media library'));
    }
    next();
  },
  upload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      res.status(400).json({ success: false, error: 'No file uploaded' });
      return;
    }
    // Validate file magic bytes (content matches declared MIME type)
    await validateUploadedFile(req.file.path, req.file.mimetype);
    const stored = await storeLibraryFile(req.file.path, { localBaseUrl: '/api/uploads' });
    if (!stored.storedLocally) {
      removeLocalFile(req.file.path);
    }
    const publicId = stored.cloudinaryId ?? `local-${req.file.filename}`;
    const resourceType = req.file.mimetype.startsWith('image')
      ? 'image'
      : req.file.mimetype.startsWith('video')
        ? 'video'
        : 'raw';

    const [asset] = await db.insert(schema.mediaAssets).values({
      publicId,
      url: stored.fileUrl,
      resourceType,
      format: stored.format,
      bytes: stored.bytes ?? req.file.size,
      width: stored.width,
      height: stored.height,
      uploadedBy: req.user!.id,
    }).returning();

    res.status(201).json({
      success: true,
      data: asset,
      message: 'Media uploaded',
    });
  })
);

// ── Private submission upload (students only) ───────────────────────────────
// Stored under uploads/private/student/<userId>/ and NEVER served statically —
// only through the authorized download endpoint in server.ts (ownership check).
const studentSubmission = multer({
  storage: makePerUserStorage(path.join(privateRoot, 'student')),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (Object.keys(MIME_TO_EXT).includes(file.mimetype)) cb(null, true);
    else cb(new ApiError(400, 'File type not allowed'));
  },
});

router.post(
  '/submission',
  (req, _res, next) => {
    if (req.user!.role !== 'student') {
      return next(new ApiError(403, 'Only students can upload assignment submissions'));
    }
    next();
  },
  studentSubmission.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      res.status(400).json({ success: false, error: 'No file uploaded' });
      return;
    }
    // Validate file magic bytes (content matches declared MIME type)
    await validateUploadedFile(req.file.path, req.file.mimetype);
    const fileUrl = `/api/uploads/private/student/${req.user!.id}/${req.file.filename}`;
    res.json({
      success: true,
      data: {
        fileUrl,
        fileName: req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_'),
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
      },
    });
  })
);

export default router;