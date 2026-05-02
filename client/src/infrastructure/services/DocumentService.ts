import { apiClient } from '../api/apiClient';
import { ENDPOINTS } from '../api/endpoints';
import type { DocumentEntity } from '../../domain/entities/Document';
import type { DocumentRepository, DocumentQueryFilters } from '../../domain/repositories/DocumentRepository';

export class DocumentService implements DocumentRepository {
  async getDocuments(filters?: DocumentQueryFilters): Promise<DocumentEntity[]> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
    }
    const response = await apiClient.get<{ status: string; data: DocumentEntity[] }>(
      `${ENDPOINTS.DOCUMENTS.ROOT}?${params.toString()}`
    );
    return response.data.data;
  }

  async getDocumentById(id: string): Promise<DocumentEntity | null> {
    const response = await apiClient.get<{ status: string; data: DocumentEntity }>(
      ENDPOINTS.DOCUMENTS.DETAILS(id)
    );
    return response.data.data;
  }

  async createDocument(data: Partial<DocumentEntity>, file: File): Promise<DocumentEntity> {
    // We would normally use FormData for file upload. For now, since the backend model 
    // expects a fileUrl, we'll simulate an upload or just send it as json.
    // In a real scenario, this would post to a Cloudinary route, get the URL, then save the document.
    // Since we don't have the Cloudinary route setup here, we'll just mock the fileUrl temporarily.
    
    const payload = {
      ...data,
      fileUrl: URL.createObjectURL(file) // Mock URL for frontend display until backend saves it
    };
    
    // In reality:
    // const formData = new FormData();
    // formData.append('file', file);
    // Object.entries(data).forEach(([key, value]) => formData.append(key, value as string));
    // const response = await apiClient.post(ENDPOINTS.DOCUMENTS.ROOT, formData, { headers: { 'Content-Type': 'multipart/form-data' }});
    
    const response = await apiClient.post<{ status: string; data: DocumentEntity }>(
      ENDPOINTS.DOCUMENTS.ROOT,
      payload
    );
    return response.data.data;
  }

  async deleteDocument(id: string): Promise<void> {
    await apiClient.delete(ENDPOINTS.DOCUMENTS.DETAILS(id));
  }
}

export const documentService = new DocumentService();
