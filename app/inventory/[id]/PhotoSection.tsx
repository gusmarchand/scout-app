'use client'

import { useState } from 'react'
import Image from 'next/image'
import type { Photo } from '@/types'

interface Props {
  itemId: string
  componentKey: string
  photos: Photo[]
  canEdit: boolean
}

export default function PhotoSection({ itemId, componentKey, photos: initialPhotos, canEdit }: Props) {
  const [photos, setPhotos] = useState<Photo[]>(initialPhotos)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError('')

    try {
      // 1. Obtenir la signature Cloudinary
      const signRes = await fetch(
        `/api/equipment/items/${itemId}/components/${componentKey}/photos/sign`
      )
      if (!signRes.ok) throw new Error('Impossible d\'obtenir la signature.')
      const { signature, timestamp, cloudName, apiKey, folder } = await signRes.json()

      // 2. Upload vers Cloudinary
      const formData = new FormData()
      formData.append('file', file)
      formData.append('signature', signature)
      formData.append('timestamp', String(timestamp))
      formData.append('api_key', apiKey)
      if (folder) formData.append('folder', folder)

      const uploadRes = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        { method: 'POST', body: formData }
      )
      if (!uploadRes.ok) throw new Error('Échec de l\'upload Cloudinary.')
      const uploadData = await uploadRes.json()

      // 3. Enregistrer la photo dans l'API
      const saveRes = await fetch(
        `/api/equipment/items/${itemId}/components/${componentKey}/photos`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: uploadData.secure_url,
            publicId: uploadData.public_id,
          }),
        }
      )
      if (!saveRes.ok) throw new Error('Erreur lors de l\'enregistrement.')
      const saved = await saveRes.json()
      setPhotos(saved.photos ?? [...photos, { url: uploadData.secure_url, publicId: uploadData.public_id }])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue.')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  async function handleDelete(publicId: string) {
    if (!confirm('Supprimer cette photo ?')) return
    const encoded = encodeURIComponent(publicId)
    const res = await fetch(
      `/api/equipment/items/${itemId}/components/${componentKey}/photos/${encoded}`,
      { method: 'DELETE' }
    )
    if (res.ok) {
      setPhotos((prev) => prev.filter((p) => p.publicId !== publicId))
    } else {
      setError('Erreur lors de la suppression.')
    }
  }

  return (
    <div className="mt-2">
      {photos.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {photos.map((photo) => (
            <div key={photo.publicId} className="relative group">
              <Image
                src={photo.url}
                alt={photo.caption ?? 'Photo'}
                width={80}
                height={80}
                className="rounded object-cover w-20 h-20"
              />
              {canEdit && (
                <button
                  onClick={() => handleDelete(photo.publicId)}
                  className="absolute top-0 right-0 bg-red-600 text-white text-xs rounded-bl px-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Supprimer"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      {canEdit && (
        <label className="inline-flex items-center gap-2 cursor-pointer">
          <span className="bg-white border border-gray-300 text-gray-700 text-xs px-3 py-1 rounded hover:bg-gray-50">
            {uploading ? 'Upload en cours…' : '+ Ajouter une photo'}
          </span>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleUpload}
            disabled={uploading}
          />
        </label>
      )}
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  )
}
