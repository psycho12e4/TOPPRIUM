import { Router } from '../lib/router.js'
import { renderNav, initNavEvents } from '../components/nav.js'
import { supabase } from '../lib/supabase.js'

export const ADMIN_GATE_KEY = 'adminGateUnlocked'

export function isAdminGateUnlocked() {
  return sessionStorage.getItem(ADMIN_GATE_KEY) === 'true'
}

export async function renderAdminGate() {
  return `
    ${renderNav()}
    <div class="min-h-[70vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div class="w-full max-w-md">
        <div class="card">
          <h2 class="text-2xl font-bold text-center mb-2">Admin Access</h2>
          <p class="text-center text-sm text-gray-600 mb-6">Enter the admin password to continue.</p>
          <form id="admin-gate-form">
            <p id="admin-gate-error" class="hidden mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3"></p>
            <div class="mb-6">
              <label class="block text-sm font-medium mb-2">Password</label>
              <input type="password" id="admin-gate-password" required class="input" placeholder="••••••••" autofocus>
            </div>
            <button type="submit" class="w-full btn btn-primary">Unlock Admin</button>
          </form>
        </div>
      </div>
    </div>
  `
}

export function initAdminGateEvents() {
  initNavEvents()

  const form = document.getElementById('admin-gate-form')
  if (!form) return

  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    const input = document.getElementById('admin-gate-password')
    const errorEl = document.getElementById('admin-gate-error')
    const submitBtn = form.querySelector('button[type="submit"]')

    submitBtn.disabled = true
    const { data: isCorrect, error } = await supabase.rpc('check_admin_gate_password', {
      p_password: input.value,
    })
    submitBtn.disabled = false

    if (!error && isCorrect) {
      sessionStorage.setItem(ADMIN_GATE_KEY, 'true')
      Router.setPath('/admin')
      window.location.href = Router.getUrl('/admin')
    } else {
      errorEl.textContent = 'Incorrect password.'
      errorEl.classList.remove('hidden')
      input.value = ''
      input.focus()
    }
  })
}
