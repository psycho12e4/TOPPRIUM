import { getCurrentUser, signOut } from '../lib/supabase.js'
import { Router } from '../lib/router.js'
import { showNotification } from '../lib/utils.js'

export function renderNav(isAdmin = false) {
  const loggedIn = !!localStorage.getItem('userId')

  return `
    <nav class="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center h-16">
          <div class="flex items-center">
            <a href="/" class="font-bold text-2xl text-blue-600">TOPPRIUM</a>
          </div>

          <div class="flex items-center gap-4">
            ${!isAdmin ? `
              <a href="/" class="text-gray-600 hover:text-gray-900">Home</a>
            ` : `
              <a href="/admin" class="text-gray-600 hover:text-gray-900">Dashboard</a>
              <a href="/admin/subjects" class="text-gray-600 hover:text-gray-900">Subjects</a>
              <a href="/admin/resources" class="text-gray-600 hover:text-gray-900">Resources</a>
              <a href="/admin/tests" class="text-gray-600 hover:text-gray-900">Tests</a>
              <a href="/admin/review" class="text-gray-600 hover:text-gray-900">Review</a>
            `}

            ${loggedIn ? `
              <button id="logout-btn" class="btn btn-outline text-sm">Logout</button>
            ` : `
              <a href="/login" class="btn btn-primary text-sm">Login</a>
            `}
          </div>
        </div>
      </div>
    </nav>
  `
}

export function initNavEvents() {
  const logoutBtn = document.getElementById('logout-btn')
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      try {
        await signOut()
      } catch (e) {
        console.error('Sign out error:', e)
      }
      localStorage.removeItem('userId')
      window.location.href = '/login'
    })
  }
}
