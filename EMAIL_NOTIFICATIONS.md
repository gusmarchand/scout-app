# Système de Notifications Email - Guide d'implémentation

## Vue d'ensemble

Le système implémente les notifications suivantes :
1. **Confirmation au chef créateur** lors de l'enregistrement d'une réservation
2. **Alerte aux équipiers** (et responsables matériel) lors d'une nouvelle réservation
3. **Notification aux chefs** lors de modification d'une réservation (avec détails des changements)
4. **Alerte item KO** : Retrait automatique d'un item devenu KO d'une réservation + email au chef et au responsable matériel

## Prérequis

### 1. Installation de Resend

```bash
npm install resend
```

### 2. Configuration environnement

Ajouter dans `.env.local` :
```env
RESEND_API_KEY=re_xxx
RESEND_FROM_EMAIL=notifications@yourdomain.com
```

Créer un compte sur [resend.com](https://resend.com) et récupérer l'API key.

## Architecture

### Fichiers à créer

```
lib/
  email.ts              # Fonctions d'envoi d'emails (wrapper Resend)
  email-templates.ts    # Templates HTML des emails
app/api/
  webhooks/
    item-status/route.ts  # Webhook pour détecter changement statut item → KO
```

## Implémentation

### 1. `lib/email.ts` - Service d'envoi d'emails

```typescript
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendEmail(params: {
  to: string | string[]
  subject: string
  html: string
}) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[EMAIL] API key manquante, email non envoyé')
    return { success: false, error: 'No API key' }
  }

  try {
    const result = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'noreply@scout-app.com',
      to: Array.isArray(params.to) ? params.to : [params.to],
      subject: params.subject,
      html: params.html,
    })
    return { success: true, data: result }
  } catch (error) {
    console.error('[EMAIL] Erreur:', error)
    return { success: false, error }
  }
}

// Récupérer tous les équipiers (optionnellement uniquement responsables matériel)
export async function getEquipmentTeam(onlyManagers = false) {
  const { User } = await import('@/models/User')
  const { connectDB } = await import('@/lib/mongodb')

  await connectDB()

  const filter: any = { role: 'equipier' }
  if (onlyManagers) {
    filter.isEquipmentManager = true
  }

  const users = await User.find(filter).select('email name').lean()
  return users
}
```

### 2. `lib/email-templates.ts` - Templates HTML

```typescript
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

export function reservationCreatedTemplate(params: {
  chefName: string
  eventName: string
  startDate: Date
  endDate: Date
  location?: string
  items: string[]
  numberOfGirls?: number
  numberOfBoys?: number
}) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #0a3a5b; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
          .info-block { background: white; padding: 15px; margin: 10px 0; border-radius: 6px; border-left: 4px solid #0b7152; }
          .item-list { list-style: none; padding: 0; }
          .item-list li { padding: 5px 0; border-bottom: 1px solid #e5e7eb; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Réservation confirmée</h1>
          </div>
          <div class="content">
            <p>Bonjour ${params.chefName},</p>
            <p>Votre réservation a bien été enregistrée :</p>

            <div class="info-block">
              <h3>${params.eventName}</h3>
              <p><strong>📅 Dates :</strong> Du ${format(params.startDate, 'dd MMM yyyy', { locale: fr })} au ${format(params.endDate, 'dd MMM yyyy', { locale: fr })}</p>
              ${params.location ? `<p><strong>📍 Lieu :</strong> ${params.location}</p>` : ''}
              ${params.numberOfGirls || params.numberOfBoys ? `
                <p><strong>👥 Participants :</strong>
                  ${params.numberOfGirls ? `${params.numberOfGirls} fille(s)` : ''}
                  ${params.numberOfBoys ? `${params.numberOfBoys} garçon(s)` : ''}
                </p>
              ` : ''}
            </div>

            <div class="info-block">
              <h4>Matériel réservé (${params.items.length} item${params.items.length > 1 ? 's' : ''}) :</h4>
              <ul class="item-list">
                ${params.items.map(item => `<li>• ${item}</li>`).join('')}
              </ul>
            </div>

            <p style="margin-top: 20px;">Vous recevrez un email si l'équipe matériel modifie votre réservation.</p>
          </div>
          <div class="footer">
            <p>Application de gestion matériel - Groupe Alice Gillig</p>
          </div>
        </div>
      </body>
    </html>
  `
}

