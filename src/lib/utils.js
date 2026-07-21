export function html(strings, ...values) {
  return strings.reduce((acc, str, i) => acc + str + (values[i] || ''), '')
}

export function formatDate(date) {
  if (!date) return ''
  return new Date(date).toLocaleDateString()
}

export function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

export function getFileIcon(fileType) {
  const icons = {
    'application/pdf': '[PDF]',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '[DOC]',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': '[PPT]',
    'video/mp4': '[VID]',
    'image/jpeg': '[IMG]',
    'image/png': '[IMG]',
  }
  return icons[fileType] || '[FILE]'
}

export function formatFileType(fileType) {
  if (!fileType || typeof fileType !== 'string') return 'FILE'
  const parts = fileType.split('/')
  const ext = parts[1] || parts[0] || 'file'
  return ext.toUpperCase()
}

export function debounce(fn, delay) {
  let timeout
  return function (...args) {
    clearTimeout(timeout)
    timeout = setTimeout(() => fn(...args), delay)
  }
}

export function showNotification(message, type = 'success') {
  const styles = {
    success: { grad: 'linear-gradient(135deg, #14b8a6, #0d9488)', icon: '✓' },
    error: { grad: 'linear-gradient(135deg, #f43f5e, #e11d48)', icon: '!' },
    info: { grad: 'linear-gradient(135deg, #3b6bf6, #2b52e0)', icon: 'i' },
  }
  const { grad, icon } = styles[type] || styles.success

  const div = document.createElement('div')
  div.className =
    'toast fixed top-4 right-4 text-white pl-4 pr-5 py-3 rounded-xl shadow-lg z-50 flex items-center gap-3 max-w-[calc(100vw-2rem)] sm:max-w-sm'
  div.style.backgroundImage = grad
  div.style.boxShadow = '0 12px 30px -10px rgba(15, 23, 42, 0.45)'
  div.innerHTML = `
    <span class="flex items-center justify-center w-6 h-6 rounded-full bg-white/25 font-bold text-sm shrink-0">${icon}</span>
    <span class="text-sm font-medium leading-snug"></span>
  `
  div.querySelector('span:last-child').textContent = message
  document.body.appendChild(div)

  setTimeout(() => {
    div.classList.add('toast-out')
    div.addEventListener('animationend', () => div.remove(), { once: true })
  }, 3000)
}

export function showModal(content) {
  const modal = document.createElement('div')
  modal.className = 'modal'
  modal.innerHTML = `<div class="modal-content">${content}</div>`
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove()
  })
  document.body.appendChild(modal)
  return modal
}

export function closeModal() {
  document.querySelectorAll('.modal').forEach(m => m.remove())
}

// ---------------------------------------------------------------------------
// Styled dialogs — in-app replacements for native prompt()/confirm()/alert().
// Each resolves a Promise instead of blocking the thread, and matches the
// app's design system instead of the browser's default dialog chrome.
// ---------------------------------------------------------------------------

function openDialog(innerHtml, { onOpen } = {}) {
  const overlay = document.createElement('div')
  overlay.className = 'modal'
  overlay.innerHTML = `<div class="modal-content">${innerHtml}</div>`
  document.body.appendChild(overlay)

  const close = () => overlay.remove()
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close()
  })
  const escHandler = (e) => {
    if (e.key === 'Escape') {
      close()
      document.removeEventListener('keydown', escHandler)
    }
  }
  document.addEventListener('keydown', escHandler)

  if (onOpen) onOpen(overlay, close)
  return { overlay, close }
}

/**
 * Styled replacement for window.prompt(message, defaultValue).
 * Resolves the entered string, or null if cancelled/empty.
 */
export function promptDialog(title, { placeholder = '', defaultValue = '', confirmLabel = 'OK', inputType = 'text' } = {}) {
  return new Promise((resolve) => {
    let resolved = false
    const finish = (value) => {
      if (resolved) return
      resolved = true
      resolve(value)
    }

    const { close } = openDialog(`
      <h2 class="text-xl font-bold text-slate-900 mb-4">${title}</h2>
      <input type="${inputType}" id="dialog-input" class="input w-full mb-6" placeholder="${placeholder}" value="${defaultValue}">
      <div class="flex justify-end gap-2">
        <button type="button" id="dialog-cancel" class="btn btn-outline text-sm">Cancel</button>
        <button type="button" id="dialog-confirm" class="btn btn-primary text-sm">${confirmLabel}</button>
      </div>
    `, {
      onOpen: (overlay) => {
        const input = overlay.querySelector('#dialog-input')
        input.focus()
        input.select()

        overlay.querySelector('#dialog-cancel').addEventListener('click', () => {
          finish(null)
          close()
        })
        overlay.querySelector('#dialog-confirm').addEventListener('click', () => {
          const val = input.value.trim()
          finish(val || null)
          close()
        })
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            const val = input.value.trim()
            finish(val || null)
            close()
          }
        })
      },
    })

    // Resolve null if dismissed via overlay click / Escape without an explicit button.
    const observer = new MutationObserver(() => {
      if (!document.body.contains(document.querySelector('#dialog-input'))) {
        finish(null)
        observer.disconnect()
      }
    })
    observer.observe(document.body, { childList: true })
  })
}

