import type { Ticket, TicketStatus, TicketPriority } from '../entities/Ticket';

export interface TicketQueryFilters {
  propertyId?: string;
  status?: TicketStatus;
  priority?: TicketPriority;
  category?: string;
  assignedToUserId?: string;
}

export interface TicketRepository {
  getTickets(filters?: TicketQueryFilters): Promise<Ticket[]>;
  getTicketById(id: string): Promise<Ticket | null>;
  createTicket(data: Partial<Ticket>): Promise<Ticket>;
  assignTicket(id: string, staffId: string): Promise<Ticket>;
  postUpdate(id: string, update: { message: string; images?: string[] }): Promise<Ticket>;
  resolveTicket(id: string, resolutionNotes: string, costs?: { estimated?: number; actual?: number }): Promise<Ticket>;
  closeTicket(id: string): Promise<Ticket>;
}
