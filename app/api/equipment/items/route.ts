import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/authOptions'
import { hasPermission } from '@/lib/auth'
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

  if (!hasPermission(session.user, 'manage_equipment')) {
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
  const categoryDoc = category as unknown as { componentTemplate: any[] }
  const components = categoryDoc.componentTemplate.map((def: any) => ({
    key: def.key,
    label: def.label,
    status: 'ok' as const,
    notes: '',
    photos: [],
  }))

  // Note: priority sera calculé automatiquement par le middleware Mongoose

  const item = await Item.create({
    categoryId,
    name,
    type,
    globalStatus,
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
  const search = searchParams.get('search')
  const status = searchParams.get('status')
  const sortBy = searchParams.get('sortBy') || 'name'
  const sortOrder = searchParams.get('sortOrder') || 'asc'
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const limit = Math.min(10000, parseInt(searchParams.get('limit') ?? '20', 10)) // Max 10k items
  const skip = (page - 1) * limit

  await connectDB()

  const filter: any = {}

  if (categoryId) {
    filter.categoryId = categoryId
  }

  if (search) {
    // Utilise l'index text pour recherche plus rapide
    filter.$text = { $search: search }
  }

  if (status) {
    filter.globalStatus = status
  }

  // Déterminer le tri
  const sortField = sortBy === 'status' ? 'priority' : 'name'
  const sortDirection = sortOrder === 'desc' ? -1 : 1
  const sortOptions: any = { [sortField]: sortDirection }

  // Tri secondaire par nom si on trie par statut
  if (sortBy === 'status') {
    sortOptions.name = 1
  }

  const [items, total] = await Promise.all([
    Item.find(filter)
      .select('_id name globalStatus type priority') // Seulement les champs affichés dans la liste
      .sort(sortOptions)
      .skip(skip)
      .limit(limit)
      .lean(),
    Item.countDocuments(filter),
  ])

  const totalPages = Math.ceil(total / limit)

  return NextResponse.json({ items, total, page, totalPages })
}
