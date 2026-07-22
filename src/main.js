import { Router } from './lib/router.js'
import { getCurrentUser, getUserProfile, supabase } from './lib/supabase.js'

import { renderLogin, renderSignup, initAuthEvents } from './pages/auth.js'
import { renderLanding, initLandingEvents } from './pages/landing.js'
import { renderHome, initHomeEvents } from './pages/home.js'
import { renderSubject, initSubjectEvents } from './pages/subject.js'
import { renderChapter, initChapterEvents } from './pages/chapter.js'
import { renderTest, initTestEvents } from './pages/test.js'
import { renderAdminDashboard, initAdminDashboardEvents } from './pages/admin-dashboard.js'
import { renderAdminSubjects, initAdminSubjectsEvents } from './pages/admin-subjects.js'
import { renderAdminResources, initAdminResourcesEvents } from './pages/admin-resources.js'
import { renderAdminTests, initAdminTestsEvents } from './pages/admin-tests.js'
import { renderAdminReview, initAdminReviewEvents } from './pages/admin-review.js'
import { renderComplaint, initComplaintEvents } from './pages/complaint.js'
import { renderAdminComplaints, initAdminComplaintsEvents } from './pages/admin-complaints.js'
import { renderBuyCourse, initBuyCourseEvents } from './pages/buy-course.js'
import { renderAdminCourseRequests, initAdminCourseRequestsEvents } from './pages/admin-course-requests.js'
import { renderAdminGate, initAdminGateEvents, isAdminGateUnlocked } from './pages/admin-gate.js'
import { COURSE_ACCESS_ENABLED } from './lib/feature-flags.js'

const ADMIN_GATE_PATH = '/admin-gate'

const app = document.getElementById('app')
const router = new Router()
const LANDING_PATH = '/landing'
const LANDING_SEEN_KEY = 'toppriumLandingSeen'

function markLandingSeen() {
  localStorage.setItem(LANDING_SEEN_KEY, 'true')
}

async function checkAuth(path) {
  const isAdminRoute = path.startsWith('/admin')
  const authRoutes = ['/login', '/signup']

  // Course access (locked previews / buy-course requests) is built but not
  // yet approved to go live. Redirect its routes away until the flag flips.
  if (!COURSE_ACCESS_ENABLED) {
    if (path === '/buy-course') {
      Router.setPath('/')
      return false
    }
    if (path === '/admin/course-requests') {
      Router.setPath('/admin')
      return false
    }
  }

  let user = null
  try {
    user = await getCurrentUser()
  } catch (e) {
    console.error('getCurrentUser failed:', e)
  }

  if (path === LANDING_PATH) return true
  if (path === ADMIN_GATE_PATH) return true
  if (user && authRoutes.includes(path)) return true

  if (!user) {
    if (path === LANDING_PATH || authRoutes.includes(path)) return true

    Router.setPath(LANDING_PATH)
    return false
  }

  if (isAdminRoute) {
    try {
      const { data: profile } = await getUserProfile(user.id)
      if (!profile || profile.role !== 'admin') {
        Router.setPath('/')
        return false
      }
    } catch (e) {
      console.error('getUserProfile failed:', e)
      Router.setPath('/')
      return false
    }

    if (!isAdminGateUnlocked()) {
      Router.setPath(ADMIN_GATE_PATH)
      return false
    }
  }

  return true
}

router.use(checkAuth)

router.on('/login', async () => {
  app.innerHTML = await renderLogin()
  initAuthEvents()
})

router.on('/signup', async () => {
  app.innerHTML = await renderSignup()
  initAuthEvents()
})

router.on(LANDING_PATH, async () => {
  markLandingSeen()
  app.innerHTML = await renderLanding()
  initLandingEvents()
})

router.on('/', async () => {
  app.innerHTML = await renderHome()
  initHomeEvents()
})

router.on(/^\/subject\/.+$/, async (path) => {
  const subjectId = path.split('/').pop()
  app.innerHTML = await renderSubject(subjectId)
  initSubjectEvents()
})

