import { Schema, model, models, Document } from 'mongoose'
import type { User as IUser } from '@/types'

export type UserDocument = Omit<IUser, '_id'> & Document

const UserSchema = new Schema<UserDocument>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['admin', 'equipier', 'chef'], required: true },
    unit: {
      type: String,
      enum: ['farfadets', 'louveteaux-jeannettes', 'scouts-guides', 'pionniers-caravelles', 'compagnons'],
      required: false,
    },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
)

export const User = models.User ?? model<UserDocument>('User', UserSchema)
