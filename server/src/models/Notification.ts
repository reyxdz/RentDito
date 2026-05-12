import mongoose, { Schema, Document } from 'mongoose';

export type NotificationType = 
  | 'inquiry' 
  | 'message' 
  | 'visit' 
  | 'application' 
  | 'contract' 
  | 'tenancy'
  | 'billing' 
  | 'maintenance' 
  | 'system';

export interface INotification extends Document {
  userId: mongoose.Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    type: {
      type: String,
      enum: ['inquiry', 'message', 'visit', 'application', 'contract', 'tenancy', 'billing', 'maintenance', 'system'],
      required: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    message: {
      type: String,
      required: true
    },
    link: {
      type: String
    },
    isRead: {
      type: Boolean,
      default: false
    },
    metadata: {
      type: Schema.Types.Mixed
    }
  },
  { timestamps: true }
);

// Indexes
NotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
NotificationSchema.index({ createdAt: -1 });

export const Notification = mongoose.model<INotification>('Notification', NotificationSchema);