export function reservationNotificationToEquipmentTeam(params: {
  chefName: string
  eventName: string
  startDate: Date
  endDate: Date
  items: string[]
}) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #0b7152; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
          .info-block { background: white; padding: 15px; margin: 10px 0; border-radius: 6px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📦 Nouvelle réservation</h1>
          </div>
          <div class="content">
            <p>Une nouvelle réservation a été créée par <strong>${params.chefName}</strong> :</p>

            <div class="info-block">
              <h3>${params.eventName}</h3>
              <p>📅 ${format(params.startDate, 'dd MMM yyyy', { locale: fr })} → ${format(params.endDate, 'dd MMM yyyy', { locale: fr })}</p>
              <p>🎒 ${params.items.length} item(s) réservé(s)</p>
            </div>

            <p><a href="${process.env.NEXTAUTH_URL}/reservations" style="display: inline-block; background: #0b7152; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; margin-top: 10px;">Voir les réservations</a></p>
          </div>
        </div>
      </body>
    </html>
  `
}

export function reservationModifiedTemplate(params: {
  chefName: string
  eventName: string
  changes: string[]
  modifiedBy: string
}) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #f59e0b; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
          .change-item { background: #fef3c7; padding: 10px; margin: 5px 0; border-radius: 4px; border-left: 3px solid #f59e0b; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✏️ Réservation modifiée</h1>
          </div>
          <div class="content">
            <p>Bonjour ${params.chefName},</p>
            <p>Votre réservation "<strong>${params.eventName}</strong>" a été modifiée par <strong>${params.modifiedBy}</strong>.</p>

            <h4>Modifications apportées :</h4>
            ${params.changes.map(change => `<div class="change-item">• ${change}</div>`).join('')}

            <p style="margin-top: 20px;"><a href="${process.env.NEXTAUTH_URL}/reservations" style="display: inline-block; background: #0b7152; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px;">Voir ma réservation</a></p>
          </div>
        </div>
      </body>
    </html>
  `
}

