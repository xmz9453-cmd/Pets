const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

const storageRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'pets-contract-storage-unit-'));
process.env.CONTRACT_STORAGE_ROOT = storageRoot;

const storage = require('../../backend/src/utils/contract-pdf-storage');

const validPdf = Buffer.from('%PDF-1.7\nStorage test\n%%EOF\n');

describe('Contract PDF storage utility', () => {
  beforeEach(() => {
    fs.rmSync(storageRoot, { recursive: true, force: true });
    fs.mkdirSync(storageRoot, { recursive: true });
  });

  afterAll(() => {
    fs.rmSync(storageRoot, { recursive: true, force: true });
  });

  test('generates unique random storage keys and resolves only valid keys below the configured root', async () => {
    const keys = new Set(Array.from({ length: 100 }, () => storage.createStorageKey()));
    expect(keys.size).toBe(100);
    expect([...keys].every((key) => /^contract-versions\/[a-f0-9]{32}\.pdf$/.test(key))).toBe(true);

    const resolved = await storage.resolveStoragePath([...keys][0]);
    const root = await fs.promises.realpath(storageRoot);
    const relative = path.relative(root, resolved);
    expect(relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)).toBe(false);
  });

  test.each([
    '../escape.pdf',
    '..\\escape.pdf',
    'contract-versions/../escape.pdf',
    'C:\\private\\contract.pdf',
    '\\\\server\\share\\contract.pdf',
    '/etc/passwd',
    'contract-versions/not-random.pdf',
  ])('rejects invalid storage key %s', async (key) => {
    await expect(storage.resolveStoragePath(key)).rejects.toMatchObject({ code: 'INVALID_STORAGE_KEY' });
  });

  test('validates PDF signature and computes actual size and SHA-256', async () => {
    const tempPath = await storage.writeTemporaryFile(validPdf);
    const metadata = await storage.inspectUploadedFile({
      path: tempPath,
      originalname: 'contract.pdf',
      mimetype: 'application/pdf',
    });
    expect(metadata).toEqual({
      file_name: 'contract.pdf',
      mime_type: 'application/pdf',
      file_size: validPdf.length,
      file_hash: crypto.createHash('sha256').update(validPdf).digest('hex'),
    });
    await storage.removeTemporaryFile(tempPath);
  });

  test('rejects empty, fake, oversized, wrong MIME, and wrong extension files', async () => {
    const emptyPath = await storage.writeTemporaryFile(Buffer.alloc(0));
    await expect(storage.inspectUploadedFile({
      path: emptyPath,
      originalname: 'empty.pdf',
      mimetype: 'application/pdf',
    })).rejects.toMatchObject({ code: 'INVALID_PDF' });

    const fakePath = await storage.writeTemporaryFile(Buffer.from('not a PDF'));
    await expect(storage.inspectUploadedFile({
      path: fakePath,
      originalname: 'fake.pdf',
      mimetype: 'application/pdf',
    })).rejects.toMatchObject({ code: 'INVALID_PDF' });

    const largePath = await storage.writeTemporaryFile(validPdf);
    fs.truncateSync(largePath, storage.MAX_PDF_SIZE + 1);
    await expect(storage.inspectUploadedFile({
      path: largePath,
      originalname: 'large.pdf',
      mimetype: 'application/pdf',
    })).rejects.toMatchObject({ code: 'PDF_TOO_LARGE' });

    await expect(storage.inspectUploadedFile({
      path: largePath,
      originalname: 'wrong.txt',
      mimetype: 'application/octet-stream',
    })).rejects.toMatchObject({ code: 'INVALID_PDF' });
    await expect(storage.inspectUploadedFile({
      path: largePath,
      originalname: 'wrong-mime.pdf',
      mimetype: 'application/octet-stream',
    })).rejects.toMatchObject({ code: 'INVALID_PDF_MIME_TYPE' });
    await storage.removeTemporaryFile(emptyPath);
    await storage.removeTemporaryFile(fakePath);
    await storage.removeTemporaryFile(largePath);
  });

  test('rejects storage symlinks that could escape the configured root', async () => {
    const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'pets-contract-outside-'));
    try {
      fs.symlinkSync(outside, path.join(storageRoot, 'contract-versions'), 'junction');
      await expect(storage.resolveStoragePath(storage.createStorageKey()))
        .rejects.toMatchObject({ code: 'INVALID_STORAGE_PATH' });
    } finally {
      fs.rmSync(storageRoot, { recursive: true, force: true });
      fs.mkdirSync(storageRoot, { recursive: true });
      fs.rmSync(outside, { recursive: true, force: true });
    }
  });

  test('moves files without overwriting and verifies stored size and hash', async () => {
    const tempPath = await storage.writeTemporaryFile(validPdf);
    const key = storage.createStorageKey();
    await storage.moveTemporaryFile(tempPath, key);
    const verified = await storage.verifyStoredFile({
      storage_path: key,
      file_size: validPdf.length,
      file_hash: crypto.createHash('sha256').update(validPdf).digest('hex'),
      mime_type: 'application/pdf',
      file_name: 'contract.pdf',
    });
    expect(verified.bytes).toEqual(validPdf);

    const duplicateTemp = await storage.writeTemporaryFile(validPdf);
    await expect(storage.moveTemporaryFile(duplicateTemp, key))
      .rejects.toMatchObject({ code: 'STORAGE_KEY_CONFLICT' });
    await storage.removeTemporaryFile(duplicateTemp);

    await expect(storage.verifyStoredFile({
      storage_path: key,
      file_size: validPdf.length + 1,
      file_hash: crypto.createHash('sha256').update(validPdf).digest('hex'),
      mime_type: 'application/pdf',
      file_name: 'contract.pdf',
    })).rejects.toMatchObject({ code: 'CONTRACT_PDF_SIZE_MISMATCH' });
  });
});
