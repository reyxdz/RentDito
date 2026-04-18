export interface RentalApplication {
  id: string;
  propertyId: string;
  propertyName: string;
  unitId: string;
  unitIdentifier: string;
  userId: string;
  userName: string;
  status: 'pending' | 'under_review' | 'approved' | 'rejected';
  personalDetails: {
    fullName: string;
    phone: string;
    occupation: string;
    school?: string;
    address: string;
    emergencyContact: {
      name: string;
      phone: string;
      relation: string;
    };
  };
  documents: string[]; // file names (mock)
  reviewNotes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

let mockApplications: RentalApplication[] = [
  {
    id: 'app_1',
    propertyId: 'prop-white-dorm',
    propertyName: 'White Dorm',
    unitId: 'unit-white-dorm-room2',
    unitIdentifier: 'Room 2',
    userId: 'usr_tenant',
    userName: 'Juan Dela Cruz',
    status: 'approved',
    personalDetails: {
      fullName: 'Juan Dela Cruz',
      phone: '09171234567',
      occupation: 'Student',
      school: 'University of the Philippines',
      address: '123 Rizal St., Brgy. Marilag, Quezon City',
      emergencyContact: {
        name: 'Maria Dela Cruz',
        phone: '09189876543',
        relation: 'Mother',
      },
    },
    documents: ['valid_id_front.jpg', 'valid_id_back.jpg', 'enrollment_certificate.pdf'],
    reviewNotes: 'All documents verified. Good standing student at UP Diliman.',
    reviewedBy: 'landlord_1',
    reviewedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 'app_2',
    propertyId: 'prop-white-dorm',
    propertyName: 'White Dorm',
    unitId: 'unit-white-dorm-room5',
    unitIdentifier: 'Room 5',
    userId: 'usr_tenant',
    userName: 'Juan Dela Cruz',
    status: 'pending',
    personalDetails: {
      fullName: 'Juan Dela Cruz',
      phone: '09171234567',
      occupation: 'Student',
      school: 'University of the Philippines',
      address: '123 Rizal St., Brgy. Marilag, Quezon City',
      emergencyContact: {
        name: 'Maria Dela Cruz',
        phone: '09189876543',
        relation: 'Mother',
      },
    },
    documents: ['valid_id_front.jpg', 'valid_id_back.jpg'],
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
  },
];

export class MockApplicationService {
  static async getApplicationsByUser(userId: string): Promise<RentalApplication[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(mockApplications.filter((a) => a.userId === userId));
      }, 500);
    });
  }

  static async getApplicationById(id: string): Promise<RentalApplication | null> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(mockApplications.find((a) => a.id === id) || null);
      }, 300);
    });
  }

  static async createApplication(data: {
    propertyId: string;
    propertyName: string;
    unitId: string;
    unitIdentifier: string;
    userId: string;
    userName: string;
    personalDetails: RentalApplication['personalDetails'];
    documents: string[];
  }): Promise<RentalApplication> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // Check if user already has a pending application for this unit
        const existing = mockApplications.find(
          (a) => a.userId === data.userId && a.unitId === data.unitId && ['pending', 'under_review'].includes(a.status)
        );
        if (existing) {
          reject(new Error('You already have a pending application for this unit.'));
          return;
        }

        const newApp: RentalApplication = {
          id: `app_${Date.now()}`,
          propertyId: data.propertyId,
          propertyName: data.propertyName,
          unitId: data.unitId,
          unitIdentifier: data.unitIdentifier,
          userId: data.userId,
          userName: data.userName,
          status: 'pending',
          personalDetails: data.personalDetails,
          documents: data.documents,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        mockApplications = [newApp, ...mockApplications];
        resolve(newApp);
      }, 800);
    });
  }

  static async withdrawApplication(applicationId: string): Promise<RentalApplication> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const idx = mockApplications.findIndex((a) => a.id === applicationId);
        if (idx === -1) {
          reject(new Error('Application not found'));
          return;
        }
        if (!['pending', 'under_review'].includes(mockApplications[idx].status)) {
          reject(new Error('Can only withdraw pending or under-review applications'));
          return;
        }

        const updated: RentalApplication = {
          ...mockApplications[idx],
          status: 'rejected',
          reviewNotes: 'Withdrawn by applicant.',
          updatedAt: new Date().toISOString(),
        };
        mockApplications[idx] = updated;
        resolve(updated);
      }, 400);
    });
  }
}
