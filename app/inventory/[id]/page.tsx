import { getServerSession } from 'next-auth'
import { redirect, notFound } from 'next/navigation'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { connectDB } from '@/lib/mongodb'
import { Item as ItemModel } from '@/models/Item'
import StatusBadge from '../StatusBadge'
import ItemStatusForm from './ItemStatusForm'
import ComponentForm from './ComponentForm'
import PhotoSection from './PhotoSection'
import type { Item, Component } from '@/types'

async function getItem(id: string): Promise<Item | null> {
  try {
    await connectDB()
    const item = await ItemModel.findById(id).lean()
    return item as unknown as Item | null
  } catch {
    return null
  }
}

export default async function ItemDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const item = await getItem(params.id)
  if (!item) notFound()

  const canEdit = session.user.role === 'admin' || session.user.role === 'equipier'

  return (
    <main className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-2">
        <h1 className="text-2xl font-bold text-gray-900">{item.name}</h1>
        <StatusBadge status={item.globalStatus} />
      </div>
      {item.notes && <p className="text-sm text-gray-600 mb-6">{item.notes}</p>}

      {/* Mise à jour du statut global */}
      {canEdit && (
        <section className="bg-white rounded-xl shadow p-5 mb-6">
          <h2 className="text-base font-semibold text-gray-800 mb-3">Statut global</h2>
          <ItemStatusForm
            itemId={String(item._id)}
            currentStatus={item.globalStatus}
            currentNotes={item.notes}
          />
        </section>
      )}

      {/* Composants */}
      <section className="bg-white rounded-xl shadow p-5 mb-6">
        <h2 className="text-base font-semibold text-gray-800 mb-3">Composants</h2>
        {item.components.length === 0 ? (
          <p className="text-sm text-gray-500">Aucun composant.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {item.components.map((comp: Component) => (
              <div key={comp.key}>
                {canEdit ? (
                  <ComponentForm itemId={String(item._id)} component={comp} />
                ) : (
                  <div className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{comp.label}</span>
                      <StatusBadge status={comp.status} />
                      {comp.quantity !== undefined && (
                        <span className="text-xs text-gray-500">
                          Qté : {comp.quantity}
                          {comp.quantityExpected ? ` / ${comp.quantityExpected}` : ''}
                        </span>
                      )}
                    </div>
                    {comp.notes && <p className="text-xs text-gray-500 mt-1">{comp.notes}</p>}
                  </div>
                )}
                {/* Photos du composant */}
                <div className="mt-2 pl-1">
                  <PhotoSection
                    itemId={String(item._id)}
                    componentKey={comp.key}
                    photos={comp.photos ?? []}
                    canEdit={canEdit}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
