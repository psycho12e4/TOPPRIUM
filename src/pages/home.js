import { getSubjects } from '../lib/supabase.js'
import { renderNav, initNavEvents } from '../components/nav.js'
import { renderErrorBanner } from '../lib/utils.js'
import { filterToCurrentClass } from '../lib/site-scope.js'

export async function renderHome() {
  const { data: rawSubjects, error } = await getSubjects()
  const subjects = filterToCurrentClass(rawSubjects)

  return `
    ${renderNav()}
    ${error ? renderErrorBanner('Could not load subjects. Please refresh the page.') : ''}
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
      <div class="text-center mb-12">
        <h1 class="text-4xl sm:text-5xl font-extrabold text-slate-900 mb-4">Welcome to <span class="gradient-text">TOPPRIUM</span></h1>
        <p class="text-lg sm:text-xl text-slate-500">Learn from expertly curated educational content</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 stagger">
        ${subjects?.map(subject => `
          <a href="/subject/${subject.id}" class="card card-interactive">
            <div class="flex items-start justify-between gap-4">
              <div>
                <h3 class="text-lg font-semibold text-slate-900">${subject.name}</h3>
                <p class="text-sm text-slate-500 mt-2">Explore chapters and resources</p>
              </div>
              <span class="w-10 h-10 shrink-0 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center text-xl">📚</span>
            </div>
            <div class="mt-5 inline-flex items-center gap-1.5 text-brand-600 font-semibold text-sm">Browse <span class="card-arrow">→</span></div>
          </a>
        `).join('') || (error ? '' : '<p class="col-span-3 text-center text-slate-500">No subjects available yet</p>')}
      </div>
    </div>
  `
}

export function initHomeEvents() {
  initNavEvents()
}
