import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { authOptions } from '@/lib/authOptions'
import { connectDB } from '@/lib/mongodb'
import { Category } from '@/models/Category'
import { Item } from '@/models/Item'
import InventoryClient from './InventoryClient'

async function getCategories() {
  await connectDB()
  return Category.find().lean() as any
}

async function getItems(categoryId = '', page = 1) {
  await connectDB()
  const limit = 20
  const skip = (page - 1) * limit
  const filter = categoryId ? { categoryId } : {}
  const [items, total] = await Promise.all([
    Item.find(filter).sort({ priority: 1, name: 1 }).skip(skip).limit(limit).lean() as any,
    Item.countDocuments(filter),
  ])
  return { items, total, page, totalPages: Math.ceil(total / limit) }
}

export default async function InventoryPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const [categories, initialItems] = await Promise.all([
    getCategories(),
    getItems(),
  ])

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Inventaire du matériel</h1>
        {(session.user.role === 'admin' || session.user.role === 'equipier') && (
          <Link
            href="/inventory/new"
            className="bg-logo-green text-white px-4 py-2 rounded-lg text-sm bg-logo-green-hover"
          >
            + Ajouter
          </Link>
        )}
      </div>
      <InventoryClient
        categories={categories}
        initialItems={initialItems}
        initialCategoryId=""
      />
    </main>
  )
}
