'use client'

import { useState } from 'react'
import { utils, writeFile } from 'xlsx'
import { toast } from 'sonner'

interface Props {
  categoryId?: string
  statusFilter?: string
  searchQuery?: string
}

export default function ExportButton({ categoryId, statusFilter, searchQuery }: Props) {
  const [exporting, setExporting] = useState(false)

  async function handleExport() {
    setExporting(true)
    try {
      // Récupérer tous les items (sans pagination)
      const params = new URLSearchParams()
      if (categoryId) params.set('categoryId', categoryId)
      if (statusFilter) params.set('status', statusFilter)
      if (searchQuery) params.set('search', searchQuery)
      params.set('limit', '10000') // Récupérer tous les items

      const res = await fetch(`/api/equipment/items?${params}`)
      if (!res.ok) throw new Error('Erreur lors de la récupération des items')

      const data = await res.json()
      const items = data.items

      // Récupérer les catégories pour le mapping
      const categoriesRes = await fetch('/api/equipment/categories')
      const categories = await categoriesRes.json()
      const categoryMap = new Map(categories.map((c: { _id: string; name: string }) => [c._id, c.name]))

      // Récupérer les détails complets de chaque item (avec composants)
      const detailedItems = await Promise.all(
        items.map(async (item: { _id: string }) => {
          const itemRes = await fetch(`/api/equipment/items/${item._id}`)
          return itemRes.json()
        })
      )

      // Préparer les données pour Excel
      const rows = []

      for (const item of detailedItems) {
        const categoryName = categoryMap.get(item.categoryId) || 'N/A'

        // Si l'item a des composants, créer une ligne par composant
        if (item.components && item.components.length > 0) {
          for (const comp of item.components) {
            rows.push({
              'Catégorie': categoryName,
              'Item': item.name,
              'Type': item.type || '',
              'Statut Global': item.globalStatus.toUpperCase(),
              'Composant': comp.label,
              'Statut Composant': comp.status.toUpperCase(),
              'Quantité': comp.quantity ?? '',
              'Quantité attendue': comp.quantityExpected ?? '',
              'Notes Composant': comp.notes || '',
              'Photos': comp.photos?.length || 0,
              'Notes Item': item.notes || '',
              'Dernière maj': new Date(item.updatedAt).toLocaleDateString('fr-FR'),
            })
          }
        } else {
          // Sinon, créer une seule ligne pour l'item
          rows.push({
            'Catégorie': categoryName,
            'Item': item.name,
            'Type': item.type || '',
            'Statut Global': item.globalStatus.toUpperCase(),
            'Composant': '',
            'Statut Composant': '',
            'Quantité': '',
            'Quantité attendue': '',
            'Notes Composant': '',
            'Photos': 0,
            'Notes Item': item.notes || '',
            'Dernière maj': new Date(item.updatedAt).toLocaleDateString('fr-FR'),
          })
        }
      }

      // Créer le workbook et la feuille
      const worksheet = utils.json_to_sheet(rows)
      const workbook = utils.book_new()
      utils.book_append_sheet(workbook, worksheet, 'Inventaire')

      // Ajuster la largeur des colonnes
      const cols = [
        { wch: 15 }, // Catégorie
        { wch: 25 }, // Item
        { wch: 15 }, // Type
        { wch: 12 }, // Statut Global
        { wch: 20 }, // Composant
        { wch: 15 }, // Statut Composant
        { wch: 10 }, // Quantité
        { wch: 15 }, // Quantité attendue
        { wch: 30 }, // Notes Composant
        { wch: 8 },  // Photos
        { wch: 30 }, // Notes Item
        { wch: 12 }, // Dernière maj
      ]
      worksheet['!cols'] = cols

      // Télécharger le fichier
      const filename = `inventaire_${new Date().toISOString().split('T')[0]}.xlsx`
      writeFile(workbook, filename)

      toast.success(`Export Excel réussi : ${rows.length} ligne(s)`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erreur lors de l\'export')
    } finally {
      setExporting(false)
    }
  }

  return (
    <button
      onClick={handleExport}
      disabled={exporting}
      className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors flex items-center gap-2"
    >
      {exporting ? (
        <>
          <span className="animate-spin">⏳</span>
          Export en cours...
        </>
      ) : (
        <>
          📊 Exporter Excel
        </>
      )}
    </button>
  )
}
