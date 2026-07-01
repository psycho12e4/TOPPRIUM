import { getChapter, getResources, getTests } from '../lib/supabase.js'
import { renderNav, initNavEvents } from '../components/nav.js'
import { getFileIcon, formatFileType } from '../lib/utils.js'

export async function renderChapter(chapterId) {
  const { data: chapter } = await getChapter(chapterId)
  const { data: resources } = await getResources(chapterId)
  const { data: tests } = await getTests(chapterId)

  if (!chapter) {
    return `
      ${renderNav()}
      <div class="max-w-7xl mx-auto px-4 py-12 text-center">
        <p class="text-gray-600">Chapter not found</p>
        <a href="/" class="text-blue-600 hover:underline">Back to Home</a>
      </div>
    `
  }

  return `
    ${renderNav()}
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <a href="/" class="text-blue-600 hover:underline mb-4">← Back to Home</a>
      <h1 class="text-4xl font-bold text-gray-900 mb-2">${chapter.title}</h1>

      ${resources && resources.length > 0 ? `
        <div class="mt-12">
          <h2 class="text-2xl font-bold text-gray-900 mb-6">Resources</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            ${resources.map(resource => `
              <a href="${resource.file_url}" target="_blank" class="card hover:shadow-md transition-shadow">
                <div class="flex items-center gap-3">
                  <span class="text-3xl">${getFileIcon(resource.file_type)}</span>
                  <div class="flex-1">
                    <h3 class="font-semibold text-gray-900 truncate">${resource.title}</h3>
                    <p class="text-xs text-gray-500 mt-1">${formatFileType(resource.file_type)}</p>
                  </div>
                </div>
              </a>
            `).join('')}
          </div>
        </div>
      ` : ''}

      ${tests && tests.length > 0 ? `
        <div class="mt-12">
          <h2 class="text-2xl font-bold text-gray-900 mb-6">Tests</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            ${tests.map(test => `
              <a href="/test/${test.id}" class="card hover:shadow-md transition-shadow cursor-pointer">
                <h3 class="text-lg font-semibold text-gray-900">${test.title}</h3>
                <p class="text-sm text-gray-600 mt-2">📋 Take the test</p>
                <div class="mt-4 inline-block text-blue-600 font-medium text-sm">Start →</div>
              </a>
            `).join('')}
          </div>
        </div>
      ` : ''}
    </div>
  `
}

export function initChapterEvents() {
  initNavEvents()
}
