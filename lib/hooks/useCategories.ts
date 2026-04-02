import { useQuery } from '@tanstack/react-query'

interface Category {
  _id: string
  name: string
}

async function fetchCategories(): Promise<Category[]> {
  const res = await fetch('/api/equipment/categories')
  if (!res.ok) throw new Error('Failed to fetch categories')
  return res.json()
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
    staleTime: 10 * 60 * 1000, // 10 minutes (les catégories changent rarement)
  })
}
