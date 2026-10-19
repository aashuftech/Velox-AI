import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },
    sender: {
      type: String,
      enum: ['user', 'assistant', 'system'],
      required: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
    },
    metadata: {
      tokens: {
        type: Number,
        default: 0,
      },
      status: {
        type: String,
        enum: ['sent', 'delivered', 'error'],
        default: 'delivered',
      },
    },
  },
  {
    timestamps: true,
  }
);

export const Message = mongoose.model('Message', messageSchema);
