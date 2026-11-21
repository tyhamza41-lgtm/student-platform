import { describe, expect, it } from 'vitest'
import { cn } from '../src/utils/cn.js'

describe('cn', () => {
  it('merges conflicting Tailwind classes and preserves unrelated classes', () => {
    expect(cn('px-2 text-sm', 'px-4 font-medium')).toBe('text-sm px-4 font-medium')
  })
})
