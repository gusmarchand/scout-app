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
    isEquipmentManager: { type: Boolean, default: false },  // Responsable matériel
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
)

// ─── Indexes pour optimiser les requêtes ─────────────────────────────────────

// Index unique sur email (déjà défini dans le schema mais explicité)
UserSchema.index({ email: 1 }, { unique: true })

// Index pour rechercher par role
UserSchema.index({ role: 1 })

export const User = models.User ?? model<UserDocument>('User', UserSchema)
