export class Router {
  constructor() {
    this.routes = []
    this.middleware = []
  }

  use(fn) {
    this.middleware.push(fn)
    return this
  }

  on(path, handler) {
    this.routes.push({ path, handler })
    return this
  }

  async navigate(path) {
    for (const fn of this.middleware) {
      const result = await fn(path)
      if (result === false) {
        // middleware redirected — navigate to new path
        const newPath = Router.getPath()
        if (newPath !== path) {
          await this._dispatch(newPath)
        }
        return
      }
    }
    await this._dispatch(path)
  }

  async _dispatch(path) {
    for (const { path: routePath, handler } of this.routes) {
      if (routePath === '*') continue
      if (routePath instanceof RegExp) {
        if (routePath.test(path)) {
          this.currentRoute = path
          await handler(path)
          return
        }
      } else if (routePath === path) {
        this.currentRoute = path
        await handler(path)
        return
      }
    }
    // fallback to wildcard
    const wildcard = this.routes.find(r => r.path === '*')
    if (wildcard) await wildcard.handler(path)
  }

  static getPath() {
    const path = window.location.pathname
    return path === '/' ? '/' : path.replace(/\/$/, '')
  }

  static setPath(path) {
    window.history.pushState({}, '', path)
  }
}
