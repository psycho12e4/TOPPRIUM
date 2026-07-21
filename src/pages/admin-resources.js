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
  getFolders,
  createFolder,
  updateFolder,
  deleteFolder,
  setResourceFolder,
  getPublicUrl,
} from '../lib/supabase.js'
import { renderAdminShell, initAdminShellEvents } from '../components/admin-shell.js'
import { showNotification, formDialog, confirmDialog } from '../lib/utils.js'
import defaultFolderLogo from '../assets/default-folder-logo.png'

let students = []

export async function renderAdminResources() {
  const { data: subjects } = await getSubjects()
  const { data: profiles } = await getProfiles()
  students = profiles?.filter(profile => profile.role !== 'admin') || []

  return renderAdminShell('/admin/resources', `
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
                ${renderUserOptions(students)}
              </select>
              <p class="text-xs text-gray-500 mt-1">
                ${students.length ? 'Hold Ctrl/Cmd to select more than one user.' : 'Create student accounts and run the access SQL migration if this stays empty.'}
              </p>
            </div>
          </div>

          <button type="submit" class="btn btn-primary">Upload Resource</button>
        </form>
      </div>

      <div id="folders-section" class="hidden card mb-8">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-xl font-bold text-gray-900">Folders</h2>
          <button id="add-folder-btn" class="btn btn-secondary text-sm">+ Add Folder</button>
        </div>
        <div id="folders-list" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"></div>
      </div>

      <div id="resources-container" class="space-y-4"></div>
    </div>
  `)
}

function renderFolderCard(folder) {
  const logo = folder.logo_url || defaultFolderLogo
  return `
    <div class="card flex items-center gap-3" data-folder-card="${folder.id}">
      <img src="${logo}" alt="" class="w-10 h-10 rounded-lg object-cover shrink-0">
      <div class="flex-1 min-w-0">
        <p class="font-medium text-gray-900 truncate">${folder.name}</p>
      </div>
      <div class="flex gap-1.5 shrink-0">
        <button class="edit-folder-btn btn btn-outline text-xs" data-id="${folder.id}" data-name="${folder.name}">Edit</button>
        <button class="delete-folder-btn btn btn-danger text-xs" data-id="${folder.id}">Delete</button>
      </div>
    </div>
  `
}

function folderOptionsHtml(folders, selectedFolderId = '') {
  return `<option value="">No folder</option>` + folders.map(f =>
    `<option value="${f.id}" ${f.id === selectedFolderId ? 'selected' : ''}>${f.name}</option>`
  ).join('')
}

function renderUserOptions(students, selectedUserIds = []) {
  if (!students.length) {
    return '<option value="" disabled>No student users found</option>'
  }

  const selected = new Set(selectedUserIds)
  return students.map(user => `
    <option value="${user.id}" ${selected.has(user.id) ? 'selected' : ''}>${user.email || user.id}</option>
  `).join('')
}

