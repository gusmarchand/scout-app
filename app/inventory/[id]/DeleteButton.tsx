'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

interface Props {
  itemId: string
  itemName: string
}

export default function DeleteButton({ itemId, itemName }: Props) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  async function handleDelete() {
    setDeleting(true)
    const res = await fetch(`/api/equipment/items/${itemId}`, {
      method: 'DELETE',
    })

    if (res.ok) {
      toast.success(`"${itemName}" supprimé`)
      router.push('/inventory')
    } else {
      const err = await res.json().catch(() => ({}))
      toast.error(err.error ?? 'Erreur lors de la suppression')
      setDeleting(false)
      setConfirmOpen(false)
    }
  }

  if (!confirmOpen) {
    return (
      <button
        onClick={() => setConfirmOpen(true)}
        className="px-4 py-2 border border-red-600 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors"
      >
        🗑️ Supprimer
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-700">Confirmer la suppression ?</span>
      <button
        onClick={handleDelete}
        disabled={deleting}
        className="px-3 py-1 bg-red-600 text-white rounded text-sm font-medium hover:bg-red-700 disabled:opacity-50"
      >
        {deleting ? 'Suppression...' : 'Oui, supprimer'}
      </button>
      <button
        onClick={() => setConfirmOpen(false)}
        disabled={deleting}
        className="px-3 py-1 border border-gray-300 text-gray-700 rounded text-sm hover:bg-gray-50"
      >
        Annuler
      </button>
    </div>
  )
}
