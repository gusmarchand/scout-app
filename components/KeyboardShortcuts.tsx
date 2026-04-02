'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

export default function KeyboardShortcuts() {
  const pathname = usePathname()

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // "/" : focus sur la recherche (page inventaire uniquement)
      if (e.key === '/' && pathname === '/inventory') {
        e.preventDefault()
        const searchInput = document.querySelector<HTMLInputElement>('input[type="search"]')
        if (searchInput) {
          searchInput.focus()
          searchInput.select()
        }
      }

      // "Esc" : fermer les modales/overlays
      if (e.key === 'Escape') {
        // Fermer le menu mobile si ouvert
        const mobileMenu = document.querySelector('[data-mobile-menu="true"]')
        if (mobileMenu && !mobileMenu.classList.contains('hidden')) {
          const closeButton = mobileMenu.querySelector('button[aria-label="Fermer le menu"]')
          if (closeButton instanceof HTMLElement) {
            closeButton.click()
          }
        }

        // Fermer les previews de photo si ouvert (modal avec z-50)
        const photoPreview = document.querySelector('.fixed.z-50 button')
        if (photoPreview instanceof HTMLElement && photoPreview.textContent?.includes('Annuler')) {
          photoPreview.click()
        }

        // Déselectionner le champ de recherche actif
        const activeElement = document.activeElement
        if (activeElement instanceof HTMLInputElement && activeElement.type === 'search') {
          activeElement.blur()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [pathname])

  return null
}
