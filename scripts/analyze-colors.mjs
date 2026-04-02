import sharp from 'sharp'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const logoPath = join(__dirname, '../public/icons/nag_logo.png')

// Récupérer les pixels bruts
const { data, info } = await sharp(logoPath)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true })

// Compter les couleurs (en ignorant les pixels transparents)
const colorCounts = new Map()

for (let i = 0; i < data.length; i += 4) {
  const r = data[i]
  const g = data[i + 1]
  const b = data[i + 2]
  const a = data[i + 3]

  // Ignorer les pixels transparents ou quasi-transparents
  if (a < 50) continue

  const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
  colorCounts.set(hex, (colorCounts.get(hex) || 0) + 1)
}

// Trier par fréquence
const sortedColors = Array.from(colorCounts.entries())
  .sort((a, b) => b[1] - a[1])
  .slice(0, 10)

console.log('Top 10 couleurs du logo (hors transparence):')
sortedColors.forEach(([color, count], index) => {
  console.log(`${index + 1}. ${color} (${count} pixels)`)
})
