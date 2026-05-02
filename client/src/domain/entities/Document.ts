export type DocumentType = 'lease' | 'id' | 'contract' | 'receipt' | 'incident' | 'inventory_form' | 'other';

export interface DocumentEntity {
  id: string;
  propertyId: string;
  unitId?: string;
  tenancyId?: string;
  type: DocumentType;
  title: string;
  fileUrl: string;
  uploadedBy: string;
  uploadedByUser?: { name: string; email: string };
  createdAt: string | Date;
  updatedAt: string | Date;
}
