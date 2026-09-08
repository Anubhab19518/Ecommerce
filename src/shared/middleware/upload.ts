import type { Request } from 'express';
import multer, { memoryStorage } from 'multer';
import { ValidationError } from '@shared/errors';

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB
const MAX_FILES_COUNT = 10;

const storage = memoryStorage();

const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
): void => {
  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    return cb(
      new ValidationError(
        `Invalid file type "${file.mimetype}". Only JPEG, PNG, WEBP, and GIF images are allowed.`,
      ),
    );
  }
  cb(null, true);
};

export const uploadMiddleware = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
    files: MAX_FILES_COUNT,
  },
  fileFilter,
});
