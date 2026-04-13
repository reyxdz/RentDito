import { Router } from 'express';
import auth from '../middleware/auth';
import validate from '../middleware/validate';
import * as messageController from '../controllers/message.controller';
import * as messageValidator from '../validators/message.validator';

const router = Router();

// All routes require authentication
router.use(auth);

// GET /api/messages/conversation/:id/messages - Get messages (paginated)
router.get('/conversation/:id/messages', messageController.getConversationMessages);

// POST /api/messages/conversation/:id/messages - Send message
router.post(
  '/conversation/:id/messages',
  validate(messageValidator.sendMessageSchema),
  messageController.sendMessage
);

export default router;
