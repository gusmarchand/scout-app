import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import crypto from 'crypto'
import { Resend } from 'resend'
import { connectDB } from '@/lib/mongodb'
import { User } from '@/models/User'
import { ResetToken } from '@/models/ResetToken'

const resend = new Resend(process.env.RESEND_API_KEY)

const schema = z.object({ email: z.string().email() })

export async function POST(req: NextRequest) {
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Email invalide.' }, { status: 400 })
  }

  await connectDB()

  const user = await User.findOne({ email: parsed.data.email.toLowerCase() }).lean()

  // Réponse générique même si l'email n'existe pas (sécurité)
  if (!user) {
    return NextResponse.json({ message: 'Si cet email existe, un lien a été envoyé.' })
  }

  // Invalider les anciens tokens
  const userDoc = user as unknown as { _id: any; email: string; name: string }
  await ResetToken.deleteMany({ userId: userDoc._id })

  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60) // 1h

  await ResetToken.create({ userId: userDoc._id, token, expiresAt })

  const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${token}`

  await resend.emails.send({
    from: 'Scout App <onboarding@resend.dev>',
    to: userDoc.email,
    subject: 'Réinitialisation de votre mot de passe',
    html: `
      <p>Bonjour ${userDoc.name},</p>
      <p>Tu as demandé à réinitialiser ton mot de passe.</p>
      <p><a href="${resetUrl}" style="background:#15803d;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;">Réinitialiser mon mot de passe</a></p>
      <p>Ce lien expire dans 1 heure.</p>
      <p>Si tu n'as pas fait cette demande, ignore cet email.</p>
    `,
  })

  return NextResponse.json({ message: 'Si cet email existe, un lien a été envoyé.' })
}
