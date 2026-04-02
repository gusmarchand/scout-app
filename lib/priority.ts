import type { Status, Component } from '@/types'

/**
 * Calcule la priorité de sortie d'un item à partir de son statut global.
 * ok → 1 (à sortir en premier)
 * moyen → 2 (sortable avec précaution)
 * ko → 3 (ne pas sortir)
 */
export function computePriority(status: Status): number {
  switch (status) {
    case 'ok':    return 1
    case 'moyen': return 2
    case 'ko':    return 3
  }
}

/**
 * Calcule le statut global d'un item à partir de ses composants.
 * Retourne le statut le plus critique parmi tous les composants :
 * - Si au moins un composant est 'ko', l'item est 'ko'
 * - Sinon, si au moins un composant est 'moyen', l'item est 'moyen'
 * - Sinon, tous les composants sont 'ok', l'item est 'ok'
 */
export function computeGlobalStatus(components: Component[]): Status {
  if (components.length === 0) return 'ok'

  const hasKo = components.some(c => c.status === 'ko')
  if (hasKo) return 'ko'

  const hasMoyen = components.some(c => c.status === 'moyen')
  if (hasMoyen) return 'moyen'

  return 'ok'
}
