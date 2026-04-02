import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/authOptions'
import { hasPermission } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Item } from '@/models/Item'
import { computeGlobalStatus } from '@/lib/priority'
import type { User } from '@/types'

// ─── Schéma Zod ──────────────────────────────────────────────────────────────

const updateComponentSchema = z.object({
  status: z.enum(['ok', 'moyen', 'ko']).optional(),
  quantity: z.number().min(0).optional(),
  quantityExpected: z.number().min(0).optional(),
  notes: z.string().optional(),
})

// ─── PATCH /api/equipment/items/:id/components/:key ───────────────────────────

export async function PATCH(
  req: NextRequest,
  props: { params: Promise<{ id: string; key: string }> }
) {
  const params = await props.params
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  }

  if (!hasPermission(session.user, 'update_equipment_status')) {
    return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = updateComponentSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Données invalides.', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  await connectDB()

  const item = await Item.findById(params.id)

  if (!item) {
    return NextResponse.json({ error: 'Item introuvable.' }, { status: 404 })
  }

  const component = item.components.find((c: any) => c.key === params.key)

  if (!component) {
    return NextResponse.json({ error: 'Composant introuvable.' }, { status: 404 })
  }

  const { status, quantity, quantityExpected, notes } = parsed.data

  if (status !== undefined) component.status = status
  if (quantity !== undefined) component.quantity = quantity
  if (quantityExpected !== undefined) component.quantityExpected = quantityExpected
  if (notes !== undefined) component.notes = notes

  // Recalcule automatiquement le statut global de l'item basé sur le statut le plus critique des composants
  const oldGlobalStatus = item.globalStatus
  const newGlobalStatus = computeGlobalStatus(item.components)
  item.globalStatus = newGlobalStatus

  await item.save()

  // Si le statut global devient KO, retirer l'item de toutes les réservations futures
  if (oldGlobalStatus !== 'ko' && newGlobalStatus === 'ko') {
    setImmediate(async () => {
      try {
        const { Reservation } = await import('@/models/Reservation')
        const { sendEmail, getEquipmentTeam } = await import('@/lib/email')
        const { itemRemovedKoTemplate } = await import('@/lib/email-templates')
        const { User } = await import('@/models/User')

        // Trouver toutes les réservations futures de cet item
        const now = new Date()
        const futureReservations = await Reservation.find({
          itemId: params.id,
          startDate: { $gte: now },
        }).lean()

        if (futureReservations.length > 0) {
          // Grouper par chef pour éviter de spammer
          const reservationsByChef = new Map<string, any[]>()

          for (const res of futureReservations) {
            const chefId = (res as any).reservedBy.toString()
            if (!reservationsByChef.has(chefId)) {
              reservationsByChef.set(chefId, [])
            }
            reservationsByChef.get(chefId)!.push(res)
          }

          // Supprimer toutes les réservations futures
          await Reservation.deleteMany({
            itemId: params.id,
            startDate: { $gte: now },
          })

          // Envoyer un email à chaque chef concerné
          for (const [chefId, reservations] of reservationsByChef.entries()) {
            const chefDoc = await User.findById(chefId).select('email name').lean()
            const chef = chefDoc ? JSON.parse(JSON.stringify(chefDoc)) : null

            if (chef) {
              for (const res of reservations) {
                await sendEmail({
                  to: chef.email,
                  subject: `Matériel retiré de votre réservation - ${(res as any).eventName}`,
                  html: itemRemovedKoTemplate({
                    itemName: (res as any).itemName,
                    eventName: (res as any).eventName,
                    chefName: chef.name,
                  })
                })
              }
            }
          }

          // Envoyer un email aux responsables matériel
          const equipmentManagers = await getEquipmentTeam(true)
          if (equipmentManagers.length > 0) {
            await sendEmail({
              to: equipmentManagers.map((u: any) => u.email),
              subject: `Item KO retiré des réservations - ${item.name}`,
              html: `
                <p>L'item <strong>${item.name}</strong> est passé en statut KO.</p>
                <p>${futureReservations.length} réservation(s) future(s) ont été automatiquement annulées et les chefs concernés ont été notifiés.</p>
              `
            })
          }

          console.log(`[KO-ALERT] ${futureReservations.length} réservations futures de "${item.name}" supprimées et alertes envoyées`)
        }
      } catch (error) {
        console.error('[KO-ALERT] Erreur lors du traitement des réservations KO:', error)
      }
    })
  }

  return NextResponse.json(component.toObject())
}
