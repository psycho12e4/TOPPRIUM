// Floating Copilot widget — a launcher button + slide-up chat panel mounted
// once on every authenticated page. Role-aware: admins get authoring modes
// (Quiz / Notes / Rewrite) in addition to chat; students get the study tutor.
//
// The role passed here is only a UI hint. The real access boundary lives in
// the edge function, which re-checks the caller's role server-side.

import { streamCopilot, renderMarkdown } from '../lib/copilot.js'

const MODES = {
  chat: { label: 'Chat', placeholder: 'Ask anything about your studies…' },
  quiz: { label: 'Quiz', placeholder: 'e.g. 5 MCQs on the French Revolution' },
  notes: { label: 'Notes', placeholder: 'e.g. Study notes on Newton’s laws' },
  rewrite: { label: 'Rewrite', placeholder: 'Paste text + say what to do with it…' },
}

const STUDENT_GREETING =
  "Hi! I'm your TOPPRIUM study buddy. Ask me to explain a topic, work through a problem, quiz you, or help you find your way around the site."

const ADMIN_GREETING =
  "Hi! I'm your TOPPRIUM copilot. Chat for help, or use **Quiz**, **Notes**, and **Rewrite** to draft content you can paste into the dashboard."

// Per-page module state. Reset whenever the widget is (re)mounted.
let state = {
  role: 'student',
  mode: 'chat',
  // Conversation history per mode, so switching tabs keeps separate threads.
  threads: { chat: [], quiz: [], notes: [], rewrite: [] },
  busy: false,
  abort: null,
}

function iconSpark() {
  return `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 3l1.9 4.6L18.5 9.5 13.9 11.4 12 16l-1.9-4.6L5.5 9.5l4.6-1.9L12 3z"/>
    <path d="M19 14l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8.8-2z"/>
  </svg>`
}

function iconClose() {
  return `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>`
}

function iconSend() {
  return `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>`
}

/**
 * Returns the widget markup. Call once and append to <body>.
 * @param {'student'|'admin'} role
 */
export function renderCopilotWidget(role = 'student') {
  const isAdmin = role === 'admin'
  const modeKeys = isAdmin ? Object.keys(MODES) : ['chat']

  const tabs = isAdmin
    ? `<div class="copilot-tabs" role="tablist">
        ${modeKeys
          .map(
            (key) => `<button type="button" class="copilot-tab${key === 'chat' ? ' is-active' : ''}" data-mode="${key}" role="tab">${MODES[key].label}</button>`,
          )
          .join('')}
      </div>`
    : ''

  return `
    <button id="copilot-launcher" class="copilot-launcher" aria-label="Open study copilot" title="Copilot">
      ${iconSpark()}
    </button>

    <div id="copilot-panel" class="copilot-panel" role="dialog" aria-label="TOPPRIUM Copilot" aria-hidden="true">
      <header class="copilot-header">
        <div class="copilot-header-title">
          <span class="copilot-header-icon">${iconSpark()}</span>
          <div>
            <div class="copilot-header-name">TOPPRIUM Copilot</div>
            <div class="copilot-header-sub">${isAdmin ? 'Admin' : 'Study buddy'}</div>
          </div>
        </div>
        <button id="copilot-close" class="copilot-icon-btn" aria-label="Close copilot">${iconClose()}</button>
      </header>

      ${tabs}

      <div id="copilot-messages" class="copilot-messages" aria-live="polite"></div>

      <form id="copilot-form" class="copilot-input-row">
        <textarea id="copilot-input" class="copilot-input" rows="1" placeholder="${MODES.chat.placeholder}" autocomplete="off"></textarea>
        <button type="submit" id="copilot-send" class="copilot-send" aria-label="Send">${iconSend()}</button>
      </form>
    </div>
  `
}

function messagesEl() {
  return document.getElementById('copilot-messages')
}

function scrollToBottom() {
  const el = messagesEl()
  if (el) el.scrollTop = el.scrollHeight
}

function addBubble(role, htmlContent) {
  const el = messagesEl()
  if (!el) return null
  const wrap = document.createElement('div')
  wrap.className = `copilot-msg copilot-msg-${role}`
  const bubble = document.createElement('div')
  bubble.className = 'copilot-bubble'
  bubble.innerHTML = htmlContent
  wrap.appendChild(bubble)
  el.appendChild(wrap)
  scrollToBottom()
  return bubble
}

