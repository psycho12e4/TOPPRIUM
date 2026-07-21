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
  const div = document.createElement('div')
  const bgColor = type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500'
  div.className = `fixed top-4 right-4 ${bgColor} text-white px-6 py-3 rounded-lg shadow-lg z-50`
  div.textContent = message
  document.body.appendChild(div)
  setTimeout(() => div.remove(), 3000)
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

export function renderErrorBanner(message = 'Something went wrong loading this page. Please try again.') {
  return `
    <div class="max-w-7xl mx-auto px-4 py-6">
      <div class="rounded-lg border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">
        ${message}
      </div>
    </div>
  `
}
