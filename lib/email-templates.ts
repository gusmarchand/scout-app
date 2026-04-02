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
  const participantText = [
    params.numberOfGirls && `${params.numberOfGirls} fille${params.numberOfGirls > 1 ? 's' : ''}`,
    params.numberOfBoys && `${params.numberOfBoys} garçon${params.numberOfBoys > 1 ? 's' : ''}`
  ].filter(Boolean).join(', ')

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
              ${participantText ? `<p><strong>👥 Participants :</strong> ${participantText}</p>` : ''}
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
          .btn { display: inline-block; background: #0b7152; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; margin-top: 10px; }
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
              <p>🎒 ${params.items.length} item(s) réservé(s) :</p>
              <ul style="margin: 10px 0; padding-left: 20px;">
                ${params.items.map(item => `<li>${item}</li>`).join('')}
              </ul>
            </div>

            <p><a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/reservations" class="btn">Voir les réservations</a></p>
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
          .btn { display: inline-block; background: #0b7152; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; }
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

            <p style="margin-top: 20px;"><a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/reservations" class="btn">Voir ma réservation</a></p>
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
          .btn { display: inline-block; background: #0b7152; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; }
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

            <p style="margin-top: 20px;"><a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/reservations" class="btn">Voir ma réservation</a></p>
          </div>
        </div>
      </body>
    </html>
  `
}
