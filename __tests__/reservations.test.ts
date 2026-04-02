import { describe, it, expect } from 'vitest'

describe('Reservation conflict detection', () => {
  // Test de la logique de chevauchement sans dépendance MongoDB
  // Formule : startA < endB && endA > startB

  const hasOverlap = (
    startA: Date,
    endA: Date,
    startB: Date,
    endB: Date
  ): boolean => {
    return startA < endB && endA > startB
  }

  describe('hasOverlap logic', () => {
    it('should detect complete overlap', () => {
      const start1 = new Date('2024-01-10')
      const end1 = new Date('2024-01-15')
      const start2 = new Date('2024-01-12')
      const end2 = new Date('2024-01-14')

      expect(hasOverlap(start1, end1, start2, end2)).toBe(true)
    })

    it('should detect partial overlap (start)', () => {
      const start1 = new Date('2024-01-10')
      const end1 = new Date('2024-01-15')
      const start2 = new Date('2024-01-08')
      const end2 = new Date('2024-01-12')

      expect(hasOverlap(start1, end1, start2, end2)).toBe(true)
    })

    it('should detect partial overlap (end)', () => {
      const start1 = new Date('2024-01-10')
      const end1 = new Date('2024-01-15')
      const start2 = new Date('2024-01-13')
      const end2 = new Date('2024-01-20')

      expect(hasOverlap(start1, end1, start2, end2)).toBe(true)
    })

    it('should NOT detect overlap when periods are consecutive', () => {
      const start1 = new Date('2024-01-10')
      const end1 = new Date('2024-01-15')
      const start2 = new Date('2024-01-15')
      const end2 = new Date('2024-01-20')

      // Égalité stricte : pas de chevauchement
      expect(hasOverlap(start1, end1, start2, end2)).toBe(false)
    })

    it('should NOT detect overlap when periods are separated', () => {
      const start1 = new Date('2024-01-10')
      const end1 = new Date('2024-01-15')
      const start2 = new Date('2024-01-20')
      const end2 = new Date('2024-01-25')

      expect(hasOverlap(start1, end1, start2, end2)).toBe(false)
    })

    it('should be symmetric (order should not matter)', () => {
      const start1 = new Date('2024-01-10')
      const end1 = new Date('2024-01-15')
      const start2 = new Date('2024-01-12')
      const end2 = new Date('2024-01-14')

      expect(hasOverlap(start1, end1, start2, end2)).toBe(
        hasOverlap(start2, end2, start1, end1)
      )
    })
  })

  describe('Edge cases', () => {
    it('should handle same-day reservations', () => {
      const start1 = new Date('2024-01-10T09:00:00')
      const end1 = new Date('2024-01-10T12:00:00')
      const start2 = new Date('2024-01-10T10:00:00')
      const end2 = new Date('2024-01-10T14:00:00')

      expect(hasOverlap(start1, end1, start2, end2)).toBe(true)
    })

    it('should handle exact same period', () => {
      const start = new Date('2024-01-10')
      const end = new Date('2024-01-15')

      expect(hasOverlap(start, end, start, end)).toBe(true)
    })
  })
})
