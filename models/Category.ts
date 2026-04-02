import { Schema, model, models, Document } from 'mongoose'
import type { Category as ICategory } from '@/types'

export type CategoryDocument = Omit<ICategory, '_id'> & Document

const ComponentDefSchema = new Schema(
  {
    key: { type: String, required: true },
    label: { type: String, required: true },
    hasEyelets: { type: Boolean, default: false },
    isQuantified: { type: Boolean, default: false },
  },
  { _id: false }
)

const CategorySchema = new Schema<CategoryDocument>(
  {
    name: { type: String, required: true, trim: true },
    componentTemplate: { type: [ComponentDefSchema], required: true, default: [] },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
)

export const Category = models.Category ?? model<CategoryDocument>('Category', CategorySchema)
