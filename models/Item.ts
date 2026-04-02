import { Schema, model, models, Types, Document } from 'mongoose'
import type { Item as IItem } from '@/types'

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

// Index composé pour le tri et la recherche par catégorie
ItemSchema.index({ categoryId: 1, priority: 1 })

export const Item = models.Item ?? model<ItemDocument>('Item', ItemSchema)
