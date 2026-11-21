import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

afterEach(() => {
  cleanup()
  localStorage.removeItem('bricoham.language')
  vi.unstubAllGlobals()
})
