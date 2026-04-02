'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

interface Props {
  itemId: string
  itemName: string
}

export default function CopyButton({ itemId, itemName }: Props) {
  const router = useRouter()
  const [copying, setCopying] = useState(false)

  async function handleCopy() {
    setCopying(true)

    try {
      // 1. Récupérer l'item original
      const itemRes = await fetch(`/api/equipment/items/${itemId}`)
      if (!itemRes.ok) throw new Error('Item introuvable')
      const item = await itemRes.json()

      // 2. Créer une copie
      const copyRes = await fetch('/api/equipment/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId: item.categoryId,
          name: `${item.name} (copie)`,
          type: item.type,
          globalStatus: item.globalStatus,
          notes: item.notes || '',
          updatedBy: item.updatedBy,
        }),
      })

      if (!copyRes.ok) {
        const err = await copyRes.json()
        throw new Error(err.error ?? 'Erreur lors de la copie')
      }

      const newItem = await copyRes.json()
      toast.success(`Item dupliqué : "${newItem.name}"`)
      router.push(`/inventory/${newItem._id}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la copie')
      setCopying(false)
    }
  }

  return (
    <button
      onClick={handleCopy}
      disabled={copying}
      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors"
    >
      {copying ? '⏳ Copie...' : '📋 Dupliquer'}
    </button>
  )
}
