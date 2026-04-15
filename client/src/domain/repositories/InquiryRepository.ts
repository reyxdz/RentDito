import type { Inquiry, InquiryStatus } from '../entities/Inquiry';
import type { Message } from '../entities/Message';

export interface InquiryRepository {
  getPropertyInquiries(propertyId: string, filters?: { status?: string }): Promise<Inquiry[]>;
  getInquiryById(inquiryId: string): Promise<(Inquiry & { conversationId?: string }) | null>;
  updateInquiryStatus(inquiryId: string, status: InquiryStatus): Promise<Inquiry>;
  getConversationMessages(conversationId: string, page?: number, limit?: number): Promise<{ messages: Message[]; pagination: any }>;
  sendMessage(conversationId: string, data: { content: string; attachments?: string[] }): Promise<Message>;
}
