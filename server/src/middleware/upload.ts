import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import cloudinary from '../config/cloudinary';
import { Readable } from 'stream';

// ─── Multer Config ──────────────────────────────────────────

const storage = multer.memoryStorage();

const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, WebP, and GIF images are allowed.'));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB
  },
});

// ─── Document Upload Config (images + PDFs) ─────────────────

const documentFileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = [
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'application/pdf',
  ];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, WebP, GIF, and PDF files are allowed.'));
  }
};

const documentUpload = multer({
  storage,
  fileFilter: documentFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
  },
});

// ─── Cloudinary Upload Helper ───────────────────────────────

/**
 * Upload a single buffer to Cloudinary and return the secure URL.
 */
export const uploadToCloudinary = (
  buffer: Buffer,
  folder: string,
  resourceType: 'image' | 'raw' | 'auto' = 'image'
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `rentdito/${folder}`,
        resource_type: resourceType,
        transformation: resourceType === 'image' ? [{ quality: 'auto', fetch_format: 'auto' }] : undefined,
      },
      (error, result) => {
        if (error) return reject(error);
        if (!result) return reject(new Error('Upload returned no result'));
        resolve(result.secure_url);
      }
    );

    const readable = new Readable();
    readable.push(buffer);
    readable.push(null);
    readable.pipe(uploadStream);
  });
};

/**
 * Middleware that uploads req.file (single) to Cloudinary
 * and attaches the URL to req.body.imageUrl.
 */
export const uploadSingle = (fieldName: string, folder: string) => {
  return [
    upload.single(fieldName),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        if (!req.file) {
          next();
          return;
        }
        const url = await uploadToCloudinary(req.file.buffer, folder);
        req.body.imageUrl = url;
        next();
      } catch (error: any) {
        res.status(400).json({
          status: 'error',
          message: error.message || 'Image upload failed.',
        });
      }
    },
  ];
};

/**
 * Middleware that uploads req.files (multiple) to Cloudinary
 * and attaches the URLs to req.body.imageUrls.
 */
export const uploadMultiple = (fieldName: string, folder: string, maxCount = 10) => {
  return [
    upload.array(fieldName, maxCount),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const files = req.files as Express.Multer.File[] | undefined;
        if (!files || files.length === 0) {
          next();
          return;
        }
        const urls = await Promise.all(
          files.map((file) => uploadToCloudinary(file.buffer, folder))
        );
        req.body.imageUrls = urls;
        next();
      } catch (error: any) {
        res.status(400).json({
          status: 'error',
          message: error.message || 'Image upload failed.',
        });
      }
    },
  ];
};

/**
 * Middleware that uploads a single document file (image or PDF) to Cloudinary
 * and attaches the URL to req.body.fileUrl.
 */
export const uploadDocumentSingle = (fieldName: string, folder: string) => {
  return [
    documentUpload.single(fieldName),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        if (!req.file) {
          next();
          return;
        }
        const isPdf = req.file.mimetype === 'application/pdf';
        const resourceType = isPdf ? 'raw' as const : 'image' as const;
        const url = await uploadToCloudinary(req.file.buffer, folder, resourceType);
        req.body.fileUrl = url;
        next();
      } catch (error: any) {
        res.status(400).json({
          status: 'error',
          message: error.message || 'Document upload failed.',
        });
      }
    },
  ];
};

