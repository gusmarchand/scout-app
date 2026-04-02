import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { connectDB } from '@/lib/mongodb'
import { User } from '@/models/User'
import { ResetToken } from '@/models/ResetToken'

const schema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
})

export async function POST(req: NextRequest) {
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides.' }, { status: 400 })
  }

  await connectDB()

  const resetToken = await ResetToken.findOne({
    token: parsed.data.token,
    used: false,
    expiresAt: { $gt: new Date() },
  })

  if (!resetToken) {
    return NextResponse.json({ error: 'Lien invalide ou expiré.' }, { status: 400 })
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12)

  await User.findByIdAndUpdate(resetToken.userId, { passwordHash })
  await ResetToken.findByIdAndUpdate(resetToken._id, { used: true })

  return NextResponse.json({ message: 'Mot de passe mis à jour.' })
}
