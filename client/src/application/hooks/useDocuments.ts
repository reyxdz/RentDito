import { useState, useCallback } from 'react';
import { documentService } from '../../infrastructure/services/DocumentService';
import type { DocumentEntity } from '../../domain/entities/Document';
import type { DocumentQueryFilters } from '../../domain/repositories/DocumentRepository';

export function useDocuments() {
  const [documents, setDocuments] = useState<DocumentEntity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDocuments = useCallback(async (filters?: DocumentQueryFilters) => {
    setLoading(true);
    setError(null);
    try {
      const data = await documentService.getDocuments(filters);
      setDocuments(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch documents');
    } finally {
      setLoading(false);
    }
  }, []);

  const createDocument = async (data: Partial<DocumentEntity>, file: File) => {
    setLoading(true);
    setError(null);
    try {
      const newDoc = await documentService.createDocument(data, file);
      setDocuments(prev => [newDoc, ...prev]);
      return newDoc;
    } catch (err: any) {
      setError(err.message || 'Failed to upload document');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteDocument = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      await documentService.deleteDocument(id);
      setDocuments(prev => prev.filter(doc => doc.id !== id));
    } catch (err: any) {
      setError(err.message || 'Failed to delete document');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { documents, loading, error, fetchDocuments, createDocument, deleteDocument };
}
