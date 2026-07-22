import { getScheduleAnnouncements } from './supabase.js'
import { showNotification } from './utils.js'
import { Router } from './router.js'

const LAST_CHECK_KEY = 'toppriumScheduleAnnouncementsSince'

function getSinceIso() {
  const stored = localStorage.getItem(LAST_CHECK_KEY)
  // First-ever check on this device: don't dump every past scheduled item as
  // "new" — only look forward from now.
  return stored || new Date().toISOString()
}

function labelFor(kind) {
  if (kind === 'test') return 'test'
  if (kind === 'book') return 'book'
  return 'resource'
}

function formatWhen(iso) {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function showAnnouncement(item) {
  const kind = labelFor(item.kind)
  if (item.is_upcoming) {
    showNotification(`"${item.title}" (${kind}) will be uploaded at ${formatWhen(item.scheduled_at)}`, 'info')
    return
  }

  const div = document.createElement('div')
  div.className =
    'toast fixed top-4 right-4 text-white pl-4 pr-5 py-3 rounded-xl shadow-lg z-50 flex items-center gap-3 max-w-[calc(100vw-2rem)] sm:max-w-sm cursor-pointer'
  div.style.backgroundImage = 'linear-gradient(135deg, #14b8a6, #0d9488)'
  div.style.boxShadow = '0 12px 30px -10px rgba(15, 23, 42, 0.45)'
  div.innerHTML = `
    <span class="flex items-center justify-center w-6 h-6 rounded-full bg-white/25 font-bold text-sm shrink-0">✓</span>
    <span class="text-sm font-medium leading-snug">New ${kind} uploaded — ${item.title}. <span class="underline">View file?</span></span>
  `
  div.addEventListener('click', () => {
    div.remove()
    Router.setPath(item.link_path)
    window.location.href = Router.getUrl(item.link_path)
  })
  document.body.appendChild(div)
  setTimeout(() => {
    div.classList.add('toast-out')
    div.addEventListener('animationend', () => div.remove(), { once: true })
  }, 6000)
}

// Shows one notification per scheduled item that's either upcoming or went
// live since the last time this device checked, then advances the
// last-checked marker so the same item isn't announced again. Meant to be
// called once per app session for a logged-in, non-admin user.
export async function checkScheduleAnnouncements() {
  const since = getSinceIso()
  const now = new Date().toISOString()

  try {
    const { data, error } = await getScheduleAnnouncements(since)
    if (error) throw error

    for (const item of data || []) {
      showAnnouncement(item)
    }
  } catch (e) {
    console.error('Schedule announcements check failed:', e)
  } finally {
    localStorage.setItem(LAST_CHECK_KEY, now)
  }
}
