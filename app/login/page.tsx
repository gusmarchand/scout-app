'use client'

import { useState, useEffect } from 'react'
import { signIn, useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (status === 'authenticated') {
      router.replace('/')
    }
  }, [status, router])

  if (status === 'loading' || session) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const result = await signIn('credentials', {
      email,
      password,
      callbackUrl: '/',
      redirect: false,
    })

    setLoading(false)

    if (result?.error) {
      setError('Identifiants incorrects. Veuillez réessayer.')
    } else if (result?.url) {
      router.push(result.url)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm bg-white rounded-xl shadow p-8">
        <h1 className="text-2xl font-bold text-logo-navy mb-6 text-center">
          🏕️ Matos Alice Gillig
        </h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Adresse e-mail
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0b7152]"
              placeholder="vous@exemple.fr"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Mot de passe
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0b7152]"
              placeholder="••••••••"
            />
          </div>
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="bg-logo-green text-white rounded-lg py-2 font-medium bg-logo-green-hover disabled:opacity-50 transition-colors"
          >
            {loading ? 'Connexion…' : 'Se connecter'}
          </button>
          <Link href="/forgot-password" className="text-sm text-center text-gray-500 hover:underline">
            Mot de passe oublié ?
          </Link>
        </form>
      </div>
    </main>
  )
}
