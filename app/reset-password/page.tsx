'use client'

import { useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'

function ResetForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token') ?? ''

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password !== confirm) { setError('Les mots de passe ne correspondent pas.'); return }
    if (password.length < 8) { setError('Le mot de passe doit faire au moins 8 caractères.'); return }

    setLoading(true)
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password }),
    })
    setLoading(false)

    if (res.ok) {
      setSuccess(true)
      setTimeout(() => router.push('/login'), 2000)
    } else {
      const json = await res.json()
      setError(json.error ?? 'Une erreur est survenue.')
    }
  }

  if (!token) {
    return (
      <p className="text-sm text-red-600 text-center">
        Lien invalide. <Link href="/forgot-password" className="underline">Refaire une demande</Link>
      </p>
    )
  }

  if (success) {
    return (
      <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded px-3 py-3 text-center">
        Mot de passe mis à jour. Redirection…
      </p>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Nouveau mot de passe</label>
        <input type="password" required minLength={8} value={password}
          onChange={e => setPassword(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          placeholder="8 caractères minimum"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Confirmer le mot de passe</label>
        <input type="password" required value={confirm}
          onChange={e => setConfirm(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          placeholder="Répète le mot de passe"
        />
      </div>
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>
      )}
      <button type="submit" disabled={loading}
        className="bg-green-700 text-white rounded-lg py-2 font-medium hover:bg-green-800 disabled:opacity-50"
      >
        {loading ? 'Mise à jour…' : 'Changer le mot de passe'}
      </button>
    </form>
  )
}

export default function ResetPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm bg-white rounded-xl shadow p-8">
        <h1 className="text-xl font-bold text-green-700 mb-6 text-center">Nouveau mot de passe</h1>
        <Suspense fallback={<p className="text-sm text-gray-500 text-center">Chargement…</p>}>
          <ResetForm />
        </Suspense>
      </div>
    </main>
  )
}
