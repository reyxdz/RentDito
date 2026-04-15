import { useState, useCallback } from 'react';
import { MockInquiryService } from '../../infrastructure/services/MockInquiryService';
import type { Inquiry } from '../../infrastructure/services/MockInquiryService';

export function useInquiries(userId?: string) {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInquiries = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await MockInquiryService.getInquiriesByUser(userId);
      setInquiries(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch inquiries');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const createInquiry = async (data: {
    propertyId: string;
    propertyName: string;
    unitId: string;
    unitIdentifier: string;
    userId: string;
    userName: string;
    initialMessage: string;
  }) => {
    setLoading(true);
    try {
      const newInquiry = await MockInquiryService.createInquiry(data);
      setInquiries(prev => [newInquiry, ...prev]);
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
  const [inquiry, setInquiry] = useState<Inquiry | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInquiry = useCallback(async () => {
    if (!inquiryId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await MockInquiryService.getInquiryById(inquiryId);
      if (!data) throw new Error('Inquiry not found');
      setInquiry(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch inquiry');
    } finally {
      setLoading(false);
    }
  }, [inquiryId]);

  const sendMessage = async (senderId: string, senderName: string, content: string) => {
    if (!inquiryId) return;
    try {
      const newMessage = await MockInquiryService.addMessage(inquiryId, senderId, senderName, content);
      setInquiry(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          messages: [...prev.messages, newMessage],
          updatedAt: new Date().toISOString()
        };
      });
      return newMessage;
    } catch (err: any) {
      setError(err.message || 'Failed to send message');
      throw err;
    }
  };

  return { inquiry, loading, error, fetchInquiry, sendMessage };
}
