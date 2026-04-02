import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { v2 as cloudinary } from 'cloudinary'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { hasPermission } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Item } from '@/models/Item'
import type { User } from '@/types'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

// ─── DELETE /api/equipment/items/:id/components/:key/photos/:publicId ─────────

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; key: string; publicId: string } }
) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  }

  if (!hasPermission(session.user as User, 'manage_equipment')) {
    return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  }

  const publicId = decodeURIComponent(params.publicId)

  await connectDB()

  const item = await Item.findById(params.id)

  if (!item) {
    return NextResponse.json({ error: 'Item introuvable.' }, { status: 404 })
  }

  const component = item.components.find((c) => c.key === params.key)

  if (!component) {
    return NextResponse.json({ error: 'Composant introuvable.' }, { status: 404 })
  }

  const photoIndex = (component.photos ?? []).findIndex((p) => p.publicId === publicId)

  if (photoIndex === -1) {
    return NextResponse.json({ error: 'Photo introuvable.' }, { status: 404 })
  }

  // Supprimer sur Cloudinary
  await cloudinary.uploader.destroy(publicId)

  // Retirer du tableau
  component.photos!.splice(photoIndex, 1)

  await item.save()

  return new NextResponse(null, { status: 204 })
}
