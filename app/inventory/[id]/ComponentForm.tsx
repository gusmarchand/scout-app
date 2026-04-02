'use client'

import { useState } from 'react'
import type { Component, Status } from '@/types'

interface Props {
  itemId: string
  component: Component
}

export default function ComponentForm({ itemId, component }: Props) {
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState<Status>(component.status)
  const [quantity, setQuantity] = useState(component.quantity ?? '')
  const [notes, setNotes] = useState(component.notes)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMessage('')
    const body: Record<string, unknown> = { status, notes }
    if (component.quantity !== undefined) body.quantity = Number(quantity)
    const res = await fetch(`/api/equipment/items/${itemId}/components/${component.key}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    setSaving(false)
    if (res.ok) {
      setMessage('Composant mis à jour.')
      setOpen(false)
    } else {
      const err = await res.json().catch(() => ({}))
      setMessage(err.error ?? 'Erreur.')
    }
  }

  const statusColor: Record<Status, string> = {
    ok: 'text-green-700',
    moyen: 'text-orange-600',
    ko: 'text-red-600',
  }

  return (
    <div className="border border-gray-200 rounded-lg p-3">
      <div className="flex items-center justify-between">
        <div>
          <span className="font-medium text-sm">{component.label}</span>
          <span className={`ml-2 text-xs font-semibold ${statusColor[component.status]}`}>
            {component.status.toUpperCase()}
          </span>
          {component.quantity !== undefined && (
            <span className="ml-2 text-xs text-gray-500">
              Qté : {component.quantity}
              {component.quantityExpected ? ` / ${component.quantityExpected}` : ''}
            </span>
          )}
        </div>
        <button
          onClick={() => setOpen(!open)}
          className="text-xs text-green-700 hover:underline"
        >
          {open ? 'Fermer' : 'Modifier'}
        </button>
      </div>
      {component.notes && (
        <p className="text-xs text-gray-500 mt-1">{component.notes}</p>
      )}
      {open && (
        <form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-2">
          <div className="flex gap-3 flex-wrap">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-0.5">Statut</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as Status)}
                className="border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-green-500"
              >
                <option value="ok">OK</option>
                <option value="moyen">Moyen</option>
                <option value="ko">KO</option>
              </select>
            </div>
            {component.quantity !== undefined && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-0.5">Quantité</label>
                <input
                  type="number"
                  min={0}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="border border-gray-300 rounded px-2 py-1 text-xs w-20 focus:outline-none focus:ring-1 focus:ring-green-500"
                />
              </div>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-0.5">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="border border-gray-300 rounded px-2 py-1 text-xs w-full focus:outline-none focus:ring-1 focus:ring-green-500"
            />
          </div>
          {message && <p className="text-xs text-green-700">{message}</p>}
          <button
            type="submit"
            disabled={saving}
            className="self-start bg-green-700 text-white px-3 py-1 rounded text-xs hover:bg-green-800 disabled:opacity-50"
          >
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </form>
      )}
    </div>
  )
}
