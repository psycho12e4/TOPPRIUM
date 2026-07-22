import { createCourseRequest, getCurrentUser, getSubjects } from '../lib/supabase.js'
import { renderNav, initNavEvents } from '../components/nav.js'
import { showNotification } from '../lib/utils.js'
import { COURSE_ACCESS_BETA_LABEL } from '../lib/feature-flags.js'

const OTHER_VALUE = '__other__'

export async function renderBuyCourse() {
  const { data: subjects } = await getSubjects()
  const courseOptions = (subjects || [])
    .map(s => `<option value="${s.name}">${s.name}${s.grade ? ` (Class ${s.grade})` : ''}</option>`)
    .join('')

  return `
    ${renderNav()}
    <div class="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div class="text-center mb-8">
        <div class="flex items-center justify-center gap-2 mb-2">
          <h1 class="text-3xl font-extrabold text-slate-900">Request Course Access</h1>
          ${COURSE_ACCESS_BETA_LABEL ? '<span class="text-[10px] font-semibold uppercase tracking-wide text-amber-700 bg-amber-100 px-2 py-1 rounded">Beta</span>' : ''}
        </div>
        <p class="text-slate-500">Want a locked course? Share your details and pay at school — we'll unlock your access once payment is collected.</p>
      </div>

      <form id="buy-course-form" class="card space-y-4">
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1" for="course-name">Full name</label>
          <input type="text" id="course-name" required class="input w-full" placeholder="e.g., Aarav Sharma" />
        </div>
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1" for="course-class">Class</label>
          <input type="text" id="course-class" required class="input w-full" placeholder="e.g., VIII" />
        </div>
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1" for="course-select">Course you want</label>
          <select id="course-select" required class="input w-full">
            <option value="">Select a course</option>
            ${courseOptions}
            <option value="${OTHER_VALUE}">Other (type below)</option>
          </select>
        </div>
        <div id="course-other-wrap" class="hidden">
          <label class="block text-sm font-medium text-slate-700 mb-1" for="course-other">Course name</label>
          <input type="text" id="course-other" class="input w-full" placeholder="e.g., Spoken English" />
        </div>
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1" for="course-email">Email</label>
          <input type="email" id="course-email" required class="input w-full" placeholder="you@example.com" />
        </div>
        <div id="course-success" class="hidden rounded-lg border border-green-200 bg-green-50 text-green-700 px-4 py-3 text-sm">
          Thanks! Your request has been received. Please complete the payment at school — we'll unlock your access soon.
        </div>
        <div id="course-error" class="hidden rounded-lg border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm"></div>
        <button type="submit" id="course-submit" class="btn btn-primary w-full">Submit Request</button>
        <p class="text-center text-xs text-slate-400">Prefer to call? Contact: 83689 83030 (Mon–Sat, 9 AM – 7 PM)</p>
      </form>
    </div>
  `
}

export function initBuyCourseEvents() {
  initNavEvents()

  const form = document.getElementById('buy-course-form')
  if (!form) return

  const courseSelect = document.getElementById('course-select')
  const otherWrap = document.getElementById('course-other-wrap')
  const otherInput = document.getElementById('course-other')

  courseSelect.addEventListener('change', () => {
    const isOther = courseSelect.value === OTHER_VALUE
    otherWrap.classList.toggle('hidden', !isOther)
    otherInput.required = isOther
    if (!isOther) otherInput.value = ''
  })

  form.addEventListener('submit', async (e) => {
    e.preventDefault()

    const nameInput = document.getElementById('course-name')
    const classInput = document.getElementById('course-class')
    const emailInput = document.getElementById('course-email')
    const submitBtn = document.getElementById('course-submit')
    const successBox = document.getElementById('course-success')
    const errorBox = document.getElementById('course-error')

    const name = nameInput.value.trim()
    const studentClass = classInput.value.trim()
    const email = emailInput.value.trim()
    const courseName = courseSelect.value === OTHER_VALUE
      ? otherInput.value.trim()
      : courseSelect.value.trim()

    errorBox.classList.add('hidden')
    successBox.classList.add('hidden')

    if (!name || !studentClass || !email || !courseName) return

    submitBtn.disabled = true
    submitBtn.textContent = 'Submitting...'

    try {
      const user = await getCurrentUser()
      const { error } = await createCourseRequest(name, studentClass, email, courseName, user?.id || null)

      if (error) throw error

      form.reset()
      otherWrap.classList.add('hidden')
      successBox.classList.remove('hidden')
      showNotification('Request submitted. We will get in touch to unlock your access!', 'success')
    } catch (err) {
      console.error('Failed to submit course request:', err)
      errorBox.textContent = 'Something went wrong submitting your request. Please try again.'
      errorBox.classList.remove('hidden')
    } finally {
      submitBtn.disabled = false
      submitBtn.textContent = 'Submit Request'
    }
  })
}
