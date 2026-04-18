import { apiClient } from '../api/apiClient';
import { ENDPOINTS } from '../api/endpoints';
import type { Inquiry, InquiryStatus } from '../../domain/entities/Inquiry';
import type { Message } from '../../domain/entities/Message';
import type { InquiryRepository } from '../../domain/repositories/InquiryRepository';

export class InquiryService implements InquiryRepository {
  async getPropertyInquiries(propertyId: string, filters?: { status?: string }): Promise<Inquiry[]> {
    const { data } = await apiClient.get(`${ENDPOINTS.INQUIRIES.ROOT}/property/${propertyId}`, {
      params: filters
    });
    return data.data || data;
  }

  async getInquiryById(inquiryId: string): Promise<(Inquiry & { conversationId?: string }) | null> {
    try {
      const { data } = await apiClient.get(ENDPOINTS.INQUIRIES.DETAILS(inquiryId));
      return data.data || data;
    } catch (error: any) {
      if (error.statusCode === 404) return null;
      throw error;
    }
  }

  async updateInquiryStatus(inquiryId: string, status: InquiryStatus): Promise<Inquiry> {
    const { data } = await apiClient.patch(`${ENDPOINTS.INQUIRIES.DETAILS(inquiryId)}/status`, { status });
    return data.data || data;
  }

  async getConversationMessages(
    conversationId: string,
    page: number = 1,
    limit: number = 50
  ): Promise<{ messages: Message[]; pagination: any }> {
    const { data } = await apiClient.get(
      `${ENDPOINTS.MESSAGES.CONVERSATION(conversationId)}`,
      { params: { page, limit } }
    );
    return {
      messages: data.data || [],
      pagination: data.pagination || {}
    };
  }

  async sendMessage(
    conversationId: string,
    messageData: { content: string; attachments?: string[] }
  ): Promise<Message> {
    const { data } = await apiClient.post(
      `${ENDPOINTS.MESSAGES.CONVERSATION(conversationId)}`,
      messageData
    );
    return data.data || data;
  }
}

export const inquiryService = new InquiryService();
