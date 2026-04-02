import type { Status } from '@/types'

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
