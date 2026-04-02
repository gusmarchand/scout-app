import sharp from 'sharp'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const svgPath = join(__dirname, '../public/icons/icon.svg')
const svgBuffer = readFileSync(svgPath)

const sizes = [192, 512]

for (const size of sizes) {
  await sharp(svgBuffer)
    .resize(size, size)
    .png()
    .toFile(join(__dirname, `../public/icons/icon-${size}.png`))

  console.log(`✓ Generated icon-${size}.png`)
}

console.log('✓ All icons generated successfully!')
