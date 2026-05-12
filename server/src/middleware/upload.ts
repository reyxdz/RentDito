import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import cloudinary from '../config/cloudinary';
import { Readable } from 'stream';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

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

// ─── Local Storage Fallback ─────────────────────────────────

const UPLOADS_DIR = path.resolve(__dirname, '../../uploads');

/**
 * Save a buffer to local disk and return a URL path for it.
 */
const saveLocally = (buffer: Buffer, folder: string, mimetype: string): string => {
  const subDir = path.join(UPLOADS_DIR, folder);
  fs.mkdirSync(subDir, { recursive: true });

  const ext = mimetype.split('/')[1] === 'jpeg' ? 'jpg' : mimetype.split('/')[1];
  const filename = `${crypto.randomUUID()}.${ext}`;
  const filePath = path.join(subDir, filename);

  fs.writeFileSync(filePath, buffer);
  return `/uploads/${folder}/${filename}`;
};

// ─── Cloudinary Upload Helper (with local fallback) ─────────

/**
 * Upload a single buffer to Cloudinary and return the secure URL.
 * Falls back to local file storage if Cloudinary fails.
 */
export const uploadToCloudinary = async (
  buffer: Buffer,
  folder: string,
  mimetype: string = 'image/jpeg'
): Promise<string> => {
  try {
    const url: string = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `rentdito/${folder}`,
          resource_type: 'image',
          transformation: [{ quality: 'auto', fetch_format: 'auto' }],
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
    return url;
  } catch (err: any) {
    console.warn(`Cloudinary upload failed (${err.message}), saving locally...`);
    return saveLocally(buffer, folder, mimetype);
  }
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
        const url = await uploadToCloudinary(req.file.buffer, folder, req.file.mimetype);
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
          files.map((file) => uploadToCloudinary(file.buffer, folder, file.mimetype))
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
