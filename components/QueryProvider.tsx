'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'

export default function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // Les données sont considérées fraîches pendant 1 min
            gcTime: 5 * 60 * 1000, // Cache gardé pendant 5 min
            refetchOnWindowFocus: false, // Pas de refetch au focus (trop agressif)
            retry: 1, // 1 seule retry en cas d'erreur
          },
        },
      })
  )

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
