import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/authOptions'
import { hasPermission } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Reservation } from '@/models/Reservation'
import type { User, Role } from '@/types'

// ─── Schéma Zod pour PATCH ────────────────────────────────────────────────────

const updateReservationSchema = z.object({
  eventName: z.string().min(1).optional(),
  location: z.string().optional(),
  numberOfGirls: z.number().int().min(0).optional(),
  numberOfBoys: z.number().int().min(0).optional(),
  leaders: z.array(z.string().regex(/^[0-9a-fA-F]{24}$/)).optional(),
  manualLeaders: z.array(z.string()).optional(),
})

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

// ─── GET /api/reservations/:id ───────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  }

  await connectDB()

  const reservation = await Reservation.findById(params.id)
    .populate('leaders', 'name')
    .lean()

  if (!reservation) {
    return NextResponse.json({ error: 'Réservation introuvable.' }, { status: 404 })
  }

  return NextResponse.json(reservation)
}

// ─── PATCH /api/reservations/:id ─────────────────────────────────────────────

export async function PATCH(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  }

  const body = await req.json()
  const parsed = updateReservationSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Données invalides.', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  await connectDB()

  const reservation = await Reservation.findById(params.id).lean()

  if (!reservation) {
    return NextResponse.json({ error: 'Réservation introuvable.' }, { status: 404 })
  }

  const reservationDoc = reservation as unknown as { reservedBy: { toString(): string } }
  const currentUser = session.user as { id: string; role: Role }

  // Vérifier les permissions : seul le créateur ou un admin/équipier peut modifier
  if (!hasPermission(currentUser, 'cancel_any_reservation')) {
    if (reservationDoc.reservedBy.toString() !== currentUser.id) {
      return NextResponse.json(
        { error: 'Vous ne pouvez modifier que vos propres réservations.' },
        { status: 403 }
      )
    }
  }

  const updated = await Reservation.findByIdAndUpdate(
    params.id,
    { $set: parsed.data },
    { new: true }
  )

  return NextResponse.json(updated)
}
