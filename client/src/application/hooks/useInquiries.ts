import { useState, useCallback } from 'react';
import { apiClient } from '../../infrastructure/api/apiClient';
import { ENDPOINTS } from '../../infrastructure/api/endpoints';
import type { Inquiry } from '../../domain/entities/Inquiry';
import type { Message } from '../../domain/entities/Message';

export function useInquiries(userId?: string) {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInquiries = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await apiClient.get(ENDPOINTS.INQUIRIES.ROOT);
      setInquiries(data.data || data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch inquiries');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const createInquiry = async (inquiryData: {
    propertyId: string;
    unitId?: string;
    subject: string;
    initialMessage: string;
  }) => {
    setLoading(true);
    try {
      const { data } = await apiClient.post(ENDPOINTS.INQUIRIES.ROOT, inquiryData);
      const newInquiry = data.data || data;
      setInquiries((prev: Inquiry[]) => [newInquiry, ...prev]);
      return newInquiry;
    } catch (err: any) {
      setError(err.message || 'Failed to create inquiry');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { inquiries, loading, error, fetchInquiries, createInquiry };
}

export function useInquiryDetail(inquiryId?: string) {
  const [inquiry, setInquiry] = useState<(Inquiry & { conversationId?: string; messages?: Message[] }) | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInquiry = useCallback(async () => {
    if (!inquiryId) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await apiClient.get(ENDPOINTS.INQUIRIES.DETAILS(inquiryId));
      const result = data.data || data;
      if (!result) throw new Error('Inquiry not found');

      let messages: Message[] = [];
      if (result.conversationId) {
        try {
          const msgRes = await apiClient.get(ENDPOINTS.MESSAGES.CONVERSATION(result.conversationId));
          messages = msgRes.data?.data || msgRes.data || [];
        } catch (msgErr) {
          console.error('Failed to fetch messages:', msgErr);
        }
      }

      setInquiry({
        ...result,
        messages
      });
    } catch (err: any) {
      setError(err.message || 'Failed to fetch inquiry');
    } finally {
      setLoading(false);
    }
  }, [inquiryId]);

  const sendMessage = async (_senderId: string, _senderName: string, content: string) => {
    if (!inquiry?.conversationId) return;
    try {
      const { data } = await apiClient.post(
        ENDPOINTS.MESSAGES.CONVERSATION(inquiry.conversationId),
        { content }
      );
      const newMsg = data.data || data;
      setInquiry((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          messages: [...(prev.messages || []), newMsg]
        };
      });
      return newMsg;
    } catch (err: any) {
      setError(err.message || 'Failed to send message');
      throw err;
    }
  };

  return { inquiry, loading, error, fetchInquiry, sendMessage };
}
