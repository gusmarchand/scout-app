'use client'

import { useState } from 'react'
import Link from 'next/link'
import StatusBadge from './StatusBadge'
import type { Status } from '@/types'

interface ItemSummary {
  _id: string
  name: string
  globalStatus: Status
  type?: string
}

interface Category {
  _id: string
  name: string
}

interface PaginatedItems {
  items: ItemSummary[]
  total: number
  page: number
  totalPages: number
}

interface Props {
  categories: Category[]
  initialItems: PaginatedItems
  initialCategoryId: string
}

export default function InventoryClient({ categories, initialItems, initialCategoryId }: Props) {
  const [selectedCategory, setSelectedCategory] = useState(initialCategoryId)
  const [page, setPage] = useState(1)
  const [data, setData] = useState<PaginatedItems>(initialItems)
  const [loading, setLoading] = useState(false)

  async function fetchItems(categoryId: string, p: number) {
    setLoading(true)
    const params = new URLSearchParams({ page: String(p) })
    if (categoryId) params.set('categoryId', categoryId)
    const res = await fetch(`/api/equipment/items?${params}`)
    if (res.ok) {
      const json = await res.json()
      setData(json)
    }
    setLoading(false)
  }

  function handleCategoryChange(catId: string) {
    setSelectedCategory(catId)
    setPage(1)
    fetchItems(catId, 1)
  }

  function handlePrev() {
    const p = page - 1
    setPage(p)
    fetchItems(selectedCategory, p)
  }

  function handleNext() {
    const p = page + 1
    setPage(p)
    fetchItems(selectedCategory, p)
  }

  return (
    <div>
      {/* Filtre par catégorie */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => handleCategoryChange('')}
          className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors ${
            selectedCategory === ''
              ? 'bg-green-700 text-white border-green-700'
              : 'bg-white text-gray-700 border-gray-300 hover:border-green-500'
          }`}
        >
          Toutes
        </button>
        {categories.map((cat) => (
          <button
            key={cat._id}
            onClick={() => handleCategoryChange(cat._id)}
            className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors ${
              selectedCategory === cat._id
                ? 'bg-green-700 text-white border-green-700'
                : 'bg-white text-gray-700 border-gray-300 hover:border-green-500'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Liste des items */}
      {loading ? (
        <p className="text-gray-500 text-sm">Chargement…</p>
      ) : data.items.length === 0 ? (
        <p className="text-gray-500 text-sm">Aucun item trouvé.</p>
      ) : (
        <ul className="divide-y divide-gray-200 bg-white rounded-xl shadow">
          {data.items.map((item) => (
            <li key={item._id}>
              <Link
                href={`/inventory/${item._id}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
              >
                <div>
                  <span className="font-medium text-gray-900">{item.name}</span>
                  {item.type && (
                    <span className="ml-2 text-xs text-gray-500">{item.type}</span>
                  )}
                </div>
                <StatusBadge status={item.globalStatus} />
              </Link>
            </li>
          ))}
        </ul>
      )}

      {/* Pagination */}
      {data.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <button
            onClick={handlePrev}
            disabled={page <= 1}
            className="px-4 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40"
          >
            ← Précédent
          </button>
          <span className="text-sm text-gray-600">
            Page {page} / {data.totalPages}
          </span>
          <button
            onClick={handleNext}
            disabled={page >= data.totalPages}
            className="px-4 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40"
          >
            Suivant →
          </button>
        </div>
      )}
    </div>
  )
}
