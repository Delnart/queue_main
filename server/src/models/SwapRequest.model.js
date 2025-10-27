const { Schema, model, Types } = require('mongoose');

const SwapRequestSchema = new Schema(
  {
    subject: {
      type: Types.ObjectId,
      ref: 'Subject',
      required: true,
    },
    requester: {
      type: Types.ObjectId,
      ref: 'User',
      required: true,
    },
    requested: {
      type: Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'expired'],
      default: 'pending',
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: '15m', // Запит автоматично "протухне" через 15 хвилин
    },
  },
  {
    timestamps: true,
  }
);

module.exports = model('SwapRequest', SwapRequestSchema);