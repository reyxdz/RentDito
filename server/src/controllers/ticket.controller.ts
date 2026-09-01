import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { catchAsync } from '../utils/catchAsync';
import * as ticketService from '../services/ticket.service';

/**
 * POST /api/tickets - Tenant creates ticket
 */
export const createTicket = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    const ticket = await ticketService.createTicket(req.user!.id, req.body);
    res.status(201).json({
      status: 'success',
      message: 'Maintenance ticket submitted successfully.',
      data: ticket
    });
});

/**
 * GET /api/tickets/my - Tenant tickets
 */
export const getMyTickets = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    const filters = {
      status: req.query.status as string,
      priority: req.query.priority as string,
      category: req.query.category as string
    };
    const tickets = await ticketService.getMyTickets(req.user!.id, filters);
    res.status(200).json({ status: 'success', data: tickets });
});

/**
 * GET /api/tickets - Landlord/staff scoped ticket list
 */
export const getTickets = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    const filters = {
      propertyId: req.query.propertyId as string,
      status: req.query.status as string,
      priority: req.query.priority as string,
      category: req.query.category as string,
      assignedToUserId: req.query.assignedToUserId as string
    };
    const tickets = await ticketService.getTickets(req.user!.id, filters);
    res.status(200).json({ status: 'success', data: tickets });
});

/**
 * GET /api/tickets/:id - Single ticket
 */
export const getTicketById = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    const ticket = await ticketService.getTicketById(req.user!.id, req.params.id as string);
    res.status(200).json({ status: 'success', data: ticket });
});

/**
 * PATCH /api/tickets/:id/assign - Assign staff
 */
export const assignTicket = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    const ticket = await ticketService.assignTicket(
      req.user!.id,
      req.params.id as string,
      req.body.staffId,
      'assign'
    );
    res.status(200).json({
      status: 'success',
      message: 'Ticket assigned successfully.',
      data: ticket
    });
});

/**
 * PATCH /api/tickets/:id/reassign - Reassign staff
 */
export const reassignTicket = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    const ticket = await ticketService.assignTicket(
      req.user!.id,
      req.params.id as string,
      req.body.staffId,
      'reassign'
    );
    res.status(200).json({
      status: 'success',
      message: 'Ticket reassigned successfully.',
      data: ticket
    });
});

/**
 * POST /api/tickets/:id/updates - Add progress update
 */
export const addTicketUpdate = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    const ticket = await ticketService.addTicketUpdate(
      req.user!.id,
      req.params.id as string,
      req.body.message
    );
    res.status(200).json({
      status: 'success',
      message: 'Ticket update posted successfully.',
      data: ticket
    });
});

/**
 * PATCH /api/tickets/:id/resolve - Resolve ticket
 */
export const resolveTicket = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    const ticket = await ticketService.resolveTicket(
      req.user!.id,
      req.params.id as string,
      req.body.resolutionNotes
    );
    res.status(200).json({
      status: 'success',
      message: 'Ticket resolved successfully.',
      data: ticket
    });
});

/**
 * PATCH /api/tickets/:id/close - Close ticket
 */
export const closeTicket = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    const ticket = await ticketService.closeTicket(
      req.user!.id,
      req.params.id as string,
      req.body?.closingNotes
    );
    res.status(200).json({
      status: 'success',
      message: 'Ticket closed successfully.',
      data: ticket
    });
});
