import {
  getPendingTests,
  getPendingResources,
  updateTestStatus,
  updateResourceStatus,
} from '../lib/supabase.js'
import { renderNav, initNavEvents } from '../components/nav.js'
import { showNotification, getFileIcon } from '../lib/utils.js'

function chapterLabel(row) {
  const chapter = row.chapters?.title || 'Unknown chapter'
  const subject = row.chapters?.subjects?.name
  return subject ? `${subject} › ${chapter}` : chapter
}

function renderTestCard(test) {
  const questions = test.questions || []
  return `
    <div class="card" data-test-card="${test.id}">
      <div class="flex justify-between items-start mb-4 gap-4">
        <div>
          <h3 class="text-lg font-semibold text-gray-900">${test.title}</h3>
          <p class="text-sm text-gray-500">${chapterLabel(test)} · ${questions.length} question${questions.length === 1 ? '' : 's'}</p>
        </div>
        <span class="text-xs font-medium bg-amber-100 text-amber-800 px-2 py-1 rounded">AI · Pending</span>
      </div>
      <div class="space-y-3 mb-4">
        ${questions.map((q, i) => `
          <div class="p-4 bg-gray-50 rounded border border-gray-200">
            <p class="font-medium text-gray-900 mb-2">${i + 1}. ${q.question}</p>
            <div class="text-sm text-gray-600 space-y-1">
              <p>A) ${q.option_a}</p>
              <p>B) ${q.option_b}</p>
              <p>C) ${q.option_c}</p>
              <p>D) ${q.option_d}</p>
              <p class="font-semibold mt-2">Correct: ${(q.correct_answer || '').toUpperCase()}</p>
            </div>
          </div>
        `).join('') || '<p class="text-gray-600 text-sm">No questions generated.</p>'}
      </div>
      <div class="flex gap-2">
        <button class="approve-test-btn btn btn-primary text-sm" data-id="${test.id}">Approve</button>
        <button class="reject-test-btn btn btn-outline text-sm" data-id="${test.id}">Reject</button>
      </div>
    </div>
  `
}

function renderResourceCard(resource) {
  return `
    <div class="card" data-resource-card="${resource.id}">
      <div class="flex justify-between items-start mb-4 gap-4">
        <div>
          <h3 class="text-lg font-semibold text-gray-900">${getFileIcon(resource.file_type)} ${resource.title}</h3>
          <p class="text-sm text-gray-500">${chapterLabel(resource)}</p>
        </div>
        <span class="text-xs font-medium bg-amber-100 text-amber-800 px-2 py-1 rounded">AI · Pending</span>
      </div>
      <a href="${resource.file_url}" target="_blank" rel="noopener" class="text-blue-600 hover:underline text-sm inline-block mb-4">
        Preview file ↗
      </a>
      <div class="flex gap-2">
        <button class="approve-resource-btn btn btn-primary text-sm" data-id="${resource.id}">Approve</button>
        <button class="reject-resource-btn btn btn-outline text-sm" data-id="${resource.id}">Reject</button>
      </div>
    </div>
  `
}

export async function renderAdminReview() {
  const { data: tests } = await getPendingTests()
  const { data: resources } = await getPendingResources()
  const pendingTests = tests || []
  const pendingResources = resources || []
  const nothing = pendingTests.length === 0 && pendingResources.length === 0

  return `
    ${renderNav(true)}
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 class="text-4xl font-bold text-gray-900 mb-2">Pending Review</h1>
      <p class="text-gray-600 mb-8">AI-generated content is hidden from students until you approve it.</p>

      ${nothing ? `
        <div class="card text-center py-12">
          <p class="text-gray-600">Nothing awaiting review. 🎉</p>
        </div>
      ` : `
        ${pendingTests.length ? `
          <h2 class="text-2xl font-bold text-gray-900 mb-4">Tests (${pendingTests.length})</h2>
          <div class="space-y-4 mb-10">
            ${pendingTests.map(renderTestCard).join('')}
          </div>
        ` : ''}
        ${pendingResources.length ? `
          <h2 class="text-2xl font-bold text-gray-900 mb-4">Resources (${pendingResources.length})</h2>
          <div class="space-y-4">
            ${pendingResources.map(renderResourceCard).join('')}
          </div>
        ` : ''}
      `}
    </div>
  `
}

// Wire an approve/reject button: run the status update, remove the card on success.
function wireStatusButton(selector, cardAttr, updateFn, status, successMsg) {
  document.querySelectorAll(selector).forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.currentTarget.dataset.id
      e.currentTarget.disabled = true
      const { error } = await updateFn(id, status)
      if (error) {
        showNotification('Failed: ' + (error.message || 'unknown error'), 'error')
        e.currentTarget.disabled = false
        return
      }
      showNotification(successMsg)
      const card = document.querySelector(`[${cardAttr}="${id}"]`)
      if (card) card.remove()
    })
  })
}

export function initAdminReviewEvents() {
  initNavEvents()

  wireStatusButton('.approve-test-btn', 'data-test-card', updateTestStatus, 'published', 'Test approved & published')
  wireStatusButton('.reject-test-btn', 'data-test-card', updateTestStatus, 'rejected', 'Test rejected')
  wireStatusButton('.approve-resource-btn', 'data-resource-card', updateResourceStatus, 'published', 'Resource approved & published')
  wireStatusButton('.reject-resource-btn', 'data-resource-card', updateResourceStatus, 'rejected', 'Resource rejected')
}
