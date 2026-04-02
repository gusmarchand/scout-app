import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { connectDB } from '@/lib/mongodb'
import { Reservation } from '@/models/Reservation'

// ─── GET /api/reservations/event?eventName=&startDate=&endDate= ──────────────

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const eventName = searchParams.get('eventName')
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')

  if (!eventName || !startDate || !endDate) {
    return NextResponse.json(
      { error: 'Paramètres manquants.' },
      { status: 400 }
    )
  }

  await connectDB()

  const reservations = await Reservation.find({
    eventName,
    startDate: new Date(startDate),
    endDate: new Date(endDate),
  })
    .select('_id itemId itemName')
    .lean()

  return NextResponse.json(reservations)
}
