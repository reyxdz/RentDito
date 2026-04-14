import mongoose, { Schema, Document } from 'mongoose';

export interface IConversation extends Document {
  inquiryId: mongoose.Types.ObjectId;
  participants: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const ConversationSchema = new Schema<IConversation>(
  {
    inquiryId: {
      type: Schema.Types.ObjectId,
      ref: 'Inquiry',
      required: true,
      unique: true
    },
    participants: [{
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }]
  },
  { timestamps: true }
);

// Indexes
ConversationSchema.index({ inquiryId: 1 });
ConversationSchema.index({ participants: 1 });

export const Conversation = mongoose.model<IConversation>('Conversation', ConversationSchema);
