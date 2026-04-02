import { describe, it, expect } from 'vitest'
import { computePriority } from '../lib/priority'
import type { Status } from '../types'

describe('computePriority', () => {
  it('should return 1 for ok status', () => {
    expect(computePriority('ok')).toBe(1)
  })

  it('should return 2 for moyen status', () => {
    expect(computePriority('moyen')).toBe(2)
  })

  it('should return 3 for ko status', () => {
    expect(computePriority('ko')).toBe(3)
  })

  it('should maintain correct priority ordering', () => {
    const statuses: Status[] = ['ok', 'moyen', 'ko']
    const priorities = statuses.map(computePriority)

    // Vérifie que les priorités sont strictement croissantes
    for (let i = 1; i < priorities.length; i++) {
      expect(priorities[i]).toBeGreaterThan(priorities[i - 1])
    }
  })
})
