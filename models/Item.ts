import { Schema, model, models, Types, Document } from 'mongoose'
import type { Item as IItem, Status } from '@/types'
import { computePriority } from '@/lib/priority'

export type ItemDocument = Omit<IItem, '_id'> & Document

const PhotoSchema = new Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, required: true },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    uploadedAt: { type: Date, default: Date.now },
    caption: { type: String },
  },
  { _id: false }
)

const ComponentSchema = new Schema(
  {
    key: { type: String, required: true },
    label: { type: String, required: true },
    status: { type: String, enum: ['ok', 'moyen', 'ko'], required: true, default: 'ok' },
    quantity: { type: Number },
    quantityExpected: { type: Number },
    notes: { type: String, default: '' },
    photos: { type: [PhotoSchema], default: [] },
  },
  { _id: false }
)

const ItemSchema = new Schema<ItemDocument>(
  {
    categoryId: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    name: { type: String, required: true, trim: true },
    type: { type: String },
    globalStatus: { type: String, enum: ['ok', 'moyen', 'ko'], required: true, default: 'ok' },
    priority: { type: Number, required: true, default: 1 },
    components: { type: [ComponentSchema], default: [] },
    notes: { type: String, default: '' },
    updatedAt: { type: Date, default: Date.now },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: false }
)

// ─── Middleware : calcul automatique de priority ─────────────────────────────

ItemSchema.pre('save', function (next) {
  // Recalculer priority si globalStatus a changé
  if (this.isModified('globalStatus')) {
    this.priority = computePriority(this.globalStatus as Status)
  }
  next()
})

// ─── Indexes pour optimiser les requêtes ─────────────────────────────────────

// Index composé pour le tri et la recherche par catégorie
ItemSchema.index({ categoryId: 1, priority: 1 })

// Index pour la recherche par nom (case-insensitive)
ItemSchema.index({ name: 'text' })

// Index pour le tri par nom
ItemSchema.index({ name: 1 })

// Index pour le filtre par statut
ItemSchema.index({ globalStatus: 1 })

// Index composé pour filtres combinés (catégorie + statut + tri)
ItemSchema.index({ categoryId: 1, globalStatus: 1, priority: 1 })
ItemSchema.index({ categoryId: 1, globalStatus: 1, name: 1 })

export const Item = models.Item ?? model<ItemDocument>('Item', ItemSchema)