/**
 * Styled replacement for window.confirm(message). Resolves true/false.
 */
export function confirmDialog(message, { confirmLabel = 'Delete', danger = true } = {}) {
  return new Promise((resolve) => {
    let resolved = false
    const finish = (value) => {
      if (resolved) return
      resolved = true
      resolve(value)
    }

    const { close } = openDialog(`
      <h2 class="text-xl font-bold text-slate-900 mb-3">Are you sure?</h2>
      <p class="text-slate-600 mb-6">${message}</p>
      <div class="flex justify-end gap-2">
        <button type="button" id="dialog-cancel" class="btn btn-outline text-sm">Cancel</button>
        <button type="button" id="dialog-confirm" class="btn ${danger ? 'btn-danger' : 'btn-primary'} text-sm">${confirmLabel}</button>
      </div>
    `, {
      onOpen: (overlay) => {
        overlay.querySelector('#dialog-cancel').addEventListener('click', () => {
          finish(false)
          close()
        })
        overlay.querySelector('#dialog-confirm').addEventListener('click', () => {
          finish(true)
          close()
        })
      },
    })

    const observer = new MutationObserver(() => {
      if (!document.body.contains(document.querySelector('.modal-content'))) {
        finish(false)
        observer.disconnect()
      }
    })
    observer.observe(document.body, { childList: true })
  })
}

/**
 * A small styled form dialog for cases prompt() can't handle at all (e.g. a
 * name field plus a file upload). `fields` is an array of
 * { name, label, type: 'text'|'file', placeholder?, defaultValue?, accept? }.
 * Resolves an object keyed by field name (File objects for type: 'file'), or
 * null if cancelled. Required text fields must be non-empty to submit.
 */
export function formDialog(title, fields, { confirmLabel = 'Save' } = {}) {
  return new Promise((resolve) => {
    let resolved = false
    const finish = (value) => {
      if (resolved) return
      resolved = true
      resolve(value)
    }

    const fieldsHtml = fields.map((f) => `
      <div class="mb-4">
        <label class="block text-sm font-medium text-slate-700 mb-1">${f.label}</label>
        <input
          type="${f.type === 'file' ? 'file' : (f.type || 'text')}"
          id="dialog-field-${f.name}"
          class="input w-full"
          ${f.placeholder ? `placeholder="${f.placeholder}"` : ''}
          ${f.defaultValue ? `value="${f.defaultValue}"` : ''}
          ${f.accept ? `accept="${f.accept}"` : ''}
        >
      </div>
    `).join('')

    const { close } = openDialog(`
      <h2 class="text-xl font-bold text-slate-900 mb-4">${title}</h2>
      ${fieldsHtml}
      <div class="flex justify-end gap-2 mt-2">
        <button type="button" id="dialog-cancel" class="btn btn-outline text-sm">Cancel</button>
        <button type="button" id="dialog-confirm" class="btn btn-primary text-sm">${confirmLabel}</button>
      </div>
    `, {
      onOpen: (overlay) => {
        const firstInput = overlay.querySelector('#dialog-field-' + fields[0]?.name)
        if (firstInput) firstInput.focus()

        overlay.querySelector('#dialog-cancel').addEventListener('click', () => {
          finish(null)
          close()
        })
        overlay.querySelector('#dialog-confirm').addEventListener('click', () => {
          const result = {}
          for (const f of fields) {
            const el = overlay.querySelector('#dialog-field-' + f.name)
            if (f.type === 'file') {
              result[f.name] = el.files[0] || null
            } else {
              result[f.name] = el.value.trim()
              if (f.required !== false && !result[f.name]) {
                el.focus()
                return
              }
            }
          }
          finish(result)
          close()
        })
      },
    })

    const observer = new MutationObserver(() => {
      if (!document.body.contains(document.querySelector('.modal-content'))) {
        finish(null)
        observer.disconnect()
      }
    })
    observer.observe(document.body, { childList: true })
  })
}

export function renderErrorBanner(message = 'Something went wrong loading this page. Please try again.') {
  return `
    <div class="max-w-7xl mx-auto px-4 py-6">
      <div class="rounded-lg border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">
        ${message}
      </div>
    </div>
  `
}
