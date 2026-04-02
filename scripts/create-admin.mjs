/**
 * Script pour créer le premier compte admin et les catégories par défaut.
 * Usage : node scripts/create-admin.mjs
 *
 * Nécessite que MONGODB_URI soit défini dans .env.local
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

config({ path: resolve(process.cwd(), '.env.local') })

const MONGODB_URI = process.env.MONGODB_URI
if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI manquant dans .env.local')
  process.exit(1)
}

const UserSchema = new mongoose.Schema({
  name: String, email: String, passwordHash: String, role: String,
  createdAt: { type: Date, default: Date.now },
})

const CategorySchema = new mongoose.Schema({
  name: String,
  componentTemplate: [{ key: String, label: String, hasEyelets: Boolean, isQuantified: Boolean }],
  createdAt: { type: Date, default: Date.now },
})

const User = mongoose.models.User ?? mongoose.model('User', UserSchema)
const Category = mongoose.models.Category ?? mongoose.model('Category', CategorySchema)

// ─── Compte admin ─────────────────────────────────────────────────────────────
const ADMIN_NAME = 'Admin'
const ADMIN_EMAIL = 'admin@mongroupe.fr'
const ADMIN_PASSWORD = 'changeme123'

// ─── Catégories par défaut ────────────────────────────────────────────────────
const TENT_COMPONENTS = [
  { key: 'toit',      label: 'Toit',       isQuantified: false },
  {key:'oeillets', label:"Oeillets", isQuantified:false},
  { key: 'tapis_sol', label: 'Tapis de sol', isQuantified: false },
  { key: 'sardines',  label: 'Sardines',   isQuantified: true  },
  { key: 'piquets',   label: 'Piquets',    isQuantified: true  },
]


const DEFAULT_CATEGORIES = [
  {
    name: 'Tentes',
    componentTemplate: TENT_COMPONENTS,
  },
  {
    name: 'Autre matériel',
    componentTemplate: [],
  },
]

async function main() {
  await mongoose.connect(MONGODB_URI)
  console.log('✅ Connecté à MongoDB')

  // Compte admin
  const existing = await User.findOne({ email: ADMIN_EMAIL })
  if (existing) {
    console.log(`ℹ️  Compte admin déjà existant pour ${ADMIN_EMAIL}`)
  } else {
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12)
    await User.create({ name: ADMIN_NAME, email: ADMIN_EMAIL, passwordHash, role: 'admin' })
    console.log(`✅ Compte admin créé : ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`)
    console.log(`⚠️  Change le mot de passe après ta première connexion !`)
  }

  // Catégories par défaut
  for (const cat of DEFAULT_CATEGORIES) {
    const exists = await Category.findOne({ name: cat.name })
    if (exists) {
      console.log(`ℹ️  Catégorie "${cat.name}" déjà existante`)
    } else {
      await Category.create(cat)
      console.log(`✅ Catégorie créée : "${cat.name}"`)
    }
  }

  await mongoose.disconnect()
  console.log('\n🎉 Initialisation terminée.')
}

main().catch((err) => {
  console.error('❌ Erreur :', err)
  process.exit(1)
})
