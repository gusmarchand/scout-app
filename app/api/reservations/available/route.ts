import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/authOptions'
import { connectDB } from '@/lib/mongodb'
import { Item } from '@/models/Item'
import { Reservation } from '@/models/Reservation'

// ─── Schéma Zod ──────────────────────────────────────────────────────────────

const availableItemsSchema = z.object({
  categoryId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
  start: z.string().datetime(),
  end: z.string().datetime(),
}).refine((data) => new Date(data.start) < new Date(data.end), {
  message: 'La date de début doit être antérieure à la date de fin.',
  path: ['start'],
})

// ─── GET /api/reservations/available?categoryId=&start=&end= ─────────────────

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const params = {
    categoryId: searchParams.get('categoryId') || undefined,
    start: searchParams.get('start') || undefined,
    end: searchParams.get('end') || undefined,
  }

  const parsed = availableItemsSchema.safeParse(params)

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Paramètres invalides.', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const start = new Date(parsed.data.start)
  const end = new Date(parsed.data.end)

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
  if (parsed.data.categoryId) {
    baseFilter.categoryId = parsed.data.categoryId
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
