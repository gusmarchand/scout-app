import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { authOptions } from '@/lib/authOptions'
import { connectDB } from '@/lib/mongodb'
import { Reservation } from '@/models/Reservation'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import DeleteEventButton from './DeleteEventButton'

async function getReservations(userId?: string, isAdmin?: boolean) {
  await connectDB()

  const now = new Date()
  const filter = isAdmin ? {} : { reservedBy: userId }

  const reservations = await Reservation.find(filter)
    .populate('leaders', 'name')
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
    const key = `${res.eventName}|${res.startDate}|${res.endDate}|${res.location || ''}|${res.numberOfGirls || ''}|${res.numberOfBoys || ''}`
    if (!eventGroups.has(key)) {
      eventGroups.set(key, [])
    }
    eventGroups.get(key)!.push(res)
  }

  const events = Array.from(eventGroups.entries()).map(([key, items]) => {
    const [eventName, startDate, endDate, location, numberOfGirls, numberOfBoys] = key.split('|')
    // Récupérer les chefs depuis le premier item (ils sont identiques pour tous les items d'un même événement)
    const firstItem = items[0]
    return {
      eventName,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      location: location || undefined,
      numberOfGirls: numberOfGirls ? parseInt(numberOfGirls, 10) : undefined,
      numberOfBoys: numberOfBoys ? parseInt(numberOfBoys, 10) : undefined,
      leaders: firstItem.leaders || [],
      manualLeaders: firstItem.manualLeaders || [],
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
            {upcoming.map((event, idx) => {
              const firstReservationId = event.items[0]?._id
              return (
              <div key={idx} className="bg-white rounded-lg shadow p-4 border-l-4 border-logo-green">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-lg font-semibold text-gray-900">{event.eventName}</h3>
                      <Link
                        href={`/reservations/${firstReservationId}/edit`}
                        className="text-xs text-logo-green hover:underline"
                      >
                        ✏️ Modifier
                      </Link>
                      <DeleteEventButton
                        eventName={event.eventName}
                        startDate={event.startDate.toISOString()}
                        endDate={event.endDate.toISOString()}
                        itemCount={event.items.length}
                      />
                    </div>
                    <p className="text-sm text-gray-600">
                      Du {format(event.startDate, 'dd MMM yyyy', { locale: fr })} au{' '}
                      {format(event.endDate, 'dd MMM yyyy', { locale: fr })}
                    </p>
                    {event.location && (
                      <p className="text-sm text-gray-600 mt-1">
                        📍 {event.location}
                      </p>
                    )}
                    {(event.numberOfGirls || event.numberOfBoys) && (
                      <p className="text-sm text-gray-600 mt-1">
                        👥 {[
                          event.numberOfGirls && `${event.numberOfGirls} fille${event.numberOfGirls > 1 ? 's' : ''}`,
                          event.numberOfBoys && `${event.numberOfBoys} garçon${event.numberOfBoys > 1 ? 's' : ''}`
                        ].filter(Boolean).join(', ')}
                      </p>
                    )}
                    {(event.leaders.length > 0 || event.manualLeaders.length > 0) && (
                      <p className="text-sm text-gray-600 mt-1">
                        👤 {[
                          ...event.leaders.map((l: any) => l.name),
                          ...event.manualLeaders
                        ].join(', ')}
                      </p>
                    )}
                  </div>
                  <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                    {event.items.length} item{event.items.length > 1 ? 's' : ''}
                  </span>
                </div>

                <div className="space-y-1 mt-3">
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
              )
            })}
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
