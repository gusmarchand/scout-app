/**
 * Script pour supprimer toutes les réservations contenant des items avec statut KO
 * Usage: npx tsx scripts/clean-ko-reservations.ts
 */

import { connectDB } from '../lib/mongodb'
import { Reservation } from '../models/Reservation'
import { Item } from '../models/Item'

async function cleanKoReservations() {
  try {
    await connectDB()
    console.log('🔍 Recherche de tous les items KO...')

    // Trouver tous les items avec statut global KO
    const koItems = await Item.find({ globalStatus: 'ko' }).select('_id name').lean()

    if (koItems.length === 0) {
      console.log('✅ Aucun item KO trouvé')
      return
    }

    console.log(`📦 ${koItems.length} item(s) KO trouvé(s):`)
    koItems.forEach(item => console.log(`   - ${item.name} (${item._id})`))

    // Extraire les IDs
    const koItemIds = koItems.map(item => item._id.toString())

    // Trouver toutes les réservations concernées
    const reservationsToDelete = await Reservation.find({
      itemId: { $in: koItemIds }
    }).lean()

    if (reservationsToDelete.length === 0) {
      console.log('✅ Aucune réservation à supprimer')
      return
    }

    console.log(`\n🗑️  ${reservationsToDelete.length} réservation(s) à supprimer:`)

    // Grouper par événement pour afficher
    const eventGroups = new Map<string, any[]>()
    for (const res of reservationsToDelete) {
      const key = `${(res as any).eventName}|${(res as any).startDate}|${(res as any).endDate}`
      if (!eventGroups.has(key)) {
        eventGroups.set(key, [])
      }
      eventGroups.get(key)!.push(res)
    }

    eventGroups.forEach((items, key) => {
      const [eventName, startDate, endDate] = key.split('|')
      console.log(`   📅 ${eventName} (${new Date(startDate).toLocaleDateString('fr-FR')} → ${new Date(endDate).toLocaleDateString('fr-FR')})`)
      items.forEach(item => {
        console.log(`      - ${(item as any).itemName}`)
      })
    })

    // Supprimer toutes les réservations
    console.log('\n🔄 Suppression en cours...')
    const result = await Reservation.deleteMany({
      itemId: { $in: koItemIds }
    })

    console.log(`\n✅ ${result.deletedCount} réservation(s) supprimée(s) avec succès`)

    process.exit(0)
  } catch (error) {
    console.error('❌ Erreur:', error)
    process.exit(1)
  }
}

cleanKoReservations()
