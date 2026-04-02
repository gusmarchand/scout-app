'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import StatusBadge from './StatusBadge'
import ExportButton from './ExportButton'
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
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<Status | ''>('')
  const [sortBy, setSortBy] = useState<'name' | 'status'>('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const searchTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)

  // Debounce search query
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearch(searchQuery)
    }, 300)

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [searchQuery])

  // Trigger search when debounced value changes
  useEffect(() => {
    setPage(1)
    fetchItems(selectedCategory, 1, debouncedSearch, statusFilter, sortBy, sortOrder)
  }, [debouncedSearch])

  async function fetchItems(categoryId: string, p: number, search?: string, status?: Status | '', sort?: string, order?: string) {
    setLoading(true)
    const params = new URLSearchParams({ page: String(p) })
    if (categoryId) params.set('categoryId', categoryId)
    if (search) params.set('search', search)
    if (status) params.set('status', status)
    if (sort) params.set('sortBy', sort)
    if (order) params.set('sortOrder', order)
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
    fetchItems(catId, 1, debouncedSearch, statusFilter, sortBy, sortOrder)
  }

  function handleSearch(query: string) {
    setSearchQuery(query)
    // Le debounce se charge de déclencher la recherche
  }

  function handleStatusFilter(status: Status | '') {
    setStatusFilter(status)
    setPage(1)
    fetchItems(selectedCategory, 1, debouncedSearch, status, sortBy, sortOrder)
  }

  function handleSort(field: 'name' | 'status') {
    const newOrder = sortBy === field && sortOrder === 'asc' ? 'desc' : 'asc'
    setSortBy(field)
    setSortOrder(newOrder)
    fetchItems(selectedCategory, page, debouncedSearch, statusFilter, field, newOrder)
  }

  function handlePrev() {
    const p = page - 1
    setPage(p)
    fetchItems(selectedCategory, p, debouncedSearch, statusFilter, sortBy, sortOrder)
  }

  function handleNext() {
    const p = page + 1
    setPage(p)
    fetchItems(selectedCategory, p, debouncedSearch, statusFilter, sortBy, sortOrder)
  }

  return (
    <div>
      {/* Barre de recherche et export */}
      <div className="mb-4 flex gap-2">
        <input
          type="search"
          placeholder="🔍 Rechercher un item... (raccourci: /)"
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0b7152] text-sm"
        />
        <ExportButton
          categoryId={selectedCategory}
          statusFilter={statusFilter}
          searchQuery={debouncedSearch}
        />
      </div>

      {/* Filtres */}
      <div className="mb-4 flex flex-wrap gap-3">
        {/* Filtre par statut */}
        <select
          value={statusFilter}
          onChange={(e) => handleStatusFilter(e.target.value as Status | '')}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0b7152]"
        >
          <option value="">Tous les statuts</option>
          <option value="ok">OK</option>
          <option value="moyen">Moyen</option>
          <option value="ko">KO</option>
        </select>

        {/* Tri */}
        <div className="flex gap-2">
          <button
            onClick={() => handleSort('name')}
            className={`px-3 py-2 border rounded-lg text-sm font-medium transition-colors ${
              sortBy === 'name'
                ? 'bg-logo-green text-white border-logo-green'
                : 'bg-white text-gray-700 border-gray-300 hover:border-green-500'
            }`}
          >
            Nom {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
          </button>
          <button
            onClick={() => handleSort('status')}
            className={`px-3 py-2 border rounded-lg text-sm font-medium transition-colors ${
              sortBy === 'status'
                ? 'bg-logo-green text-white border-logo-green'
                : 'bg-white text-gray-700 border-gray-300 hover:border-green-500'
            }`}
          >
            Statut {sortBy === 'status' && (sortOrder === 'asc' ? '↑' : '↓')}
          </button>
        </div>
      </div>

      {/* Filtre par catégorie */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => handleCategoryChange('')}
          className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors ${
            selectedCategory === ''
              ? 'bg-logo-green text-white border-logo-green'
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
                ? 'bg-logo-green text-white border-logo-green'
                : 'bg-white text-gray-700 border-gray-300 hover:border-green-500'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Liste des items */}
      {loading ? (
        <div className="bg-white rounded-xl shadow divide-y divide-gray-200">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="px-4 py-3 animate-pulse">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                  <div className="h-3 bg-gray-100 rounded w-1/4"></div>
                </div>
                <div className="h-6 w-16 bg-gray-200 rounded-full"></div>
              </div>
            </div>
          ))}
        </div>
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
