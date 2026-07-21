import { getChapter, getChapterResourcesPreview, getChapterTestsPreview, getFolders } from '../lib/supabase.js'
import { renderNav, initNavEvents } from '../components/nav.js'
import { getFileIcon, formatFileType, renderErrorBanner } from '../lib/utils.js'
import { COURSE_ACCESS_ENABLED } from '../lib/feature-flags.js'
import defaultFolderLogo from '../assets/default-folder-logo.png'

const LOCK_ICON = `
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0">
    <rect x="4" y="10" width="16" height="10" rx="2"/>
    <path d="M8 10V7a4 4 0 0 1 8 0v3"/>
  </svg>
`

function renderLockedCard(title, subtitle) {
  return `
    <div class="card relative bg-slate-50 border-slate-200">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <h3 class="text-lg font-semibold text-slate-500 truncate">${title}</h3>
          <p class="text-sm text-slate-400 mt-2">${subtitle}</p>
        </div>
        <span class="w-9 h-9 shrink-0 rounded-xl bg-slate-200 text-slate-500 flex items-center justify-center">${LOCK_ICON}</span>
      </div>
      <a href="/buy-course" class="mt-4 btn btn-primary text-sm inline-flex">Contact to buy course</a>
    </div>
  `
}

function renderResourceCard(resource) {
  if (COURSE_ACCESS_ENABLED && resource.locked) {
    return renderLockedCard(resource.title, 'Locked — buy the course to unlock')
  }
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

function renderFolderGroup(folder, folderResources) {
  const logo = folder.logo_url || defaultFolderLogo
  return `
    <div class="mb-8">
      <div class="flex items-center gap-2.5 mb-4">
        <img src="${logo}" alt="" class="w-7 h-7 rounded-md object-cover">
        <h3 class="text-lg font-semibold text-slate-800">${folder.name}</h3>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 stagger">
        ${folderResources.map(renderResourceCard).join('')}
      </div>
    </div>
  `
}

export async function renderChapter(chapterId) {
  const { data: chapter, error: chapterError } = await getChapter(chapterId)
  const { data: rawResources, error: resourcesError } = await getChapterResourcesPreview(chapterId)
  const { data: rawTests, error: testsError } = await getChapterTestsPreview(chapterId)
  const { data: folders } = await getFolders(chapterId)

  // Locked-preview cards are a course-access feature still behind a flag —
  // until it's enabled, keep the old behavior of simply not showing items
  // the student can't access.
  const resources = COURSE_ACCESS_ENABLED ? rawResources : rawResources?.filter(r => !r.locked)
  const tests = COURSE_ACCESS_ENABLED ? rawTests : rawTests?.filter(t => !t.locked)

  const foldersById = new Map((folders || []).map(f => [f.id, f]))
  const groupedResources = new Map()
  const ungroupedResources = []
  for (const resource of resources || []) {
    if (resource.folder_id && foldersById.has(resource.folder_id)) {
      if (!groupedResources.has(resource.folder_id)) groupedResources.set(resource.folder_id, [])
      groupedResources.get(resource.folder_id).push(resource)
    } else {
      ungroupedResources.push(resource)
    }
  }

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
          ${[...groupedResources.entries()].map(([folderId, folderResources]) =>
            renderFolderGroup(foldersById.get(folderId), folderResources)
          ).join('')}
          ${ungroupedResources.length > 0 ? `
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 stagger">
              ${ungroupedResources.map(renderResourceCard).join('')}
            </div>
          ` : ''}
        </div>
      ` : ''}

      ${tests && tests.length > 0 ? `
        <div class="mt-12">
          <h2 class="text-2xl font-bold text-slate-900 mb-6">Tests</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6 stagger">
            ${tests.map(test => (COURSE_ACCESS_ENABLED && test.locked)
              ? renderLockedCard(test.title, 'Locked — buy the course to unlock')
              : `
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
