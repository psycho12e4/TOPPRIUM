import { describe, it, expect } from 'vitest'
import { formatFileSize, formatFileType, debounce } from './utils.js'

describe('formatFileSize', () => {
  it('formats zero bytes', () => {
    expect(formatFileSize(0)).toBe('0 Bytes')
  })

  it('formats kilobytes', () => {
    expect(formatFileSize(2048)).toBe('2 KB')
  })

  it('formats megabytes', () => {
    expect(formatFileSize(5 * 1024 * 1024)).toBe('5 MB')
  })
})

describe('formatFileType', () => {
  it('extracts subtype from mime type', () => {
    expect(formatFileType('application/pdf')).toBe('PDF')
  })

  it('handles missing input', () => {
    expect(formatFileType(null)).toBe('FILE')
    expect(formatFileType(undefined)).toBe('FILE')
  })
})

describe('debounce', () => {
  it('only invokes once after rapid calls', async () => {
    let calls = 0
    const fn = debounce(() => calls++, 10)
    fn()
    fn()
    fn()
    await new Promise((resolve) => setTimeout(resolve, 30))
    expect(calls).toBe(1)
  })
})
