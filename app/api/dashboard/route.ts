import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { connectDB } from '@/lib/mongodb'
import { Item } from '@/models/Item'
import { Reservation } from '@/models/Reservation'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  await connectDB()

  const now = new Date()
  const role = session.user.role

  if (role === 'admin' || role === 'equipier') {
    const [totalItems, koItems, moyenItems, upcomingReservations, alertItems] = await Promise.all([
      Item.countDocuments(),
      Item.countDocuments({ globalStatus: 'ko' }),
      Item.countDocuments({ globalStatus: 'moyen' }),
      Reservation.find({ startDate: { $gte: now } })
        .sort({ startDate: 1 })
        .limit(5)
        .lean(),
      Item.find({ globalStatus: { $in: ['ko', 'moyen'] } })
        .sort({ priority: -1 })
        .limit(5)
        .select('name globalStatus priority')
        .lean(),
    ])

    return NextResponse.json({
      role,
      stats: { totalItems, koItems, moyenItems },
      upcomingReservations,
      alertItems,
    })
  }

  // Chef : ses réservations + toutes les réservations à venir
  const [myReservations, allUpcoming] = await Promise.all([
    Reservation.find({
      reservedBy: session.user.id,
      endDate: { $gte: now },
    }).sort({ startDate: 1 }).lean(),
    Reservation.find({ startDate: { $gte: now } })
      .sort({ startDate: 1 })
      .limit(10)
      .lean(),
  ])

  return NextResponse.json({ role, myReservations, allUpcoming })
}
