import { renderNav, initNavEvents } from '../components/nav.js'

export async function renderLanding() {
  const features = [
    { icon: 'book-open', title: 'All Your Study Material', body: 'PDFs, videos, presentations and notes for every subject and chapter, uploaded by your teachers and organised so nothing gets lost.' },
    { icon: 'clipboard-check', title: 'Practice Tests', body: 'Take chapter-wise multiple-choice tests whenever you feel ready. No waiting, no pressure, practise as many times as you like.' },
    { icon: 'trending-up', title: 'Instant Scores', body: 'See your score the moment you finish a test, and track how you improve chapter by chapter.' },
  ]

  const steps = [
    { n: '1', title: 'Browse subjects', body: 'Sign up free and explore all your subjects and their chapters.' },
    { n: '2', title: 'Learn at your pace', body: 'Open any chapter to watch videos, read notes and download resources.' },
    { n: '3', title: 'Test yourself', body: 'Take the chapter test and get your score instantly. Repeat until you top it.' },
  ]

  return `
    ${renderNav()}
    <header class="hero-gradient text-white">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-28 flex flex-col items-center text-center gap-6">
        <span class="text-xs font-semibold uppercase tracking-widest bg-white/15 border border-white/40 rounded-full px-4 py-1.5 backdrop-blur-sm animate-float">MRIS Charmwood Student Exclusive</span>
        <h1 class="text-4xl sm:text-6xl font-extrabold leading-[1.08] sm:leading-[1.05] max-w-3xl">Study smarter.<br class="hidden sm:block"> <span class="text-white/90">Score higher.</span></h1>
        <p class="text-lg sm:text-xl text-blue-100 max-w-2xl leading-relaxed">All your subjects, notes, videos and practice tests in one place, made for school students who want to top their class.</p>
        <div class="flex flex-col sm:flex-row gap-4 mt-3 w-full sm:w-auto">
          <a href="/signup" class="btn bg-white !text-brand-700 font-semibold text-lg px-8 py-3.5 shadow-lg hover:!bg-brand-50">Sign Up Free</a>
          <a href="/login" class="btn btn-outline !bg-white/10 !border-white/50 !text-white font-medium text-lg px-7 py-3.5 hover:!bg-white/20">I already have an account</a>
        </div>
        <p class="text-sm text-blue-200/90 mt-1">Free to join &nbsp;/&nbsp; Instant test scores &nbsp;/&nbsp; Learn at your own pace</p>
      </div>
      <div class="h-6 bg-white rounded-t-[2rem] -mb-px"></div>
    </header>

    <section id="features" class="bg-white border-b border-slate-100">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        <div class="text-center mb-12">
          <h2 class="text-3xl sm:text-4xl font-bold mb-3">Everything you need to <span class="gradient-text">ace your exams</span></h2>
          <p class="text-slate-500 text-lg">One account unlocks all of it.</p>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 stagger">
          ${features.map(f => `
            <div class="card card-interactive flex flex-col gap-4">
              <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-50 to-brand-100 flex items-center justify-center ring-1 ring-brand-100">
                <img src="https://unpkg.com/lucide-static@latest/icons/${f.icon}.svg" alt="" class="w-7 h-7" style="filter: invert(28%) sepia(72%) saturate(2200%) hue-rotate(217deg) brightness(92%);">
              </div>
              <h3 class="text-lg font-semibold text-slate-900">${f.title}</h3>
              <p class="text-sm text-slate-500 leading-relaxed">${f.body}</p>
            </div>
          `).join('')}
        </div>
      </div>
    </section>

    <section id="how" class="bg-slate-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        <div class="text-center mb-12">
          <h2 class="text-3xl sm:text-4xl font-bold mb-3">How it works</h2>
          <p class="text-slate-500 text-lg">Three simple steps from sign-up to your first test score.</p>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-8 text-center stagger">
          ${steps.map(s => `
            <div class="flex flex-col items-center gap-4 px-3">
              <div class="w-14 h-14 rounded-2xl text-white font-bold text-xl flex items-center justify-center shadow-brand" style="background-image: var(--grad-brand);">${s.n}</div>
              <h3 class="text-lg font-semibold text-slate-900">${s.title}</h3>
              <p class="text-sm text-slate-500 leading-relaxed max-w-xs">${s.body}</p>
            </div>
          `).join('')}
        </div>
      </div>
    </section>

    <section id="pricing" class="bg-white border-t border-slate-100">
      <div class="max-w-2xl mx-auto px-4 py-16 text-center flex flex-col items-center gap-4">
        <h2 class="text-3xl sm:text-4xl font-bold">Course pricing</h2>
        <p class="text-slate-500 max-w-lg text-lg">Pricing varies by course. Call us to find the right plan for the subjects you need.</p>
        <a href="tel:8368983030" class="card card-interactive text-xl font-semibold gradient-text mt-2">Contact: 83689 83030</a>
        <p class="text-sm text-slate-400">Available Mon-Sat, 9 AM - 7 PM</p>
      </div>
    </section>

    <section class="hero-gradient">
      <div class="max-w-7xl mx-auto px-4 py-16 flex flex-col items-center text-center gap-4">
        <h2 class="text-3xl sm:text-4xl font-bold text-white">Ready to start topping?</h2>
        <p class="text-blue-100 text-lg">Create your free account in under a minute.</p>
        <a href="/signup" class="btn bg-white !text-brand-700 font-semibold text-lg px-9 py-3.5 mt-2 hover:!bg-brand-50">Sign Up Free</a>
      </div>
    </section>

    <footer class="bg-white border-t border-slate-100">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex items-center justify-between flex-wrap gap-4">
        <div class="flex items-center gap-2">
          <span class="font-extrabold gradient-text text-lg">TOPPRIUM</span>
          <span class="text-xs text-slate-400">/ MRIS Charmwood Student Exclusive</span>
        </div>
        <div class="flex gap-5 text-sm text-slate-500 items-center">
          <a href="/login" class="link-anim hover:text-slate-900">Login</a>
          <a href="/signup" class="link-anim hover:text-slate-900">Sign Up</a>
          <span>Contact: 83689 83030</span>
        </div>
        <span class="text-xs text-slate-400">${new Date().getFullYear()} TOPPRIUM</span>
      </div>
    </footer>
  `
}

export function initLandingEvents() {
  initNavEvents()
}
