import { Schema, model, models, Types, Document } from 'mongoose'
import type { Reservation as IReservation } from '@/types'

export type ReservationDocument = Omit<IReservation, '_id'> & Document

const ReservationSchema = new Schema<ReservationDocument>(
  {
    itemId: { type: Types.ObjectId, ref: 'Item', required: true },
    itemName: { type: String, required: true },
    reservedBy: { type: Types.ObjectId, ref: 'User', required: true },
    unit: {
      type: String,
      enum: ['farfadets', 'louveteaux-jeannettes', 'scouts-guides', 'pionniers-caravelles', 'compagnons'],
    },
    eventName: { type: String, required: true, trim: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
)

// Index composé pour les requêtes de disponibilité
ReservationSchema.index({ itemId: 1, startDate: 1, endDate: 1 })

export const Reservation =
  models.Reservation ?? model<ReservationDocument>('Reservation', ReservationSchema)
