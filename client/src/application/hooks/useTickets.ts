import { useState, useCallback } from 'react';
import { ticketService } from '../../infrastructure/services/TicketService';
import type { Ticket } from '../../domain/entities/Ticket';
import type { TicketQueryFilters } from '../../domain/repositories/TicketRepository';

export function useTickets() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTickets = useCallback(async (filters?: TicketQueryFilters) => {
    setLoading(true);
    setError(null);
    try {
      const data = await ticketService.getTickets(filters);
      setTickets(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch tickets');
    } finally {
      setLoading(false);
    }
  }, []);

  return { tickets, loading, error, fetchTickets };
}

export function useTicketDetail(ticketId?: string) {
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTicket = useCallback(async () => {
    if (!ticketId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await ticketService.getTicketById(ticketId);
      if (!data) throw new Error('Ticket not found');
      setTicket(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch ticket');
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  const assign = async (staffId: string) => {
    if (!ticketId) return;
    setLoading(true);
    try {
      const updated = await ticketService.assignTicket(ticketId, staffId);
      setTicket(updated);
    } catch (err: any) {
      setError(err.message || 'Failed to assign ticket');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const postUpdate = async (message: string, images?: string[]) => {
    if (!ticketId) return;
    setLoading(true);
    try {
      const updated = await ticketService.postUpdate(ticketId, { message, images });
      setTicket(updated);
    } catch (err: any) {
      setError(err.message || 'Failed to post update');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const resolve = async (resolutionNotes: string, costs?: { estimated?: number; actual?: number }) => {
    if (!ticketId) return;
    setLoading(true);
    try {
      const updated = await ticketService.resolveTicket(ticketId, resolutionNotes, costs);
      setTicket(updated);
    } catch (err: any) {
      setError(err.message || 'Failed to resolve ticket');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const close = async () => {
     if (!ticketId) return;
    setLoading(true);
    try {
      const updated = await ticketService.closeTicket(ticketId);
      setTicket(updated);
    } catch (err: any) {
      setError(err.message || 'Failed to close ticket');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { ticket, loading, error, fetchTicket, assign, postUpdate, resolve, close };
}
