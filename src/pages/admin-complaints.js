import { getComplaints, updateComplaintStatus } from '../lib/supabase.js'
import { renderAdminShell, initAdminShellEvents } from '../components/admin-shell.js'
import { showNotification, formatDate } from '../lib/utils.js'

function renderComplaintCard(complaint) {
  const isResolved = complaint.status === 'resolved'
  return `
    <div class="card" data-complaint-card="${complaint.id}">
      <div class="flex justify-between items-start mb-3 gap-4">
        <div>
          <h3 class="text-lg font-semibold text-gray-900">${complaint.email}</h3>
          <p class="text-sm text-gray-500">${formatDate(complaint.created_at)}</p>
        </div>
        <span class="text-xs font-medium px-2 py-1 rounded ${isResolved ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}">
          ${isResolved ? 'Resolved' : 'Open'}
        </span>
      </div>
      <p class="text-gray-700 whitespace-pre-wrap mb-4">${complaint.message}</p>
      <div class="flex gap-2">
        ${!isResolved
          ? `<button class="resolve-complaint-btn btn btn-primary text-sm" data-id="${complaint.id}">Mark Resolved</button>`
          : `<button class="reopen-complaint-btn btn btn-outline text-sm" data-id="${complaint.id}">Reopen</button>`}
      </div>
    </div>
  `
}

export async function renderAdminComplaints() {
  const { data, error } = await getComplaints()
  const complaints = data || []

  return renderAdminShell('/admin/complaints', `
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 class="text-4xl font-bold text-gray-900 mb-2">Complaints</h1>
      <p class="text-gray-600 mb-8">Complaints submitted by users through the complaint form.</p>

      ${error ? `
        <div class="card text-center py-12">
          <p class="text-red-600">Could not load complaints. Please refresh the page.</p>
        </div>
      ` : complaints.length === 0 ? `
        <div class="card text-center py-12">
          <p class="text-gray-600">No complaints yet.</p>
        </div>
      ` : `
        <div class="space-y-4">
          ${complaints.map(renderComplaintCard).join('')}
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
    ? `<button class="reopen-complaint-btn btn btn-outline text-sm" data-id="${card.dataset.complaintCard}">Reopen</button>`
    : `<button class="resolve-complaint-btn btn btn-primary text-sm" data-id="${card.dataset.complaintCard}">Mark Resolved</button>`

  wireButton(actions.querySelector('button'))
}

function wireButton(btn) {
  const status = btn.classList.contains('resolve-complaint-btn') ? 'resolved' : 'open'
  const successMsg = status === 'resolved' ? 'Complaint marked resolved' : 'Complaint reopened'

  btn.addEventListener('click', async (e) => {
    const target = e.currentTarget
    const id = target.dataset.id
    target.disabled = true
    const { error } = await updateComplaintStatus(id, status)
    if (error) {
      showNotification('Failed: ' + (error.message || 'unknown error'), 'error')
      target.disabled = false
      return
    }
    showNotification(successMsg)
    const card = document.querySelector(`[data-complaint-card="${id}"]`)
    if (card) setCardStatus(card, status)
  })
}

export function initAdminComplaintsEvents() {
  initAdminShellEvents()
  document.querySelectorAll('.resolve-complaint-btn, .reopen-complaint-btn').forEach(wireButton)
}
