export interface Visit {
  id: string;
  propertyId: string;
  propertyName: string;
  unitId?: string;
  unitIdentifier?: string;
  userId: string;
  userName: string;
  status: 'pending' | 'approved' | 'scheduled' | 'completed' | 'cancelled' | 'no_show';
  preferredDate: string;
  preferredTime: string;
  scheduledDate?: string;
  scheduledTime?: string;
  purpose: 'viewing' | 'inspection';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TimeSlot {
  time: string;
  available: boolean;
}

const AVAILABLE_TIMES = [
  '08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM',
  '12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM',
  '04:00 PM', '05:00 PM',
];

let mockVisits: Visit[] = [
  {
    id: 'visit_1',
    propertyId: 'prop-white-dorm',
    propertyName: 'White Dorm',
    unitId: 'unit-white-dorm-room2',
    unitIdentifier: 'Room 2',
    userId: 'usr_tenant',
    userName: 'Juan Dela Cruz',
    status: 'scheduled',
    preferredDate: new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10),
    preferredTime: '10:00 AM',
    scheduledDate: new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10),
    scheduledTime: '10:00 AM',
    purpose: 'viewing',
    notes: 'Will bring a friend to help assess the room.',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 3600000).toISOString(),
  },
];

// Track booked slots per unit+date for double-booking prevention
const bookedSlots: Record<string, string[]> = {
  // key: `${unitId}_${date}` → array of booked times
  [`unit-white-dorm-room2_${new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10)}`]: ['10:00 AM'],
};

export class MockVisitService {
  static async getVisitsByUser(userId: string): Promise<Visit[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(mockVisits.filter((v) => v.userId === userId));
      }, 500);
    });
  }

  static async getVisitById(id: string): Promise<Visit | null> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(mockVisits.find((v) => v.id === id) || null);
      }, 300);
    });
  }

  static async getAvailableSlots(unitId: string, date: string): Promise<TimeSlot[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const key = `${unitId}_${date}`;
        const booked = bookedSlots[key] || [];
        const slots: TimeSlot[] = AVAILABLE_TIMES.map((time) => ({
          time,
          available: !booked.includes(time),
        }));
        resolve(slots);
      }, 400);
    });
  }

  static async createVisit(data: {
    propertyId: string;
    propertyName: string;
    unitId?: string;
    unitIdentifier?: string;
    userId: string;
    userName: string;
    preferredDate: string;
    preferredTime: string;
    purpose: 'viewing' | 'inspection';
    notes?: string;
  }): Promise<Visit> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const newVisit: Visit = {
          id: `visit_${Date.now()}`,
          propertyId: data.propertyId,
          propertyName: data.propertyName,
          unitId: data.unitId,
          unitIdentifier: data.unitIdentifier,
          userId: data.userId,
          userName: data.userName,
          status: 'pending',
          preferredDate: data.preferredDate,
          preferredTime: data.preferredTime,
          purpose: data.purpose,
          notes: data.notes,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        // Mark the slot as booked
        if (data.unitId) {
          const key = `${data.unitId}_${data.preferredDate}`;
          if (!bookedSlots[key]) bookedSlots[key] = [];
          bookedSlots[key].push(data.preferredTime);
        }

        mockVisits = [newVisit, ...mockVisits];
        resolve(newVisit);
      }, 800);
    });
  }

  static async cancelVisit(visitId: string): Promise<Visit> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const idx = mockVisits.findIndex((v) => v.id === visitId);
        if (idx === -1) {
          reject(new Error('Visit not found'));
          return;
        }
        const updated = { ...mockVisits[idx], status: 'cancelled' as const, updatedAt: new Date().toISOString() };

        // Free the booked slot
        if (updated.unitId) {
          const key = `${updated.unitId}_${updated.preferredDate}`;
          if (bookedSlots[key]) {
            bookedSlots[key] = bookedSlots[key].filter((t) => t !== updated.preferredTime);
          }
        }

        mockVisits[idx] = updated;
        resolve(updated);
      }, 400);
    });
  }
}
