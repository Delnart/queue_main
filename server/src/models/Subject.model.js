const { Schema, model, Types } = require('mongoose');

const SubjectSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    group: {
      type: Types.ObjectId,
      ref: 'Group',
      required: true,
    },
    settings: {
      isQueueEnabled: {
        type: Boolean,
        default: false,
      },
      maxLabStep: {
        type: Number,
        default: 0,
      },
      allowMultipleTopics: {
        type: Boolean,
        default: false,
      },
      queueList: [
        {
          user: {
            type: Types.ObjectId,
            ref: 'User',
          },
          labInfo: {
            type: String,
            trim: true,
          },
          timestamp: {
            type: Date,
            default: Date.now,
          },
        },
      ],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = model('Subject', SubjectSchema);