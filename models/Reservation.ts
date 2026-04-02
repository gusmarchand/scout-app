import { Schema, model, models, Types, Document } from 'mongoose'
import type { Reservation as IReservation } from '@/types'

export type ReservationDocument = Omit<IReservation, '_id'> & Document

const ReservationSchema = new Schema<ReservationDocument>(
  {
    itemId: { type: Schema.Types.ObjectId, ref: 'Item', required: true },
    itemName: { type: String, required: true },
    reservedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    unit: {
      type: String,
      enum: ['farfadets', 'louveteaux-jeannettes', 'scouts-guides', 'pionniers-caravelles', 'compagnons'],
    },
    eventName: { type: String, required: true, trim: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    createdAt: { type: Date, default: Date.now },
    // Champs facultatifs
    location: { type: String, trim: true },
    numberOfGirls: { type: Number, min: 0 },
    numberOfBoys: { type: Number, min: 0 },
    leaders: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    manualLeaders: [{ type: String, trim: true }], // Chefs ajoutés manuellement (non inscrits)
  },
  { timestamps: false }
)

// ─── Indexes pour optimiser les requêtes ─────────────────────────────────────

// Index composé pour les requêtes de disponibilité
ReservationSchema.index({ itemId: 1, startDate: 1, endDate: 1 })

// Index pour rechercher les réservations d'un utilisateur
ReservationSchema.index({ reservedBy: 1, startDate: -1 })

// Index pour rechercher par dates (upcoming reservations)
ReservationSchema.index({ startDate: 1 })
ReservationSchema.index({ endDate: 1 })

export const Reservation =
  models.Reservation ?? model<ReservationDocument>('Reservation', ReservationSchema)
