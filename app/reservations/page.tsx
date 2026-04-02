import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { authOptions } from '@/lib/authOptions'
import { connectDB } from '@/lib/mongodb'
import { Reservation } from '@/models/Reservation'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

async function getReservations(userId?: string, isAdmin?: boolean) {
  await connectDB()

  const now = new Date()
  const filter = isAdmin ? {} : { reservedBy: userId }

  const reservations = await Reservation.find(filter)
    .sort({ startDate: -1 })
    .lean()

  return JSON.parse(JSON.stringify(reservations))
}

export default async function ReservationsPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const isAdmin = session.user.role === 'admin'
  const reservations = await getReservations(
    session.user.id,
    isAdmin
  )

  // Grouper par événement
  const eventGroups = new Map<string, any[]>()

  for (const res of reservations) {
    const key = `${res.eventName}|${res.startDate}|${res.endDate}`
    if (!eventGroups.has(key)) {
      eventGroups.set(key, [])
    }
    eventGroups.get(key)!.push(res)
  }

  const events = Array.from(eventGroups.entries()).map(([key, items]) => {
    const [eventName, startDate, endDate] = key.split('|')
    return {
      eventName,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      items,
    }
  }).sort((a, b) => b.startDate.getTime() - a.startDate.getTime())

  const now = new Date()
  const upcoming = events.filter(e => e.endDate >= now)
  const past = events.filter(e => e.endDate < now)

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Réservations</h1>
        <Link
          href="/reservations/new"
          className="bg-logo-green text-white px-4 py-2 rounded-lg text-sm hover:bg-logo-green-hover"
        >
          + Nouvelle réservation
        </Link>
      </div>

      {/* Réservations à venir */}
      {upcoming.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">À venir</h2>
          <div className="space-y-4">
            {upcoming.map((event, idx) => (
              <div key={idx} className="bg-white rounded-lg shadow p-4 border-l-4 border-logo-green">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{event.eventName}</h3>
                    <p className="text-sm text-gray-600">
                      Du {format(event.startDate, 'dd MMM yyyy', { locale: fr })} au{' '}
                      {format(event.endDate, 'dd MMM yyyy', { locale: fr })}
                    </p>
                  </div>
                  <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                    {event.items.length} item{event.items.length > 1 ? 's' : ''}
                  </span>
                </div>

                <div className="space-y-1">
                  {event.items.map((item) => (
                    <div key={item._id} className="flex items-center justify-between text-sm">
                      <Link
                        href={`/inventory/${item.itemId}`}
                        className="text-logo-green hover:underline"
                      >
                        • {item.itemName}
                      </Link>
                      {isAdmin && item.unit && (
                        <span className="text-gray-500 text-xs">
                          {item.unit}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Réservations passées */}
      {past.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Passées</h2>
          <div className="space-y-4">
            {past.map((event, idx) => (
              <div key={idx} className="bg-gray-50 rounded-lg shadow p-4 border-l-4 border-gray-300">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-700">{event.eventName}</h3>
                    <p className="text-sm text-gray-500">
                      Du {format(event.startDate, 'dd MMM yyyy', { locale: fr })} au{' '}
                      {format(event.endDate, 'dd MMM yyyy', { locale: fr })}
                    </p>
                  </div>
                  <span className="bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded">
                    {event.items.length} item{event.items.length > 1 ? 's' : ''}
                  </span>
                </div>

                <div className="space-y-1">
                  {event.items.map((item) => (
                    <div key={item._id} className="flex items-center justify-between text-sm text-gray-600">
                      <span>• {item.itemName}</span>
                      {isAdmin && item.unit && (
                        <span className="text-gray-400 text-xs">
                          {item.unit}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {events.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">Aucune réservation</p>
          <Link
            href="/reservations/new"
            className="text-logo-green hover:underline"
          >
            Créer une réservation
          </Link>
        </div>
      )}
    </main>
  )
}
