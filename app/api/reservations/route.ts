import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/authOptions'
import { hasPermission } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Reservation } from '@/models/Reservation'
import { hasConflict } from '@/lib/reservations'
import type { User } from '@/types'

// ─── Schéma Zod ──────────────────────────────────────────────────────────────

const createReservationSchema = z.object({
  itemId: z.string().min(1),
  itemName: z.string().min(1),
  eventName: z.string().min(1),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
})

// ─── POST /api/reservations ───────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  }

  if (!hasPermission(session.user, 'create_reservation')) {
    return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = createReservationSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Données invalides.', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { itemId, itemName, eventName, startDate: startStr, endDate: endStr } = parsed.data
  const startDate = new Date(startStr)
  const endDate = new Date(endStr)

  if (startDate >= endDate) {
    return NextResponse.json(
      { error: 'La date de début doit être antérieure à la date de fin.' },
      { status: 400 }
    )
  }

  // Détection de conflit
  const conflict = await hasConflict(itemId, startDate, endDate)

  if (conflict) {
    return NextResponse.json(
      {
        error: 'Cet item est déjà réservé sur cette période.',
        conflict: {
          startDate: conflict.startDate,
          endDate: conflict.endDate,
        },
      },
      { status: 409 }
    )
  }

  await connectDB()

  const reservedBy = session.user.id
  const unit = session.user.role === 'chef' ? session.user.unit : undefined

  const reservation = await Reservation.create({
    itemId,
    itemName,
    reservedBy,
    unit: unit ?? undefined,
    eventName,
    startDate,
    endDate,
    createdAt: new Date(),
  })

  return NextResponse.json(reservation.toObject(), { status: 201 })
}

// ─── GET /api/reservations?itemId=&userId=&start=&end= ────────────────────────

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const itemId = searchParams.get('itemId')
  const userId = searchParams.get('userId')
  const startParam = searchParams.get('start')
  const endParam = searchParams.get('end')

  const filter: Record<string, unknown> = {}

  if (itemId) filter.itemId = itemId
  if (userId) filter.reservedBy = userId

  if (startParam || endParam) {
    const dateFilter: Record<string, Date> = {}
    if (startParam) {
      const start = new Date(startParam)
      if (!isNaN(start.getTime())) dateFilter.$gte = start
    }
    if (endParam) {
      const end = new Date(endParam)
      if (!isNaN(end.getTime())) dateFilter.$lte = end
    }
    if (Object.keys(dateFilter).length > 0) {
      filter.startDate = dateFilter
    }
  }

  await connectDB()

  const reservations = await Reservation.find(filter)
    .sort({ startDate: 1 })
    .lean()

  return NextResponse.json({ reservations })
}
