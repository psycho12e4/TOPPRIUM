import { signOut } from '../lib/supabase.js'
import { Router } from '../lib/router.js'

export function renderNav() {
  const loggedIn = !!localStorage.getItem('userId')

  const authAction = loggedIn
    ? `<button id="logout-btn" class="btn btn-outline text-sm">Logout</button>`
    : `<a href="/login" class="btn btn-primary text-sm">Login</a>`

  return `
    <nav class="nav-blur sticky top-0 z-40">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center h-16">
          <div class="flex items-center">
            <a href="/" class="font-extrabold text-2xl gradient-text tracking-tight transition-transform hover:scale-105 inline-block">TOPPRIUM</a>
          </div>

          <!-- Desktop links -->
          <div class="hidden md:flex items-center gap-6">
            <a href="/" class="nav-link text-slate-600 hover:text-slate-900 font-medium">Home</a>
            <a href="/buy-course" class="nav-link text-slate-600 hover:text-slate-900 font-medium">Buy Course</a>
            <a href="/complaint" class="nav-link text-slate-600 hover:text-slate-900 font-medium">Complaint</a>
            ${authAction}
          </div>

          <!-- Mobile toggle -->
          <button id="nav-toggle" class="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-xl text-slate-700 hover:bg-brand-50 transition-colors" aria-label="Toggle menu" aria-expanded="false">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <path d="M3 6h18M3 12h18M3 18h18"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Mobile menu -->
      <div id="nav-mobile" class="md:hidden hidden border-t border-slate-100 bg-white/95 backdrop-blur">
        <div class="px-4 py-3 flex flex-col gap-1">
          <a href="/" class="px-3 py-3 rounded-xl text-slate-700 font-medium hover:bg-brand-50 transition-colors">Home</a>
          <a href="/buy-course" class="px-3 py-3 rounded-xl text-slate-700 font-medium hover:bg-brand-50 transition-colors">Buy Course</a>
          <a href="/complaint" class="px-3 py-3 rounded-xl text-slate-700 font-medium hover:bg-brand-50 transition-colors">Complaint</a>
          <div class="pt-2">${authAction.replace('id="logout-btn"', 'id="logout-btn-mobile"').replace('class="btn', 'class="w-full btn')}</div>
        </div>
      </div>
    </nav>
  `
}

export function initNavEvents() {
  const handleLogout = async () => {
    try {
      await signOut()
    } catch (e) {
      console.error('Sign out error:', e)
    }
    localStorage.removeItem('userId')
    window.location.href = Router.getUrl('/login')
  }

  const logoutBtn = document.getElementById('logout-btn')
  if (logoutBtn) logoutBtn.addEventListener('click', handleLogout)

  const logoutBtnMobile = document.getElementById('logout-btn-mobile')
  if (logoutBtnMobile) logoutBtnMobile.addEventListener('click', handleLogout)

  const toggle = document.getElementById('nav-toggle')
  const mobile = document.getElementById('nav-mobile')
  if (toggle && mobile) {
    toggle.addEventListener('click', () => {
      const open = mobile.classList.toggle('hidden') === false
      toggle.setAttribute('aria-expanded', String(open))
    })
    // Close the menu after navigating
    mobile.querySelectorAll('a').forEach((a) => {
      a.addEventListener('click', () => mobile.classList.add('hidden'))
    })
  }
}
