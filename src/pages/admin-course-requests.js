import { getCourseRequests, updateCourseRequestStatus } from '../lib/supabase.js'
import { renderAdminShell, initAdminShellEvents } from '../components/admin-shell.js'
import { showNotification, formatDate } from '../lib/utils.js'

function renderRequestCard(req) {
  const isResolved = req.status === 'resolved'
  return `
    <div class="card" data-request-card="${req.id}">
      <div class="flex justify-between items-start mb-3 gap-4">
        <div>
          <h3 class="text-lg font-semibold text-gray-900">${req.name}</h3>
          <p class="text-sm text-gray-500">Class ${req.student_class} · ${formatDate(req.created_at)}</p>
        </div>
        <span class="text-xs font-medium px-2 py-1 rounded ${isResolved ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}">
          ${isResolved ? 'Resolved' : 'Open'}
        </span>
      </div>
      <p class="text-gray-700 mb-1"><span class="font-medium">Course:</span> ${req.course_name || '—'}</p>
      <p class="text-gray-700 mb-4"><span class="font-medium">Email:</span> ${req.email}</p>
      <div class="flex gap-2">
        ${!isResolved
          ? `<button class="resolve-request-btn btn btn-primary text-sm" data-id="${req.id}">Mark Resolved</button>`
          : `<button class="reopen-request-btn btn btn-outline text-sm" data-id="${req.id}">Reopen</button>`}
      </div>
    </div>
  `
}

export async function renderAdminCourseRequests() {
  const { data, error } = await getCourseRequests()
  const requests = data || []

  return renderAdminShell('/admin/course-requests', `
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 class="text-4xl font-bold text-gray-900 mb-2">Course Requests</h1>
      <p class="text-gray-600 mb-8">Students requesting course access with manual payment collected at school. Grant access from the Tests / Resources pages once payment is confirmed.</p>

      ${error ? `
        <div class="card text-center py-12">
          <p class="text-red-600">Could not load course requests. Please refresh the page.</p>
        </div>
      ` : requests.length === 0 ? `
        <div class="card text-center py-12">
          <p class="text-gray-600">No course requests yet.</p>
        </div>
      ` : `
        <div class="space-y-4">
          ${requests.map(renderRequestCard).join('')}
        </div>
      `}
    </div>
  `)
}

function setCardStatus(card, status) {
  const isResolved = status === 'resolved'
  const badge = card.querySelector('span')
  badge.className = `text-xs font-medium px-2 py-1 rounded ${isResolved ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`
  badge.textContent = isResolved ? 'Resolved' : 'Open'

  const actions = card.querySelector('.flex.gap-2')
  actions.innerHTML = isResolved
    ? `<button class="reopen-request-btn btn btn-outline text-sm" data-id="${card.dataset.requestCard}">Reopen</button>`
    : `<button class="resolve-request-btn btn btn-primary text-sm" data-id="${card.dataset.requestCard}">Mark Resolved</button>`

  wireButton(actions.querySelector('button'))
}

function wireButton(btn) {
  const status = btn.classList.contains('resolve-request-btn') ? 'resolved' : 'open'
  const successMsg = status === 'resolved' ? 'Request marked resolved' : 'Request reopened'

  btn.addEventListener('click', async (e) => {
    const id = e.currentTarget.dataset.id
    e.currentTarget.disabled = true
    const { error } = await updateCourseRequestStatus(id, status)
    if (error) {
      showNotification('Failed: ' + (error.message || 'unknown error'), 'error')
      e.currentTarget.disabled = false
      return
    }
    showNotification(successMsg)
    const card = document.querySelector(`[data-request-card="${id}"]`)
    if (card) setCardStatus(card, status)
  })
}

export function initAdminCourseRequestsEvents() {
  initAdminShellEvents()
  document.querySelectorAll('.resolve-request-btn, .reopen-request-btn').forEach(wireButton)
}
