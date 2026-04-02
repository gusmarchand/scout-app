import type { Action, Role } from '@/types'

// Matrice de permissions par rôle
const PERMISSIONS: Record<string, Action[]> = {
  admin: [
    'manage_users',
    'manage_equipment',
    'update_equipment_status',
    'upload_photo',
    'create_reservation',
    'cancel_any_reservation',
  ],
  equipier: [
    'manage_equipment',
    'update_equipment_status',
    'upload_photo',
    'create_reservation',
    'cancel_any_reservation',
  ],
  chef: [
    'upload_photo',
    'create_reservation',
  ],
}

/**
 * Vérifie si un utilisateur est autorisé à effectuer une action donnée.
 * La vérification est basée sur la matrice de permissions définie par rôle.
 */
export function hasPermission(user: { role: Role }, action: Action): boolean {
  const allowed = PERMISSIONS[user.role]
  return allowed?.includes(action) ?? false
}
