import mongoose, { Schema, Document as MongooseDocument } from 'mongoose';

export interface IDocument extends MongooseDocument {
  propertyId: mongoose.Types.ObjectId;
  unitId?: mongoose.Types.ObjectId;
  tenancyId?: mongoose.Types.ObjectId;
  type: 'lease' | 'id' | 'contract' | 'receipt' | 'incident' | 'inventory_form' | 'other';
  title: string;
  fileUrl: string;
  uploadedBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const DocumentSchema = new Schema<IDocument>(
  {
    propertyId: { type: Schema.Types.ObjectId, ref: 'Property', required: true },
    unitId: { type: Schema.Types.ObjectId, ref: 'Unit' },
    tenancyId: { type: Schema.Types.ObjectId, ref: 'Tenancy' },
    type: { 
      type: String, 
      enum: ['lease', 'id', 'contract', 'receipt', 'incident', 'inventory_form', 'other'], 
      required: true 
    },
    title: { type: String, required: true },
    fileUrl: { type: String, required: true },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
  },
  { timestamps: true }
);

export const Document = mongoose.model<IDocument>('Document', DocumentSchema);