export function itemRemovedKoTemplate(params: {
  itemName: string
  eventName: string
  chefName: string
  equipmentManagerName?: string
}) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #dc2626; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
          .alert { background: #fee2e2; padding: 15px; border-left: 4px solid #dc2626; border-radius: 4px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⚠️ Matériel retiré de votre réservation</h1>
          </div>
          <div class="content">
            <p>Bonjour ${params.chefName},</p>

            <div class="alert">
              <p><strong>L'item "${params.itemName}" a été retiré de votre réservation "${params.eventName}"</strong></p>
              <p>Raison : Le matériel est passé en statut KO et n'est plus disponible.</p>
            </div>

            <p>Nous vous conseillons de :</p>
            <ul>
              <li>Vérifier s'il existe un item de remplacement disponible</li>
              <li>Adapter votre événement en conséquence</li>
              <li>Contacter l'équipe matériel si besoin</li>
            </ul>

            <p style="margin-top: 20px;"><a href="${process.env.NEXTAUTH_URL}/reservations" style="display: inline-block; background: #0b7152; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px;">Voir ma réservation</a></p>
          </div>
        </div>
      </body>
    </html>
  `
}
```

### 3. Intégration dans les APIs

#### A. Dans `app/api/reservations/route.ts` (création)

Ajouter après création réussie :

```typescript
// Après la création de toutes les réservations
if (allCreated) {
  const { sendEmail } = await import('@/lib/email')
  const { reservationCreatedTemplate, reservationNotificationToEquipmentTeam } = await import('@/lib/email-templates')
  const { getEquipmentTeam } = await import('@/lib/email')

  // 1. Email au chef créateur
  await sendEmail({
    to: session.user.email,
    subject: `Réservation confirmée - ${eventName}`,
    html: reservationCreatedTemplate({
      chefName: session.user.name,
      eventName,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      location,
      items: selectedItemIds.map(id => availableItems.find(i => i._id === id)?.name || ''),
      numberOfGirls,
      numberOfBoys,
    })
  })

  // 2. Email aux équipiers
  const equipmentTeam = await getEquipmentTeam()
  if (equipmentTeam.length > 0) {
    await sendEmail({
      to: equipmentTeam.map(u => u.email),
      subject: `Nouvelle réservation - ${eventName}`,
      html: reservationNotificationToEquipmentTeam({
        chefName: session.user.name,
        eventName,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        items: selectedItemIds.map(id => availableItems.find(i => i._id === id)?.name || ''),
      })
    })
  }
}
```

#### B. Dans `app/api/reservations/[id]/route.ts` (modification PATCH)

```typescript
// Avant la mise à jour, sauvegarder l'ancien état
const oldReservation = await Reservation.findById(params.id).lean()

// Après la mise à jour
const changes: string[] = []
if (parsed.data.location && parsed.data.location !== oldReservation.location) {
  changes.push(`Lieu modifié: ${oldReservation.location || 'non défini'} → ${parsed.data.location}`)
}
// ... autres comparaisons ...

if (changes.length > 0) {
  const { sendEmail } = await import('@/lib/email')
  const { reservationModifiedTemplate } = await import('@/lib/email-templates')

  const creator = await User.findById(oldReservation.reservedBy).select('email name').lean()

  if (creator) {
    await sendEmail({
      to: creator.email,
      subject: `Réservation modifiée - ${oldReservation.eventName}`,
      html: reservationModifiedTemplate({
        chefName: creator.name,
        eventName: oldReservation.eventName,
        changes,
        modifiedBy: session.user.name,
      })
    })
  }
}
```

### 4. Système d'alerte item KO

#### Dans `app/api/equipment/items/[id]/components/[key]/route.ts` (PATCH)

Ajouter après mise à jour du statut :

```typescript
// Si le statut est passé à KO, vérifier les réservations futures
if (parsed.data.status === 'ko') {
  const { Reservation } = await import('@/models/Reservation')
  const now = new Date()

  // Trouver toutes les réservations futures de cet item
  const futureReservations = await Reservation.find({
    itemId: itemId,
    startDate: { $gt: now }
  }).populate('reservedBy', 'email name').lean()

  if (futureReservations.length > 0) {
    const { sendEmail } = await import('@/lib/email')
    const { itemRemovedKoTemplate } = await import('@/lib/email-templates')
    const { getEquipmentTeam } = await import('@/lib/email')

    // Supprimer les réservations et envoyer les emails
    for (const res of futureReservations) {
      // Email au chef
      await sendEmail({
        to: res.reservedBy.email,
        subject: `⚠️ Matériel retiré - ${res.itemName}`,
        html: itemRemovedKoTemplate({
          itemName: res.itemName,
          eventName: res.eventName,
          chefName: res.reservedBy.name,
        })
      })

      // Supprimer la réservation
      await Reservation.findByIdAndDelete(res._id)
    }

    // Email aux responsables matériel
    const managers = await getEquipmentTeam(true) // only managers
    if (managers.length > 0) {
      await sendEmail({
        to: managers.map(m => m.email),
        subject: `Item KO - ${futureReservations.length} réservation(s) annulée(s)`,
        html: `<p>${futureReservations.length} réservation(s) ont été automatiquement annulées car l'item "${item.name}" est passé en statut KO.</p>`
      })
    }
  }
}
```

## Tests

1. Créer un compte Resend en mode test
2. Vérifier les emails dans le dashboard Resend
3. Tester chaque scénario :
   - Création réservation
   - Modification réservation
   - Passage item en KO avec réservation future

## Notes importantes

- Les emails sont envoyés de manière asynchrone (ne pas bloquer la requête)
- Gérer les erreurs d'envoi sans faire échouer l'opération principale
- Logger tous les envois pour debug
- Utiliser des variables d'environnement pour activer/désactiver les notifications
