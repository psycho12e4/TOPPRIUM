import { Router } from './lib/router.js'
import { getCurrentUser, getUserProfile, supabase } from './lib/supabase.js'

import { renderLogin, renderSignup, initAuthEvents } from './pages/auth.js'
import { renderHome, initHomeEvents } from './pages/home.js'
import { renderSubject, initSubjectEvents } from './pages/subject.js'
import { renderChapter, initChapterEvents } from './pages/chapter.js'
import { renderTest, initTestEvents } from './pages/test.js'
import { renderAdminDashboard, initAdminDashboardEvents } from './pages/admin-dashboard.js'
import { renderAdminSubjects, initAdminSubjectsEvents } from './pages/admin-subjects.js'
import { renderAdminResources, initAdminResourcesEvents } from './pages/admin-resources.js'
import { renderAdminTests, initAdminTestsEvents } from './pages/admin-tests.js'
import { renderAdminReview, initAdminReviewEvents } from './pages/admin-review.js'

const app = document.getElementById('app')
const router = new Router()

async function checkAuth(path) {
  const isAdminRoute = path.startsWith('/admin')
  const authRoutes = ['/login', '/signup']

  if (authRoutes.includes(path)) return true

  let user = null
  try {
    user = await getCurrentUser()
  } catch (e) {
    console.error('getCurrentUser failed:', e)
  }

  if (!user) {
    Router.setPath('/login')
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
  await router.navigate(path)
  window.scrollTo(0, 0)
}

window.addEventListener('popstate', navigate)

window.addEventListener('click', (e) => {
  const anchor = e.target.closest('a')
  if (anchor && anchor.href && anchor.href.startsWith(window.location.origin)) {
    const path = new URL(anchor.href).pathname
    if (path !== Router.getPath()) {
      e.preventDefault()
      Router.setPath(path)
      navigate()
    }
  }
})

navigate()
