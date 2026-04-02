'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import type { Role, Unit } from '@/types'

interface UserSummary {
  _id: string
  name: string
  email: string
  role: Role
  unit?: Unit
  createdAt: string
}

const ROLES: Role[] = ['admin', 'equipier', 'chef']
const UNITS: Unit[] = [
  'farfadets',
  'louveteaux-jeannettes',
  'scouts-guides',
  'pionniers-caravelles',
]

export default function AdminUsersPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [users, setUsers] = useState<UserSummary[]>([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [listError, setListError] = useState('')

  // Formulaire de création
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<Role>('chef')
  const [unit, setUnit] = useState<Unit | ''>('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')
  const [createSuccess, setCreateSuccess] = useState('')

  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true)
    setListError('')
    const res = await fetch('/api/users')
    setLoadingUsers(false)
    if (res.ok) {
      const json = await res.json()
      setUsers(json.users ?? json)
    } else {
      setListError('Impossible de charger la liste des utilisateurs.')
    }
  }, [])

  useEffect(() => {
    if (status === 'authenticated') {
      if (session?.user.role !== 'admin') {
        router.replace('/')
        return
      }
      fetchUsers()
    } else if (status === 'unauthenticated') {
      router.replace('/login')
    }
  }, [status, session, router, fetchUsers])

  if (status === 'loading') return null
  if (!session || session.user.role !== 'admin') return null

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreateError('')
    setCreateSuccess('')

    if (role === 'chef' && !unit) {
      setCreateError('L\'unité est obligatoire pour un chef.')
      return
    }

    setCreating(true)
    const body: Record<string, unknown> = { name, email, password, role }
    if (role === 'chef') body.unit = unit

    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    setCreating(false)

    if (res.ok) {
      setCreateSuccess('Compte créé avec succès.')
      setName('')
      setEmail('')
      setPassword('')
      setRole('chef')
      setUnit('')
      fetchUsers()
    } else {
      const err = await res.json().catch(() => ({}))
      setCreateError(err.error ?? 'Erreur lors de la création.')
    }
  }

  async function handleDelete(userId: string, userName: string) {
    if (!confirm(`Supprimer le compte de ${userName} ?`)) return
    const res = await fetch(`/api/users/${userId}`, { method: 'DELETE' })
    if (res.ok) {
      setUsers((prev) => prev.filter((u) => u._id !== userId))
      toast.success(`Compte de ${userName} supprimé`)
    } else {
      toast.error('Erreur lors de la suppression')
    }
  }

  const roleLabel: Record<Role, string> = {
    admin: 'Admin',
    equipier: 'Équipier',
    chef: 'Chef',
  }

  return (
    <main className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Gestion des utilisateurs</h1>

      {/* Formulaire de création */}
      <section className="bg-white rounded-xl shadow p-5 mb-8">
        <h2 className="text-base font-semibold text-gray-800 mb-4">Créer un compte</h2>
        <form onSubmit={handleCreate} className="flex flex-col gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Prénom Nom"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="utilisateur@exemple.fr"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="8 caractères minimum"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rôle</label>
              <select
                value={role}
                onChange={(e) => {
                  setRole(e.target.value as Role)
                  if (e.target.value !== 'chef') setUnit('')
                }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>{roleLabel[r]}</option>
                ))}
              </select>
            </div>
            {role === 'chef' && (
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Unité</label>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value as Unit)}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">— Sélectionner une unité —</option>
                  {UNITS.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
          {createError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
              {createError}
            </p>
          )}
          {createSuccess && (
            <p className="text-sm text-logo-green bg-green-50 border border-green-200 rounded px-3 py-2">
              {createSuccess}
            </p>
          )}
          <button
            type="submit"
            disabled={creating}
            className="self-start bg-logo-green text-white px-4 py-2 rounded-lg text-sm bg-logo-green-hover disabled:opacity-50"
          >
            {creating ? 'Création…' : 'Créer le compte'}
          </button>
        </form>
      </section>

      {/* Liste des utilisateurs */}
      <section className="bg-white rounded-xl shadow p-5">
        <h2 className="text-base font-semibold text-gray-800 mb-4">Utilisateurs existants</h2>
        {loadingUsers ? (
          <p className="text-sm text-gray-500">Chargement…</p>
        ) : listError ? (
          <p className="text-sm text-red-600">{listError}</p>
        ) : users.length === 0 ? (
          <p className="text-sm text-gray-500">Aucun utilisateur trouvé.</p>
        ) : (
          <ul className="divide-y divide-gray-200">
            {users.map((user) => (
              <li key={user._id} className="py-3 flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-sm text-gray-900">{user.name}</p>
                  <p className="text-xs text-gray-500">{user.email}</p>
                  <p className="text-xs text-gray-400">
                    {roleLabel[user.role]}
                    {user.unit ? ` · ${user.unit}` : ''}
                  </p>
                </div>
                {user._id !== session.user.id && (
                  <button
                    onClick={() => handleDelete(user._id, user.name)}
                    className="text-xs text-red-600 border border-red-200 px-2 py-1 rounded hover:bg-red-50"
                  >
                    Supprimer
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
