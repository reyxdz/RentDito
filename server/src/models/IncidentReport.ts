import mongoose, { Schema, Document } from 'mongoose';

export interface IIncidentReport extends Document {
  propertyId: mongoose.Types.ObjectId;
  reportedBy: mongoose.Types.ObjectId;
  dateOfIncident: Date;
  type: 'theft' | 'damage' | 'medical' | 'fire' | 'dispute' | 'other';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  status: 'open' | 'investigating' | 'resolved' | 'closed';
  resolutionNotes?: string;
  attachments: string[];
  createdAt: Date;
  updatedAt: Date;
}

const IncidentReportSchema = new Schema<IIncidentReport>(
  {
    propertyId: { type: Schema.Types.ObjectId, ref: 'Property', required: true },
    reportedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    dateOfIncident: { type: Date, required: true },
    type: { 
      type: String, 
      enum: ['theft', 'damage', 'medical', 'fire', 'dispute', 'other'], 
      required: true 
    },
    severity: { 
      type: String, 
      enum: ['low', 'medium', 'high', 'critical'], 
      required: true 
    },
    description: { type: String, required: true },
    status: { 
      type: String, 
      enum: ['open', 'investigating', 'resolved', 'closed'], 
      default: 'open' 
    },
    resolutionNotes: { type: String },
    attachments: [{ type: String }]
  },
  { timestamps: true }
);

export const IncidentReport = mongoose.model<IIncidentReport>('IncidentReport', IncidentReportSchema);
