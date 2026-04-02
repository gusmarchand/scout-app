'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { optimizeCloudinaryUrl } from '@/lib/cloudinary'
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
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setError('')
    setSelectedFile(file)

    // Créer l'URL de preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string)
    }
    reader.readAsDataURL(file)

    e.target.value = ''
  }

  function cancelPreview() {
    setPreviewUrl(null)
    setSelectedFile(null)
  }

  // Support Escape key to close preview
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape' && previewUrl) {
        cancelPreview()
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [previewUrl])

  async function confirmUpload() {
    if (!selectedFile) return
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
      formData.append('file', selectedFile)
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

      // Reset preview
      setPreviewUrl(null)
      setSelectedFile(null)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue.')
    } finally {
      setUploading(false)
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
                src={optimizeCloudinaryUrl(photo.url, 160)}
                alt={photo.caption ?? 'Photo'}
                width={80}
                height={80}
                className="rounded object-cover w-20 h-20"
                loading="lazy"
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

      {/* Preview modal */}
      {previewUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 max-w-lg w-full">
            <h3 className="text-lg font-semibold mb-3">Aperçu de la photo</h3>
            <img
              src={previewUrl}
              alt="Preview"
              className="w-full h-auto rounded mb-4 max-h-96 object-contain"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={cancelPreview}
                disabled={uploading}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded text-sm hover:bg-gray-50 disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={confirmUpload}
                disabled={uploading}
                className="px-4 py-2 bg-logo-green text-white rounded text-sm hover:bg-logo-green-hover disabled:opacity-50"
              >
                {uploading ? 'Upload en cours…' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {canEdit && !previewUrl && (
        <label className="inline-flex items-center gap-2 cursor-pointer">
          <span className="bg-white border border-gray-300 text-gray-700 text-xs px-3 py-1 rounded hover:bg-gray-50">
            + Ajouter une photo
          </span>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileSelect}
          />
        </label>
      )}
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  )
}
