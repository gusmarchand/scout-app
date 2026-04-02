import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { connectDB } from '@/lib/mongodb'
import { Item } from '@/models/Item'
import { Reservation } from '@/models/Reservation'

async function getDashboardData(role: string, userId: string, unit?: string | null) {
  await connectDB()
  const now = new Date()

  if (role === 'admin' || role === 'equipier') {
    const [totalItems, koItems, moyenItems, upcomingReservations, alertItems] = await Promise.all([
      Item.countDocuments(),
      Item.countDocuments({ globalStatus: 'ko' }),
      Item.countDocuments({ globalStatus: 'moyen' }),
      Reservation.find({ startDate: { $gte: now } }).sort({ startDate: 1 }).limit(5).lean(),
      Item.find({ globalStatus: { $in: ['ko', 'moyen'] } })
        .sort({ priority: -1 }).limit(5).select('name globalStatus').lean(),
    ])
    return { totalItems, koItems, moyenItems, upcomingReservations, alertItems }
  }

  const [myReservations, allUpcoming] = await Promise.all([
    Reservation.find({ unit: unit, endDate: { $gte: now } })
      .sort({ startDate: 1 }).lean(),
    Reservation.find({ startDate: { $gte: now } }).sort({ startDate: 1 }).limit(10).lean(),
  ])
  return { myReservations, allUpcoming }
}

const UNIT_BADGE: Record<string, { label: string; className: string }> = {
  'farfadets':             { label: 'Farfa',   className: 'bg-green-100 text-green-700' },
  'louveteaux-jeannettes': { label: 'LJ',      className: 'bg-orange-100 text-orange-700' },
  'scouts-guides':         { label: 'SG',      className: 'bg-blue-100 text-blue-900' },
  'pionniers-caravelles':  { label: 'PK',      className: 'bg-red-100 text-red-700' },
  'compagnons':            { label: 'Compas',  className: 'bg-emerald-100 text-emerald-800' },
}

