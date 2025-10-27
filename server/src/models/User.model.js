// server/src/models/User.model.js

const { Schema, model, Types } = require('mongoose'); // Додай 'Types'

const UserSchema = new Schema(
  {
    telegramId: {
      type: Number,
      required: true,
      unique: true,
    },
    firstName: {
      type: String,
      required: true,
    },
    lastName: {
      type: String,
    },
    username: {
      type: String,
    },
    photoUrl: {
      type: String,
    },
    surname: {
      type: String,
      trim: true,
      default: '',
    },
    patronymic: {
      type: String,
      trim: true,
      default: '',
    },
    role: {
      type: String,
      enum: ['student', 'monitor', 'teacher', 'super_admin'],
      default: 'student',
    },
    groups: [
      {
        type: Types.ObjectId,
        ref: 'Group',
      },
    ],
    // -------------------
  },
  {
    timestamps: true,
  }
);

module.exports = model('User', UserSchema);