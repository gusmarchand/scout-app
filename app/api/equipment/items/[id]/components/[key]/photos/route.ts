import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { connectDB } from '@/lib/mongodb'
import { Item } from '@/models/Item'
import { Types } from 'mongoose'

// ─── Schéma Zod ──────────────────────────────────────────────────────────────

const addPhotoSchema = z.object({
  url: z.string().url(),
  publicId: z.string(),
  caption: z.string().optional(),
})

// ─── POST /api/equipment/items/:id/components/:key/photos ─────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string; key: string } }
) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  }

  const body = await req.json()
  const parsed = addPhotoSchema.safeParse(body)

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

  const component = item.components.find((c) => c.key === params.key)

  if (!component) {
    return NextResponse.json({ error: 'Composant introuvable.' }, { status: 404 })
  }

  const photo = {
    url: parsed.data.url,
    publicId: parsed.data.publicId,
    uploadedBy: new Types.ObjectId(session.user.id),
    uploadedAt: new Date(),
    ...(parsed.data.caption ? { caption: parsed.data.caption } : {}),
  }

  component.photos = component.photos ?? []
  component.photos.push(photo as never)

  await item.save()

  return NextResponse.json(photo, { status: 201 })
}
