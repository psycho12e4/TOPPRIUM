import { getSubjects } from '../lib/supabase.js'
import { renderNav, initNavEvents } from '../components/nav.js'

export async function renderHome() {
  const { data: subjects } = await getSubjects()

  return `
    ${renderNav()}
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div class="text-center mb-12">
        <h1 class="text-4xl font-bold text-gray-900 mb-4">Welcome to TOPPRIUM</h1>
        <p class="text-xl text-gray-600">Learn from expertly curated educational content</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        ${subjects?.map(subject => `
          <a href="/subject/${subject.id}" class="card hover:shadow-md transition-shadow cursor-pointer">
            <div class="flex items-start justify-between">
              <div>
                <h3 class="text-lg font-semibold text-gray-900">${subject.name}</h3>
                <p class="text-sm text-gray-600 mt-2">Explore chapters and resources</p>
              </div>
              <span class="text-2xl">📚</span>
            </div>
            <div class="mt-4 inline-block text-blue-600 font-medium text-sm">Browse →</div>
          </a>
        `).join('') || '<p class="col-span-3 text-center text-gray-600">No subjects available yet</p>'}
      </div>
    </div>
  `
}

export function initHomeEvents() {
  initNavEvents()
}
