import { test, expect } from 'vitest'
import { normalizarPlaca } from '@/utils/placa'

test.each([['abc-123', 'ABC123'], [' abc 12d ', 'ABC12D'], [null, ''], [undefined, '']])('%p → %p', (e, s) => {
  expect(normalizarPlaca(e)).toBe(s)
})
