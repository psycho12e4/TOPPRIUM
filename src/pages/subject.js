import { getSubject, getChapters, getBooks } from '../lib/supabase.js'
import { renderNav, initNavEvents } from '../components/nav.js'
import { renderErrorBanner } from '../lib/utils.js'

export async function renderSubject(subjectId) {
  const { data: subject, error: subjectError } = await getSubject(subjectId)
  const { data: chapters, error: chaptersError } = await getChapters(subjectId)
  const { data: books } = await getBooks(subjectId)

  if (!subject) {
    return `
      ${renderNav()}
      <div class="max-w-7xl mx-auto px-4 py-12 text-center">
        <p class="text-gray-600">${subjectError ? 'Could not load this subject. Please try again.' : 'Subject not found'}</p>
        <a href="/" class="text-blue-600 hover:underline">Back to Home</a>
      </div>
    `
  }

  return `
    ${renderNav()}
    ${chaptersError ? renderErrorBanner('Could not load chapters. Please refresh the page.') : ''}
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div class="mb-10">
        <a href="/" class="link-anim inline-block text-brand-600 font-medium mb-4">← Back to Subjects</a>
        <h1 class="text-4xl font-extrabold text-slate-900 mb-2">${subject.name}</h1>
      </div>

      ${books && books.length > 0 ? `
        <div class="mb-12">
          <h2 class="text-2xl font-bold text-slate-900 mb-6">Books</h2>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger">
            ${books.map(book => `
              <a href="${book.file_url}" target="_blank" class="card card-interactive flex items-center gap-3">
                ${book.cover_url
                  ? `<img src="${book.cover_url}" alt="" class="w-12 h-16 rounded object-cover shrink-0">`
                  : `<span class="w-12 h-16 rounded bg-brand-50 text-brand-600 flex items-center justify-center text-2xl shrink-0">📖</span>`}
                <div class="min-w-0">
                  <h3 class="font-semibold text-slate-900 truncate">${book.name}</h3>
                  <p class="text-xs text-brand-600 font-medium mt-1">Open book →</p>
                </div>
              </a>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <h2 class="text-2xl font-bold text-slate-900 mb-6">Chapters</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 stagger">
        ${chapters?.map(chapter => `
          <a href="/chapter/${chapter.id}" class="card card-interactive">
            <h3 class="text-lg font-semibold text-slate-900">${chapter.title}</h3>
            <p class="text-sm text-slate-500 mt-2">View resources and tests</p>
            <div class="mt-4 inline-flex items-center gap-1.5 text-brand-600 font-semibold text-sm">Open <span class="card-arrow">→</span></div>
          </a>
        `).join('') || (chaptersError ? '' : '<p class="col-span-2 text-slate-500">No chapters available</p>')}
      </div>
    </div>
  `
}

export function initSubjectEvents() {
  initNavEvents()
}
