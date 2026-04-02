import type { Metadata, Viewport } from 'next'
import './globals.css'
import SessionProviderWrapper from '@/components/SessionProviderWrapper'
import NavBar from '@/components/NavBar'

export const metadata: Metadata = {
  title: 'Scout Group App',
  description: 'Gestion du matériel de camp pour groupes scouts',
  manifest: '/manifest.json',
  themeColor: '#15803d',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Scout App',
  },
}

export const viewport: Viewport = {
  themeColor: '#15803d',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <body className="min-h-screen bg-gray-50">
        <SessionProviderWrapper>
          <NavBar />
          {children}
        </SessionProviderWrapper>
      </body>
    </html>
  )
}
