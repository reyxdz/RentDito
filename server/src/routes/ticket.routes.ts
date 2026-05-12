import { Router } from 'express';
import auth from '../middleware/auth';
import validate from '../middleware/validate';
import * as ticketController from '../controllers/ticket.controller';
import * as ticketValidator from '../validators/ticket.validator';

const router = Router();

router.use(auth);

// POST /api/tickets - Tenant creates ticket (active tenancy required)
router.post(
  '/',
  validate(ticketValidator.createTicketSchema),
  ticketController.createTicket
);

// GET /api/tickets/my - Tenant's own tickets
router.get('/my', ticketController.getMyTickets);

// GET /api/tickets - Landlord/staff scoped tickets
router.get('/', ticketController.getTickets);

// GET /api/tickets/:id - Single ticket
router.get('/:id', ticketController.getTicketById);

// PATCH /api/tickets/:id/assign - Assign staff
router.patch(
  '/:id/assign',
  validate(ticketValidator.assignTicketSchema),
  ticketController.assignTicket
);

// PATCH /api/tickets/:id/reassign - Reassign staff
router.patch(
  '/:id/reassign',
  validate(ticketValidator.assignTicketSchema),
  ticketController.reassignTicket
);

// POST /api/tickets/:id/updates - Staff/tenant follow-up updates
router.post(
  '/:id/updates',
  validate(ticketValidator.addTicketUpdateSchema),
  ticketController.addTicketUpdate
);

// PATCH /api/tickets/:id/resolve - Resolve ticket
router.patch(
  '/:id/resolve',
  validate(ticketValidator.resolveTicketSchema),
  ticketController.resolveTicket
);

// PATCH /api/tickets/:id/close - Close ticket
router.patch(
  '/:id/close',
  validate(ticketValidator.closeTicketSchema),
  ticketController.closeTicket
);

export default router;
