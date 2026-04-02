'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import Breadcrumbs from '@/components/Breadcrumbs'
import type { Status } from '@/types'

interface Item {
  _id: string
  categoryId: string
  name: string
  type?: string
  globalStatus: Status
  notes: string
}

type TentType = 'classique' | 'bateau' | 'autre'

export default function EditItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { data: session, status: authStatus } = useSession()
  const router = useRouter()

  const [itemId, setItemId] = useState<string | null>(null)
  const [item, setItem] = useState<Item | null>(null)
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [type, setType] = useState('')
  const [globalStatus, setGlobalStatus] = useState<Status>('ok')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  // Champs spécifiques tentes
  const [isTentCategory, setIsTentCategory] = useState(false)
  const [tentType, setTentType] = useState<TentType>('classique')
  const [tentPlaces, setTentPlaces] = useState<'6' | '8'>('6')
  const [tentTypeAutre, setTentTypeAutre] = useState('')

  useEffect(() => {
    params.then((p) => setItemId(p.id))
  }, [params])

  useEffect(() => {
    if (authStatus === 'unauthenticated') router.replace('/login')
    if (authStatus === 'authenticated' && itemId) {
      const role = session?.user.role
      if (role !== 'admin' && role !== 'equipier') router.replace('/')
      else fetchItem()
    }
  }, [authStatus, session, router, itemId])

  async function fetchItem() {
    if (!itemId) return
    setLoading(true)
    const res = await fetch(`/api/equipment/items/${itemId}`)
    if (res.ok) {
      const data = await res.json()
      setItem(data)
      setName(data.name)
      setType(data.type || '')
      setGlobalStatus(data.globalStatus)
      setNotes(data.notes || '')

      // Déterminer si c'est une tente
      const categoryRes = await fetch(`/api/equipment/categories`)
      if (categoryRes.ok) {
        const categories = await categoryRes.json()
        const category = categories.find((c: any) => c._id === data.categoryId)
        const isTent = category?.name.toLowerCase().includes('tente')
        setIsTentCategory(isTent)

        // Parser le type de tente
        if (isTent && data.type) {
          if (data.type.includes('classique')) {
            setTentType('classique')
            setTentPlaces(data.type.includes('8') ? '8' : '6')
          } else if (data.type.includes('bateau')) {
            setTentType('bateau')
            setTentPlaces(data.type.includes('8') ? '8' : '6')
          } else {
            setTentType('autre')
            setTentTypeAutre(data.type)
          }
        }
      }
    } else {
      toast.error('Item introuvable')
      router.push('/inventory')
    }
    setLoading(false)
  }

  function computeTentType(): string {
    if (tentType === 'autre') return tentTypeAutre || 'autre'
    return `${tentType} ${tentPlaces} places`
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!itemId) return
    setSaving(true)

    const finalType = isTentCategory ? computeTentType() : (type || undefined)

    const res = await fetch(`/api/equipment/items/${itemId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        type: finalType,
        globalStatus,
        notes: notes || undefined,
        updatedBy: session?.user.id,
      }),
    })

    setSaving(false)

    if (res.ok) {
      toast.success('Item modifié avec succès')
      router.push(`/inventory/${itemId}`)
    } else {
      const err = await res.json().catch(() => ({}))
      toast.error(err.error ?? 'Erreur lors de la modification')
    }
  }

  if (authStatus === 'loading' || loading) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-8">
        <p className="text-gray-500">Chargement…</p>
      </main>
    )
  }

  if (!item) return null

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <Breadcrumbs
        items={[
          { label: 'Inventaire', href: '/inventory' },
          { label: item.name, href: `/inventory/${itemId}` },
          { label: 'Modifier' },
        ]}
      />
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Modifier l'item</h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow p-6 flex flex-col gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0b7152]"
            placeholder="Ex: Tente Patrouille, Popote 6L, etc."
          />
        </div>

        {isTentCategory ? (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Type de tente</label>
              <div className="flex flex-wrap gap-3">
                {(['classique', 'bateau', 'autre'] as TentType[]).map((t) => (
                  <label key={t} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={tentType === t}
                      onChange={() => setTentType(t)}
                      className="accent-[#0b7152]"
                    />
                    <span className="text-sm capitalize">{t}</span>
                  </label>
                ))}
              </div>
            </div>

            {tentType === 'autre' ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Préciser le type</label>
                <input
                  type="text"
                  value={tentTypeAutre}
                  onChange={(e) => setTentTypeAutre(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0b7152]"
                  placeholder="Type personnalisé"
                />
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nombre de places</label>
                <div className="flex gap-3">
                  {(['6', '8'] as ('6' | '8')[]).map((p) => (
                    <label key={p} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={tentPlaces === p}
                        onChange={() => setTentPlaces(p)}
                        className="accent-[#0b7152]"
                      />
                      <span className="text-sm">{p} places</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type / Modèle</label>
            <input
              type="text"
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0b7152]"
              placeholder="Optionnel"
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Statut global</label>
          <select
            value={globalStatus}
            onChange={(e) => setGlobalStatus(e.target.value as Status)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0b7152]"
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
            rows={3}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0b7152]"
            placeholder="Remarques, observations…"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-logo-green text-white rounded-lg text-sm font-medium bg-logo-green-hover disabled:opacity-50"
          >
            {saving ? 'Enregistrement…' : 'Enregistrer les modifications'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
          >
            Annuler
          </button>
        </div>
      </form>
    </main>
  )
}
