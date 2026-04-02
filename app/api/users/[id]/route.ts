import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { connectDB } from '@/lib/mongodb'
import { User } from '@/models/User'

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
