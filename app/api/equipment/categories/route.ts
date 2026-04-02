import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/authOptions'
import { hasPermission } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Category } from '@/models/Category'
import type { Role } from '@/types'

const componentDefSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  hasEyelets: z.boolean().optional(),
  isQuantified: z.boolean().optional(),
})

const createCategorySchema = z.object({
  name: z.string().min(1),
  componentTemplate: z.array(componentDefSchema),
})

export async function GET() {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  }

  await connectDB()

  const categories = await Category.find().lean()

  return NextResponse.json(categories)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  }

  if (!hasPermission({ role: session.user.role } as Parameters<typeof hasPermission>[0], 'manage_equipment')) {
    return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = createCategorySchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Données invalides.', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  await connectDB()

  const category = await Category.create(parsed.data)

  return NextResponse.json(category.toObject(), { status: 201 })
}
