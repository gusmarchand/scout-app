'use client'

import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'

export default function NavBar() {
  const { data: session } = useSession()

  if (!session) return null

  return (
    <nav className="bg-green-700 text-white px-4 py-3 flex items-center justify-between shadow">
      <div className="flex items-center gap-6">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg tracking-tight">
          <img
            src="/icons/nag_logo.png"
            alt="Logo Alice Gillig"
            className="w-8 h-8 object-contain"
          />
          <span>Matos Alice Gillig</span>
        </Link>
        <Link href="/inventory" className="hover:underline text-sm">
          Inventaire
        </Link>
        <Link href="/reservations/new" className="hover:underline text-sm">
          Réservation
        </Link>
        {session.user.role === 'admin' && (
          <Link href="/admin/users" className="hover:underline text-sm">
            Utilisateurs
          </Link>
        )}
      </div>
      <div className="flex items-center gap-3 text-sm">
        <span className="opacity-80">{session.user.name}</span>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="bg-white text-green-700 px-3 py-1 rounded hover:bg-green-100 font-medium"
        >
          Déconnexion
        </button>
      </div>
    </nav>
  )
}
