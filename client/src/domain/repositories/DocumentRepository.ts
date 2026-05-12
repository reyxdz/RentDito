import type { DocumentEntity } from '../entities/Document';

export interface DocumentQueryFilters {
  propertyId?: string;
  unitId?: string;
  tenancyId?: string;
  type?: string;
  uploadedBy?: string;
}

export interface DocumentRepository {
  getDocuments(filters?: DocumentQueryFilters): Promise<DocumentEntity[]>;
  getDocumentById(id: string): Promise<DocumentEntity | null>;
  createDocument(data: Partial<DocumentEntity>, file: File): Promise<DocumentEntity>;
  deleteDocument(id: string): Promise<void>;
}
