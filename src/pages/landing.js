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
    <header class="bg-blue-600 text-white">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 flex flex-col items-center text-center gap-6">
        <span class="text-xs font-semibold uppercase tracking-widest bg-white/15 border border-white/40 rounded-full px-4 py-1.5">MRIS Charmwood Student Exclusive</span>
        <h1 class="text-5xl font-extrabold leading-tight max-w-3xl">Study smarter. Score higher.</h1>
        <p class="text-xl text-blue-100 max-w-2xl">All your subjects, notes, videos and practice tests in one place, made for school students who want to top their class.</p>
        <div class="flex flex-col sm:flex-row gap-4 mt-2">
          <a href="/signup" class="bg-white text-blue-600 font-semibold text-lg px-8 py-3 rounded-xl shadow-lg hover:bg-blue-50">Sign Up Free</a>
          <a href="/login" class="border border-white/60 text-white font-medium text-lg px-7 py-3 rounded-xl hover:bg-white/10">I already have an account</a>
        </div>
        <p class="text-sm text-blue-200">Free to join / Instant test scores / Learn at your own pace</p>
      </div>
    </header>

    <section id="features" class="bg-gray-50 border-b border-gray-200">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div class="text-center mb-12">
          <h2 class="text-3xl font-bold mb-3">Everything you need to ace your exams</h2>
          <p class="text-gray-500">One account unlocks all of it.</p>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          ${features.map(f => `
            <div class="card flex flex-col gap-3">
              <div class="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                <img src="https://unpkg.com/lucide-static@latest/icons/${f.icon}.svg" alt="" class="w-6 h-6">
              </div>
              <h3 class="text-lg font-semibold">${f.title}</h3>
              <p class="text-sm text-gray-500 leading-relaxed">${f.body}</p>
            </div>
          `).join('')}
        </div>
      </div>
    </section>

    <section id="how" class="bg-white">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div class="text-center mb-12">
          <h2 class="text-3xl font-bold mb-3">How it works</h2>
          <p class="text-gray-500">Three simple steps from sign-up to your first test score.</p>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
          ${steps.map(s => `
            <div class="flex flex-col items-center gap-3 px-3">
              <div class="w-11 h-11 rounded-full bg-blue-600 text-white font-bold text-lg flex items-center justify-center">${s.n}</div>
              <h3 class="text-lg font-semibold">${s.title}</h3>
              <p class="text-sm text-gray-500 leading-relaxed max-w-xs">${s.body}</p>
            </div>
          `).join('')}
        </div>
      </div>
    </section>

    <section id="pricing" class="bg-gray-50 border-t border-gray-200">
      <div class="max-w-2xl mx-auto px-4 py-14 text-center flex flex-col items-center gap-4">
        <h2 class="text-3xl font-bold">Course pricing</h2>
        <p class="text-gray-500 max-w-lg">Pricing varies by course. Call us to find the right plan for the subjects you need.</p>
        <div class="card text-xl font-semibold text-blue-600">Contact: 83689 83030</div>
        <p class="text-sm text-gray-400">Available Mon-Sat, 9 AM - 7 PM</p>
      </div>
    </section>

    <section class="bg-blue-600">
      <div class="max-w-7xl mx-auto px-4 py-14 flex flex-col items-center text-center gap-4">
        <h2 class="text-3xl font-bold text-white">Ready to start topping?</h2>
        <p class="text-blue-100">Create your free account in under a minute.</p>
        <a href="/signup" class="bg-white text-blue-600 font-semibold text-lg px-9 py-3 rounded-xl hover:bg-blue-50">Sign Up Free</a>
      </div>
    </section>

    <footer class="bg-white border-t border-gray-200">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-7 flex items-center justify-between flex-wrap gap-3">
        <div class="flex items-center gap-2">
          <span class="font-semibold text-gray-900">TOPPRIUM</span>
          <span class="text-xs text-gray-400">/ MRIS Charmwood Student Exclusive</span>
        </div>
        <div class="flex gap-5 text-sm text-gray-500">
          <a href="/login" class="hover:text-gray-900">Login</a>
          <a href="/signup" class="hover:text-gray-900">Sign Up</a>
          <span>Contact: 83689 83030</span>
        </div>
        <span class="text-xs text-gray-400">${new Date().getFullYear()} TOPPRIUM</span>
      </div>
    </footer>
  `
}

export function initLandingEvents() {
  initNavEvents()
}
