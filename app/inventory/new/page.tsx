'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import type { Status } from '@/types'

interface Category {
  _id: string
  name: string
  componentTemplate: { key: string; label: string; isQuantified?: boolean }[]
}

type TentType = 'classique' | 'bateau' | 'autre'

export default function NewItemPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [categories, setCategories] = useState<Category[]>([])
  const [tab, setTab] = useState<'item' | 'category'>('item')

  // Formulaire item
  const [categoryId, setCategoryId] = useState('')
  const [name, setName] = useState('')
  const [type, setType] = useState('')
  const [globalStatus, setGlobalStatus] = useState<Status>('ok')
  const [notes, setNotes] = useState('')
  const [itemError, setItemError] = useState('')
  const [itemSuccess, setItemSuccess] = useState('')
  const [savingItem, setSavingItem] = useState(false)

  // Champs spécifiques tentes
  const [tentType, setTentType] = useState<TentType>('classique')
  const [tentPlaces, setTentPlaces] = useState<'6' | '8'>('6')
  const [tentTypeAutre, setTentTypeAutre] = useState('')

  // Formulaire catégorie
  const [catName, setCatName] = useState('')
  const [components, setComponents] = useState([{ key: '', label: '', isQuantified: false }])
  const [catError, setCatError] = useState('')
  const [catSuccess, setCatSuccess] = useState('')
  const [savingCat, setSavingCat] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/login')
    if (status === 'authenticated') {
      const role = session?.user.role
      if (role !== 'admin' && role !== 'equipier') router.replace('/')
      else fetchCategories()
    }
  }, [status, session, router])

  async function fetchCategories() {
    const res = await fetch('/api/equipment/categories')
    if (res.ok) {
      const json = await res.json()
      setCategories(json)
    }
  }

  const selectedCategory = categories.find(c => c._id === categoryId)
  const isTentCategory = selectedCategory?.name.toLowerCase().includes('tente')

  function computeTentType(): string {
    if (tentType === 'autre') return tentTypeAutre || 'autre'
    return `${tentType} ${tentPlaces} places`
  }

  async function handleCreateItem(e: React.FormEvent) {
    e.preventDefault()
    setItemError('')
    setItemSuccess('')
    if (!categoryId) { setItemError('Sélectionne une catégorie.'); return }
    const finalType = isTentCategory ? computeTentType() : (type || undefined)
    setSavingItem(true)
    const res = await fetch('/api/equipment/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        categoryId, name, type: finalType, globalStatus,
        notes: notes || undefined, updatedBy: session?.user.id,
      }),
    })
    setSavingItem(false)
    if (res.ok) {
      setItemSuccess(`"${name}" ajouté avec succès.`)
      setName(''); setType(''); setNotes(''); setGlobalStatus('ok')
      setTentType('classique'); setTentPlaces('6'); setTentTypeAutre('')
    } else {
      const err = await res.json().catch(() => ({}))
      setItemError(err.error ?? 'Erreur lors de la création.')
    }
  }

  async function handleCreateCategory(e: React.FormEvent) {
    e.preventDefault()
    setCatError(''); setCatSuccess('')
    const validComponents = components.filter(c => c.key && c.label)
    if (validComponents.length === 0) { setCatError('Ajoute au moins un composant.'); return }
    setSavingCat(true)
    const res = await fetch('/api/equipment/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: catName, componentTemplate: validComponents }),
    })
    setSavingCat(false)
    if (res.ok) {
      setCatSuccess(`Catégorie "${catName}" créée.`)
      setCatName(''); setComponents([{ key: '', label: '', isQuantified: false }])
      fetchCategories()
    } else {
      const err = await res.json().catch(() => ({}))
      setCatError(err.error ?? 'Erreur lors de la création.')
    }
  }

  if (status === 'loading') return null

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Ajouter du matériel</h1>
        <button onClick={() => router.push('/inventory')} className="self-start sm:self-auto text-sm text-logo-green hover:underline">
          ← Retour à l&apos;inventaire
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-6">
        {(['item', 'category'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === t ? 'bg-logo-green text-white' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'}`}
          >
            {t === 'item' ? 'Nouvel équipement' : 'Nouvelle catégorie'}
          </button>
        ))}
      </div>

      {tab === 'item' && (
        <section className="bg-white rounded-xl shadow p-5">
          <form onSubmit={handleCreateItem} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie</label>
              {categories.length === 0 ? (
                <p className="text-sm text-orange-600">Aucune catégorie — crée-en une d&apos;abord.</p>
              ) : (
                <select value={categoryId} onChange={e => setCategoryId(e.target.value)} required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">— Sélectionner —</option>
                  {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} required
                placeholder={isTentCategory ? 'ex : Tente 03' : 'Nom de l\'équipement'}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            {isTentCategory ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Type de tente</label>
                  <div className="flex flex-col xs:flex-row gap-4">
                    {(['classique', 'bateau', 'autre'] as TentType[]).map(t => (
                      <label key={t} className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="tentType" value={t} checked={tentType === t}
                          onChange={() => setTentType(t)} className="accent-[#0b7152]"
                        />
                        <span className="text-sm capitalize">{t}</span>
                      </label>
                    ))}
                  </div>
                  {tentType === 'autre' && (
                    <input type="text" value={tentTypeAutre} onChange={e => setTentTypeAutre(e.target.value)}
                      placeholder="Préciser le type"
                      className="mt-2 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  )}
                </div>
                {tentType !== 'autre' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Nombre de places</label>
                    <div className="flex flex-col xs:flex-row gap-4">
                      {(['6', '8'] as const).map(p => (
                        <label key={p} className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" name="tentPlaces" value={p} checked={tentPlaces === p}
                            onChange={() => setTentPlaces(p)} className="accent-[#0b7152]"
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Type <span className="text-gray-400">(optionnel)</span></label>
                <input type="text" value={type} onChange={e => setType(e.target.value)}
                  placeholder="ex : grand, petit"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">État initial</label>
              <select value={globalStatus} onChange={e => setGlobalStatus(e.target.value as Status)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="ok">OK</option>
                <option value="moyen">Moyen</option>
                <option value="ko">KO</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes <span className="text-gray-400">(optionnel)</span></label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            {itemError && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{itemError}</p>}
            {itemSuccess && <p className="text-sm text-logo-green bg-green-50 border border-green-200 rounded px-3 py-2">{itemSuccess}</p>}
            <button type="submit" disabled={savingItem || categories.length === 0}
              className="self-start bg-logo-green text-white px-4 py-2 rounded-lg text-sm bg-logo-green-hover disabled:opacity-50"
            >
              {savingItem ? 'Création…' : "Ajouter l'équipement"}
            </button>
          </form>
        </section>
      )}

      {tab === 'category' && (
        <section className="bg-white rounded-xl shadow p-5">
          <form onSubmit={handleCreateCategory} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom de la catégorie</label>
              <input type="text" value={catName} onChange={e => setCatName(e.target.value)} required
                placeholder="ex : Tentes, Cuisine de camp"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Composants</label>
              <div className="flex flex-col gap-3">
                {components.map((comp, i) => (
                  <div key={i} className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center border sm:border-0 border-gray-200 p-3 sm:p-0 rounded-lg sm:rounded-none">
                    <input type="text" placeholder="Clé (ex: toit)" value={comp.key}
                      onChange={e => { const c = [...components]; c[i].key = e.target.value.toLowerCase().replace(/\s+/g, '_'); setComponents(c) }}
                      className="flex-1 min-w-0 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                    <input type="text" placeholder="Label (ex: Toit)" value={comp.label}
                      onChange={e => { const c = [...components]; c[i].label = e.target.value; setComponents(c) }}
                      className="flex-1 min-w-0 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                    <label className="flex items-center gap-1 text-xs text-gray-600 whitespace-nowrap">
                      <input type="checkbox" checked={comp.isQuantified}
                        onChange={e => { const c = [...components]; c[i].isQuantified = e.target.checked; setComponents(c) }}
                      /> Quantité
                    </label>
                    {components.length > 1 && (
                      <button type="button" onClick={() => setComponents(components.filter((_, j) => j !== i))}
                        className="sm:ml-auto text-red-500 hover:text-red-700 text-lg leading-none self-end sm:self-auto"
                      >×</button>
                    )}
                  </div>
                ))}
              </div>
              <button type="button"
                onClick={() => setComponents([...components, { key: '', label: '', isQuantified: false }])}
                className="mt-2 text-sm text-logo-green hover:underline"
              >
                + Ajouter un composant
              </button>
            </div>
            {catError && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{catError}</p>}
            {catSuccess && <p className="text-sm text-logo-green bg-green-50 border border-green-200 rounded px-3 py-2">{catSuccess}</p>}
            <button type="submit" disabled={savingCat}
              className="self-start bg-logo-green text-white px-4 py-2 rounded-lg text-sm bg-logo-green-hover disabled:opacity-50"
            >
              {savingCat ? 'Création…' : 'Créer la catégorie'}
            </button>
          </form>
        </section>
      )}
    </main>
  )
}
