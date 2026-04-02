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
  const newGlobalStatus = computeGlobalStatus(item.components)
  item.globalStatus = newGlobalStatus

  await item.save()

  return NextResponse.json(component.toObject())
}
