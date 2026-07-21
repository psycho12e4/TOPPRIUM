import { signOut } from '../lib/supabase.js'
import { Router } from '../lib/router.js'

const ICON_SVGS = {
  dashboard: '<path d="M3 3h7v7H3V3zm11 0h7v7h-7V3zM3 14h7v7H3v-7zm11 0h7v7h-7v-7z"/>',
  subjects: '<path d="M4 4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v16l-6.5-3.5L4 20V4z"/>',
  resources: '<path d="M8 3h5l5 5v11a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M13 3v5h5" fill="none" stroke="currentColor" stroke-width="1.5"/>',
  tests: '<path d="M9 11l2 2 4-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><rect x="3" y="3" width="18" height="18" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/>',
  review: '<path d="M5 13l4 4L19 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>',
  complaints: '<path d="M4 4h16v12H7l-3 3V4z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>',
  courseRequests: '<path d="M6 2l1.5 3h9L18 2M3 6h18l-1.5 9a2 2 0 0 1-2 1.7H6.5a2 2 0 0 1-2-1.7L3 6z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><circle cx="9" cy="20" r="1"/><circle cx="17" cy="20" r="1"/>',
}

function icon(name) {
  return `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" class="shrink-0">${ICON_SVGS[name]}</svg>`
}

const ADMIN_LINKS = [
  { path: '/admin', label: 'Dashboard', icon: icon('dashboard') },
  { path: '/admin/subjects', label: 'Subjects', icon: icon('subjects') },
  { path: '/admin/resources', label: 'Resources', icon: icon('resources') },
  { path: '/admin/tests', label: 'Tests', icon: icon('tests') },
  { path: '/admin/review', label: 'Review', icon: icon('review') },
  { path: '/admin/complaints', label: 'Complaints', icon: icon('complaints') },
  { path: '/admin/course-requests', label: 'Course Requests', icon: icon('courseRequests') },
]

export function renderAdminShell(activePath, innerHtml) {
  return `
    <div class="min-h-screen bg-gray-50">
      <aside id="admin-sidebar" class="fixed inset-y-0 left-0 z-40 w-64 bg-gray-900 text-gray-300 flex flex-col -translate-x-full md:translate-x-0 transition-transform">
        <div class="h-16 flex items-center px-6 border-b border-gray-800">
          <a href="/" class="font-bold text-xl text-white">TOPPRIUM</a>
          <span class="ml-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Admin</span>
        </div>

        <nav class="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          ${ADMIN_LINKS.map(link => `
            <a href="${link.path}" class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              link.path === activePath
                ? 'bg-gray-800 text-white'
                : 'text-gray-400 hover:bg-gray-800 hover:text-white'
            }">
              ${link.icon}
              <span>${link.label}</span>
            </a>
          `).join('')}
        </nav>

        <div class="px-3 py-4 border-t border-gray-800">
          <button id="admin-logout-btn" class="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-white transition-colors">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <path d="M16 17l5-5-5-5"/>
              <path d="M21 12H9"/>
            </svg>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <div id="admin-sidebar-overlay" class="hidden fixed inset-0 bg-black/40 z-30 md:hidden"></div>

      <div class="md:pl-64">
        <header class="h-16 flex items-center gap-4 px-4 sm:px-6 lg:px-8 bg-white border-b border-gray-200 sticky top-0 z-20 md:hidden">
          <button id="admin-sidebar-toggle" class="btn btn-outline text-sm flex items-center gap-2">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <path d="M3 6h18M3 12h18M3 18h18"/>
            </svg>
            <span>Menu</span>
          </button>
          <span class="font-semibold text-gray-900">Admin</span>
        </header>

        <main>
          ${innerHtml}
        </main>
      </div>
    </div>
  `
}

export function initAdminShellEvents() {
  const logoutBtn = document.getElementById('admin-logout-btn')
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      try {
        await signOut()
      } catch (e) {
        console.error('Sign out error:', e)
      }
      localStorage.removeItem('userId')
      sessionStorage.removeItem('adminGateUnlocked')
      window.location.href = Router.getUrl('/login')
    })
  }

  const sidebar = document.getElementById('admin-sidebar')
  const overlay = document.getElementById('admin-sidebar-overlay')
  const toggleBtn = document.getElementById('admin-sidebar-toggle')

  function openSidebar() {
    sidebar.classList.remove('-translate-x-full')
    overlay.classList.remove('hidden')
  }

  function closeSidebar() {
    sidebar.classList.add('-translate-x-full')
    overlay.classList.add('hidden')
  }

  if (toggleBtn) toggleBtn.addEventListener('click', openSidebar)
  if (overlay) overlay.addEventListener('click', closeSidebar)
}
