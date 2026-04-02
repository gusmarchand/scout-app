import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { hasPermission } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Reservation } from '@/models/Reservation'
import type { User, Role } from '@/types'

// ─── DELETE /api/reservations/:id ────────────────────────────────────────────

export async function DELETE(
  _req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  }

  await connectDB()

  const reservation = await Reservation.findById(params.id).lean()

  if (!reservation) {
    return NextResponse.json({ error: 'Réservation introuvable.' }, { status: 404 })
  }

  const reservationDoc = reservation as unknown as { reservedBy: { toString(): string } }
  const currentUser = session.user as { id: string; role: Role }

  // Admin/Equipier : annulation libre via permission cancel_any_reservation
  // Chef : peut uniquement annuler ses propres réservations
  if (!hasPermission(currentUser, 'cancel_any_reservation')) {
    if (reservationDoc.reservedBy.toString() !== currentUser.id) {
      return NextResponse.json(
        { error: 'Vous ne pouvez annuler que vos propres réservations.' },
        { status: 403 }
      )
    }
  }

  await Reservation.findByIdAndDelete(params.id)

  return new NextResponse(null, { status: 204 })
}
