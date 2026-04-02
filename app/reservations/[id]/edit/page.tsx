'use client'

import { useState, useEffect, use } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

export default function EditReservationPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const { data: session, status } = useSession()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Données de la réservation
  const [eventName, setEventName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [location, setLocation] = useState('')
  const [numberOfGirls, setNumberOfGirls] = useState('')
  const [numberOfBoys, setNumberOfBoys] = useState('')
  const [selectedLeaderIds, setSelectedLeaderIds] = useState<string[]>([])
  const [manualLeaders, setManualLeaders] = useState<string[]>([])
  const [manualLeaderInput, setManualLeaderInput] = useState('')
  const [allUsers, setAllUsers] = useState<any[]>([])

  // Gestion des items
  const [reservedItems, setReservedItems] = useState<any[]>([])
  const [availableItems, setAvailableItems] = useState<any[]>([])
  const [showAddItems, setShowAddItems] = useState(false)
  const [loadingItems, setLoadingItems] = useState(false)

  // Charger la réservation existante et tous les items du même événement
  useEffect(() => {
    async function fetchReservation() {
      try {
        const res = await fetch(`/api/reservations/${resolvedParams.id}`)
        if (res.ok) {
          const data = await res.json()
          setEventName(data.eventName || '')
          setStartDate(data.startDate || '')
          setEndDate(data.endDate || '')
          setLocation(data.location || '')
          setNumberOfGirls(data.numberOfGirls ? String(data.numberOfGirls) : '')
          setNumberOfBoys(data.numberOfBoys ? String(data.numberOfBoys) : '')
          setSelectedLeaderIds(data.leaders?.map((l: any) => l._id || l) || [])
          setManualLeaders(data.manualLeaders || [])

          // Charger tous les items de cet événement
          await fetchReservedItems(data.eventName, data.startDate, data.endDate)
        } else {
          toast.error('Réservation introuvable')
          router.push('/reservations')
        }
      } catch (error) {
        toast.error('Erreur lors du chargement')
        router.push('/reservations')
      } finally {
        setLoading(false)
      }
    }

    if (session) {
      fetchReservation()
    }
  }, [session, resolvedParams.id, router])

  // Récupérer tous les items réservés pour cet événement
  async function fetchReservedItems(evtName: string, start: string, end: string) {
    try {
      const res = await fetch(`/api/reservations/event?eventName=${encodeURIComponent(evtName)}&startDate=${start}&endDate=${end}`)
      if (res.ok) {
        const data = await res.json()
        setReservedItems(data)
      }
    } catch (error) {
      console.error('Erreur chargement items:', error)
    }
  }

  // Charger la liste des chefs
  useEffect(() => {
    async function fetchUsers() {
      try {
        const res = await fetch('/api/users')
        if (res.ok) {
          const data = await res.json()
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

  function addManualLeader() {
    if (manualLeaderInput.trim()) {
      setManualLeaders(prev => [...prev, manualLeaderInput.trim()])
      setManualLeaderInput('')
    }
  }

  function removeManualLeader(index: number) {
    setManualLeaders(prev => prev.filter((_, i) => i !== index))
  }

  async function handleShowAddItems() {
    setShowAddItems(true)
    setLoadingItems(true)
    try {
      const params = new URLSearchParams({ start: startDate, end: endDate })
      const res = await fetch(`/api/reservations/available?${params}`)
      if (res.ok) {
        const data = await res.json()
        setAvailableItems(data.items || [])
      }
    } catch (error) {
      toast.error('Erreur lors du chargement des items disponibles')
    } finally {
      setLoadingItems(false)
    }
  }

  async function handleAddItem(itemId: string, itemName: string) {
    try {
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId,
          itemName,
          eventName,
          startDate,
          endDate,
          location: location.trim() || undefined,
          numberOfGirls: numberOfGirls ? parseInt(numberOfGirls, 10) : undefined,
          numberOfBoys: numberOfBoys ? parseInt(numberOfBoys, 10) : undefined,
          leaders: selectedLeaderIds.length > 0 ? selectedLeaderIds : undefined,
          manualLeaders: manualLeaders.length > 0 ? manualLeaders : undefined,
        }),
      })

      if (res.ok) {
        toast.success(`${itemName} ajouté`)
        await fetchReservedItems(eventName, startDate, endDate)
        setAvailableItems(prev => prev.filter(item => item._id !== itemId))
      } else {
        const error = await res.json()
        toast.error(error.error || 'Erreur lors de l\'ajout')
      }
    } catch (error) {
      toast.error('Erreur lors de l\'ajout')
    }
  }

  async function handleRemoveItem(reservationId: string, itemName: string) {
    if (!confirm(`Retirer "${itemName}" de la réservation ?`)) return

    try {
      const res = await fetch(`/api/reservations/${reservationId}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        toast.success(`${itemName} retiré`)
        await fetchReservedItems(eventName, startDate, endDate)
      } else {
        toast.error('Erreur lors de la suppression')
      }
    } catch (error) {
      toast.error('Erreur lors de la suppression')
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!eventName.trim()) {
      toast.error('Veuillez saisir le nom de l\'événement')
      return
    }

    setSubmitting(true)

    try {
      const res = await fetch(`/api/reservations/${resolvedParams.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventName: eventName.trim(),
          location: location.trim() || undefined,
          numberOfGirls: numberOfGirls ? parseInt(numberOfGirls, 10) : undefined,
          numberOfBoys: numberOfBoys ? parseInt(numberOfBoys, 10) : undefined,
          leaders: selectedLeaderIds.length > 0 ? selectedLeaderIds : undefined,
          manualLeaders: manualLeaders.length > 0 ? manualLeaders : undefined,
        }),
      })

      if (res.ok) {
        toast.success('Réservation mise à jour')
        router.push('/reservations')
      } else {
        const error = await res.json()
        toast.error(error.error || 'Erreur lors de la mise à jour')
      }
    } catch (error) {
      toast.error('Erreur lors de la mise à jour')
    } finally {
      setSubmitting(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-8">
        <p className="text-gray-500">Chargement...</p>
      </main>
    )
  }

  if (!session) {
    router.replace('/login')
    return null
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Modifier la réservation</h1>

      {/* Section Matériel réservé */}
      <div className="bg-white rounded-xl shadow p-5 mb-6">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">Matériel réservé</h2>
          <button
            type="button"
            onClick={handleShowAddItems}
            className="w-full sm:w-auto px-3 py-1 bg-logo-green text-white rounded text-sm hover:bg-logo-green-hover"
          >
            + Ajouter du matériel
          </button>
        </div>

        {reservedItems.length === 0 ? (
          <p className="text-sm text-gray-500">Aucun matériel réservé pour cet événement</p>
        ) : (
          <div className="space-y-2">
            {reservedItems.map((item) => (
              <div key={item._id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded">
                <span className="text-sm font-medium text-gray-900">{item.itemName}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveItem(item._id, item.itemName)}
                  className="text-red-600 hover:text-red-800 text-sm"
                >
                  ✕ Retirer
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Modal Ajouter des items */}
        {showAddItems && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
            <div className="bg-white rounded-lg p-4 sm:p-5 max-w-md w-full max-h-[80vh] sm:max-h-96 overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Ajouter du matériel</h3>
                <button
                  onClick={() => setShowAddItems(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              {loadingItems ? (
                <p className="text-sm text-gray-500">Chargement...</p>
              ) : availableItems.length === 0 ? (
                <p className="text-sm text-gray-500">Aucun matériel disponible pour cette période</p>
              ) : (
                <div className="space-y-2">
                  {availableItems.map((item) => (
                    <div key={item._id} className="flex items-center justify-between py-2 px-3 border border-gray-200 rounded hover:bg-gray-50">
                      <span className="text-sm">{item.name}</span>
                      <button
                        type="button"
                        onClick={() => handleAddItem(item._id, item.name)}
                        className="px-2 py-1 bg-logo-green text-white rounded text-xs hover:bg-logo-green-hover"
                      >
                        + Ajouter
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow p-5 flex flex-col gap-4">
        {/* Nom de l'événement */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nom de l&apos;événement <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={eventName}
            onChange={e => setEventName(e.target.value)}
            required
            placeholder="Ex : Camp d'été 2025"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        {/* Lieu */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Lieu <span className="text-xs text-gray-500">(facultatif)</span>
          </label>
          <input
            type="text"
            value={location}
            onChange={e => setLocation(e.target.value)}
            placeholder="Ex : Base de Kerloc'h"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        {/* Nombre d'enfants */}
        <div className="grid grid-cols-1 xs:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre de filles <span className="text-xs text-gray-500">(facultatif)</span>
            </label>
            <input
              type="number"
              min="0"
              value={numberOfGirls}
              onChange={e => setNumberOfGirls(e.target.value)}
              placeholder="0"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre de garçons <span className="text-xs text-gray-500">(facultatif)</span>
            </label>
            <input
              type="number"
              min="0"
              value={numberOfBoys}
              onChange={e => setNumberOfBoys(e.target.value)}
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
            <div className="mb-2 max-h-48 sm:max-h-32 overflow-y-auto border border-gray-200 rounded-lg p-2">
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

        {/* Boutons */}
        <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end mt-4">
          <button
            type="button"
            onClick={() => router.push('/reservations')}
            className="w-full sm:w-auto px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="w-full sm:w-auto px-4 py-2 bg-logo-green text-white rounded-lg text-sm hover:bg-logo-green-hover disabled:opacity-50"
          >
            {submitting ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </form>
    </main>
  )
}
