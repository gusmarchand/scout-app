import { Resend } from 'resend'
import { User } from '@/models/User'
import { connectDB } from '@/lib/mongodb'

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
      from: process.env.RESEND_FROM_EMAIL || 'Matos Alice Gillig <noreply@scout-app.com>',
      to: Array.isArray(params.to) ? params.to : [params.to],
      subject: params.subject,
      html: params.html,
    })
    console.log('[EMAIL] Envoyé:', params.subject, 'à', params.to)
    return { success: true, data: result }
  } catch (error) {
    console.error('[EMAIL] Erreur:', error)
    return { success: false, error }
  }
}

// Récupérer tous les équipiers (optionnellement uniquement responsables matériel)
export async function getEquipmentTeam(onlyManagers = false) {
  await connectDB()

  const filter: Record<string, unknown> = { role: 'equipier' }
  if (onlyManagers) {
    filter.isEquipmentManager = true
  }

  const users = await User.find(filter).select('email name').lean()
  return JSON.parse(JSON.stringify(users))
}
