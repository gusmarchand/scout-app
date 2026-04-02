import type { Metadata, Viewport } from 'next'
import './globals.css'
import SessionProviderWrapper from '@/components/SessionProviderWrapper'
import QueryProvider from '@/components/QueryProvider'
import NavBar from '@/components/NavBar'
import KeyboardShortcuts from '@/components/KeyboardShortcuts'
import { Toaster } from 'sonner'

export const metadata: Metadata = {
  title: 'Matos Alice Gillig',
  description: 'Gestion du matériel de camp - Groupe Alice Gillig',
  manifest: '/manifest.json',
  themeColor: '#0a3a5b',
  icons: {
    icon: [
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Matos Alice Gillig',
  },
}

export const viewport: Viewport = {
  themeColor: '#0a3a5b',
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
        <QueryProvider>
          <SessionProviderWrapper>
            <NavBar />
            <KeyboardShortcuts />
            {children}
            <Toaster position="top-right" richColors />
          </SessionProviderWrapper>
        </QueryProvider>
      </body>
    </html>
  )
}
