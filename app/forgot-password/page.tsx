'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError(''); setMessage('')

    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })

    setLoading(false)
    const json = await res.json()
    if (res.ok) setMessage(json.message)
    else setError(json.error ?? 'Une erreur est survenue.')
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm bg-white rounded-xl shadow p-8">
        <h1 className="text-xl font-bold text-green-700 mb-2 text-center">Mot de passe oublié</h1>
        <p className="text-sm text-gray-500 text-center mb-6">
          Saisis ton adresse email pour recevoir un lien de réinitialisation.
        </p>

        {message ? (
          <div className="text-center">
            <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded px-3 py-3 mb-4">
              {message}
            </p>
            <Link href="/login" className="text-sm text-green-700 hover:underline">
              Retour à la connexion
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Adresse e-mail
              </label>
              <input
                id="email" type="email" required value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="vous@exemple.fr"
              />
            </div>
            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
                {error}
              </p>
            )}
            <button type="submit" disabled={loading}
              className="bg-green-700 text-white rounded-lg py-2 font-medium hover:bg-green-800 disabled:opacity-50"
            >
              {loading ? 'Envoi…' : 'Envoyer le lien'}
            </button>
            <Link href="/login" className="text-sm text-center text-gray-500 hover:underline">
              Retour à la connexion
            </Link>
          </form>
        )}
      </div>
    </main>
  )
}
