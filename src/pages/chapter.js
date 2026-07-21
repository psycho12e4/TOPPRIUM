import { getChapter, getResources, getTests } from '../lib/supabase.js'
import { renderNav, initNavEvents } from '../components/nav.js'
import { getFileIcon, formatFileType, renderErrorBanner } from '../lib/utils.js'

export async function renderChapter(chapterId) {
  const { data: chapter, error: chapterError } = await getChapter(chapterId)
  const { data: resources, error: resourcesError } = await getResources(chapterId)
  const { data: tests, error: testsError } = await getTests(chapterId)

  if (!chapter) {
    return `
      ${renderNav()}
      <div class="max-w-7xl mx-auto px-4 py-12 text-center">
        <p class="text-gray-600">${chapterError ? 'Could not load this chapter. Please try again.' : 'Chapter not found'}</p>
        <a href="/" class="text-blue-600 hover:underline">Back to Home</a>
      </div>
    `
  }

  return `
    ${renderNav()}
    ${resourcesError || testsError ? renderErrorBanner('Some content on this page failed to load. Please refresh.') : ''}
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <a href="/" class="link-anim inline-block text-brand-600 font-medium mb-4">← Back to Home</a>
      <h1 class="text-4xl font-extrabold text-slate-900 mb-2">${chapter.title}</h1>

      ${resources && resources.length > 0 ? `
        <div class="mt-12">
          <h2 class="text-2xl font-bold text-slate-900 mb-6">Resources</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 stagger">
            ${resources.map(resource => `
              <a href="${resource.file_url}" target="_blank" class="card card-interactive">
                <div class="flex items-center gap-3">
                  <span class="w-11 h-11 shrink-0 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center text-lg font-bold">${getFileIcon(resource.file_type)}</span>
                  <div class="flex-1 min-w-0">
                    <h3 class="font-semibold text-slate-900 truncate">${resource.title}</h3>
                    <p class="text-xs text-slate-400 mt-1">${formatFileType(resource.file_type)}</p>
                  </div>
                </div>
              </a>
            `).join('')}
          </div>
        </div>
      ` : ''}

      ${tests && tests.length > 0 ? `
        <div class="mt-12">
          <h2 class="text-2xl font-bold text-slate-900 mb-6">Tests</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6 stagger">
            ${tests.map(test => `
              <a href="/test/${test.id}" class="card card-interactive">
                <h3 class="text-lg font-semibold text-slate-900">${test.title}</h3>
                <p class="text-sm text-slate-500 mt-2">Take the test</p>
                <div class="mt-4 inline-flex items-center gap-1.5 text-brand-600 font-semibold text-sm">Start <span class="card-arrow">→</span></div>
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
