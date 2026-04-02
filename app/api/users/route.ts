import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { authOptions } from '@/lib/authOptions'
import { connectDB } from '@/lib/mongodb'
import { User } from '@/models/User'

const createUserSchema = z
  .object({
    name: z.string().min(1),
    email: z.string().email(),
    password: z.string().min(8),
    role: z.enum(['admin', 'equipier', 'chef']),
    unit: z
      .enum(['farfadets', 'louveteaux-jeannettes', 'scouts-guides', 'pionniers-caravelles'])
      .optional(),
  })
  .refine((data) => data.role !== 'chef' || data.unit !== undefined, {
    message: "Le champ 'unit' est requis pour le rôle 'chef'.",
    path: ['unit'],
  })

// ─── GET /api/users ────────────────────────────────────────────────────────

export async function GET() {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  }

  await connectDB()

  const users = await User.find()
    .select('-passwordHash')
    .sort({ createdAt: -1 })
    .lean()

  return NextResponse.json(users as any)
}

// ─── POST /api/users ───────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = createUserSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Données invalides.', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { name, email, password, role, unit } = parsed.data

  await connectDB()

  const existing = await User.findOne({ email: email.toLowerCase() }).lean()
  if (existing) {
    return NextResponse.json({ error: 'Cet email est déjà utilisé.' }, { status: 400 })
  }

  const passwordHash = await bcrypt.hash(password, 12)

  const user = await User.create({
    name,
    email: email.toLowerCase(),
    passwordHash,
    role,
    unit: unit ?? undefined,
  })

  const { passwordHash: _omit, ...userWithoutPassword } = user.toObject()

  return NextResponse.json(userWithoutPassword, { status: 201 })
}
