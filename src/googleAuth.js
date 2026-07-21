// Utilities to load Google Identity Services (GSI) and render the button
export function loadGsiScript() {
  return new Promise((resolve, reject) => {
    if (window.google && window.google.accounts) return resolve()
    const s = document.createElement('script')
    s.src = 'https://accounts.google.com/gsi/client'
    s.async = true
    s.defer = true
    s.onload = () => resolve()
    s.onerror = (e) => reject(e)
    document.head.appendChild(s)
  })
}

export async function initGoogleSignIn({ clientId, callback, btnContainerId, buttonOptions = {} }) {
  if (!clientId) throw new Error('Missing Google client ID (VITE_GOOGLE_CLIENT_ID)')
  await loadGsiScript()
  window.google.accounts.id.initialize({
    client_id: clientId,
    callback,
  })
  if (btnContainerId) {
    const el = document.getElementById(btnContainerId)
    if (el) {
      window.google.accounts.id.renderButton(el, buttonOptions)
    }
  }
  // Optionally prompt the One Tap UX
  // window.google.accounts.id.prompt()
}
