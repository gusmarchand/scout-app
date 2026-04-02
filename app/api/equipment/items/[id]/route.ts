import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/authOptions'
import { hasPermission } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Item } from '@/models/Item'
import type { User } from '@/types'

// ─── Schéma Zod ──────────────────────────────────────────────────────────────

const updateItemSchema = z.object({
  globalStatus: z.enum(['ok', 'moyen', 'ko']).optional(),
  notes: z.string().optional(),
  updatedBy: z.string().optional(),
})

// ─── GET /api/equipment/items/:id ─────────────────────────────────────────────

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

  const item = await Item.findById(params.id).lean()

  if (!item) {
    return NextResponse.json({ error: 'Item introuvable.' }, { status: 404 })
  }

  return NextResponse.json(item)
}

// ─── PATCH /api/equipment/items/:id ──────────────────────────────────────────

export async function PATCH(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
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
  const parsed = updateItemSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Données invalides.', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { globalStatus, notes } = parsed.data

  await connectDB()

  const item = await Item.findById(params.id)

  if (!item) {
    return NextResponse.json({ error: 'Item introuvable.' }, { status: 404 })
  }

  if (globalStatus !== undefined) {
    item.globalStatus = globalStatus
    // Note: priority sera calculé automatiquement par le middleware Mongoose
  }

  if (notes !== undefined) {
    item.notes = notes
  }

  item.updatedBy = session.user.id as unknown as typeof item.updatedBy
  item.updatedAt = new Date()

  await item.save()

  return NextResponse.json(item.toObject())
}

// ─── DELETE /api/equipment/items/:id ─────────────────────────────────────────

export async function DELETE(
  _req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  }

  if (!hasPermission(session.user, 'manage_equipment')) {
    return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  }

  await connectDB()

  const item = await Item.findByIdAndDelete(params.id)

  if (!item) {
    return NextResponse.json({ error: 'Item introuvable.' }, { status: 404 })
  }

  return new NextResponse(null, { status: 204 })
}
