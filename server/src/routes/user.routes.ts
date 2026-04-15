import { Router } from 'express';
import auth from '../middleware/auth';
import * as controller from '../controllers/user.controller';
import { uploadSingle, uploadMultiple } from '../middleware/upload';
import validate from '../middleware/validate';
import { updateProfileSchema, changePasswordSchema } from '../validators/user.validator';

const router = Router();

// All routes require authentication
router.use(auth);

// Profile
router.get('/me', controller.getMe);
router.patch('/me', validate(updateProfileSchema), controller.updateMe);
router.patch('/me/password', validate(changePasswordSchema), controller.changePassword);

// Avatar upload (single image → Cloudinary)
router.post('/me/avatar', ...uploadSingle('avatar', 'avatars'), controller.updateAvatar);

// ID verification (multiple images → Cloudinary)
router.post('/me/verify', ...uploadMultiple('idPhotos', 'verification'), controller.submitVerification);

export default router;
