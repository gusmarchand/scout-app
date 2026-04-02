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

  // Envoyer email de modification (asynchrone) avant de supprimer
  setImmediate(async () => {
    try {
      const { sendEmail } = await import('@/lib/email')
      const { reservationModifiedTemplate } = await import('@/lib/email-templates')
      const { User } = await import('@/models/User')

      const creatorDoc = await User.findById(reservationDoc.reservedBy).select('email name').lean()
      const modifierDoc = await User.findById(currentUser.id).select('name').lean()

      const creator = creatorDoc ? JSON.parse(JSON.stringify(creatorDoc)) : null
      const modifier = modifierDoc ? JSON.parse(JSON.stringify(modifierDoc)) : null

      if (creator && modifier) {
        await sendEmail({
          to: creator.email,
          subject: `Modification de votre réservation - ${(reservation as any).eventName}`,
          html: reservationModifiedTemplate({
            chefName: creator.name,
            eventName: (reservation as any).eventName,
            changes: [`Retrait du matériel : ${(reservation as any).itemName}`],
            modifiedBy: modifier.name,
          })
        })
      }
    } catch (error) {
      console.error('[EMAIL] Erreur lors de l\'envoi de la notification de suppression:', error)
    }
  })

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

  // Envoyer email de modification (asynchrone)
  setImmediate(async () => {
    try {
      const { sendEmail } = await import('@/lib/email')
      const { reservationModifiedTemplate } = await import('@/lib/email-templates')
      const { User } = await import('@/models/User')

      // Identifier les changements
      const changes: string[] = []

      if (parsed.data.eventName && parsed.data.eventName !== (reservation as any).eventName) {
        changes.push(`Nom de l'événement : "${(reservation as any).eventName}" → "${parsed.data.eventName}"`)
      }

      if (parsed.data.location !== undefined && parsed.data.location !== (reservation as any).location) {
        const oldLoc = (reservation as any).location || 'non renseigné'
        const newLoc = parsed.data.location || 'non renseigné'
        changes.push(`Lieu : "${oldLoc}" → "${newLoc}"`)
      }

      if (parsed.data.numberOfGirls !== undefined && parsed.data.numberOfGirls !== (reservation as any).numberOfGirls) {
        changes.push(`Nombre de filles : ${(reservation as any).numberOfGirls || 0} → ${parsed.data.numberOfGirls}`)
      }

      if (parsed.data.numberOfBoys !== undefined && parsed.data.numberOfBoys !== (reservation as any).numberOfBoys) {
        changes.push(`Nombre de garçons : ${(reservation as any).numberOfBoys || 0} → ${parsed.data.numberOfBoys}`)
      }

      if (parsed.data.leaders !== undefined) {
        const oldLeaders = ((reservation as any).leaders || []).map((l: any) => l.toString()).sort().join(',')
        const newLeaders = parsed.data.leaders.sort().join(',')
        if (oldLeaders !== newLeaders) {
          changes.push(`Liste des chefs présents modifiée`)
        }
      }

      if (parsed.data.manualLeaders !== undefined) {
        const oldManual = ((reservation as any).manualLeaders || []).sort().join(',')
        const newManual = parsed.data.manualLeaders.sort().join(',')
        if (oldManual !== newManual) {
          changes.push(`Chefs externes modifiés`)
        }
      }

      // Si des changements ont été détectés, envoyer l'email
      if (changes.length > 0) {
        const creatorDoc = await User.findById((reservation as any).reservedBy).select('email name').lean()
        const modifierDoc = await User.findById(currentUser.id).select('name').lean()

        const creator = creatorDoc ? JSON.parse(JSON.stringify(creatorDoc)) : null
        const modifier = modifierDoc ? JSON.parse(JSON.stringify(modifierDoc)) : null

        if (creator && modifier) {
          await sendEmail({
            to: creator.email,
            subject: `Modification de votre réservation - ${(reservation as any).eventName}`,
            html: reservationModifiedTemplate({
              chefName: creator.name,
              eventName: (reservation as any).eventName,
              changes,
              modifiedBy: modifier.name,
            })
          })
        }
      }
    } catch (error) {
      console.error('[EMAIL] Erreur lors de l\'envoi de la notification de modification:', error)
    }
  })

  return NextResponse.json(updated)
}