export function initAdminResourcesEvents() {
  initAdminShellEvents()

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

  const foldersSection = document.getElementById('folders-section')
  const foldersList = document.getElementById('folders-list')
  const addFolderBtn = document.getElementById('add-folder-btn')
  let currentChapterId = ''
  let currentFolders = []

  async function loadFolders(chapterId) {
    const { data } = await getFolders(chapterId)
    currentFolders = data || []
    foldersList.innerHTML = currentFolders.length
      ? currentFolders.map(renderFolderCard).join('')
      : '<p class="text-gray-600 text-sm col-span-full">No folders yet. Folders let you group resources (e.g. "Notes", "Videos").</p>'
    wireFolderButtons()
  }

  function wireFolderButtons() {
    foldersList.querySelectorAll('.edit-folder-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.dataset.id
        const name = e.currentTarget.dataset.name
        const result = await formDialog('Edit Folder', [
          { name: 'name', label: 'Folder name', type: 'text', defaultValue: name },
          { name: 'logo', label: 'New logo (optional)', type: 'file', accept: 'image/*', required: false },
        ], { confirmLabel: 'Save' })
        if (!result) return

        let logoUrl
        if (result.logo) {
          const safeName = result.logo.name.replace(/[^a-zA-Z0-9._-]/g, '_')
          const path = `${Date.now()}-${safeName}`
          const { error: upErr } = await uploadFile('folder-logos', path, result.logo)
          if (upErr) {
            showNotification('Logo upload failed: ' + (upErr.message || ''), 'error')
            return
          }
          logoUrl = getPublicUrl('folder-logos', path)
        }

        const { error } = await updateFolder(id, { name: result.name, logoUrl })
        if (error) {
          showNotification('Failed to update folder: ' + (error.message || ''), 'error')
        } else {
          showNotification('Folder updated')
          loadFolders(currentChapterId)
        }
      })
    })

    foldersList.querySelectorAll('.delete-folder-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.dataset.id
        const ok = await confirmDialog('This deletes the folder. Resources inside it are kept, just unassigned from the folder.')
        if (!ok) return
        const { error } = await deleteFolder(id)
        if (error) {
          showNotification('Failed to delete folder: ' + (error.message || ''), 'error')
        } else {
          showNotification('Folder deleted')
          loadFolders(currentChapterId)
          chapterSelect.dispatchEvent(new Event('change'))
        }
      })
    })
  }

  if (addFolderBtn) {
    addFolderBtn.addEventListener('click', async () => {
      if (!currentChapterId) {
        showNotification('Select a chapter first', 'error')
        return
      }
      const result = await formDialog('Add Folder', [
        { name: 'name', label: 'Folder name', type: 'text', placeholder: 'e.g., Notes, Videos, Past Papers' },
        { name: 'logo', label: 'Folder logo (optional)', type: 'file', accept: 'image/*', required: false },
      ], { confirmLabel: 'Create' })
      if (!result) return

      let logoUrl = null
      if (result.logo) {
        const safeName = result.logo.name.replace(/[^a-zA-Z0-9._-]/g, '_')
        const path = `${Date.now()}-${safeName}`
        const { error: upErr } = await uploadFile('folder-logos', path, result.logo)
        if (upErr) {
          showNotification('Logo upload failed: ' + (upErr.message || ''), 'error')
          return
        }
        logoUrl = getPublicUrl('folder-logos', path)
      }

      const { error } = await createFolder({ chapterId: currentChapterId, name: result.name, logoUrl })
      if (error) {
        showNotification('Failed to create folder: ' + (error.message || ''), 'error')
      } else {
        showNotification('Folder created')
        loadFolders(currentChapterId)
      }
    })
  }

  if (chapterSelect) {
    chapterSelect.addEventListener('change', async (e) => {
      const chapterId = e.target.value
      currentChapterId = chapterId
      if (chapterId) {
        foldersSection.classList.remove('hidden')
        await loadFolders(chapterId)

        const { data: resources } = await getResources(chapterId, { includeAll: true })
        resourcesContainer.innerHTML = `
          <h2 class="text-2xl font-bold text-gray-900 mb-4">Resources in this Chapter</h2>
          <div class="space-y-3">
            ${resources?.map(r => `
              <div class="card">
                <div class="flex justify-between items-center gap-4">
                  <div class="min-w-0">
                    <p class="font-medium text-gray-900 truncate">${r.title}</p>
                    <p class="text-xs text-gray-500">${r.file_type}</p>
                    <p class="text-xs text-gray-500">${r.access_level === 'selected' ? 'Selected users only' : 'Everyone'}</p>
                  </div>
                  <div class="flex items-center gap-2 shrink-0">
                    <select class="resource-folder-select input text-xs !py-1.5 !w-40" data-id="${r.id}">
                      ${folderOptionsHtml(currentFolders, r.folder_id || '')}
                    </select>
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

        resourcesContainer.querySelectorAll('.resource-folder-select').forEach(select => {
          select.addEventListener('change', async (event) => {
            const resourceId = event.currentTarget.dataset.id
            const folderId = event.currentTarget.value || null
            const { error } = await setResourceFolder(resourceId, folderId)
            if (error) {
              showNotification('Failed to move resource: ' + (error.message || ''), 'error')
            } else {
              showNotification('Resource moved')
            }
          })
        })

        resourcesContainer.querySelectorAll('.manage-resource-access-btn').forEach(btn => {
          btn.addEventListener('click', async (event) => {
            console.log('Manage access clicked!', event.currentTarget);
            try {
              const btn = event.currentTarget
              const resourceId = btn.dataset.id
              const currentAccessLevel = btn.dataset.accessLevel
              const card = btn.closest('.card')
              const { data: allowedUsers, error } = await getResourceAllowedUsers(resourceId)

              if (error) {
                console.error('Error fetching allowed users:', error)
                showNotification('Failed to load access list: ' + (error.message || ''), 'error')
                return
              }

              const selectedUserIds = allowedUsers?.map(row => row.user_id) || []
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
                console.error('Error saving access:', saveError)
                showNotification('Failed to update access: ' + (saveError.message || ''), 'error')
              } else {
                showNotification('Access updated')
                chapterSelect.dispatchEvent(new Event('change'))
              }
            })
            } catch (err) {
              console.error('Unhandled error in manage access click:', err)
              showNotification('An error occurred. Check console.', 'error')
            }
          })
        })

        resourcesContainer.querySelectorAll('.delete-resource-btn').forEach(btn => {
          btn.addEventListener('click', async (event) => {
            const id = event.currentTarget.dataset.id
            const ok = await confirmDialog('Delete this resource? This cannot be undone.')
            if (!ok) return
            const { error } = await deleteResource(id)
            if (!error) {
              showNotification('Resource deleted')
              location.reload()
            } else {
              showNotification('Failed to delete resource', 'error')
            }
          })
        })
      } else {
        foldersSection.classList.add('hidden')
        foldersList.innerHTML = ''
        resourcesContainer.innerHTML = ''
        currentFolders = []
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

      const fileUrl = getPublicUrl('resources', fileName)
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