router.on(/^\/chapter\/.+$/, async (path) => {
  const chapterId = path.split('/').pop()
  app.innerHTML = await renderChapter(chapterId)
  initChapterEvents()
})

router.on(/^\/test\/.+$/, async (path) => {
  const testId = path.split('/').pop()
  app.innerHTML = await renderTest(testId)
  initTestEvents()
})

router.on('/complaint', async () => {
  app.innerHTML = await renderComplaint()
  initComplaintEvents()
})

router.on('/buy-course', async () => {
  app.innerHTML = await renderBuyCourse()
  initBuyCourseEvents()
})

router.on(ADMIN_GATE_PATH, async () => {
  app.innerHTML = await renderAdminGate()
  initAdminGateEvents()
})

router.on('/admin', async () => {
  app.innerHTML = await renderAdminDashboard()
  initAdminDashboardEvents()
})

router.on('/admin/subjects', async () => {
  app.innerHTML = await renderAdminSubjects()
  initAdminSubjectsEvents()
})

router.on('/admin/resources', async () => {
  app.innerHTML = await renderAdminResources()
  initAdminResourcesEvents()
})

router.on('/admin/tests', async () => {
  app.innerHTML = await renderAdminTests()
  initAdminTestsEvents()
})

router.on('/admin/review', async () => {
  app.innerHTML = await renderAdminReview()
  initAdminReviewEvents()
})

router.on('/admin/complaints', async () => {
  app.innerHTML = await renderAdminComplaints()
  initAdminComplaintsEvents()
})

router.on('/admin/course-requests', async () => {
  app.innerHTML = await renderAdminCourseRequests()
  initAdminCourseRequestsEvents()
})

router.on('*', async () => {
  app.innerHTML = `<div class="text-center py-12">
    <h1 class="text-2xl font-bold text-gray-900">404 - Page Not Found</h1>
    <a href="/" class="text-blue-600 hover:underline">Back to Home</a>
  </div>`
})

supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT') {
    localStorage.removeItem('userId')
  } else if (session?.user) {
    localStorage.setItem('userId', session.user.id)
  }
})

async function navigate() {
  // Keep localStorage in sync with the actual session
  try {
    const user = await getCurrentUser()
    if (user) {
      localStorage.setItem('userId', user.id)
    } else {
      localStorage.removeItem('userId')
    }
  } catch (e) {
    console.error('Session sync failed:', e)
  }

  const path = Router.getPath()

  // Smooth cross-fade between routes
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (!reduceMotion && app.children.length) {
    app.style.transition = 'opacity 0.14s ease, transform 0.14s ease'
    app.style.opacity = '0'
    app.style.transform = 'translateY(6px)'
    await new Promise((r) => setTimeout(r, 130))
  }

  await router.navigate(path)
  window.scrollTo(0, 0)

  // Reveal the new page
  app.style.transition = 'opacity 0.28s ease, transform 0.28s ease'
  app.style.opacity = '1'
  app.style.transform = 'translateY(0)'
}

window.addEventListener('popstate', navigate)

window.addEventListener('click', (e) => {
  const anchor = e.target.closest('a')
  if (anchor && anchor.href && anchor.href.startsWith(window.location.origin)) {
    const path = Router.getAppPath(new URL(anchor.href).pathname)
    const isAppRoute = path === '/' ||
      path === '/login' ||
      path === '/signup' ||
      path === LANDING_PATH ||
      path === '/complaint' ||
      path === '/buy-course' ||
      path === ADMIN_GATE_PATH ||
      path.startsWith('/subject/') ||
      path.startsWith('/chapter/') ||
      path.startsWith('/test/') ||
      path.startsWith('/admin')

    if (!isAppRoute) return

    e.preventDefault()
    if (path !== Router.getPath()) {
      Router.setPath(path)
    }
    navigate()
  }
})

navigate()