function formatDate(d: Date | string) {
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

const STATUS_COLOR: Record<string, string> = {
  ok: 'bg-green-100 text-green-800',
  moyen: 'bg-orange-100 text-orange-800',
  ko: 'bg-red-100 text-red-800',
}

export default async function HomePage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const role = session.user.role
  const data = await getDashboardData(role, session.user.id, session.user.unit)

  const isManager = role === 'admin' || role === 'equipier'

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Bonjour {session.user.name?.split(' ')[0]} 👋
        </h1>
        <p className="text-sm text-gray-500 mt-1 capitalize">{role}</p>
      </div>

      {isManager ? (
        <>
          {/* Compteurs */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-white rounded-xl shadow p-4 text-center">
              <p className="text-3xl font-bold text-gray-900">{(data as any).totalItems}</p>
              <p className="text-xs text-gray-500 mt-1">Items total</p>
            </div>
            <div className="bg-white rounded-xl shadow p-4 text-center">
              <p className="text-3xl font-bold text-orange-600">{(data as any).moyenItems}</p>
              <p className="text-xs text-gray-500 mt-1">État moyen</p>
            </div>
            <div className="bg-white rounded-xl shadow p-4 text-center">
              <p className="text-3xl font-bold text-red-600">{(data as any).koItems}</p>
              <p className="text-xs text-gray-500 mt-1">Hors service</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Réservations à venir */}
            <section className="bg-white rounded-xl shadow p-5">
              <h2 className="text-base font-semibold text-gray-800 mb-3">Prochaines réservations</h2>
              {(data as any).upcomingReservations.length === 0 ? (
                <p className="text-sm text-gray-400">Aucune réservation à venir.</p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {(data as any).upcomingReservations.map((r: any) => (
                    <li key={String(r._id)} className="py-2">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900 flex-1">{r.itemName}</p>
                        {r.unit && UNIT_BADGE[r.unit] && (
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${UNIT_BADGE[r.unit].className}`}>
                            {UNIT_BADGE[r.unit].label}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">{r.eventName}</p>
                      <p className="text-xs text-gray-400">
                        {formatDate(r.startDate)} → {formatDate(r.endDate)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Items à surveiller */}
            <section className="bg-white rounded-xl shadow p-5">
              <h2 className="text-base font-semibold text-gray-800 mb-3">Items à surveiller</h2>
              {(data as any).alertItems.length === 0 ? (
                <p className="text-sm text-gray-400">Tout le matériel est en bon état.</p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {(data as any).alertItems.map((item: any) => (
                    <li key={String(item._id)} className="py-2 flex items-center justify-between">
                      <Link href={`/inventory/${item._id}`}
                        className="text-sm font-medium text-gray-900 hover:text-green-700"
                      >
                        {item.name}
                      </Link>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLOR[item.globalStatus]}`}>
                        {item.globalStatus.toUpperCase()}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          {/* Raccourcis */}
          <section className="bg-white rounded-xl shadow p-5">
            <h2 className="text-base font-semibold text-gray-800 mb-3">Accès rapide</h2>
            <div className="flex flex-wrap gap-3">
              <Link href="/inventory"
                className="bg-green-700 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-800"
              >
                📦 Inventaire
              </Link>
              {(role === 'admin' || role === 'equipier') && (
                <Link href="/inventory/new"
                  className="bg-white border border-green-700 text-green-700 px-4 py-2 rounded-lg text-sm hover:bg-green-50"
                >
                  + Ajouter du matériel
                </Link>
              )}
              <Link href="/reservations/new"
                className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50"
              >
                📅 Nouvelle réservation
              </Link>
              {role === 'admin' && (
                <Link href="/admin/users"
                  className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50"
                >
                  👥 Gérer les comptes
                </Link>
              )}
            </div>
          </section>
        </>
      ) : (
        <>
          {/* Vue Chef */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Mes réservations */}
            <section className="bg-white rounded-xl shadow p-5">
              <h2 className="text-base font-semibold text-gray-800 mb-3">Mes réservations à venir</h2>
              {(data as any).myReservations.length === 0 ? (
                <p className="text-sm text-gray-400">Aucune réservation en cours.</p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {(data as any).myReservations.map((r: any) => (
                    <li key={String(r._id)} className="py-2">
                      <p className="text-sm font-medium text-gray-900">{r.itemName}</p>
                      <p className="text-xs text-gray-500">{r.eventName}</p>
                      <p className="text-xs text-gray-400">
                        {formatDate(r.startDate)} → {formatDate(r.endDate)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Planning général */}
            <section className="bg-white rounded-xl shadow p-5">
              <h2 className="text-base font-semibold text-gray-800 mb-3">Planning du matériel</h2>
              {(data as any).allUpcoming.length === 0 ? (
                <p className="text-sm text-gray-400">Aucune réservation à venir.</p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {(data as any).allUpcoming.map((r: any) => (
                    <li key={String(r._id)} className="py-2">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900 flex-1">{r.itemName}</p>
                        {r.unit && UNIT_BADGE[r.unit] && (
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${UNIT_BADGE[r.unit].className}`}>
                            {UNIT_BADGE[r.unit].label}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">{r.eventName}</p>
                      <p className="text-xs text-gray-400">
                        {formatDate(r.startDate)} → {formatDate(r.endDate)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          {/* Raccourcis chef */}
          <section className="bg-white rounded-xl shadow p-5">
            <h2 className="text-base font-semibold text-gray-800 mb-3">Accès rapide</h2>
            <div className="flex flex-wrap gap-3">
              <Link href="/reservations/new"
                className="bg-green-700 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-800"
              >
                📅 Nouvelle réservation
              </Link>
              <Link href="/inventory"
                className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50"
              >
                📦 Voir l&apos;inventaire
              </Link>
            </div>
          </section>
        </>
      )}
    </main>
  )
}
