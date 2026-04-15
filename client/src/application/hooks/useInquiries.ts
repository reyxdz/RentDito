import { useState, useCallback } from 'react';
import type { Inquiry, InquiryStatus } from '../../domain/entities/Inquiry';
import type { Message } from '../../domain/entities/Message';
import { inquiryService } from '../../infrastructure/services/InquiryService';

export function useInquiries() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPropertyInquiries = useCallback(async (propertyId: string, filters?: { status?: string }) => {
    setLoading(true);
    setError(null);
    try {
      const data = await inquiryService.getPropertyInquiries(propertyId, filters);
      setInquiries(data);
      return data;
    } catch (err: any) {
      setError(err.message || 'Failed to fetch inquiries');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const updateInquiryStatus = useCallback(async (inquiryId: string, status: InquiryStatus) => {
    try {
      const updated = await inquiryService.updateInquiryStatus(inquiryId, status);
      setInquiries(prev => prev.map(i => i.id === inquiryId ? { ...i, status } : i));
      return updated;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to update inquiry status');
    }
  }, []);

  return {
    inquiries,
    loading,
    error,
    fetchPropertyInquiries,
    updateInquiryStatus,
  };
}

export function useInquiryDetail(inquiryId?: string) {
  const [inquiry, setInquiry] = useState<(Inquiry & { conversationId?: string }) | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInquiry = useCallback(async () => {
    if (!inquiryId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await inquiryService.getInquiryById(inquiryId);
      setInquiry(data);
      return data;
    } catch (err: any) {
      setError(err.message || 'Failed to fetch inquiry');
      return null;
    } finally {
      setLoading(false);
    }
  }, [inquiryId]);

  const fetchMessages = useCallback(async (conversationId: string) => {
    setMessagesLoading(true);
    try {
      const result = await inquiryService.getConversationMessages(conversationId);
      setMessages(result.messages);
      return result.messages;
    } catch (err: any) {
      console.error('Failed to fetch messages:', err);
      return [];
    } finally {
      setMessagesLoading(false);
    }
  }, []);

  const sendMessage = useCallback(async (conversationId: string, content: string, attachments?: string[]) => {
    try {
      const newMessage = await inquiryService.sendMessage(conversationId, { content, attachments });
      setMessages(prev => [...prev, newMessage]);
      return newMessage;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to send message');
    }
  }, []);

  const updateStatus = useCallback(async (status: InquiryStatus) => {
    if (!inquiryId) return;
    try {
      const updated = await inquiryService.updateInquiryStatus(inquiryId, status);
      setInquiry(prev => prev ? { ...prev, status } : prev);
      return updated;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to update status');
    }
  }, [inquiryId]);

  return {
    inquiry,
    messages,
    loading,
    messagesLoading,
    error,
    fetchInquiry,
    fetchMessages,
    sendMessage,
    updateStatus,
  };
}
