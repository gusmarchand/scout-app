'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Status } from '@/types'

interface Props {
  itemId: string
  currentStatus: Status
  currentNotes: string
}

export default function ItemStatusForm({ itemId, currentStatus, currentNotes }: Props) {
  const router = useRouter()
  const [status, setStatus] = useState<Status>(currentStatus)
  const [notes, setNotes] = useState(currentNotes)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMessage('')
    const res = await fetch(`/api/equipment/items/${itemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ globalStatus: status, notes }),
    })
    setSaving(false)
    if (res.ok) {
      setMessage('Statut mis à jour.')
      router.refresh()
    } else {
      const err = await res.json().catch(() => ({}))
      setMessage(err.error ?? 'Erreur lors de la mise à jour.')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Statut global</label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as Status)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="ok">OK</option>
          <option value="moyen">Moyen</option>
          <option value="ko">KO</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>
      {message && (
        <p className="text-sm text-logo-green">{message}</p>
      )}
      <button
        type="submit"
        disabled={saving}
        className="self-start bg-logo-green text-white px-4 py-2 rounded-lg text-sm bg-logo-green-hover disabled:opacity-50"
      >
        {saving ? 'Enregistrement…' : 'Enregistrer'}
      </button>
    </form>
  )
}
