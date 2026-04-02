import { describe, it, expect } from 'vitest'
import { computePriority, computeGlobalStatus } from '../lib/priority'
import type { Status, Component } from '../types'

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

describe('computeGlobalStatus', () => {
  const createComponent = (key: string, status: Status): Component => ({
    key,
    label: `Component ${key}`,
    status,
    notes: '',
  })

  it('should return "ok" for empty components array', () => {
    expect(computeGlobalStatus([])).toBe('ok')
  })

  it('should return "ok" when all components are ok', () => {
    const components = [
      createComponent('c1', 'ok'),
      createComponent('c2', 'ok'),
      createComponent('c3', 'ok'),
    ]
    expect(computeGlobalStatus(components)).toBe('ok')
  })

  it('should return "moyen" when at least one component is moyen and none are ko', () => {
    const components = [
      createComponent('c1', 'ok'),
      createComponent('c2', 'moyen'),
      createComponent('c3', 'ok'),
    ]
    expect(computeGlobalStatus(components)).toBe('moyen')
  })

  it('should return "ko" when at least one component is ko', () => {
    const components = [
      createComponent('c1', 'ok'),
      createComponent('c2', 'moyen'),
      createComponent('c3', 'ko'),
    ]
    expect(computeGlobalStatus(components)).toBe('ko')
  })

  it('should return "ko" when all components are ko', () => {
    const components = [
      createComponent('c1', 'ko'),
      createComponent('c2', 'ko'),
    ]
    expect(computeGlobalStatus(components)).toBe('ko')
  })

  it('should return "moyen" when all components are moyen', () => {
    const components = [
      createComponent('c1', 'moyen'),
      createComponent('c2', 'moyen'),
    ]
    expect(computeGlobalStatus(components)).toBe('moyen')
  })

  it('should prioritize ko over moyen', () => {
    const components = [
      createComponent('c1', 'moyen'),
      createComponent('c2', 'ko'),
      createComponent('c3', 'moyen'),
    ]
    expect(computeGlobalStatus(components)).toBe('ko')
  })
})