function renderGreeting() {
  const el = messagesEl()
  if (!el) return
  el.innerHTML = ''
  const greeting = state.role === 'admin' ? ADMIN_GREETING : STUDENT_GREETING
  addBubble('assistant', renderMarkdown(greeting))
}

function setBusy(busy) {
  state.busy = busy
  const send = document.getElementById('copilot-send')
  const input = document.getElementById('copilot-input')
  if (send) send.disabled = busy
  if (input) input.disabled = busy
}

async function handleSubmit(text) {
  const thread = state.threads[state.mode]
  thread.push({ role: 'user', content: text })
  addBubble('user', renderMarkdown(text))

  // Typing bubble that we stream into.
  const bubble = addBubble('assistant', '<span class="copilot-typing"><span></span><span></span><span></span></span>')
  let acc = ''

  setBusy(true)
  state.abort = new AbortController()

  try {
    const reply = await streamCopilot(thread, {
      mode: state.mode,
      signal: state.abort.signal,
      onDelta: (delta) => {
        acc += delta
        if (bubble) {
          bubble.innerHTML = renderMarkdown(acc)
          scrollToBottom()
        }
      },
    })
    const finalText = reply || acc
    if (finalText.trim()) {
      thread.push({ role: 'assistant', content: finalText })
      if (bubble) bubble.innerHTML = renderMarkdown(finalText)
    } else if (bubble) {
      bubble.innerHTML = renderMarkdown('_No response — please try again._')
    }
  } catch (err) {
    if (err?.name === 'AbortError') {
      if (bubble) bubble.innerHTML = renderMarkdown('_Stopped._')
    } else {
      if (bubble) bubble.innerHTML = `<span class="copilot-error">${err?.message || 'Something went wrong. Please try again.'}</span>`
    }
    // Drop the failed user turn so a retry doesn't double up context.
    thread.pop()
  } finally {
    setBusy(false)
    state.abort = null
    scrollToBottom()
  }
}

/**
 * Wire up the widget. Call once after mounting the markup.
 * @param {'student'|'admin'} role
 */
export function initCopilotWidget(role = 'student') {
  state = {
    role,
    mode: 'chat',
    threads: { chat: [], quiz: [], notes: [], rewrite: [] },
    busy: false,
    abort: null,
  }

  const launcher = document.getElementById('copilot-launcher')
  const panel = document.getElementById('copilot-panel')
  const closeBtn = document.getElementById('copilot-close')
  const form = document.getElementById('copilot-form')
  const input = document.getElementById('copilot-input')

  if (!launcher || !panel || !form || !input) return

  let opened = false

  const openPanel = () => {
    panel.classList.add('is-open')
    panel.setAttribute('aria-hidden', 'false')
    launcher.classList.add('is-hidden')
    if (!opened) {
      renderGreeting()
      opened = true
    }
    setTimeout(() => input.focus(), 120)
  }

  const closePanel = () => {
    panel.classList.remove('is-open')
    panel.setAttribute('aria-hidden', 'true')
    launcher.classList.remove('is-hidden')
    if (state.abort) state.abort.abort()
  }

  launcher.addEventListener('click', openPanel)
  if (closeBtn) closeBtn.addEventListener('click', closePanel)

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && panel.classList.contains('is-open')) closePanel()
  })

  // Mode tabs (admin only).
  panel.querySelectorAll('.copilot-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      if (state.busy) return
      const mode = tab.getAttribute('data-mode')
      if (!mode || mode === state.mode) return
      state.mode = mode
      panel.querySelectorAll('.copilot-tab').forEach((t) => t.classList.toggle('is-active', t === tab))
      input.placeholder = MODES[mode]?.placeholder || MODES.chat.placeholder

      // Re-render this mode's thread.
      const el = messagesEl()
      el.innerHTML = ''
      const thread = state.threads[mode]
      if (thread.length === 0) {
        renderGreeting()
      } else {
        thread.forEach((m) => addBubble(m.role, renderMarkdown(m.content)))
      }
    })
  })

  // Auto-grow textarea.
  input.addEventListener('input', () => {
    input.style.height = 'auto'
    input.style.height = `${Math.min(input.scrollHeight, 140)}px`
  })

  // Enter to send, Shift+Enter for newline.
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      form.requestSubmit()
    }
  })

  form.addEventListener('submit', (e) => {
    e.preventDefault()
    if (state.busy) return
    const text = input.value.trim()
    if (!text) return
    input.value = ''
    input.style.height = 'auto'
    handleSubmit(text)
  })
}
