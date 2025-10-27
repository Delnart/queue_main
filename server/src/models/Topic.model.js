const { Schema, model, Types } = require('mongoose');

const TopicSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    subject: {
      type: Types.ObjectId,
      ref: 'Subject',
      required: true,
    },
    maxSlots: {
      type: Number,
      default: 1,
      required: true,
    },
    assignedUsers: [
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

module.exports = model('Topic', TopicSchema);