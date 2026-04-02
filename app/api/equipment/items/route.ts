import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { hasPermission } from '@/lib/auth'
import { computePriority } from '@/lib/priority'
import { connectDB } from '@/lib/mongodb'
import { Item } from '@/models/Item'
import { Category } from '@/models/Category'
import type { User } from '@/types'

// ─── Schémas Zod ─────────────────────────────────────────────────────────────

const createItemSchema = z.object({
  categoryId: z.string().min(1),
  name: z.string().min(1),
  type: z.string().optional(),
  globalStatus: z.enum(['ok', 'moyen', 'ko']),
  notes: z.string().optional(),
  updatedBy: z.string().min(1),
})

// ─── POST /api/equipment/items ────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  }

  if (!hasPermission(session.user as User, 'manage_equipment')) {
    return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = createItemSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Données invalides.', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { categoryId, name, type, globalStatus, notes, updatedBy } = parsed.data

  await connectDB()

  const category = await Category.findById(categoryId).lean()

  if (!category) {
    return NextResponse.json({ error: 'Catégorie introuvable.' }, { status: 404 })
  }

  // Dériver les components depuis le componentTemplate de la catégorie
  const components = category.componentTemplate.map((def) => ({
    key: def.key,
    label: def.label,
    status: 'ok' as const,
    notes: '',
    photos: [],
  }))

  const priority = computePriority(globalStatus)

  const item = await Item.create({
    categoryId,
    name,
    type,
    globalStatus,
    priority,
    components,
    notes: notes ?? '',
    updatedBy,
    updatedAt: new Date(),
  })

  return NextResponse.json(item.toObject(), { status: 201 })
}

// ─── GET /api/equipment/items?categoryId=&page= ───────────────────────────────

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const categoryId = searchParams.get('categoryId')
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const limit = 20
  const skip = (page - 1) * limit

  await connectDB()

  const filter = categoryId ? { categoryId } : {}

  const [items, total] = await Promise.all([
    Item.find(filter)
      .sort({ priority: 1, name: 1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Item.countDocuments(filter),
  ])

  const totalPages = Math.ceil(total / limit)

  return NextResponse.json({ items, total, page, totalPages })
}
