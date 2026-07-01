import { getSubject, getChapters } from '../lib/supabase.js'
import { renderNav, initNavEvents } from '../components/nav.js'

export async function renderSubject(subjectId) {
  const { data: subject } = await getSubject(subjectId)
  const { data: chapters } = await getChapters(subjectId)

  if (!subject) {
    return `
      ${renderNav()}
      <div class="max-w-7xl mx-auto px-4 py-12 text-center">
        <p class="text-gray-600">Subject not found</p>
        <a href="/" class="text-blue-600 hover:underline">Back to Home</a>
      </div>
    `
  }

  return `
    ${renderNav()}
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div class="mb-12">
        <a href="/" class="text-blue-600 hover:underline mb-4">← Back to Subjects</a>
        <h1 class="text-4xl font-bold text-gray-900 mb-4">${subject.name}</h1>
      </div>

      <h2 class="text-2xl font-bold text-gray-900 mb-6">Chapters</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        ${chapters?.map(chapter => `
          <a href="/chapter/${chapter.id}" class="card hover:shadow-md transition-shadow cursor-pointer">
            <h3 class="text-lg font-semibold text-gray-900">${chapter.title}</h3>
            <p class="text-sm text-gray-600 mt-2">View resources and tests</p>
            <div class="mt-4 inline-block text-blue-600 font-medium text-sm">Open →</div>
          </a>
        `).join('') || '<p class="col-span-2 text-gray-600">No chapters available</p>'}
      </div>
    </div>
  `
}

export function initSubjectEvents() {
  initNavEvents()
}
