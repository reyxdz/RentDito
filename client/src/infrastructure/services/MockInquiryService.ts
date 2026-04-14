export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  content: string;
  timestamp: string;
  attachments?: string[];
}

export interface Inquiry {
  id: string;
  propertyId: string;
  propertyName: string;
  unitId: string;
  unitIdentifier: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  status: 'pending' | 'responded' | 'resolved';
  messages: Message[];
  createdAt: string;
  updatedAt: string;
}

let mockInquiries: Inquiry[] = [
  {
    id: 'inq_1',
    propertyId: 'prop_1',
    propertyName: 'The Pad - Manila Bay',
    unitId: 'unit_1',
    unitIdentifier: 'Room 501',
    userId: 'usr_tenant',
    userName: 'Juan Dela Cruz',
    userAvatar: 'https://i.pravatar.cc/150?u=juan',
    status: 'responded',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
    messages: [
      {
        id: 'msg_1',
        senderId: 'usr_tenant',
        senderName: 'Juan Dela Cruz',
        content: 'Hi! Is this room still available for viewing this weekend?',
        timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
      },
      {
        id: 'msg_2',
        senderId: 'landlord_1',
        senderName: 'John Landlord',
        content: 'Hello Juan, yes it is! What time on Saturday works best for you?',
        timestamp: new Date(Date.now() - 86400000).toISOString(),
      }
    ]
  }
];

export class MockInquiryService {
  static async getInquiriesByUser(userId: string): Promise<Inquiry[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(mockInquiries.filter(i => i.userId === userId));
      }, 500);
    });
  }

  static async getInquiryById(id: string): Promise<Inquiry | null> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const inq = mockInquiries.find(i => i.id === id);
        resolve(inq || null);
      }, 300);
    });
  }

  static async createInquiry(data: {
    propertyId: string;
    propertyName: string;
    unitId: string;
    unitIdentifier: string;
    userId: string;
    userName: string;
    initialMessage: string;
  }): Promise<Inquiry> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const newInq: Inquiry = {
          id: `inq_${Date.now()}`,
          propertyId: data.propertyId,
          propertyName: data.propertyName,
          unitId: data.unitId,
          unitIdentifier: data.unitIdentifier,
          userId: data.userId,
          userName: data.userName,
          status: 'pending',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          messages: [
            {
              id: `msg_${Date.now()}`,
              senderId: data.userId,
              senderName: data.userName,
              content: data.initialMessage,
              timestamp: new Date().toISOString(),
            }
          ]
        };
        mockInquiries = [newInq, ...mockInquiries];
        resolve(newInq);
      }, 800);
    });
  }

  static async addMessage(inquiryId: string, senderId: string, senderName: string, content: string): Promise<Message> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const inqIndex = mockInquiries.findIndex(i => i.id === inquiryId);
        if (inqIndex === -1) {
          reject(new Error('Inquiry not found'));
          return;
        }

        const newMessage: Message = {
          id: `msg_${Date.now()}`,
          senderId,
          senderName,
          content,
          timestamp: new Date().toISOString()
        };

        const updatedInquiry = { ...mockInquiries[inqIndex] };
        updatedInquiry.messages = [...updatedInquiry.messages, newMessage];
        
        // Auto-update status if landlord replies
        if (senderId !== updatedInquiry.userId) {
          updatedInquiry.status = 'responded';
        }

        updatedInquiry.updatedAt = new Date().toISOString();
        mockInquiries[inqIndex] = updatedInquiry;

        resolve(newMessage);
      }, 400);
    });
  }
}
