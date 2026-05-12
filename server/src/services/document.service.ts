import { Document, IDocument } from '../models/Document';
import mongoose from 'mongoose';

export const getDocuments = async (filters: any): Promise<IDocument[]> => {
  const query: any = {};
  if (filters.propertyId) query.propertyId = filters.propertyId;
  if (filters.unitId) query.unitId = filters.unitId;
  if (filters.tenancyId) query.tenancyId = filters.tenancyId;
  if (filters.type) query.type = filters.type;
  if (filters.uploadedBy) query.uploadedBy = filters.uploadedBy;

  return Document.find(query)
    .populate('uploadedBy', 'name email')
    .sort({ createdAt: -1 });
};

export const getDocumentById = async (id: string): Promise<IDocument | null> => {
  return Document.findById(id).populate('uploadedBy', 'name email');
};

export const createDocument = async (data: Partial<IDocument>): Promise<IDocument> => {
  const doc = new Document(data);
  return doc.save();
};

export const deleteDocument = async (id: string): Promise<IDocument | null> => {
  return Document.findByIdAndDelete(id);
};
