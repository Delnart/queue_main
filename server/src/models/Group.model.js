const { Schema, model, Types } = require('mongoose');

const GroupSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    monitor: {
      type: Types.ObjectId,
      ref: 'User',
      required: true,
    },
    members: [
      {
        type: Types.ObjectId,
        ref: 'User',
      },
    ],
    invitationCode: {
      type: String,
      required: true,
      unique: true,
    },
    status: {
      type: String,
      enum: ['pending', 'active'],
      default: 'pending',
    },
    pendingMembers: [
      {
        type: Types.ObjectId,
        ref: 'User',
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = model('Group', GroupSchema);