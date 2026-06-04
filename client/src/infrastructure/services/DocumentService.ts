import { apiClient } from '../api/apiClient';
import { ENDPOINTS } from '../api/endpoints';
import type { DocumentEntity } from '../../domain/entities/Document';
import type { DocumentRepository, DocumentQueryFilters } from '../../domain/repositories/DocumentRepository';

export class DocumentService implements DocumentRepository {
  async getDocuments(filters?: DocumentQueryFilters): Promise<DocumentEntity[]> {
    const { data } = await apiClient.get<{ status: string; data: DocumentEntity[] }>(
      ENDPOINTS.DOCUMENTS.ROOT,
      { params: filters }
    );
    return data.data;
  }

  async getDocumentById(id: string): Promise<DocumentEntity | null> {
    try {
      const response = await apiClient.get<{ status: string; data: DocumentEntity }>(
        ENDPOINTS.DOCUMENTS.DETAILS(id)
      );
      return response.data.data;
    } catch (error: any) {
      if (error.response?.status === 404) return null;
      throw error;
    }
  }

  async createDocument(data: Partial<DocumentEntity>, file: File): Promise<DocumentEntity> {
    const formData = new FormData();
    formData.append('file', file);

    // Append all document metadata fields
    if (data.propertyId) formData.append('propertyId', data.propertyId);
    if (data.unitId) formData.append('unitId', data.unitId);
    if (data.tenancyId) formData.append('tenancyId', data.tenancyId);
    if (data.type) formData.append('type', data.type);
    if (data.title) formData.append('title', data.title);

    const response = await apiClient.post<{ status: string; data: DocumentEntity }>(
      ENDPOINTS.DOCUMENTS.ROOT,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return response.data.data;
  }

  async deleteDocument(id: string): Promise<void> {
    await apiClient.delete(ENDPOINTS.DOCUMENTS.DETAILS(id));
  }
}

export const documentService = new DocumentService();
