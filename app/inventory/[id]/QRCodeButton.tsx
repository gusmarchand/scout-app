'use client'

import { useState, useRef } from 'react'
import QRCode from 'qrcode'
import { toast } from 'sonner'

interface Props {
  itemId: string
  itemName: string
}

export default function QRCodeButton({ itemId, itemName }: Props) {
  const [showModal, setShowModal] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState('')
  const canvasRef = useRef<HTMLCanvasElement>(null)

  async function handleGenerateQR() {
    try {
      const url = `${window.location.origin}/inventory/${itemId}`

      // Générer le QR code
      const dataUrl = await QRCode.toDataURL(url, {
        width: 400,
        margin: 2,
        color: {
          dark: '#0a3a5b', // navy
          light: '#ffffff',
        },
      })

      setQrDataUrl(dataUrl)
      setShowModal(true)
    } catch (error) {
      toast.error('Erreur lors de la génération du QR code')
    }
  }

  function handleDownload() {
    const link = document.createElement('a')
    link.download = `qr-${itemName.replace(/\s+/g, '-')}.png`
    link.href = qrDataUrl
    link.click()
    toast.success('QR code téléchargé')
  }

  function handlePrint() {
    const printWindow = window.open('', '', 'width=600,height=600')
    if (!printWindow) {
      toast.error('Impossible d\'ouvrir la fenêtre d\'impression')
      return
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Code - ${itemName}</title>
          <style>
            body {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              font-family: Arial, sans-serif;
            }
            h1 {
              font-size: 24px;
              margin-bottom: 20px;
              color: #0a3a5b;
            }
            img {
              max-width: 400px;
            }
            @media print {
              body {
                padding: 20px;
              }
            }
          </style>
        </head>
        <body>
          <h1>${itemName}</h1>
          <img src="${qrDataUrl}" alt="QR Code" />
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
      printWindow.close()
    }, 250)
  }

  return (
    <>
      <button
        onClick={handleGenerateQR}
        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
      >
        📱 QR Code
      </button>

      {/* Modal QR Code */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">QR Code - {itemName}</h3>
            <div className="flex justify-center mb-4">
              <img src={qrDataUrl} alt="QR Code" className="w-full max-w-sm" />
            </div>
            <p className="text-sm text-gray-600 mb-4 text-center">
              Scanner ce code pour accéder directement à cet item
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={handlePrint}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded text-sm hover:bg-gray-50"
              >
                🖨️ Imprimer
              </button>
              <button
                onClick={handleDownload}
                className="px-4 py-2 bg-logo-green text-white rounded text-sm hover:bg-logo-green-hover"
              >
                💾 Télécharger
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded text-sm hover:bg-gray-50"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
