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
  itemId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId'),
  itemName: z.string().min(1),
  eventName: z.string().min(1),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  unit: z.string().optional(),
  location: z.string().optional(),
  numberOfGirls: z.number().int().min(0).optional(),
  numberOfBoys: z.number().int().min(0).optional(),
  leaders: z.array(z.string().regex(/^[0-9a-fA-F]{24}$/)).optional(),
  manualLeaders: z.array(z.string()).optional(),
})

const getReservationsSchema = z.object({
  itemId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
  userId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
  start: z.string().datetime().optional(),
  end: z.string().datetime().optional(),
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

  const {
    itemId,
    itemName,
    eventName,
    startDate: startStr,
    endDate: endStr,
    unit: bodyUnit,
    location,
    numberOfGirls,
    numberOfBoys,
    leaders,
    manualLeaders
  } = parsed.data
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
  const unit = bodyUnit ?? (session.user.role === 'chef' ? session.user.unit : undefined)

  const reservation = await Reservation.create({
    itemId,
    itemName,
    reservedBy,
    unit: unit ?? undefined,
    eventName,
    startDate,
    endDate,
    createdAt: new Date(),
    location,
    numberOfGirls,
    numberOfBoys,
    leaders,
    manualLeaders,
  })

  // Envoyer les emails de notification (de manière asynchrone, sans bloquer la réponse)
  setImmediate(async () => {
    try {
      const { sendEmail, getEquipmentTeam } = await import('@/lib/email')
      const { reservationCreatedTemplate, reservationNotificationToEquipmentTeam, reservationModifiedTemplate } = await import('@/lib/email-templates')
      const { User } = await import('@/models/User')

      // Récupérer l'utilisateur créateur
      const creatorDoc = await User.findById(reservedBy).select('email name').lean()
      const creator = creatorDoc ? JSON.parse(JSON.stringify(creatorDoc)) : null

      if (creator) {
        // Vérifier si c'est la première réservation pour cet événement
        const existingReservations = await Reservation.find({
          eventName,
          startDate,
          endDate,
          reservedBy,
        }).lean()

        if (existingReservations.length === 1) {
          // 1. Email de confirmation au chef créateur (première réservation)
          const allEventReservations = await Reservation.find({
            eventName,
            startDate,
            endDate,
            reservedBy,
          }).select('itemName').lean()

          await sendEmail({
            to: creator.email,
            subject: `Réservation confirmée - ${eventName}`,
            html: reservationCreatedTemplate({
              chefName: creator.name,
              eventName,
              startDate,
              endDate,
              location,
              items: allEventReservations.map(r => r.itemName),
              numberOfGirls,
              numberOfBoys,
            })
          })

          // 2. Email aux équipiers (première réservation)
          const equipmentTeam = await getEquipmentTeam()
          if (equipmentTeam.length > 0) {
            await sendEmail({
              to: equipmentTeam.map((u: any) => u.email),
              subject: `Nouvelle réservation - ${eventName}`,
              html: reservationNotificationToEquipmentTeam({
                chefName: creator.name,
                eventName,
                startDate,
                endDate,
                items: allEventReservations.map(r => r.itemName),
              })
            })
          }
        } else {
          // Ajout d'un item à une réservation existante
          await sendEmail({
            to: creator.email,
            subject: `Modification de votre réservation - ${eventName}`,
            html: reservationModifiedTemplate({
              chefName: creator.name,
              eventName,
              changes: [`Ajout du matériel : ${itemName}`],
              modifiedBy: creator.name,
            })
          })
        }
      }
    } catch (error) {
      console.error('[EMAIL] Erreur lors de l\'envoi des notifications:', error)
    }
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
  const params = {
    itemId: searchParams.get('itemId') || undefined,
    userId: searchParams.get('userId') || undefined,
    start: searchParams.get('start') || undefined,
    end: searchParams.get('end') || undefined,
  }

  const parsed = getReservationsSchema.safeParse(params)

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Paramètres invalides.', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const filter: Record<string, unknown> = {}

  if (parsed.data.itemId) filter.itemId = parsed.data.itemId
  if (parsed.data.userId) filter.reservedBy = parsed.data.userId

  if (parsed.data.start || parsed.data.end) {
    const dateFilter: Record<string, Date> = {}
    if (parsed.data.start) dateFilter.$gte = new Date(parsed.data.start)
    if (parsed.data.end) dateFilter.$lte = new Date(parsed.data.end)
    filter.startDate = dateFilter
  }

  await connectDB()

  const reservations = await Reservation.find(filter)
    .sort({ startDate: 1 })
    .lean()

  return NextResponse.json({ reservations })
}
