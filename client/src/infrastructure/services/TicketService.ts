import type { Ticket } from '../../domain/entities/Ticket';
import type { TicketRepository, TicketQueryFilters } from '../../domain/repositories/TicketRepository';

let mockTickets: Ticket[] = [
  {
    id: 'ticket_1',
    tenancyId: 'tenancy_1',
    propertyId: 'prop_1',
    unitId: 'unit_1',
    reportedByUserId: 'usr_tenant_1',
    reportedByUser: {
      id: 'usr_tenant_1',
      name: 'Juan Dela Cruz',
      email: 'juan@example.com',
      phone: '09171234567',
      role: 'user',
      status: 'active',
      verificationStatus: 'verified',
      idPhotos: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    title: 'Leaking Faucet in Bathroom',
    description: 'The sink faucet is leaking continuously even when turned off tightly.',
    category: 'plumbing',
    priority: 'medium',
    images: [],
    status: 'open',
    updates: [],
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 'ticket_2',
    tenancyId: 'tenancy_2',
    propertyId: 'prop_1',
    unitId: 'unit_2',
    reportedByUserId: 'usr_tenant_2',
    title: 'Aircon not cooling',
    description: 'The AC unit blows warm air.',
    category: 'appliance',
    priority: 'high',
    images: [],
    status: 'assigned',
    assignedToUserId: 'usr_staff_1',
    assignedToUser: {
      id: 'usr_staff_1',
      name: 'Mario Plumber',
      email: 'mario@rentdito.com',
      phone: '09181234567',
      role: 'staff',
      status: 'active',
      verificationStatus: 'verified',
      idPhotos: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    updates: [
      {
        userId: 'usr_staff_1',
        message: 'I will check this tomorrow morning.',
        timestamp: new Date(Date.now() - 86400000).toISOString()
      }
    ],
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
  }
];

export class TicketService implements TicketRepository {
  async getTickets(filters?: TicketQueryFilters): Promise<Ticket[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        let filtered = [...mockTickets];
        if (filters) {
          if (filters.status) filtered = filtered.filter(t => t.status === filters.status);
          if (filters.priority) filtered = filtered.filter(t => t.priority === filters.priority);
          if (filters.category) filtered = filtered.filter(t => t.category === filters.category);
          if (filters.propertyId) filtered = filtered.filter(t => t.propertyId === filters.propertyId);
          if (filters.assignedToUserId) filtered = filtered.filter(t => t.assignedToUserId === filters.assignedToUserId);
        }
        // Sort by newest first
        filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        resolve(filtered);
      }, 500);
    });
  }

  async getTicketById(id: string): Promise<Ticket | null> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(mockTickets.find(t => t.id === id) || null);
      }, 300);
    });
  }

  async createTicket(data: Partial<Ticket>): Promise<Ticket> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const newTicket: Ticket = {
          id: `ticket_${Date.now()}`,
          tenancyId: data.tenancyId || '',
          propertyId: data.propertyId || '',
          unitId: data.unitId || '',
          reportedByUserId: data.reportedByUserId || '',
          title: data.title || '',
          description: data.description || '',
          category: data.category || 'other',
          priority: data.priority || 'medium',
          images: data.images || [],
          status: 'open',
          updates: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        mockTickets = [newTicket, ...mockTickets];
        resolve(newTicket);
      }, 500);
    });
  }

  async assignTicket(id: string, staffId: string): Promise<Ticket> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const idx = mockTickets.findIndex(t => t.id === id);
        if (idx === -1) return reject(new Error('Ticket not found'));
        
        mockTickets[idx] = {
          ...mockTickets[idx],
          status: mockTickets[idx].status === 'open' ? 'assigned' : mockTickets[idx].status,
          assignedToUserId: staffId,
          assignedToUser: {
             id: staffId,
             name: 'Assigned Staff',
             email: 'staff@rentdito.com',
             phone: '09000000000',
             role: 'staff',
             status: 'active',
             verificationStatus: 'verified',
             idPhotos: [],
             createdAt: new Date().toISOString(),
             updatedAt: new Date().toISOString()
          },
          updatedAt: new Date().toISOString()
        };
        resolve(mockTickets[idx]);
      }, 400);
    });
  }

  async postUpdate(id: string, update: { message: string; images?: string[] }): Promise<Ticket> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const idx = mockTickets.findIndex(t => t.id === id);
        if (idx === -1) return reject(new Error('Ticket not found'));
        
        const newUpdate = {
          userId: 'usr_staff_1', // mocked user posting
          message: update.message,
          timestamp: new Date().toISOString()
        };

        mockTickets[idx] = {
          ...mockTickets[idx],
          updates: [...mockTickets[idx].updates, newUpdate],
          updatedAt: new Date().toISOString(),
          status: mockTickets[idx].status === 'assigned' ? 'in_progress' : mockTickets[idx].status,
        };
        resolve(mockTickets[idx]);
      }, 400);
    });
  }

  async resolveTicket(id: string, resolutionNotes: string, costs?: { estimated?: number; actual?: number }): Promise<Ticket> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const idx = mockTickets.findIndex(t => t.id === id);
        if (idx === -1) return reject(new Error('Ticket not found'));
        
        mockTickets[idx] = {
          ...mockTickets[idx],
          status: 'resolved',
          resolutionNotes: resolutionNotes + (costs?.actual ? `\nActual Cost: ₱${costs.actual}` : ''),
          resolvedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        resolve(mockTickets[idx]);
      }, 400);
    });
  }

  async closeTicket(id: string): Promise<Ticket> {
     return new Promise((resolve, reject) => {
      setTimeout(() => {
        const idx = mockTickets.findIndex(t => t.id === id);
        if (idx === -1) return reject(new Error('Ticket not found'));
        
        mockTickets[idx] = {
          ...mockTickets[idx],
          status: 'closed',
          updatedAt: new Date().toISOString()
        };
        resolve(mockTickets[idx]);
      }, 400);
    });
  }
}

export const ticketService = new TicketService();
