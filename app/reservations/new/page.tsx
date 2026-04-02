'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { DayPicker, type DateRange } from 'react-day-picker'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import 'react-day-picker/dist/style.css'
import type { Status } from '@/types'

interface AvailableItem {
  _id: string
  name: string
  globalStatus: Status
  type?: string
}

const STATUS_BADGE: Record<Status, { label: string; className: string }> = {
  ok: { label: 'OK', className: 'bg-green-100 text-green-800' },
  moyen: { label: 'Moyen', className: 'bg-orange-100 text-orange-800' },
  ko: { label: 'KO', className: 'bg-red-100 text-red-800' },
}

export default function NewReservationPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [range, setRange] = useState<DateRange | undefined>()
  const [availableItems, setAvailableItems] = useState<AvailableItem[]>([])
  const [loadingAvail, setLoadingAvail] = useState(false)
  const [availError, setAvailError] = useState('')
  const [searched, setSearched] = useState(false)

  const [selectedItemId, setSelectedItemId] = useState('')
  const [eventName, setEventName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [submitSuccess, setSubmitSuccess] = useState(false)

  if (status === 'loading') return null
  if (!session) { router.replace('/login'); return null }

  const startDate = range?.from ? format(range.from, 'yyyy-MM-dd') : ''
  const endDate = range?.to ? format(range.to, 'yyyy-MM-dd') : ''

  async function handleCheckAvailability(e: React.FormEvent) {
    e.preventDefault()
    setAvailError('')
    setAvailableItems([])
    setSearched(false)
    setSelectedItemId('')

    if (!startDate || !endDate) {
      setAvailError('Veuillez sélectionner une période de début et de fin.')
      return
    }

    setLoadingAvail(true)
    const params = new URLSearchParams({ start: startDate, end: endDate })
    const res = await fetch(`/api/reservations/available?${params}`)
    setLoadingAvail(false)
    setSearched(true)

    if (!res.ok) {
      setAvailError('Erreur lors de la récupération des disponibilités.')
      return
    }
    const json = await res.json()
    setAvailableItems(json.items ?? json)
  }

  async function handleReserve(e: React.FormEvent) {
    e.preventDefault()
    setSubmitError('')
    if (!selectedItemId) { setSubmitError('Veuillez sélectionner un item.'); return }
    if (!eventName.trim()) { setSubmitError("Veuillez saisir le nom de l'événement."); return }

    setSubmitting(true)
    const res = await fetch('/api/reservations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        itemId: selectedItemId,
        itemName: availableItems.find(i => i._id === selectedItemId)?.name ?? '',
        eventName: eventName.trim(),
        startDate,
        endDate,
        unit: session?.user.unit ?? undefined,
      }),
    })
    setSubmitting(false)

    if (res.ok) {
      setSubmitSuccess(true)
    } else {
      const err = await res.json().catch(() => ({}))
      if (res.status === 409) {
        setSubmitError(`Conflit : cet item est déjà réservé sur cette période.`)
      } else {
        setSubmitError(err.error ?? 'Erreur lors de la réservation.')
      }
    }
  }

  if (submitSuccess) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-8 text-center">
        <p className="text-green-700 text-lg font-semibold mb-4">✅ Réservation confirmée !</p>
        <button
          onClick={() => {
            setSubmitSuccess(false); setSelectedItemId(''); setEventName('')
            setAvailableItems([]); setSearched(false); setRange(undefined)
          }}
          className="text-sm text-green-700 hover:underline"
        >
          Faire une autre réservation
        </button>
      </main>
    )
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Nouvelle réservation</h1>

      {/* Sélecteur de période */}
      <section className="bg-white rounded-xl shadow p-5 mb-6">
        <h2 className="text-base font-semibold text-gray-800 mb-3">Période</h2>
        <form onSubmit={handleCheckAvailability} className="flex flex-col gap-4">
          <div className="flex justify-center">
            <DayPicker
              mode="range"
              selected={range}
              onSelect={setRange}
              locale={fr}
              disabled={{ before: new Date() }}
              numberOfMonths={1}
              styles={{
                day_selected: { backgroundColor: '#15803d' },
                day_range_middle: { backgroundColor: '#dcfce7' },
              }}
            />
          </div>

          {range?.from && (
            <p className="text-sm text-gray-600 text-center">
              {range.from && format(range.from, 'd MMMM yyyy', { locale: fr })}
              {range.to && range.to !== range.from
                ? ` → ${format(range.to, 'd MMMM yyyy', { locale: fr })}`
                : ' — sélectionne la date de fin'}
            </p>
          )}

          {availError && <p className="text-sm text-red-600 text-center">{availError}</p>}

          <button
            type="submit"
            disabled={loadingAvail || !startDate || !endDate}
            className="self-center bg-green-700 text-white px-5 py-2 rounded-lg text-sm hover:bg-green-800 disabled:opacity-50"
          >
            {loadingAvail ? 'Recherche…' : 'Voir les disponibilités'}
          </button>
        </form>
      </section>

      {/* Résultats */}
      {searched && (
        <section className="bg-white rounded-xl shadow p-5 mb-6">
          <h2 className="text-base font-semibold text-gray-800 mb-3">Items disponibles</h2>
          {availableItems.length === 0 ? (
            <p className="text-sm text-gray-500">Aucun item disponible sur cette période.</p>
          ) : (
            <ul className="divide-y divide-gray-200">
              {availableItems.map(item => {
                const badge = STATUS_BADGE[item.globalStatus]
                return (
                  <li key={item._id} className="py-2 flex items-center gap-3">
                    <input type="radio" name="selectedItem" value={item._id}
                      id={`item-${item._id}`} checked={selectedItemId === item._id}
                      onChange={() => setSelectedItemId(item._id)} className="accent-green-700"
                    />
                    <label htmlFor={`item-${item._id}`} className="flex-1 cursor-pointer">
                      <span className="font-medium text-sm">{item.name}</span>
                      {item.type && <span className="ml-2 text-xs text-gray-500">{item.type}</span>}
                    </label>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badge.className}`}>
                      {badge.label}
                    </span>
                    {item.globalStatus === 'ko' && (
                      <span className="text-xs text-red-600 font-medium">⚠️ KO</span>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      )}

      {/* Formulaire de confirmation */}
      {searched && availableItems.length > 0 && (
        <section className="bg-white rounded-xl shadow p-5">
          <h2 className="text-base font-semibold text-gray-800 mb-3">Confirmer la réservation</h2>
          <form onSubmit={handleReserve} className="flex flex-col gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom de l&apos;événement
              </label>
              <input type="text" value={eventName} onChange={e => setEventName(e.target.value)}
                required placeholder="Ex : Camp d'été 2025"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            {submitError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
                {submitError}
              </p>
            )}
            <button type="submit" disabled={submitting || !selectedItemId}
              className="self-start bg-green-700 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-800 disabled:opacity-50"
            >
              {submitting ? 'Réservation en cours…' : 'Confirmer la réservation'}
            </button>
          </form>
        </section>
      )}
    </main>
  )
}
