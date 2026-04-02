'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

interface Props {
  eventName: string
  startDate: string
  endDate: string
  itemCount: number
}

export default function DeleteEventButton({ eventName, startDate, endDate, itemCount }: Props) {
  const [deleting, setDeleting] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const router = useRouter()

  async function handleDelete() {
    setDeleting(true)
    try {
      // Récupérer toutes les réservations de cet événement
      const res = await fetch(
        `/api/reservations/event?eventName=${encodeURIComponent(eventName)}&startDate=${startDate}&endDate=${endDate}`
      )

      if (!res.ok) {
        throw new Error('Erreur lors de la récupération des réservations')
      }

      const reservations = await res.json()

      // Supprimer toutes les réservations
      const deletePromises = reservations.map((reservation: any) =>
        fetch(`/api/reservations/${reservation._id}`, {
          method: 'DELETE',
        })
      )

      const results = await Promise.all(deletePromises)
      const failedDeletes = results.filter(r => !r.ok)

      if (failedDeletes.length > 0) {
        toast.error(`${failedDeletes.length} réservation(s) n'ont pas pu être supprimées`)
      } else {
        toast.success(`Réservation "${eventName}" supprimée`)
        router.refresh()
      }
    } catch (error) {
      toast.error('Erreur lors de la suppression')
    } finally {
      setDeleting(false)
      setConfirmOpen(false)
    }
  }

  if (!confirmOpen) {
    return (
      <button
        onClick={() => setConfirmOpen(true)}
        className="text-xs text-red-600 hover:text-red-800 hover:underline"
      >
        🗑️ Supprimer
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-gray-700">Supprimer {itemCount} item{itemCount > 1 ? 's' : ''} ?</span>
      <button
        onClick={handleDelete}
        disabled={deleting}
        className="text-red-600 hover:text-red-800 font-medium disabled:opacity-50"
      >
        {deleting ? 'Suppression...' : 'Oui'}
      </button>
      <button
        onClick={() => setConfirmOpen(false)}
        disabled={deleting}
        className="text-gray-600 hover:text-gray-800 disabled:opacity-50"
      >
        Annuler
      </button>
    </div>
  )
}
