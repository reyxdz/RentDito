import mongoose, { Schema, Document } from 'mongoose';

export type TicketStatus = 'open' | 'assigned' | 'in_progress' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TicketCategory = 'plumbing' | 'electrical' | 'structural' | 'appliance' | 'pest' | 'other';

export interface ITicketUpdate {
  userId: mongoose.Types.ObjectId;
  message: string;
  timestamp: Date;
}

export interface ITicket extends Document {
  tenancyId: mongoose.Types.ObjectId;
  propertyId: mongoose.Types.ObjectId;
  unitId: mongoose.Types.ObjectId;
  reportedByUserId: mongoose.Types.ObjectId;
  title: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  images: string[];
  status: TicketStatus;
  assignedToUserId?: mongoose.Types.ObjectId;
  assignedByUserId?: mongoose.Types.ObjectId;
  updates: ITicketUpdate[];
  resolutionNotes?: string;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const TicketUpdateSchema = new Schema<ITicketUpdate>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    message: {
      type: String,
      required: true,
      trim: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  },
  { _id: false }
);

const TicketSchema = new Schema<ITicket>(
  {
    tenancyId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenancy',
      required: true
    },
    propertyId: {
      type: Schema.Types.ObjectId,
      ref: 'Property',
      required: true
    },
    unitId: {
      type: Schema.Types.ObjectId,
      ref: 'Unit',
      required: true
    },
    reportedByUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      required: true,
      trim: true
    },
    category: {
      type: String,
      enum: ['plumbing', 'electrical', 'structural', 'appliance', 'pest', 'other'],
      required: true
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium'
    },
    images: [{ type: String }],
    status: {
      type: String,
      enum: ['open', 'assigned', 'in_progress', 'resolved', 'closed'],
      default: 'open'
    },
    assignedToUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    assignedByUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    updates: [TicketUpdateSchema],
    resolutionNotes: {
      type: String,
      trim: true
    },
    resolvedAt: {
      type: Date
    }
  },
  { timestamps: true }
);

TicketSchema.index({ reportedByUserId: 1, status: 1 });
TicketSchema.index({ propertyId: 1, status: 1 });
TicketSchema.index({ tenancyId: 1, status: 1 });
TicketSchema.index({ assignedToUserId: 1, status: 1 });
TicketSchema.index({ priority: 1, createdAt: -1 });
TicketSchema.index({ category: 1, createdAt: -1 });
TicketSchema.index({ createdAt: -1 });

export const Ticket = mongoose.model<ITicket>('Ticket', TicketSchema);
