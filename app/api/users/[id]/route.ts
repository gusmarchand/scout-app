import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/authOptions'
import { connectDB } from '@/lib/mongodb'
import { User } from '@/models/User'

const updateUserSchema = z.object({
  role: z.enum(['admin', 'equipier', 'chef']).optional(),
  unit: z.string().optional(),
  isEquipmentManager: z.boolean().optional(),
})

export async function PATCH(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = updateUserSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Données invalides.', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  await connectDB()

  const updated = await User.findByIdAndUpdate(
    params.id,
    { $set: parsed.data },
    { new: true }
  ).select('-passwordHash')

  if (!updated) {
    return NextResponse.json({ error: 'Utilisateur introuvable.' }, { status: 404 })
  }

  return NextResponse.json(updated)
}

export async function DELETE(
  _req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  }

  await connectDB()

  const deleted = await User.findByIdAndDelete(params.id)

  if (!deleted) {
    return NextResponse.json({ error: 'Utilisateur introuvable.' }, { status: 404 })
  }

  return new NextResponse(null, { status: 204 })
}
