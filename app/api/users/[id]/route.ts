import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { connectDB } from '@/lib/mongodb'
import { User } from '@/models/User'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
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
