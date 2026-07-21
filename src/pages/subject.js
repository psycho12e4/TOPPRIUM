import { getSubject, getChapters, getBooks, getSubjectFolders, getSubFolders, getFolderResources } from '../lib/supabase.js'
import { renderNav, initNavEvents } from '../components/nav.js'
import { renderErrorBanner, getFileIcon, formatFileType } from '../lib/utils.js'
import defaultFolderLogo from '../assets/default-folder-logo.png'

function renderChapterCard(chapter) {
  return `
    <a href="/chapter/${chapter.id}" class="card card-interactive">
      <h3 class="text-lg font-semibold text-slate-900">${chapter.title}</h3>
      <p class="text-sm text-slate-500 mt-2">View resources and tests</p>
      <div class="mt-4 inline-flex items-center gap-1.5 text-brand-600 font-semibold text-sm">Open <span class="card-arrow">→</span></div>
    </a>
  `
}

function renderResourceCard(resource) {
  return `
    <a href="${resource.file_url}" target="_blank" class="card card-interactive">
      <div class="flex items-center gap-3">
        <span class="w-11 h-11 shrink-0 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center text-lg font-bold">${getFileIcon(resource.file_type)}</span>
        <div class="flex-1 min-w-0">
          <h3 class="font-semibold text-slate-900 truncate">${resource.title}</h3>
          <p class="text-xs text-slate-400 mt-1">${formatFileType(resource.file_type)}</p>
        </div>
      </div>
    </a>
  `
}

function renderBookCard(book) {
  return `
    <a href="${book.file_url}" target="_blank" class="card card-interactive flex items-center gap-3">
      ${book.cover_url
        ? `<img src="${book.cover_url}" alt="" class="w-12 h-16 rounded object-cover shrink-0">`
        : `<span class="w-12 h-16 rounded bg-brand-50 text-brand-600 flex items-center justify-center text-2xl shrink-0">📖</span>`}
      <div class="min-w-0">
        <h3 class="font-semibold text-slate-900 truncate">${book.name}</h3>
        <p class="text-xs text-brand-600 font-medium mt-1">Open book →</p>
      </div>
    </a>
  `
}

// Recursively renders a folder and its contents (sub-folders, chapters, books).
async function renderFolderTree(folder, allChapters, allBooks, depth = 0) {
  const logo = folder.logo_url || defaultFolderLogo
  const [{ data: subFolders }, { data: folderResources }] = await Promise.all([
    getSubFolders(folder.id),
    getFolderResources(folder.id),
  ])

  const chaptersInFolder = allChapters.filter(ch => ch.folder_id === folder.id)
  const booksInFolder = allBooks.filter(b => b.folder_id === folder.id)

  const subFolderHtml = (await Promise.all(
    (subFolders || []).map(sub => renderFolderTree(sub, allChapters, allBooks, depth + 1))
  )).join('')

  const cards = [
    ...booksInFolder.map(renderBookCard),
    ...chaptersInFolder.map(renderChapterCard),
    ...(folderResources || []).map(renderResourceCard),
  ]

  const isEmpty = !subFolderHtml && cards.length === 0

  return `
    <div class="mb-8 ${depth > 0 ? 'pl-6 border-l-2 border-slate-100' : ''}">
      <div class="flex items-center gap-2.5 mb-4">
        <img src="${logo}" alt="" class="w-7 h-7 rounded-md object-cover">
        <h3 class="text-lg font-semibold text-slate-800">${folder.name}</h3>
      </div>
      ${cards.length > 0 ? `
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 stagger mb-4">
          ${cards.join('')}
        </div>
      ` : ''}
      ${isEmpty ? '<p class="text-sm text-slate-400 mb-4">Empty folder</p>' : ''}
      ${subFolderHtml}
    </div>
  `
}

export async function renderSubject(subjectId) {
  const { data: subject, error: subjectError } = await getSubject(subjectId)
  const { data: chapters, error: chaptersError } = await getChapters(subjectId)
  const { data: books } = await getBooks(subjectId)
  const { data: folders } = await getSubjectFolders(subjectId)

  if (!subject) {
    return `
      ${renderNav()}
      <div class="max-w-7xl mx-auto px-4 py-12 text-center">
        <p class="text-gray-600">${subjectError ? 'Could not load this subject. Please try again.' : 'Subject not found'}</p>
        <a href="/" class="text-blue-600 hover:underline">Back to Home</a>
      </div>
    `
  }

  const allChapters = chapters || []
  const allBooks = books || []
  const foldersHtml = (await Promise.all(
    (folders || []).map(folder => renderFolderTree(folder, allChapters, allBooks))
  )).join('')

  const ungroupedBooks = allBooks.filter(b => !b.folder_id)
  const ungroupedChapters = allChapters.filter(ch => !ch.folder_id)

  return `
    ${renderNav()}
    ${chaptersError ? renderErrorBanner('Could not load chapters. Please refresh the page.') : ''}
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div class="mb-10">
        <a href="/" class="link-anim inline-block text-brand-600 font-medium mb-4">← Back to Subjects</a>
        <h1 class="text-4xl font-extrabold text-slate-900 mb-2">${subject.name}</h1>
      </div>

      ${foldersHtml}

      ${ungroupedBooks.length > 0 ? `
        <div class="mb-12">
          <h2 class="text-2xl font-bold text-slate-900 mb-6">Books</h2>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger">
            ${ungroupedBooks.map(renderBookCard).join('')}
          </div>
        </div>
      ` : ''}

      <h2 class="text-2xl font-bold text-slate-900 mb-6">Chapters</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 stagger">
        ${ungroupedChapters.length > 0
          ? ungroupedChapters.map(renderChapterCard).join('')
          : (chaptersError ? '' : (allChapters.length > 0
              ? '<p class="col-span-2 text-slate-500">All chapters are organized into folders above</p>'
              : '<p class="col-span-2 text-slate-500">No chapters available</p>'))}
      </div>
    </div>
  `
}

export function initSubjectEvents() {
  initNavEvents()
}
