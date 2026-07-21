import { createComplaint, getCurrentUser } from '../lib/supabase.js'
import { renderNav, initNavEvents } from '../components/nav.js'
import { showNotification } from '../lib/utils.js'

export async function renderComplaint() {
  return `
    ${renderNav()}
    <div class="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold text-gray-900 mb-2">Raise a Complaint</h1>
        <p class="text-gray-600">Let us know what went wrong and we'll get back to you.</p>
      </div>

      <form id="complaint-form" class="card space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1" for="complaint-email">Email</label>
          <input type="email" id="complaint-email" required class="input w-full" placeholder="you@example.com" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1" for="complaint-message">Complaint</label>
          <textarea id="complaint-message" required rows="6" class="input w-full" placeholder="Describe your issue..."></textarea>
        </div>
        <div id="complaint-success" class="hidden rounded-lg border border-green-200 bg-green-50 text-green-700 px-4 py-3 text-sm">
          Thanks for reaching out! We will get back to you soon.
        </div>
        <div id="complaint-error" class="hidden rounded-lg border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm"></div>
        <button type="submit" id="complaint-submit" class="btn btn-primary w-full">Submit Complaint</button>
      </form>
    </div>
  `
}

export function initComplaintEvents() {
  initNavEvents()

  const form = document.getElementById('complaint-form')
  if (!form) return

  form.addEventListener('submit', async (e) => {
    e.preventDefault()

    const emailInput = document.getElementById('complaint-email')
    const messageInput = document.getElementById('complaint-message')
    const submitBtn = document.getElementById('complaint-submit')
    const successBox = document.getElementById('complaint-success')
    const errorBox = document.getElementById('complaint-error')

    const email = emailInput.value.trim()
    const message = messageInput.value.trim()

    errorBox.classList.add('hidden')
    successBox.classList.add('hidden')

    if (!email || !message) return

    submitBtn.disabled = true
    submitBtn.textContent = 'Submitting...'

    try {
      const user = await getCurrentUser()
      const { error } = await createComplaint(email, message, user?.id || null)

      if (error) throw error

      form.reset()
      successBox.classList.remove('hidden')
      showNotification('Complaint submitted. We will get back to you!', 'success')
    } catch (err) {
      console.error('Failed to submit complaint:', err)
      errorBox.textContent = 'Something went wrong submitting your complaint. Please try again.'
      errorBox.classList.remove('hidden')
    } finally {
      submitBtn.disabled = false
      submitBtn.textContent = 'Submit Complaint'
    }
  })
}
