import { connectDB } from '@/lib/mongodb'
import { Reservation } from '@/models/Reservation'
import type { Reservation as IReservation } from '@/types'
import type { FlattenMaps } from 'mongoose'

export type LeanReservation = FlattenMaps<IReservation> & { _id: unknown }

/**
 * Détecte un chevauchement de réservation pour un item donné.
 * Condition de chevauchement : startDate < end && endDate > start
 *
 * @returns La réservation en conflit, ou null si aucun conflit.
 */
export async function hasConflict(
  itemId: string,
  start: Date,
  end: Date
): Promise<LeanReservation | null> {
  await connectDB()

  const conflict = await Reservation.findOne({
    itemId,
    startDate: { $lt: end },
    endDate: { $gt: start },
  }).lean() as LeanReservation | null

  return conflict
}
