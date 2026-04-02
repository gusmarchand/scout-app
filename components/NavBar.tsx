'use client'

import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import { useState, useEffect, useRef } from 'react'

export default function NavBar() {
  const { data: session } = useSession()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  // Fermer le menu quand on clique à l'extérieur
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        mobileMenuOpen &&
        menuRef.current &&
        buttonRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setMobileMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [mobileMenuOpen])

  if (!session) return null

  return (
    <nav className="bg-logo-navy text-white shadow relative">
      <div className="px-4 py-3 flex items-center justify-between">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 font-bold text-lg tracking-tight"
          onClick={() => setMobileMenuOpen(false)}
        >
          <img
            src="/icons/nag_logo.png"
            alt="Logo Alice Gillig"
            className="w-8 h-8 object-contain"
          />
          <span className="hidden sm:inline">Matos Alice Gillig</span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-6">
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
          <div className="flex items-center gap-3 text-sm ml-4">
            <span className="opacity-80">{session.user.name}</span>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="bg-white text-logo-green px-3 py-1 rounded hover:bg-gray-100 font-medium"
            >
              Déconnexion
            </button>
          </div>
        </div>

        {/* Mobile Burger Button */}
        <button
          ref={buttonRef}
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 rounded hover:bg-white/10 transition-colors relative z-50"
          aria-label="Menu"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            {mobileMenuOpen ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile Menu - Overlay with smooth animation */}
      <div
        ref={menuRef}
        className={`md:hidden absolute top-full left-0 right-0 bg-logo-navy border-t border-white/20 shadow-lg z-40 overflow-hidden transition-all duration-300 ease-in-out ${
          mobileMenuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="px-4 py-3 flex flex-col gap-3">
          <Link
            href="/inventory"
            className="py-2 hover:underline text-sm"
            onClick={() => setMobileMenuOpen(false)}
          >
            Inventaire
          </Link>
          <Link
            href="/reservations/new"
            className="py-2 hover:underline text-sm"
            onClick={() => setMobileMenuOpen(false)}
          >
            Réservation
          </Link>
          {session.user.role === 'admin' && (
            <Link
              href="/admin/users"
              className="py-2 hover:underline text-sm"
              onClick={() => setMobileMenuOpen(false)}
            >
              Utilisateurs
            </Link>
          )}
          <div className="pt-3 border-t border-white/20 flex flex-col gap-2">
            <span className="text-sm opacity-80">{session.user.name}</span>
            <button
              onClick={() => {
                setMobileMenuOpen(false)
                signOut({ callbackUrl: '/login' })
              }}
              className="bg-white text-logo-green px-3 py-2 rounded hover:bg-gray-100 font-medium text-sm self-start"
            >
              Déconnexion
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}
