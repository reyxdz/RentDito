import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { catchAsync } from '../utils/catchAsync';
import * as messageService from '../services/message.service';

/**
 * GET /api/messages/conversation/:id/messages - Get messages for a conversation
 */
export const getConversationMessages = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    const page = req.query.page ? parseInt(req.query.page as string) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

    const result = await messageService.getConversationMessages(
      req.user!.id,
      req.params.id as string,
      page,
      limit
    );

    res.status(200).json({
      status: 'success',
      data: result.messages,
      pagination: result.pagination
    });
});

/**
 * POST /api/messages/conversation/:id/messages - Send message
 */
export const sendMessage = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    const message = await messageService.sendMessage(
      req.user!.id,
      req.params.id as string,
      req.body
    );

    res.status(201).json({
      status: 'success',
      message: 'Message sent',
      data: message
    });
});
