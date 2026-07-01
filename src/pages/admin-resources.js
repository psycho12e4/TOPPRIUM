import {
  getChapters,
  getResources,
  createResource,
  deleteResource,
  uploadFile,
  getSubjects,
} from '../lib/supabase.js'
import { renderNav, initNavEvents } from '../components/nav.js'
import { showNotification } from '../lib/utils.js'

export async function renderAdminResources() {
  const { data: subjects } = await getSubjects()

  return `
    ${renderNav(true)}
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 class="text-4xl font-bold text-gray-900 mb-8">Upload Resources</h1>

      <div class="card mb-8">
        <form id="upload-form">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label class="block text-sm font-medium mb-2">Subject</label>
              <select id="subject-select" class="input">
                <option value="">Select a subject</option>
                ${subjects?.map(s => `<option value="${s.id}">${s.name}</option>`).join('') || ''}
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium mb-2">Chapter</label>
              <select id="chapter-select" class="input" disabled>
                <option value="">Select a chapter</option>
              </select>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label class="block text-sm font-medium mb-2">Resource Title</label>
              <input type="text" id="resource-title" class="input" placeholder="e.g., Chapter 1 Lecture">
            </div>
            <div>
              <label class="block text-sm font-medium mb-2">File</label>
              <input type="file" id="file-input" class="input" accept=".pdf,.pptx,.docx,.mp4,.jpg,.png">
            </div>
          </div>

          <button type="submit" class="btn btn-primary">Upload Resource</button>
        </form>
      </div>

      <div id="resources-container" class="space-y-4"></div>
    </div>
  `
}

export function initAdminResourcesEvents() {
  initNavEvents()

  const subjectSelect = document.getElementById('subject-select')
  const chapterSelect = document.getElementById('chapter-select')
  const resourcesContainer = document.getElementById('resources-container')

  if (subjectSelect) {
    subjectSelect.addEventListener('change', async (e) => {
      const subjectId = e.target.value
      if (subjectId) {
        const { data: chapters } = await getChapters(subjectId)
        chapterSelect.innerHTML = '<option value="">Select a chapter</option>'
        chapters?.forEach(ch => {
          const option = document.createElement('option')
          option.value = ch.id
          option.textContent = ch.title
          chapterSelect.appendChild(option)
        })
        chapterSelect.disabled = false
      } else {
        chapterSelect.innerHTML = '<option value="">Select a chapter</option>'
        chapterSelect.disabled = true
      }
    })
  }

  if (chapterSelect) {
    chapterSelect.addEventListener('change', async (e) => {
      const chapterId = e.target.value
      if (chapterId) {
        const { data: resources } = await getResources(chapterId)
        resourcesContainer.innerHTML = `
          <h2 class="text-2xl font-bold text-gray-900 mb-4">Resources in this Chapter</h2>
          <div class="space-y-3">
            ${resources?.map(r => `
              <div class="card flex justify-between items-center">
                <div>
                  <p class="font-medium text-gray-900">${r.title}</p>
                  <p class="text-xs text-gray-500">${r.file_type}</p>
                </div>
                <button class="delete-resource-btn btn btn-danger text-sm" data-id="${r.id}">
                  Delete
                </button>
              </div>
            `).join('') || '<p class="text-gray-600">No resources yet</p>'}
          </div>
        `

        resourcesContainer.querySelectorAll('.delete-resource-btn').forEach(btn => {
          btn.addEventListener('click', async (event) => {
            if (confirm('Delete this resource?')) {
              const { error } = await deleteResource(event.currentTarget.dataset.id)
              if (!error) {
                showNotification('Resource deleted')
                location.reload()
              } else {
                showNotification('Failed to delete resource', 'error')
              }
            }
          })
        })
      }
    })
  }

  const uploadForm = document.getElementById('upload-form')
  if (uploadForm) {
    uploadForm.addEventListener('submit', async (e) => {
      e.preventDefault()

      const chapterId = document.getElementById('chapter-select').value
      const title = document.getElementById('resource-title').value
      const file = document.getElementById('file-input').files[0]

      if (!chapterId || !title || !file) {
        showNotification('Please fill all fields', 'error')
        return
      }

      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const fileName = `${Date.now()}-${safeName}`
      showNotification('Uploading...')
      const { error: uploadError } = await uploadFile('resources', fileName, file)

      if (uploadError) {
        showNotification('Upload failed: ' + (uploadError.message || 'check storage bucket'), 'error')
        return
      }

      const fileUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/resources/${fileName}`
      const { error: dbError } = await createResource(chapterId, title, fileUrl, file.type)

      if (dbError) {
        showNotification('Failed to save resource: ' + (dbError.message || ''), 'error')
      } else {
        showNotification('Resource uploaded successfully')
        location.reload()
      }
    })
  }
}
