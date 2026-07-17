import {
  getChapters,
  getResources,
  createResource,
  deleteResource,
  getResourceAllowedUsers,
  updateResourceAccess,
  uploadFile,
  getSubjects,
  getProfiles,
} from '../lib/supabase.js'
import { renderNav, initNavEvents } from '../components/nav.js'
import { showNotification } from '../lib/utils.js'

export async function renderAdminResources() {
  const { data: subjects } = await getSubjects()
  const { data: profiles } = await getProfiles()
  const students = profiles?.filter(profile => profile.role !== 'admin') || []

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

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label class="block text-sm font-medium mb-2">Who can access this?</label>
              <select id="resource-access-level" class="input">
                <option value="everyone">Everyone</option>
                <option value="selected">Selected users only</option>
              </select>
            </div>
            <div id="resource-user-picker" class="hidden">
              <label class="block text-sm font-medium mb-2">Selected users</label>
              <select id="resource-user-ids" class="input min-h-32" multiple>
                ${students.map(user => `
                  <option value="${user.id}">${user.email || user.id}</option>
                `).join('')}
              </select>
              <p class="text-xs text-gray-500 mt-1">Hold Ctrl/Cmd to select more than one user.</p>
            </div>
          </div>

          <button type="submit" class="btn btn-primary">Upload Resource</button>
        </form>
      </div>

      <div id="resources-container" class="space-y-4"></div>
    </div>
  `
}

function renderUserOptions(students, selectedUserIds = []) {
  const selected = new Set(selectedUserIds)
  return students.map(user => `
    <option value="${user.id}" ${selected.has(user.id) ? 'selected' : ''}>${user.email || user.id}</option>
  `).join('')
}

export function initAdminResourcesEvents() {
  initNavEvents()

  const subjectSelect = document.getElementById('subject-select')
  const chapterSelect = document.getElementById('chapter-select')
  const resourcesContainer = document.getElementById('resources-container')
  const accessLevelSelect = document.getElementById('resource-access-level')
  const userPicker = document.getElementById('resource-user-picker')

  if (accessLevelSelect && userPicker) {
    accessLevelSelect.addEventListener('change', (e) => {
      userPicker.classList.toggle('hidden', e.target.value !== 'selected')
    })
  }

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
        const { data: resources } = await getResources(chapterId, { includeAll: true })
        resourcesContainer.innerHTML = `
          <h2 class="text-2xl font-bold text-gray-900 mb-4">Resources in this Chapter</h2>
          <div class="space-y-3">
            ${resources?.map(r => `
              <div class="card">
                <div class="flex justify-between items-center">
                  <div>
                    <p class="font-medium text-gray-900">${r.title}</p>
                    <p class="text-xs text-gray-500">${r.file_type}</p>
                    <p class="text-xs text-gray-500">${r.access_level === 'selected' ? 'Selected users only' : 'Everyone'}</p>
                  </div>
                  <div class="flex gap-2">
                    <button
                      class="manage-resource-access-btn btn btn-outline text-sm"
                      data-id="${r.id}"
                      data-access-level="${r.access_level || 'everyone'}"
                    >
                      Manage Access
                    </button>
                    <button class="delete-resource-btn btn btn-danger text-sm" data-id="${r.id}">
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            `).join('') || '<p class="text-gray-600">No resources yet</p>'}
          </div>
        `

        resourcesContainer.querySelectorAll('.manage-resource-access-btn').forEach(btn => {
          btn.addEventListener('click', async (event) => {
            const resourceId = event.currentTarget.dataset.id
            const currentAccessLevel = event.currentTarget.dataset.accessLevel
            const { data: allowedUsers, error } = await getResourceAllowedUsers(resourceId)

            if (error) {
              showNotification('Failed to load access list: ' + (error.message || ''), 'error')
              return
            }

            const selectedUserIds = allowedUsers?.map(row => row.user_id) || []
            const card = event.currentTarget.closest('.card')
            let editor = card.querySelector('.resource-access-editor')

            if (editor) {
              editor.remove()
              return
            }

            editor = document.createElement('div')
            editor.className = 'resource-access-editor mt-4 pt-4 border-t border-gray-200'
            editor.innerHTML = `
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium mb-2">Who can access this?</label>
                  <select class="resource-edit-access-level input">
                    <option value="everyone" ${currentAccessLevel !== 'selected' ? 'selected' : ''}>Everyone</option>
                    <option value="selected" ${currentAccessLevel === 'selected' ? 'selected' : ''}>Selected users only</option>
                  </select>
                </div>
                <div class="resource-edit-user-picker ${currentAccessLevel === 'selected' ? '' : 'hidden'}">
                  <label class="block text-sm font-medium mb-2">Selected users</label>
                  <select class="resource-edit-user-ids input min-h-32" multiple>
                    ${renderUserOptions(students, selectedUserIds)}
                  </select>
                  <p class="text-xs text-gray-500 mt-1">Hold Ctrl/Cmd to select more than one user.</p>
                </div>
              </div>
              <div class="flex gap-2 mt-4">
                <button class="save-resource-access-btn btn btn-primary text-sm">Save Access</button>
                <button class="cancel-resource-access-btn btn btn-outline text-sm">Cancel</button>
              </div>
            `
            card.appendChild(editor)

            const editAccessLevel = editor.querySelector('.resource-edit-access-level')
            const editUserPicker = editor.querySelector('.resource-edit-user-picker')
            editAccessLevel.addEventListener('change', (changeEvent) => {
              editUserPicker.classList.toggle('hidden', changeEvent.target.value !== 'selected')
            })

            editor.querySelector('.cancel-resource-access-btn').addEventListener('click', () => editor.remove())
            editor.querySelector('.save-resource-access-btn').addEventListener('click', async () => {
              const accessLevel = editAccessLevel.value
              const userIds = [...editor.querySelector('.resource-edit-user-ids').selectedOptions].map(option => option.value)

              if (accessLevel === 'selected' && userIds.length === 0) {
                showNotification('Please select at least one user', 'error')
                return
              }

              const { error: saveError } = await updateResourceAccess(resourceId, { accessLevel, userIds })
              if (saveError) {
                showNotification('Failed to update access: ' + (saveError.message || ''), 'error')
              } else {
                showNotification('Access updated')
                chapterSelect.dispatchEvent(new Event('change'))
              }
            })
          })
        })

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
      const accessLevel = document.getElementById('resource-access-level').value
      const userIds = [...document.getElementById('resource-user-ids').selectedOptions].map(option => option.value)

      if (!chapterId || !title || !file) {
        showNotification('Please fill all fields', 'error')
        return
      }

      if (accessLevel === 'selected' && userIds.length === 0) {
        showNotification('Please select at least one user', 'error')
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
      const { error: dbError } = await createResource(chapterId, title, fileUrl, file.type, { accessLevel, userIds })

      if (dbError) {
        showNotification('Failed to save resource: ' + (dbError.message || ''), 'error')
      } else {
        showNotification('Resource uploaded successfully')
        location.reload()
      }
    })
  }
}
