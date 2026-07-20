import { describe, it, expect, vi } from 'vitest'
import { Router } from './router.js'

describe('Router', () => {
  it('dispatches to a matching static route', async () => {
    const router = new Router()
    const handler = vi.fn()
    router.on('/foo', handler)
    await router.navigate('/foo')
    expect(handler).toHaveBeenCalledWith('/foo')
  })

  it('dispatches to a matching regex route', async () => {
    const router = new Router()
    const handler = vi.fn()
    router.on(/^\/item\/\d+$/, handler)
    await router.navigate('/item/42')
    expect(handler).toHaveBeenCalledWith('/item/42')
  })

  it('falls back to wildcard when no route matches', async () => {
    const router = new Router()
    const wildcard = vi.fn()
    router.on('*', wildcard)
    await router.navigate('/unknown')
    expect(wildcard).toHaveBeenCalledWith('/unknown')
  })

  it('stops dispatch when middleware returns false', async () => {
    const router = new Router()
    const handler = vi.fn()
    router.use(() => false)
    router.on('/foo', handler)
    await router.navigate('/foo')
    expect(handler).not.toHaveBeenCalled()
  })
})
