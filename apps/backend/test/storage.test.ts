import { describe, it, expect, vi, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  buildCloudinaryUploader,
  storeMaterialFile,
  removeLocalFile,
  deleteCloudinaryAsset,
  type CloudinaryUploader,
} from '../src/lib/storage.js';

vi.mock('cloudinary', () => ({
  v2: {
    config: vi.fn(),
    uploader: {
      upload: vi.fn(),
      destroy: vi.fn(),
    },
  },
}));

let tempFile: string | undefined;

function makeTempFile(): string {
  tempFile = path.join(os.tmpdir(), `storage-test-${Date.now()}-${Math.random().toString(36).slice(2)}.pdf`);
  fs.writeFileSync(tempFile, 'fake-pdf-bytes');
  return tempFile;
}

afterEach(() => {
  if (tempFile && fs.existsSync(tempFile)) {
    fs.unlinkSync(tempFile);
  }
  tempFile = undefined;
});

describe('buildCloudinaryUploader', () => {
  it('returns null when the URL is empty', () => {
    expect(buildCloudinaryUploader('')).toBeNull();
  });

  it('returns a working uploader for a valid cloudinary URL', async () => {
    const cloudinary = await import('cloudinary');
    (cloudinary.v2.uploader.upload as ReturnType<typeof vi.fn>).mockResolvedValue({
      secure_url: 'https://res.cloudinary.com/demo/image/upload/x.pdf',
      public_id: 'coaching/materials/abc',
    });
    const uploader = buildCloudinaryUploader('cloudinary://key:secret@demo');
    expect(uploader).not.toBeNull();
    const result = await uploader!.upload('/tmp/x.pdf', { folder: 'coaching/materials' });
    expect(result.secure_url).toContain('res.cloudinary.com');
    expect(cloudinary.v2.uploader.upload).toHaveBeenCalledWith('/tmp/x.pdf', expect.objectContaining({ folder: 'coaching/materials' }));
  });
});

describe('storeMaterialFile', () => {
  it('returns the Cloudinary URL and clears the cloudinary id when upload succeeds', async () => {
    const file = makeTempFile();
    const uploader: CloudinaryUploader = {
      upload: vi.fn(async () => ({
        secure_url: 'https://res.cloudinary.com/demo/raw/upload/mat.pdf',
        public_id: 'coaching/materials/mat123',
      })),
      destroy: vi.fn(async () => ({ result: 'ok' })),
    };

    const stored = await storeMaterialFile(file, { localBaseUrl: '/api/uploads' }, uploader);

    expect(stored).toEqual({
      fileUrl: 'https://res.cloudinary.com/demo/raw/upload/mat.pdf',
      cloudinaryId: 'coaching/materials/mat123',
      storedLocally: false,
    });
  });

  it('falls back to local storage when Cloudinary upload fails', async () => {
    const file = makeTempFile();
    const uploader: CloudinaryUploader = {
      upload: vi.fn(async () => { throw new Error('boom'); }),
      destroy: vi.fn(async () => ({ result: 'ok' })),
    };

    const stored = await storeMaterialFile(file, { localBaseUrl: '/api/uploads' }, uploader);

    expect(stored.storedLocally).toBe(true);
    expect(stored.cloudinaryId).toBeNull();
    expect(stored.fileUrl).toBe(`/api/uploads/${path.basename(file)}`);
  });

  it('uses local storage when no uploader is configured at all', async () => {
    const file = makeTempFile();
    const stored = await storeMaterialFile(file, { localBaseUrl: '/api/uploads' }, null);
    expect(stored.storedLocally).toBe(true);
    expect(stored.cloudinaryId).toBeNull();
  });
});

describe('removeLocalFile', () => {
  it('deletes an existing temp file and ignores missing files', () => {
    const file = makeTempFile();
    removeLocalFile(file);
    expect(fs.existsSync(file)).toBe(false);
    expect(() => removeLocalFile(path.join(os.tmpdir(), 'does-not-exist.pdf'))).not.toThrow();
  });
});

describe('deleteCloudinaryAsset', () => {
  it('destroys the asset when a cloudinary id exists', async () => {
    const destroy = vi.fn(async () => ({ result: 'ok' }));
    const uploader: CloudinaryUploader = {
      upload: vi.fn(async () => ({ secure_url: '', public_id: '' })),
      destroy,
    };
    await deleteCloudinaryAsset('coaching/materials/abc', uploader);
    expect(destroy).toHaveBeenCalledWith('coaching/materials/abc');
  });

  it('is a no-op for empty cloudinary ids or missing uploaders', async () => {
    const destroy = vi.fn();
    const uploader: CloudinaryUploader = {
      upload: vi.fn(async () => ({ secure_url: '', public_id: '' })),
      destroy,
    };
    await deleteCloudinaryAsset(null, uploader);
    await deleteCloudinaryAsset(undefined, uploader);
    await deleteCloudinaryAsset('pid', null);
    expect(destroy).not.toHaveBeenCalled();
  });

  it('swallows destroy failures so deletion never breaks the request', async () => {
    const uploader: CloudinaryUploader = {
      upload: vi.fn(async () => ({ secure_url: '', public_id: '' })),
      destroy: vi.fn(async () => { throw new Error('remote gone'); }),
    };
    await expect(deleteCloudinaryAsset('pid', uploader)).resolves.toBeUndefined();
  });
});
