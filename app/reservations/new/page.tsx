'use client'

import { useState, useEffect } from 'react'
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

  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([])
  const [eventName, setEventName] = useState('')
  const [location, setLocation] = useState('')
  const [numberOfGirls, setNumberOfGirls] = useState('')
  const [numberOfBoys, setNumberOfBoys] = useState('')
  const [selectedLeaderIds, setSelectedLeaderIds] = useState<string[]>([])
  const [manualLeaders, setManualLeaders] = useState<string[]>([])
  const [manualLeaderInput, setManualLeaderInput] = useState('')
  const [allUsers, setAllUsers] = useState<any[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [submitSuccess, setSubmitSuccess] = useState(false)

  function toggleItemSelection(itemId: string) {
    setSelectedItemIds(prev =>
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    )
  }

  function addManualLeader() {
    if (manualLeaderInput.trim()) {
      setManualLeaders(prev => [...prev, manualLeaderInput.trim()])
      setManualLeaderInput('')
    }
  }

  function removeManualLeader(index: number) {
    setManualLeaders(prev => prev.filter((_, i) => i !== index))
  }

  // Charger la liste des utilisateurs pour la sélection des chefs (role=chef uniquement)
  useEffect(() => {
    async function fetchUsers() {
      try {
        const res = await fetch('/api/users')
        if (res.ok) {
          const data = await res.json()
          // Filtrer uniquement les chefs
          const chefs = data.filter((user: any) => user.role === 'chef')
          setAllUsers(chefs)
        }
      } catch (error) {
        console.error('Erreur chargement utilisateurs:', error)
      }
    }
    if (session) {
      fetchUsers()
    }
  }, [session])

  if (status === 'loading') return null
  if (!session) { router.replace('/login'); return null }

  const startDate = range?.from ? format(range.from, 'yyyy-MM-dd') : ''
  const endDate = range?.to ? format(range.to, 'yyyy-MM-dd') : ''

  async function handleCheckAvailability(e: React.FormEvent) {
    e.preventDefault()
    setAvailError('')
    setAvailableItems([])
    setSearched(false)
    setSelectedItemIds([])

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
    if (selectedItemIds.length === 0) { setSubmitError('Veuillez sélectionner au moins un item.'); return }
    if (!eventName.trim()) { setSubmitError("Veuillez saisir le nom de l'événement."); return }

    setSubmitting(true)

    // Créer une réservation pour chaque item sélectionné
    const reservations = selectedItemIds.map(itemId => ({
      itemId,
      itemName: availableItems.find(i => i._id === itemId)?.name ?? '',
      eventName: eventName.trim(),
      startDate,
      endDate,
      unit: session?.user.unit ?? undefined,
      location: location.trim() || undefined,
      numberOfGirls: numberOfGirls ? parseInt(numberOfGirls, 10) : undefined,
      numberOfBoys: numberOfBoys ? parseInt(numberOfBoys, 10) : undefined,
      leaders: selectedLeaderIds.length > 0 ? selectedLeaderIds : undefined,
      manualLeaders: manualLeaders.length > 0 ? manualLeaders : undefined,
    }))

    try {
      const results = await Promise.all(
        reservations.map(reservation =>
          fetch('/api/reservations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(reservation),
          })
        )
      )

      const failedReservations = results.filter(r => !r.ok)

      if (failedReservations.length > 0) {
        const firstError = await failedReservations[0].json().catch(() => ({}))
        setSubmitError(firstError.error ?? `${failedReservations.length} réservation(s) ont échoué`)
      } else {
        setSubmitSuccess(true)
      }
    } catch (error) {
      setSubmitError('Erreur lors de la réservation.')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitSuccess) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-8 text-center">
        <p className="text-logo-green text-lg font-semibold mb-4">
          ✅ {selectedItemIds.length} réservation{selectedItemIds.length > 1 ? 's' : ''} confirmée{selectedItemIds.length > 1 ? 's' : ''} !
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => router.push('/reservations')}
            className="bg-logo-green text-white px-4 py-2 rounded-lg text-sm hover:bg-logo-green-hover"
          >
            Voir mes réservations
          </button>
          <button
            onClick={() => {
              setSubmitSuccess(false); setSelectedItemIds([]); setEventName('')
              setAvailableItems([]); setSearched(false); setRange(undefined)
            }}
            className="text-sm text-logo-green hover:underline"
          >
            Nouvelle réservation
          </button>
        </div>
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
            className="self-center bg-logo-green text-white px-5 py-2 rounded-lg text-sm bg-logo-green-hover disabled:opacity-50"
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
            <>
              <div className="mb-3 text-sm text-gray-600">
                Sélectionnez un ou plusieurs items ({selectedItemIds.length} sélectionné{selectedItemIds.length > 1 ? 's' : ''})
              </div>
              <ul className="divide-y divide-gray-200">
              {availableItems.map(item => {
                const badge = STATUS_BADGE[item.globalStatus]
                const isSelected = selectedItemIds.includes(item._id)
                return (
                  <li key={item._id} className="py-2 flex items-center gap-3">
                    <input
                      type="checkbox"
                      id={`item-${item._id}`}
                      checked={isSelected}
                      onChange={() => toggleItemSelection(item._id)}
                      className="accent-[#0b7152] w-4 h-4"
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
            </>
          )}
        </section>
      )}

      {/* Formulaire de confirmation */}
      {searched && availableItems.length > 0 && (
        <section className="bg-white rounded-xl shadow p-5">
          <h2 className="text-base font-semibold text-gray-800 mb-3">Confirmer la réservation</h2>
          <form onSubmit={handleReserve} className="flex flex-col gap-4">
            {/* Nom de l'événement */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom de l&apos;événement <span className="text-red-500">*</span>
              </label>
              <input type="text" value={eventName} onChange={e => setEventName(e.target.value)}
                required placeholder="Ex : Camp d'été 2025"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            {/* Lieu */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Lieu <span className="text-xs text-gray-500">(facultatif)</span>
              </label>
              <input type="text" value={location} onChange={e => setLocation(e.target.value)}
                placeholder="Ex : Base de Kerloc'h"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            {/* Nombre d'enfants */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre de filles <span className="text-xs text-gray-500">(facultatif)</span>
                </label>
                <input type="number" min="0" value={numberOfGirls} onChange={e => setNumberOfGirls(e.target.value)}
                  placeholder="0"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre de garçons <span className="text-xs text-gray-500">(facultatif)</span>
                </label>
                <input type="number" min="0" value={numberOfBoys} onChange={e => setNumberOfBoys(e.target.value)}
                  placeholder="0"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>

            {/* Chefs présents */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Chefs présents <span className="text-xs text-gray-500">(facultatif)</span>
              </label>
              {allUsers.length > 0 && (
                <div className="mb-2 max-h-32 overflow-y-auto border border-gray-200 rounded-lg p-2">
                  {allUsers.map(user => (
                    <label key={user._id} className="flex items-center gap-2 py-1 hover:bg-gray-50 px-2 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedLeaderIds.includes(user._id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedLeaderIds(prev => [...prev, user._id])
                          } else {
                            setSelectedLeaderIds(prev => prev.filter(id => id !== user._id))
                          }
                        }}
                        className="accent-[#0b7152]"
                      />
                      <span className="text-sm">{user.name}</span>
                    </label>
                  ))}
                </div>
              )}

              {/* Ajouter un chef manuellement */}
              <div className="mt-2">
                <label className="block text-xs text-gray-600 mb-1">Ajouter un chef non inscrit</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={manualLeaderInput}
                    onChange={e => setManualLeaderInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addManualLeader() } }}
                    placeholder="Nom du chef"
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <button
                    type="button"
                    onClick={addManualLeader}
                    className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200"
                  >
                    + Ajouter
                  </button>
                </div>
                {manualLeaders.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {manualLeaders.map((leader, index) => (
                      <span key={index} className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 px-2 py-1 rounded text-sm">
                        {leader}
                        <button
                          type="button"
                          onClick={() => removeManualLeader(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {submitError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
                {submitError}
              </p>
            )}
            <button type="submit" disabled={submitting || selectedItemIds.length === 0}
              className="self-start bg-logo-green text-white px-4 py-2 rounded-lg text-sm bg-logo-green-hover disabled:opacity-50"
            >
              {submitting
                ? 'Réservation en cours…'
                : `Réserver ${selectedItemIds.length} item${selectedItemIds.length > 1 ? 's' : ''}`
              }
            </button>
          </form>
        </section>
      )}
    </main>
  )
}
