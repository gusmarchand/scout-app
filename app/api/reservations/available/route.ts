import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { connectDB } from '@/lib/mongodb'
import { Item } from '@/models/Item'
import { Reservation } from '@/models/Reservation'

// ─── GET /api/reservations/available?categoryId=&start=&end= ─────────────────

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const categoryId = searchParams.get('categoryId')
  const startParam = searchParams.get('start')
  const endParam = searchParams.get('end')

  // Validation des dates
  if (!startParam || !endParam) {
    return NextResponse.json(
      { error: 'Les paramètres start et end sont requis.' },
      { status: 400 }
    )
  }

  const start = new Date(startParam)
  const end = new Date(endParam)

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return NextResponse.json(
      { error: 'Les dates start et end doivent être valides.' },
      { status: 400 }
    )
  }

  if (start >= end) {
    return NextResponse.json(
      { error: 'La date de début doit être antérieure à la date de fin.' },
      { status: 400 }
    )
  }

  await connectDB()

  // Trouver tous les itemIds réservés sur la période (chevauchement)
  const conflictingReservations = await Reservation.find({
    startDate: { $lt: end },
    endDate: { $gt: start },
  })
    .select('itemId')
    .lean()

  const reservedItemIds = conflictingReservations.map((r) => r.itemId.toString())

  // Filtre de base : catégorie si fournie, items non réservés
  const baseFilter: Record<string, unknown> = {
    _id: { $nin: reservedItemIds },
  }
  if (categoryId) {
    baseFilter.categoryId = categoryId
  }

  // Items disponibles (ok ou moyen), triés priority ASC puis name ASC
  const availableItems = await Item.find({
    ...baseFilter,
    globalStatus: { $in: ['ok', 'moyen'] },
  })
    .sort({ priority: 1, name: 1 })
    .lean()

  // Items 'ko' non réservés, triés priority ASC puis name ASC
  const koItems = await Item.find({
    ...baseFilter,
    globalStatus: 'ko',
  })
    .sort({ priority: 1, name: 1 })
    .lean()

  // Les items 'ko' sont inclus en fin de liste avec warning: true
  const result = [
    ...availableItems,
    ...koItems.map((item) => ({ ...item, warning: true })),
  ]

  return NextResponse.json({ items: result })
}
