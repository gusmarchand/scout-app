import sharp from 'sharp'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const logoPath = join(__dirname, '../public/icons/nag_logo.png')
const logoBuffer = readFileSync(logoPath)

// PWA icons (fond transparent)
const pwaSize = [192, 512]

for (const size of pwaSize) {
  await sharp(logoBuffer)
    .resize(size, size, {
      fit: 'contain',
      background: { r: 255, g: 255, b: 255, alpha: 0 }
    })
    .png()
    .toFile(join(__dirname, `../public/icons/icon-${size}.png`))

  console.log(`✓ Generated PWA icon-${size}.png`)
}

// Favicon 32x32
await sharp(logoBuffer)
  .resize(32, 32, {
    fit: 'contain',
    background: { r: 255, g: 255, b: 255, alpha: 0 }
  })
  .png()
  .toFile(join(__dirname, '../public/favicon-32x32.png'))

console.log('✓ Generated favicon-32x32.png')

// Favicon 16x16
await sharp(logoBuffer)
  .resize(16, 16, {
    fit: 'contain',
    background: { r: 255, g: 255, b: 255, alpha: 0 }
  })
  .png()
  .toFile(join(__dirname, '../public/favicon-16x16.png'))

console.log('✓ Generated favicon-16x16.png')

// Apple touch icon 180x180 (avec fond blanc car iOS n'aime pas la transparence)
await sharp(logoBuffer)
  .resize(180, 180, {
    fit: 'contain',
    background: { r: 255, g: 255, b: 255, alpha: 1 }
  })
  .png()
  .toFile(join(__dirname, '../public/apple-touch-icon.png'))

console.log('✓ Generated apple-touch-icon.png')

// Favicon.ico (nécessite plusieurs tailles combinées, on fait juste un 32x32 pour simplifier)
await sharp(logoBuffer)
  .resize(32, 32, {
    fit: 'contain',
    background: { r: 255, g: 255, b: 255, alpha: 0 }
  })
  .toFile(join(__dirname, '../public/favicon.ico'))

console.log('✓ Generated favicon.ico')

console.log('\n✅ All icons generated successfully!')
